from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.jira_ticket import JiraTicket


async def upsert_many(
    db: AsyncSession,
    tickets: list[tuple[str, str]],
) -> dict[str, int]:
    """Upsert list of (ticket_id, title). Returns {ticket_id: db_id}."""
    if not tickets:
        return {}

    now = datetime.now(timezone.utc)
    rows = [{"ticket_id": tid, "title": title, "updated_at": now} for tid, title in tickets]
    stmt = (
        insert(JiraTicket)
        .values(rows)
        .on_conflict_do_update(
            index_elements=["ticket_id"],
            set_={
                "title": insert(JiraTicket).excluded.title,
                "updated_at": insert(JiraTicket).excluded.updated_at,
            },
        )
        .returning(JiraTicket.ticket_id, JiraTicket.id)
    )
    result = await db.execute(stmt)
    return {row.ticket_id: row.id for row in result.all()}


async def get_by_ticket_ids(db: AsyncSession, ticket_ids: list[str]) -> dict[str, int]:
    """Returns {ticket_id: db_id} for existing records."""
    result = await db.execute(select(JiraTicket).where(JiraTicket.ticket_id.in_(ticket_ids)))
    return {t.ticket_id: t.id for t in result.scalars().all()}
