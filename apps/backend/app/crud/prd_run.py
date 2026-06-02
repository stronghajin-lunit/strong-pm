from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prd_run import PrdRun


async def create(
    db: AsyncSession,
    project_id: int | None,
    project_name: str,
    target_team: str,
    kickoff_url: str,
    prd_page_url: str,
    prd_page_id: str | None,
    requested_at: datetime,
) -> PrdRun:
    run = PrdRun(
        project_id=project_id,
        project_name=project_name,
        target_team=target_team,
        kickoff_url=kickoff_url,
        prd_page_url=prd_page_url,
        prd_page_id=prd_page_id,
        status="running",
        requested_at=requested_at,
    )
    db.add(run)
    await db.flush()
    return run


async def complete(
    db: AsyncSession,
    run: PrdRun,
    confluence_url: str,
    completed_at: datetime,
) -> PrdRun:
    run.status = "done"
    run.confluence_url = confluence_url
    run.completed_at = completed_at
    await db.flush()
    return run


async def fail(db: AsyncSession, run: PrdRun) -> PrdRun:
    run.status = "error"
    await db.flush()
    return run


async def list_all(db: AsyncSession) -> list[PrdRun]:
    result = await db.execute(select(PrdRun).order_by(PrdRun.id.desc()))
    return list(result.scalars().all())
