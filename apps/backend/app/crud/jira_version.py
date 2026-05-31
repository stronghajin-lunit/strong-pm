from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.jira_version import JiraVersion


async def upsert_many(
    db: AsyncSession,
    versions: list[tuple[str, str, datetime]],
) -> list[JiraVersion]:
    """Upsert list of (jira_id, label, synced_at). Returns ordered list."""
    if not versions:
        return []

    rows = [{"jira_id": jid, "label": label, "synced_at": synced_at} for jid, label, synced_at in versions]
    stmt = (
        insert(JiraVersion)
        .values(rows)
        .on_conflict_do_update(
            index_elements=["jira_id"],
            set_={"label": insert(JiraVersion).excluded.label, "synced_at": insert(JiraVersion).excluded.synced_at},
        )
        .returning(JiraVersion)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, version_id: int) -> JiraVersion | None:
    result = await db.execute(select(JiraVersion).where(JiraVersion.id == version_id))
    return result.scalar_one_or_none()


async def get_by_jira_id(db: AsyncSession, jira_id: str) -> JiraVersion | None:
    result = await db.execute(select(JiraVersion).where(JiraVersion.jira_id == jira_id))
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession) -> list[JiraVersion]:
    result = await db.execute(select(JiraVersion).order_by(JiraVersion.synced_at.desc()))
    return list(result.scalars().all())
