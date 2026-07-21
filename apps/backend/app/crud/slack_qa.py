from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.slack_qa_item import SlackQaItem


async def create(db: AsyncSession, **kwargs: object) -> SlackQaItem:
    item = SlackQaItem(**kwargs)
    db.add(item)
    await db.flush()
    return item


async def list_all(db: AsyncSession) -> list[SlackQaItem]:
    result = await db.execute(select(SlackQaItem).order_by(SlackQaItem.id.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, item_id: int) -> SlackQaItem | None:
    result = await db.execute(select(SlackQaItem).where(SlackQaItem.id == item_id))
    return result.scalar_one_or_none()


async def exists_by_ts(db: AsyncSession, message_ts: str) -> bool:
    result = await db.execute(
        select(SlackQaItem.id).where(SlackQaItem.slack_message_ts == message_ts)
    )
    return result.scalar_one_or_none() is not None


async def get_latest_message_ts(db: AsyncSession) -> str | None:
    """Return the slack_message_ts of the most recently synced item."""
    result = await db.execute(
        select(SlackQaItem.slack_message_ts).order_by(SlackQaItem.slack_message_ts.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def update_link(db: AsyncSession, item: SlackQaItem, project_id: int | None) -> SlackQaItem:
    item.linked_project_id = project_id
    await db.flush()
    return item


async def archive(db: AsyncSession, item: SlackQaItem) -> SlackQaItem:
    item.archived = True
    await db.flush()
    return item


async def delete(db: AsyncSession, item: SlackQaItem) -> None:
    await db.delete(item)
    await db.flush()
