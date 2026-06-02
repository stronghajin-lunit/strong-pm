from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.project import (
    ProjectContextResponse,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
    SyncStatusResponse,
)
from app.services import project_service

router = APIRouter()


@router.get("", response_model=ProjectListResponse)
async def list_projects(db: AsyncSession = Depends(get_db)) -> ProjectListResponse:
    return await project_service.list_projects(db)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    return await project_service.create_project(db, body, background_tasks)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    return await project_service.get_project(db, project_id)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    return await project_service.update_project(db, project_id, body)


@router.post("/{project_id}/sync", response_model=SyncStatusResponse)
async def sync_context(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> SyncStatusResponse:
    return await project_service.sync_project_context(db, project_id, background_tasks)


@router.get("/{project_id}/context", response_model=ProjectContextResponse)
async def get_context(
    project_id: str,
    db: AsyncSession = Depends(get_db),
) -> ProjectContextResponse:
    return await project_service.get_project_context(db, project_id)
