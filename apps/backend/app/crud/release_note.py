from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.release_note import ReleaseNote, ReleaseNoteTicket


async def create(
    db: AsyncSession,
    jira_version_id: int,
    confluence_page: str,
    confluence_location: str,
    confluence_url: str | None,
    status: str,
    requested_at: datetime,
    completed_at: datetime | None,
) -> ReleaseNote:
    note = ReleaseNote(
        jira_version_id=jira_version_id,
        confluence_page=confluence_page,
        confluence_location=confluence_location,
        confluence_url=confluence_url,
        status=status,
        requested_at=requested_at,
        completed_at=completed_at,
    )
    db.add(note)
    await db.flush()
    return note


async def add_tickets(
    db: AsyncSession,
    release_note_id: int,
    jira_ticket_ids: list[int],
) -> None:
    if not jira_ticket_ids:
        return
    rows = [{"release_note_id": release_note_id, "jira_ticket_id": tid} for tid in jira_ticket_ids]
    stmt = pg_insert(ReleaseNoteTicket).values(rows).on_conflict_do_nothing()
    await db.execute(stmt)


async def list_all(db: AsyncSession) -> list[ReleaseNote]:
    result = await db.execute(select(ReleaseNote).order_by(ReleaseNote.id.desc()))
    return list(result.scalars().all())
