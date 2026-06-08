import re

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import product as product_crud
from app.crud import project as project_crud
from app.integrations.confluence import ConfluenceIntegrationError, extract_page_id_from_url
from app.models.project import Project
from app.schemas.project import (
    VALID_STATUSES,
    ProjectContextResponse,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
    SyncStatusResponse,
)
from app.services import project_context_service
from app.utils import fmt_dt_required

_JIRA_KEY_RE = re.compile(r"([A-Z]+-\d+)")


def _derive_status(workflow_step: int) -> str:
    """Derive project status from workflow step.

    1 = Project Creation → not_started
    2-3 = Kick off, PRD  → planning
    4-5 = Development, Deployment → active
    """
    if workflow_step <= 1:
        return "not_started"
    if workflow_step <= 3:
        return "planning"
    return "active"


def _extract_jira_key(url: str) -> str | None:
    m = _JIRA_KEY_RE.search(url)
    return m.group(1) if m else None


def _make_project_id(db_id: int) -> str:
    return f"proj-{db_id}"


def _parse_project_id(pid: str) -> int:
    try:
        return int(pid.removeprefix("proj-"))
    except ValueError:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})


async def _to_response(db: AsyncSession, project: Project) -> ProjectResponse:
    product_names = await project_crud.get_product_names(db, project.id)
    return ProjectResponse(
        id=_make_project_id(project.id),
        name=project.name,
        description=project.description,
        status=project.status,
        epic_link=project.epic_link,
        epic_key=project.epic_key,
        confluence_link=project.confluence_link,
        workflow_step=project.workflow_step,
        background=project.background,
        hlr=project.hlr,
        product_names=product_names,
        updated_at=fmt_dt_required(project.updated_at),
    )


async def list_projects(db: AsyncSession) -> ProjectListResponse:
    projects = await project_crud.list_all(db)
    items = [await _to_response(db, p) for p in projects]
    return ProjectListResponse(projects=items)


async def create_project(
    db: AsyncSession,
    body: ProjectCreateRequest,
    background_tasks: BackgroundTasks,
) -> ProjectResponse:
    # Validate products exist
    products = await product_crud.get_by_ids(db, body.product_ids)
    if len(products) != len(body.product_ids):
        raise HTTPException(status_code=400, detail={"code": "INVALID_PRODUCT_IDS"})

    # Extract Jira epic key and Confluence page ID
    epic_key = _extract_jira_key(body.epic_link or "")
    confluence_page_id: str | None = None
    if body.confluence_link:
        try:
            confluence_page_id = extract_page_id_from_url(body.confluence_link)
        except ConfluenceIntegrationError:
            confluence_page_id = None

    project = await project_crud.create(
        db,
        name=body.name,
        epic_link=body.epic_link,
        epic_key=epic_key,
        confluence_link=body.confluence_link,
        confluence_page_id=confluence_page_id,
        background=body.background,
        hlr=body.hlr,
    )
    await project_crud.add_products(db, project.id, body.product_ids)
    await db.commit()
    await db.refresh(project)

    # Trigger context sync in background
    if confluence_page_id:
        from app.db.session import AsyncSessionLocal

        async def _bg_sync(proj_id: int) -> None:
            async with AsyncSessionLocal() as bg_db:
                await project_context_service.sync_context(bg_db, proj_id)

        background_tasks.add_task(_bg_sync, project.id)

    return await _to_response(db, project)


async def get_project(db: AsyncSession, project_id: str) -> ProjectResponse:
    pid = _parse_project_id(project_id)
    project = await project_crud.get_by_id(db, pid)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    return await _to_response(db, project)


async def update_project(
    db: AsyncSession, project_id: str, body: ProjectUpdateRequest
) -> ProjectResponse:
    pid = _parse_project_id(project_id)
    project = await project_crud.get_by_id(db, pid)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_STATUS"})

    kwargs = {k: v for k, v in body.model_dump().items() if v is not None}

    # Auto-derive status from workflow_step unless status is explicitly set
    if body.workflow_step is not None and body.status is None:
        kwargs["status"] = _derive_status(body.workflow_step)

    await project_crud.update(db, project, **kwargs)

    # Archive: keep AI summary, discard raw page cache to free storage
    if body.status == "archived":
        await project_crud.clear_page_cache(db, pid)

    await db.commit()
    await db.refresh(project)
    return await _to_response(db, project)


async def sync_project_context(
    db: AsyncSession,
    project_id: str,
    background_tasks: BackgroundTasks,
) -> SyncStatusResponse:
    pid = _parse_project_id(project_id)
    project = await project_crud.get_by_id(db, pid)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    if not project.confluence_page_id:
        raise HTTPException(status_code=400, detail={"code": "NO_CONFLUENCE_LINK"})

    from app.db.session import AsyncSessionLocal

    async def _bg_sync(proj_id: int) -> None:
        async with AsyncSessionLocal() as bg_db:
            await project_context_service.sync_context(bg_db, proj_id)

    background_tasks.add_task(_bg_sync, pid)
    return SyncStatusResponse(status="syncing", message="Context sync started in background.")


async def get_project_context(
    db: AsyncSession, project_id: str
) -> ProjectContextResponse:
    pid = _parse_project_id(project_id)
    project = await project_crud.get_by_id(db, pid)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    ctx = await project_crud.get_context(db, pid)
    return ProjectContextResponse(
        project_id=project_id,
        context=ctx.context if ctx else None,
        synced_at=fmt_dt_required(ctx.synced_at) if ctx and ctx.synced_at else None,
        page_count=len(ctx.page_cache) if ctx else 0,
    )
