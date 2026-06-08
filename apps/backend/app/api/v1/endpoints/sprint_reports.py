from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.sprint_report import (
    SprintOptionListResponse,
    SprintReportListResponse,
    SprintReportResponse,
    SprintReportRunRequest,
)
from app.services import sprint_report_service

router = APIRouter()


@router.get("/sprints", response_model=SprintOptionListResponse)
async def list_sprints() -> SprintOptionListResponse:
    return await sprint_report_service.list_sprints()


@router.post("/run", response_model=SprintReportResponse, status_code=201)
async def run_sprint_report(
    body: SprintReportRunRequest,
    db: AsyncSession = Depends(get_db),
) -> SprintReportResponse:
    return await sprint_report_service.run(db, body)


@router.get("", response_model=SprintReportListResponse)
async def list_sprint_reports(db: AsyncSession = Depends(get_db)) -> SprintReportListResponse:
    return await sprint_report_service.list_reports(db)
