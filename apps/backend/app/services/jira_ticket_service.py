from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud import jira_ticket_run as jira_ticket_run_crud
from app.integrations import ai, jira
from app.models.jira_ticket_run import JiraTicketRun
from app.schemas.jira_ticket import (
    VALID_ISSUE_TYPES,
    VALID_PRODUCTS,
    JiraSprintListResponse,
    JiraSprintResponse,
    JiraTicketListResponse,
    JiraTicketRunRequest,
    JiraTicketRunResponse,
)
from app.utils import fmt_dt_required, make_jt_id


def _to_response(run: JiraTicketRun) -> JiraTicketRunResponse:
    return JiraTicketRunResponse(
        id=make_jt_id(run.id),
        summary=run.summary,
        product=run.product,
        sprint=run.sprint,
        type=run.type,
        requested_at=fmt_dt_required(run.requested_at),
        status=run.status,
        jira_url=run.jira_url,
    )


async def run(db: AsyncSession, body: JiraTicketRunRequest) -> JiraTicketRunResponse:
    if body.product not in VALID_PRODUCTS:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PRODUCT"})
    if body.type not in VALID_ISSUE_TYPES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_ISSUE_TYPE"})

    board_ids = settings.jira_board_ids_map
    if body.product not in board_ids:
        raise HTTPException(status_code=502, detail={"code": "JIRA_UPSTREAM_ERROR"})

    ticket_content = await ai.generate_jira_ticket(
        product=body.product,
        issue_type=body.type,
        feature_description=body.feature_description,
        definition_of_done=body.definition_of_done,
    )

    issue = await jira.create_issue(
        project_key=settings.JIRA_TICKET_PROJECT_KEY,
        issue_type=body.type,
        summary=ticket_content.summary,
        description=ticket_content.description,
    )

    await jira.add_issue_to_sprint(sprint_id=body.sprint_id, issue_key=issue.key)

    now = datetime.now(UTC)
    run_record = await jira_ticket_run_crud.create(
        db,
        product=body.product,
        sprint=body.sprint,
        type=body.type,
        summary=ticket_content.summary,
        status="done",
        jira_url=issue.url,
        requested_at=now,
    )
    await db.commit()
    return _to_response(run_record)


async def list_runs(db: AsyncSession) -> JiraTicketListResponse:
    runs = await jira_ticket_run_crud.list_all(db)
    return JiraTicketListResponse(tickets=[_to_response(r) for r in runs])


async def list_sprints(product: str) -> JiraSprintListResponse:
    if product not in VALID_PRODUCTS:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PRODUCT"})

    board_ids = settings.jira_board_ids_map
    if product not in board_ids:
        raise HTTPException(status_code=502, detail={"code": "JIRA_UPSTREAM_ERROR"})

    sprints = await jira.fetch_sprints(board_id=board_ids[product])
    return JiraSprintListResponse(
        sprints=[
            JiraSprintResponse(sprint_id=s.sprint_id, label=s.label, state=s.state)
            for s in sprints
        ]
    )
