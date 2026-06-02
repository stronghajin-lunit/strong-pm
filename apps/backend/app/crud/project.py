from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectContext, ProjectProduct


async def create(
    db: AsyncSession,
    name: str,
    epic_link: str | None,
    epic_key: str | None,
    confluence_link: str | None,
    confluence_page_id: str | None,
    background: str | None,
    hlr: str | None,
) -> Project:
    project = Project(
        name=name,
        epic_link=epic_link,
        epic_key=epic_key,
        confluence_link=confluence_link,
        confluence_page_id=confluence_page_id,
        background=background,
        hlr=hlr,
    )
    db.add(project)
    await db.flush()
    return project


async def add_products(db: AsyncSession, project_id: int, product_ids: list[int]) -> None:
    for pid in product_ids:
        db.add(ProjectProduct(project_id=project_id, product_id=pid))
    await db.flush()


async def list_all(db: AsyncSession) -> list[Project]:
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, project_id: int) -> Project | None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()


async def get_product_names(db: AsyncSession, project_id: int) -> list[str]:
    from app.models.product import Product

    stmt = (
        select(Product.name)
        .join(ProjectProduct, Product.id == ProjectProduct.product_id)
        .where(ProjectProduct.project_id == project_id)
        .order_by(Product.id)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def update(db: AsyncSession, project: Project, **kwargs: Any) -> Project:
    for key, val in kwargs.items():
        if val is not None:
            setattr(project, key, val)
    await db.flush()
    return project


# ─── ProjectContext ───────────────────────────────────────────────────────────

async def get_context(db: AsyncSession, project_id: int) -> ProjectContext | None:
    result = await db.execute(
        select(ProjectContext).where(ProjectContext.project_id == project_id)
    )
    return result.scalar_one_or_none()


async def upsert_context(
    db: AsyncSession,
    project_id: int,
    context: str,
    page_cache: dict[str, Any],
) -> ProjectContext:
    existing = await get_context(db, project_id)
    now = datetime.now(UTC)
    if existing:
        existing.context = context
        existing.page_cache = page_cache
        existing.synced_at = now
        await db.flush()
        return existing
    ctx = ProjectContext(
        project_id=project_id,
        context=context,
        page_cache=page_cache,
        synced_at=now,
    )
    db.add(ctx)
    await db.flush()
    return ctx


async def delete_context(db: AsyncSession, project_id: int) -> None:
    await db.execute(
        delete(ProjectContext).where(ProjectContext.project_id == project_id)
    )
