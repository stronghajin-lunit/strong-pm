from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.feature_list import (
    ApplyCommentsRequest,
    ApplyCommentsResponse,
    ApplyLogListResponse,
    FeatureListRunListResponse,
    FeatureListRunRequest,
    FeatureListRunResponse,
)
from app.services import feature_list_service

router = APIRouter()


@router.post("/run", response_model=FeatureListRunResponse, status_code=201)
async def run_feature_list(
    body: FeatureListRunRequest,
    db: AsyncSession = Depends(get_db),
) -> FeatureListRunResponse:
    return await feature_list_service.run_feature_list(db, body)


@router.get("", response_model=FeatureListRunListResponse)
async def list_runs(db: AsyncSession = Depends(get_db)) -> FeatureListRunListResponse:
    return await feature_list_service.list_runs(db)


@router.post("/apply-comments", response_model=ApplyCommentsResponse)
async def apply_comments(
    body: ApplyCommentsRequest,
    db: AsyncSession = Depends(get_db),
) -> ApplyCommentsResponse:
    return await feature_list_service.apply_comments(db, body)


@router.get("/apply-logs", response_model=ApplyLogListResponse)
async def get_apply_logs(
    feature_list_page_url: str,
    db: AsyncSession = Depends(get_db),
) -> ApplyLogListResponse:
    return await feature_list_service.list_apply_logs(db, feature_list_page_url)
