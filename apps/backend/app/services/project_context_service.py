"""Confluence context collection and AI summarisation for projects.

Sync algorithm:
1. Fetch all Confluence pages (root + descendants) with their updated_at.
2. Compare with page_cache: identify pages that are new, changed, or lack a cached summary.
3. Summarise only changed/new pages via AI; reuse cached summaries for unchanged pages.
4. Assemble context as one ## section per page.
5. Upsert project_context with assembled context + updated cache.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import project as project_crud
from app.integrations import ai, confluence
from app.integrations.ai import AIIntegrationError
from app.integrations.confluence import ConfluenceIntegrationError

logger = logging.getLogger(__name__)


async def _build_context(
    db: AsyncSession,
    project_id: int,
) -> tuple[str, str, dict[str, Any], list[str]]:
    """Fetch Confluence pages, generate AI summary per page, translate. Does NOT write to DB.

    Returns (context_en, context_ko, new_page_cache, changed_page_titles).
    Raises ConfluenceIntegrationError, AIIntegrationError, or ValueError.
    """
    project = await project_crud.get_by_id(db, project_id)
    if not project or not project.confluence_page_id:
        raise ValueError(f"Project {project_id} has no Confluence link")

    all_pages = await confluence.fetch_all_project_pages(project.confluence_page_id)
    if not all_pages:
        raise ValueError(f"No Confluence pages found for project {project_id}")

    existing_ctx = await project_crud.get_context(db, project_id)
    cached: dict[str, dict] = existing_ctx.page_cache if existing_ctx else {}

    new_cache: dict[str, dict] = {}
    changed_page_titles: list[str] = []

    for page in all_pages:
        pid = page["id"]
        cached_entry = cached.get(pid)
        same_timestamp = cached_entry and cached_entry.get("updated_at") == page["updated_at"]
        same_content = cached_entry and cached_entry.get("content") == page["content"]
        has_summary = bool(cached_entry and cached_entry.get("summary"))

        if (same_timestamp or same_content) and has_summary:
            # Content unchanged and summary cached — reuse
            new_cache[pid] = cached_entry
        elif not page["content"].strip():
            # Empty page — store metadata only, no summary (will be excluded from context)
            new_cache[pid] = {
                "title": page["title"],
                "content": "",
                "updated_at": page["updated_at"],
            }
        else:
            # Content changed or no cached summary — summarise this page
            summary = await ai.summarize_single_page(
                project_name=project.name,
                page_title=page["title"],
                page_content=page["content"],
            )
            new_cache[pid] = {
                "title": page["title"],
                "content": page["content"],
                "updated_at": page["updated_at"],
                "summary": summary,
            }
            changed_page_titles.append(page["title"])

    # No pages changed and context exists — reuse without regenerating
    if not changed_page_titles and existing_ctx and existing_ctx.context:
        context_ko = existing_ctx.context_ko
        if context_ko is None:
            context_ko = await ai.translate_context_to_korean(existing_ctx.context)
        return existing_ctx.context, context_ko, new_cache, []

    # Assemble context: one ## section per page, in Confluence order
    sections = [
        f"## {new_cache[pid]['title']}\n{new_cache[pid]['summary']}"
        for pid in new_cache
        if new_cache[pid].get("summary")
    ]
    context = "\n\n".join(sections)
    context_ko = await ai.translate_context_to_korean(context)
    return context, context_ko, new_cache, changed_page_titles


async def preview_sync(
    db: AsyncSession,
    project_id: int,
) -> tuple[str | None, str, str, int, list[str]]:
    """Compute new context without persisting.

    Returns (old_context, new_context, new_context_ko, page_count, changed_page_titles).
    Raises ConfluenceIntegrationError, AIIntegrationError, or ValueError on failure.
    """
    existing_ctx = await project_crud.get_context(db, project_id)
    old_context = existing_ctx.context if existing_ctx else None

    new_context, new_context_ko, new_cache, changed_page_titles = await _build_context(db, project_id)
    return old_context, new_context, new_context_ko, len(new_cache), changed_page_titles


async def sync_context(db: AsyncSession, project_id: int) -> None:
    """Collect/refresh Confluence context for a project. Safe to call repeatedly."""
    project = await project_crud.get_by_id(db, project_id)
    if not project or not project.confluence_page_id:
        return

    try:
        context, context_ko, new_cache, _ = await _build_context(db, project_id)
    except (ConfluenceIntegrationError, AIIntegrationError, ValueError) as exc:
        logger.warning("Context sync failed for project %s: %s", project_id, exc)
        return

    await project_crud.upsert_context(db, project_id, context, new_cache, context_ko=context_ko)
    await db.commit()
    logger.info(
        "Project %s context synced: %d pages, context length %d chars",
        project_id, len(new_cache), len(context),
    )
