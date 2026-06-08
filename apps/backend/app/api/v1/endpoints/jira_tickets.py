from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.jira_ticket import (
    JiraSprintListResponse,
    JiraTicketListResponse,
    JiraTicketRunRequest,
    JiraTicketRunResponse,
)
from app.services import jira_ticket_service

router = APIRouter()


@router.post("/run", response_model=JiraTicketRunResponse, status_code=201)
async def run_jira_ticket(
    body: JiraTicketRunRequest,
    db: AsyncSession = Depends(get_db),
) -> JiraTicketRunResponse:
    return await jira_ticket_service.run(db, body)


@router.get("", response_model=JiraTicketListResponse)
async def list_jira_tickets(db: AsyncSession = Depends(get_db)) -> JiraTicketListResponse:
    return await jira_ticket_service.list_runs(db)


@router.get("/sprints", response_model=JiraSprintListResponse)
async def list_sprints(product: str = Query(...)) -> JiraSprintListResponse:
    return await jira_ticket_service.list_sprints(product)
