from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.prd import (
    PrdRunListResponse,
    PrdRunRequest,
    PrdRunResponse,
    PrdTeamListResponse,
)
from app.services import prd_service

router = APIRouter()


@router.get("/teams", response_model=PrdTeamListResponse)
async def list_teams() -> PrdTeamListResponse:
    return prd_service.list_teams()


@router.post("/run", response_model=PrdRunResponse, status_code=201)
async def run_prd(
    body: PrdRunRequest,
    db: AsyncSession = Depends(get_db),
) -> PrdRunResponse:
    return await prd_service.run_prd(db, body)


@router.get("", response_model=PrdRunListResponse)
async def list_runs(db: AsyncSession = Depends(get_db)) -> PrdRunListResponse:
    return await prd_service.list_runs(db)
