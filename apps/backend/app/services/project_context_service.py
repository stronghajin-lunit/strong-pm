"""Confluence context collection and AI summarisation for projects.

Sync algorithm:
1. Fetch all Confluence pages (root + descendants) with their updated_at.
2. Compare with page_cache: collect pages that are new or have changed updated_at.
3. Re-fetch content only for changed/new pages; reuse cached content for others.
4. Re-summarise ALL page content (fresh + cached) via AI → single context text.
5. Upsert project_context with new summary + updated cache.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import project as project_crud
from app.integrations import ai, confluence
from app.integrations.ai import AIIntegrationError
from app.integrations.confluence import ConfluenceIntegrationError

logger = logging.getLogger(__name__)


async def sync_context(db: AsyncSession, project_id: int) -> None:
    """Collect/refresh Confluence context for a project. Safe to call repeatedly."""
    project = await project_crud.get_by_id(db, project_id)
    if not project or not project.confluence_page_id:
        return

    # ── 1. Fetch all page metadata (lightweight: no content yet) ──────────────
    try:
        all_pages = await confluence.fetch_all_project_pages(project.confluence_page_id)
    except ConfluenceIntegrationError as exc:
        logger.warning("Confluence fetch failed for project %s: %s", project_id, exc)
        return

    if not all_pages:
        return

    # ── 2. Load existing cache ─────────────────────────────────────────────────
    existing_ctx = await project_crud.get_context(db, project_id)
    cached: dict[str, dict] = existing_ctx.page_cache if existing_ctx else {}

    # ── 3. Determine which pages need fresh content ────────────────────────────
    new_cache: dict[str, dict] = {}
    pages_for_summary: list[dict[str, str]] = []

    for page in all_pages:
        pid = page["id"]
        cached_entry = cached.get(pid)

        if cached_entry and cached_entry.get("updated_at") == page["updated_at"]:
            # No change — reuse cached content
            new_cache[pid] = cached_entry
        else:
            # New or updated — use freshly fetched content
            new_cache[pid] = {
                "title": page["title"],
                "content": page["content"],
                "updated_at": page["updated_at"],
            }

        pages_for_summary.append(
            {"title": new_cache[pid]["title"], "content": new_cache[pid]["content"]}
        )

    # ── 4. Re-summarise ALL content via AI ────────────────────────────────────
    try:
        context = await ai.summarize_project_context(
            project_name=project.name,
            pages=pages_for_summary,
        )
    except AIIntegrationError as exc:
        logger.warning("AI summarisation failed for project %s: %s", project_id, exc)
        return

    # ── 5. Persist ─────────────────────────────────────────────────────────────
    await project_crud.upsert_context(db, project_id, context, new_cache)
    await db.commit()
    logger.info(
        "Project %s context synced: %d pages, context length %d chars",
        project_id, len(new_cache), len(context),
    )
