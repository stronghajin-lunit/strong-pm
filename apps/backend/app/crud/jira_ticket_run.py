from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.jira_ticket_run import JiraTicketRun


async def create(
    db: AsyncSession,
    product: str,
    sprint: str,
    type: str,
    summary: str,
    status: str,
    jira_url: str | None,
    requested_at: datetime,
) -> JiraTicketRun:
    run = JiraTicketRun(
        product=product,
        sprint=sprint,
        type=type,
        summary=summary,
        status=status,
        jira_url=jira_url,
        requested_at=requested_at,
    )
    db.add(run)
    await db.flush()
    return run


async def list_all(db: AsyncSession) -> list[JiraTicketRun]:
    result = await db.execute(select(JiraTicketRun).order_by(JiraTicketRun.id.desc()))
    return list(result.scalars().all())
