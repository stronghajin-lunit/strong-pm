from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.deployment import (
    DeploymentDetailResponse,
    DeploymentListResponse,
    DeploymentRunRequest,
)
from app.services import deployment_service

router = APIRouter()


@router.post("/run", response_model=DeploymentDetailResponse, status_code=201)
async def run_deployment(
    body: DeploymentRunRequest,
    db: AsyncSession = Depends(get_db),
) -> DeploymentDetailResponse:
    return await deployment_service.run(db, body.jira_version_id)


@router.get("", response_model=DeploymentListResponse)
async def list_deployments(db: AsyncSession = Depends(get_db)) -> DeploymentListResponse:
    return await deployment_service.list_deployments(db)


@router.get("/{dt_id}", response_model=DeploymentDetailResponse)
async def get_deployment(
    dt_id: str,
    db: AsyncSession = Depends(get_db),
) -> DeploymentDetailResponse:
    return await deployment_service.get_detail(db, dt_id)
