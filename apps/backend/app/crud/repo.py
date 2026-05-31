from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repo import Repo


async def upsert_many(db: AsyncSession, names: list[str]) -> dict[str, int]:
    """Upsert repos by name. Returns {name: db_id}."""
    if not names:
        return {}

    now = datetime.now(timezone.utc)
    rows = [{"name": name, "created_at": now, "updated_at": now} for name in names]
    stmt = (
        insert(Repo)
        .values(rows)
        .on_conflict_do_update(
            index_elements=["name"],
            set_={"updated_at": insert(Repo).excluded.updated_at},
        )
        .returning(Repo.name, Repo.id)
    )
    result = await db.execute(stmt)
    return {row.name: row.id for row in result.all()}
