from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product


async def list_all(db: AsyncSession) -> list[Product]:
    result = await db.execute(select(Product).order_by(Product.id))
    return list(result.scalars().all())


async def get_by_ids(db: AsyncSession, ids: list[int]) -> list[Product]:
    result = await db.execute(select(Product).where(Product.id.in_(ids)))
    return list(result.scalars().all())
