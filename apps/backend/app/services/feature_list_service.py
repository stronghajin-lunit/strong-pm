import re
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession


from app.crud import feature_list_apply_log as apply_log_crud
from app.crud import feature_list_run as fl_crud
from app.crud import project as project_crud
from app.integrations import ai, confluence
from app.integrations.ai import AIIntegrationError, FeatureListContextConfig
from app.integrations.confluence import ConfluenceIntegrationError, extract_page_id_from_url
from app.models.feature_list_run import FeatureListRun
from app.schemas.feature_list import (
    ApplyCommentsRequest,
    ApplyCommentsResponse,
    ApplyLogEntry,
    ApplyLogListResponse,
    ChangeDetail,
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

    # ── Validate reference URL formats ─────────────────────────────────────────
    ref_page_ids: list[str] = []
    for ref_url in body.reference_urls:
        try:
            ref_page_ids.append(extract_page_id_from_url(ref_url))
        except ConfluenceIntegrationError as exc:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REFERENCE_URL"}) from exc

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

        # ── 2. Fetch reference pages ───────────────────────────────────────────
        reference_pages: list[dict[str, str]] = []
        for ref_page_id in ref_page_ids:
            ref_pages = await confluence.fetch_all_project_pages(ref_page_id)
            reference_pages.extend(ref_pages)

        # ── 3. Project context ─────────────────────────────────────────────────
        ctx = await project_crud.get_context(db, proj_db_id)
        project_context = ctx.context if ctx and ctx.context else ""

        # ── 4. AI generate ────────────────────────────────────────────────────
        ai_ctx_cfg = FeatureListContextConfig(
            project_summary_position=body.context_config.project_summary.position,
            project_summary_char_limit=body.context_config.project_summary.char_limit,
            prd_pages_position=body.context_config.prd_pages.position,
            prd_pages_char_limit=body.context_config.prd_pages.char_limit,
            reference_docs_position=body.context_config.reference_docs.position,
            reference_docs_char_limit=body.context_config.reference_docs.char_limit,
        )
        result = await ai.generate_feature_list(
            project_name=project.name,
            source_pages=source_pages,
            project_context=project_context,
            reference_pages=reference_pages,
            context_config=ai_ctx_cfg,
        )

        overview_data: dict[str, str] = result.get("overview", {})
        overview_data["related_prd"] = prd_url  # always set from input
        features: list[dict] = result.get("features", [])

        # ── 5. Update Confluence page ──────────────────────────────────────────
        pub = await confluence.update_feature_list_page(
            page_id=fl_page_id,
            overview_data=overview_data,
            features=features,
        )

        # ── 6. Mark done ───────────────────────────────────────────────────────
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


async def list_apply_logs(db: AsyncSession, feature_list_page_url: str) -> ApplyLogListResponse:
    import json as _json
    logs = await apply_log_crud.list_by_page_url(db, feature_list_page_url)
    entries = [
        ApplyLogEntry(
            id=log.id,
            applied_at=fmt_dt_required(log.applied_at),
            changes_applied=log.changes_applied,
            comments_resolved=log.comments_resolved,
            confluence_url=log.confluence_url,
            change_details=[ChangeDetail(**d) for d in _json.loads(log.change_details)],
        )
        for log in logs
    ]
    return ApplyLogListResponse(logs=entries)


async def apply_comments(db: AsyncSession, body: ApplyCommentsRequest) -> ApplyCommentsResponse:
    try:
        fl_page_id = extract_page_id_from_url(body.feature_list_page_url)
    except ConfluenceIntegrationError as exc:
        raise HTTPException(status_code=400, detail={"code": "INVALID_URL"}) from exc

    try:
        # 1. Read current page storage + comments in parallel
        storage, version, title = await confluence.fetch_feature_list_storage(fl_page_id)
        raw_comments = await confluence.fetch_page_comments(fl_page_id)
    except ConfluenceIntegrationError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_ERROR", "message": str(exc)}) from exc

    if not raw_comments:
        raise HTTPException(status_code=422, detail={"code": "NO_COMMENTS"})

    # 2. Extract current feature data from the page
    features = confluence.extract_features_from_storage(storage)

    if not features:
        raise HTTPException(status_code=422, detail={"code": "NO_FEATURES_FOUND"})

    # 3. AI: comments → structured changes
    comment_texts = [c.body for c in raw_comments]
    try:
        changes = await ai.apply_feature_comments(features=features, comments=comment_texts)
    except AIIntegrationError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_ERROR", "message": str(exc)}) from exc

    # Guard: filter out hallucinated changes — keep only changes whose feature_id
    # or feature name appears in at least one comment text.
    combined_comments = " ".join(comment_texts).lower()
    feature_name_map = {f["id"]: f.get("name", "") for f in features}
    changes = [
        c for c in changes
        if c.feature_id.lower() in combined_comments
        or feature_name_map.get(c.feature_id, "").lower() in combined_comments
    ]

    if not changes:
        raise HTTPException(status_code=422, detail={"code": "NO_ACTIONABLE_CHANGES"})

    # 4. Apply changes to the feature list
    deleted_ids: set[str] = set()
    feat_by_id = {f["id"]: f for f in features}

    for change in changes:
        fid = change.feature_id
        if change.action == "delete":
            feat_by_id.pop(fid, None)
            deleted_ids.add(fid)
        elif change.action == "update" and fid in feat_by_id:
            feat_by_id[fid].update(change.changes)

    # Remove deleted IDs from dependencies of remaining features
    if deleted_ids:
        for feat in feat_by_id.values():
            deps = feat.get("dependencies", "-")
            if deps and deps != "-":
                parts = [p.strip() for p in re.split(r"[,\s]+", deps) if p.strip()]
                remaining = [p for p in parts if p not in deleted_ids]
                feat["dependencies"] = ", ".join(remaining) if remaining else "-"

    # Preserve original category order
    updated_features = [feat_by_id[f["id"]] for f in features if f["id"] in feat_by_id]

    # 5. Write back to Confluence (table format preserved via _update_feature_list_table)
    updated_storage = confluence._update_feature_list_table(storage, updated_features)
    try:
        confluence_url = await confluence.write_feature_list_storage(
            fl_page_id, updated_storage, version, title
        )
    except ConfluenceIntegrationError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_ERROR", "message": str(exc)}) from exc

    # 6. Resolve comments (best-effort)
    await confluence.resolve_comments(raw_comments)

    # 7. Build enriched change details (feature name + action summary)
    feature_name_map = {f["id"]: f.get("name", f["id"]) for f in features}
    enriched: list[ChangeDetail] = [
        ChangeDetail(
            action=c.action,
            feature_id=c.feature_id,
            feature_name=feature_name_map.get(c.feature_id, c.feature_id),
            changes=c.changes,
        )
        for c in changes
    ]

    # 8. Find matching run (most recent with same page URL) and save log
    run = await fl_crud.find_latest_by_page_url(db, body.feature_list_page_url)
    await apply_log_crud.create(
        db=db,
        run_id=run.id if run else None,
        feature_list_page_url=body.feature_list_page_url,
        applied_at=datetime.now(UTC),
        changes_applied=len(changes),
        comments_resolved=len(raw_comments),
        confluence_url=confluence_url,
        change_details=[e.model_dump() for e in enriched],
    )
    await db.commit()

    return ApplyCommentsResponse(
        changes_applied=len(changes),
        comments_resolved=len(raw_comments),
        confluence_url=confluence_url,
        change_details=enriched,
    )
