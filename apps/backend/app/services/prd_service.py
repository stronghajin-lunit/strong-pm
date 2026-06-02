"""PRD Writer service.

Flow:
1. Fetch Kickoff page content (Confluence)
2. Load project context from DB
3. Build repo context from project's relatedProducts
4. AI generates PRD section content
5. Parse AI output into per-section strings
6. Replace each section in the existing PRD page (keep format, fill content only)
7. Save run record
"""

import re
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import prd_run as prd_run_crud
from app.crud import project as project_crud
from app.integrations import ai, confluence
from app.integrations.ai import AIIntegrationError
from app.integrations.confluence import (
    ConfluenceIntegrationError,
    extract_page_id_from_url,
    update_scope_table,
)
from app.models.prd_run import PrdRun
from app.schemas.prd import (
    PrdRunListResponse,
    PrdRunRequest,
    PrdRunResponse,
    PrdTeamListResponse,
    PrdTeamOption,
)
from app.utils import fmt_dt, fmt_dt_required
from app.utils.prd_config import (
    TEAMS,
    build_repo_context,
    get_repos_for_products,
    get_teams_description,
)


def _make_prd_id(db_id: int) -> str:
    return f"prd-{db_id}"


def _to_response(run: PrdRun) -> PrdRunResponse:
    # target_team stored as comma-joined string
    teams = [t.strip() for t in run.target_team.split(",") if t.strip()]
    return PrdRunResponse(
        id=_make_prd_id(run.id),
        project_id=f"proj-{run.project_id}" if run.project_id else None,
        project_name=run.project_name,
        target_teams=teams,
        kickoff_url=run.kickoff_url,
        prd_page_url=run.prd_page_url,
        requested_at=fmt_dt_required(run.requested_at),
        completed_at=fmt_dt(run.completed_at),
        status=run.status,
        confluence_url=run.confluence_url,
    )


def list_teams() -> PrdTeamListResponse:
    return PrdTeamListResponse(
        teams=[
            PrdTeamOption(key=t["key"], label=t["label"], description=t["description"])
            for t in TEAMS
        ]
    )


_SECTION_RE = re.compile(r"=== (.+?) ===\n(.*?)(?=\n=== |\Z)", re.DOTALL)


def _parse_prd_sections(raw: str) -> dict[str, str]:
    return {m.group(1).strip(): m.group(2).strip() for m in _SECTION_RE.finditer(raw)}


async def run_prd(db: AsyncSession, body: PrdRunRequest) -> PrdRunResponse:
    # ── Resolve project ────────────────────────────────────────────────────────
    try:
        proj_db_id = int(body.project_id.removeprefix("proj-"))
    except ValueError:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PROJECT_ID"})

    project = await project_crud.get_by_id(db, proj_db_id)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND"})

    product_names = await project_crud.get_product_names(db, proj_db_id)

    # ── Extract page IDs ───────────────────────────────────────────────────────
    try:
        prd_page_id = extract_page_id_from_url(body.prd_page_url)
        kickoff_page_id = extract_page_id_from_url(body.kickoff_url)
    except ConfluenceIntegrationError as exc:
        raise HTTPException(status_code=400, detail={"code": "INVALID_URL"}) from exc

    # ── Create run record (status=running) ─────────────────────────────────────
    now = datetime.now(UTC)
    teams_str = ", ".join(body.target_teams)
    run = await prd_run_crud.create(
        db,
        project_id=proj_db_id,
        project_name=project.name,
        target_team=teams_str,
        kickoff_url=body.kickoff_url,
        prd_page_url=body.prd_page_url,
        prd_page_id=prd_page_id,
        requested_at=now,
    )
    await db.commit()

    try:
        # ── 1. Fetch Kickoff content ─────────────────────────────────────────
        _, kickoff_content, _ = await confluence.fetch_page_text(kickoff_page_id)

        # ── 2. Load project context ──────────────────────────────────────────
        ctx = await project_crud.get_context(db, proj_db_id)
        project_context = ctx.context if ctx and ctx.context else ""

        # ── 3. Build repo context ────────────────────────────────────────────
        repos = get_repos_for_products(product_names)
        repo_context = build_repo_context(repos)

        # ── 4. Generate PRD sections via AI ─────────────────────────────────
        team_description = get_teams_description(body.target_teams)
        raw_output = await ai.generate_prd_sections(
            project_name=project.name,
            target_team_label=teams_str,
            target_team_description=team_description,
            kickoff_content=kickoff_content,
            project_context=project_context,
            repo_context=repo_context,
        )

        # ── 5. Parse sections ────────────────────────────────────────────────
        sections = _parse_prd_sections(raw_output)

        # ── 6. Fetch existing PRD page and replace sections ──────────────────
        try:
            get_resp = await confluence._get_client().get(
                f"/api/v2/pages/{prd_page_id}",
                params={"body-format": "storage"},
            )
        except Exception as exc:
            raise ConfluenceIntegrationError(f"Failed to fetch PRD page: {exc}") from exc

        page_data = confluence._ensure_ok(get_resp)
        version: int = (page_data.get("version") or {}).get("number", 1)
        title: str = str(page_data.get("title", "PRD"))
        existing_storage: str = (page_data.get("body") or {}).get("storage", {}).get("value", "")

        # Replace each section in the existing page
        updated = existing_storage

        # In Scope / Out of Scope live inside a 2-column table under <h2>Scope</h2>
        in_scope = sections.pop("In Scope", None)
        out_of_scope = sections.pop("Out of Scope", None)
        if in_scope is not None or out_of_scope is not None:
            updated = update_scope_table(
                updated,
                in_scope_content=in_scope or "",
                out_of_scope_content=out_of_scope or "",
            )

        # Remaining sections use heading-based replacement
        for section_title, content in sections.items():
            updated = confluence.replace_section(updated, section_title, f"\n{content}\n")

        # ── 7. Save updated page ─────────────────────────────────────────────
        payload = {
            "id": prd_page_id,
            "status": "current",
            "title": title,
            "version": {"number": version + 1},
            "body": {"representation": "storage", "value": updated},
        }
        try:
            put_resp = await confluence._get_client().put(
                f"/api/v2/pages/{prd_page_id}", json=payload
            )
        except Exception as exc:
            raise ConfluenceIntegrationError(f"Failed to update PRD page: {exc}") from exc

        confluence._ensure_ok(put_resp)

        webui = str(put_resp.json().get("_links", {}).get("webui", ""))
        site = confluence.settings.JIRA_BASE_URL.rstrip("/")
        confluence_url = f"{site}/wiki{webui}" if webui else body.prd_page_url

        # ── 8. Mark done ─────────────────────────────────────────────────────
        completed_at = datetime.now(UTC)
        run = await prd_run_crud.complete(db, run, confluence_url, completed_at)
        await db.commit()

    except (ConfluenceIntegrationError, AIIntegrationError) as exc:
        run = await prd_run_crud.fail(db, run)
        await db.commit()
        raise HTTPException(
            status_code=502, detail={"code": "UPSTREAM_ERROR", "message": str(exc)}
        ) from exc

    return _to_response(run)


async def list_runs(db: AsyncSession) -> PrdRunListResponse:
    runs = await prd_run_crud.list_all(db)
    return PrdRunListResponse(runs=[_to_response(r) for r in runs])
