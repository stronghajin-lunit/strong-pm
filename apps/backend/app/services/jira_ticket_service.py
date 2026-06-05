import asyncio
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud import jira_ticket_run as jira_ticket_run_crud
from app.crud import project as project_crud
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
from app.utils.ticket_config import detect_area, get_labels


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

    # Detect area from feature description keywords
    area = detect_area(body.feature_description)

    # AI generates action phrase and description in parallel
    ticket_action, description = await asyncio.gather(
        ai.generate_ticket_action(body.feature_description),
        ai.generate_ticket_description(
            feature_description=body.feature_description,
            definition_of_done=body.definition_of_done,
            issue_type=body.type,
        ),
    )

    # Build summary: {Product} > {Area} > {action}
    summary = f"{body.product} > {area} > {ticket_action.action}"

    # Determine labels from config mapping + special keywords
    labels = get_labels(body.product, area, body.feature_description)

    # Resolve parent epic key from selected StrongPM project
    parent_key: str | None = None
    if body.project_id:
        try:
            proj_db_id = int(body.project_id.removeprefix("proj-"))
            project = await project_crud.get_by_id(db, proj_db_id)
            if project and project.epic_key:
                parent_key = project.epic_key
        except (ValueError, Exception):
            pass  # non-fatal — create ticket without parent

    issue = await jira.create_issue(
        project_key=settings.JIRA_TICKET_PROJECT_KEY,
        issue_type=body.type,
        summary=summary,
        description=description,
        labels=labels,
        parent_key=parent_key,
    )

    await jira.add_issue_to_sprint(sprint_id=body.sprint_id, issue_key=issue.key)

    now = datetime.now(UTC)
    run_record = await jira_ticket_run_crud.create(
        db,
        product=body.product,
        sprint=body.sprint,
        type=body.type,
        summary=summary,
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
