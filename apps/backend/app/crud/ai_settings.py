from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_settings import AiSettings


async def get_all(db: AsyncSession) -> list[AiSettings]:
    result = await db.execute(select(AiSettings))
    return list(result.scalars().all())


async def upsert(db: AsyncSession, feature_key: str, model: str) -> AiSettings:
    result = await db.execute(select(AiSettings).where(AiSettings.feature_key == feature_key))
    row = result.scalar_one_or_none()
    if row:
        row.model = model
    else:
        row = AiSettings(feature_key=feature_key, model=model)
        db.add(row)
    await db.flush()
    return row
