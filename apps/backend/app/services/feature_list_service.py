from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import feature_list_run as fl_crud
from app.crud import project as project_crud
from app.integrations import ai, confluence
from app.integrations.ai import AIIntegrationError
from app.integrations.confluence import ConfluenceIntegrationError, extract_page_id_from_url
from app.models.feature_list_run import FeatureListRun
from app.schemas.feature_list import (
    FeatureListRunListResponse,
    FeatureListRunRequest,
    FeatureListRunResponse,
)
from app.utils import fmt_dt, fmt_dt_required
from app.utils.feature_list_config import should_exclude_page


def _make_fl_id(db_id: int) -> str:
    return f"fl-{db_id}"


def _to_response(run: FeatureListRun) -> FeatureListRunResponse:
    return FeatureListRunResponse(
        id=_make_fl_id(run.id),
        project_id=f"proj-{run.project_id}" if run.project_id else None,
        project_name=run.project_name,
        prd_page_url=run.prd_page_url,
        feature_list_page_url=run.feature_list_page_url,
        requested_at=fmt_dt_required(run.requested_at),
        completed_at=fmt_dt(run.completed_at),
        status=run.status,
        confluence_url=run.confluence_url,
        feature_count=run.feature_count,
    )


async def run_feature_list(db: AsyncSession, body: FeatureListRunRequest) -> FeatureListRunResponse:
    # ── Resolve project ────────────────────────────────────────────────────────
    try:
        proj_db_id = int(body.project_id.removeprefix("proj-"))
    except ValueError:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PROJECT_ID"})

    project = await project_crud.get_by_id(db, proj_db_id)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND"})

    # ── Extract page IDs ───────────────────────────────────────────────────────
    try:
        prd_page_id = extract_page_id_from_url(body.prd_page_url)
        fl_page_id = extract_page_id_from_url(body.feature_list_page_url)
    except ConfluenceIntegrationError as exc:
        raise HTTPException(status_code=400, detail={"code": "INVALID_URL"}) from exc

    # ── Create run record ──────────────────────────────────────────────────────
    now = datetime.now(UTC)
    run = await fl_crud.create(
        db,
        project_id=proj_db_id,
        project_name=project.name,
        prd_page_url=body.prd_page_url,
        prd_page_id=prd_page_id,
        feature_list_page_url=body.feature_list_page_url,
        feature_list_page_id=fl_page_id,
        requested_at=now,
    )
    await db.commit()

    try:
        # ── 1. Collect PRD + child pages (excluding Feature List pages) ────────
        all_pages = await confluence.fetch_all_project_pages(prd_page_id)
        source_pages = [
            p for p in all_pages if not should_exclude_page(p.get("title", ""))
        ]
        # Add the PRD URL as related_prd in overview
        prd_url = body.prd_page_url

        # ── 2. Project context ─────────────────────────────────────────────────
        ctx = await project_crud.get_context(db, proj_db_id)
        project_context = ctx.context if ctx and ctx.context else ""

        # ── 3. AI generate ────────────────────────────────────────────────────
        result = await ai.generate_feature_list(
            project_name=project.name,
            source_pages=source_pages,
            project_context=project_context,
        )

        overview_data: dict[str, str] = result.get("overview", {})
        overview_data["related_prd"] = prd_url  # always set from input
        features: list[dict] = result.get("features", [])

        # ── 4. Update Confluence page ──────────────────────────────────────────
        pub = await confluence.update_feature_list_page(
            page_id=fl_page_id,
            overview_data=overview_data,
            features=features,
        )

        # ── 5. Mark done ───────────────────────────────────────────────────────
        completed_at = datetime.now(UTC)
        run = await fl_crud.complete(
            db, run, pub.confluence_url, len(features), completed_at
        )
        await db.commit()

    except (ConfluenceIntegrationError, AIIntegrationError) as exc:
        run = await fl_crud.fail(db, run)
        await db.commit()
        raise HTTPException(
            status_code=502, detail={"code": "UPSTREAM_ERROR", "message": str(exc)}
        ) from exc

    return _to_response(run)


async def list_runs(db: AsyncSession) -> FeatureListRunListResponse:
    runs = await fl_crud.list_all(db)
    return FeatureListRunListResponse(runs=[_to_response(r) for r in runs])
