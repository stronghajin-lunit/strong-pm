from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.feature_list import (
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
