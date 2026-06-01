from fastapi import APIRouter, Query

from app.schemas.version_assignment import (
    AssignVersionRequest,
    AssignVersionResult,
    UnversionedTicketListResponse,
    VersionOptionListResponse,
)
from app.services import version_assignment_service

router = APIRouter()


@router.get("/versions", response_model=VersionOptionListResponse)
async def list_versions() -> VersionOptionListResponse:
    return await version_assignment_service.list_versions()


@router.get("/tickets", response_model=UnversionedTicketListResponse)
async def list_unversioned_tickets(
    period: str = Query("1m"),
) -> UnversionedTicketListResponse:
    return await version_assignment_service.list_unversioned_tickets(period)


@router.post("/assign", response_model=AssignVersionResult)
async def assign_version(body: AssignVersionRequest) -> AssignVersionResult:
    return await version_assignment_service.assign_version(body)
