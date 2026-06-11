from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feature_list_run import FeatureListRun


async def create(
    db: AsyncSession,
    project_id: int | None,
    project_name: str,
    prd_page_url: str,
    prd_page_id: str | None,
    feature_list_page_url: str,
    feature_list_page_id: str | None,
    requested_at: datetime,
) -> FeatureListRun:
    run = FeatureListRun(
        project_id=project_id,
        project_name=project_name,
        prd_page_url=prd_page_url,
        prd_page_id=prd_page_id,
        feature_list_page_url=feature_list_page_url,
        feature_list_page_id=feature_list_page_id,
        status="running",
        requested_at=requested_at,
    )
    db.add(run)
    await db.flush()
    return run


async def complete(
    db: AsyncSession,
    run: FeatureListRun,
    confluence_url: str,
    feature_count: int,
    completed_at: datetime,
) -> FeatureListRun:
    run.status = "done"
    run.confluence_url = confluence_url
    run.feature_count = feature_count
    run.completed_at = completed_at
    await db.flush()
    return run


async def fail(db: AsyncSession, run: FeatureListRun) -> FeatureListRun:
    run.status = "error"
    await db.flush()
    return run


async def list_all(db: AsyncSession) -> list[FeatureListRun]:
    result = await db.execute(select(FeatureListRun).order_by(FeatureListRun.id.desc()))
    return list(result.scalars().all())


async def find_latest_by_page_url(db: AsyncSession, feature_list_page_url: str) -> FeatureListRun | None:
    result = await db.execute(
        select(FeatureListRun)
        .where(FeatureListRun.feature_list_page_url == feature_list_page_url)
        .order_by(FeatureListRun.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
