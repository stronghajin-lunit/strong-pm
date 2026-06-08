from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sprint_report import SprintReport


async def create(
    db: AsyncSession,
    sprint_label: str,
    sprint_number: int,
    status: str,
    confluence_url: str | None,
    requested_at: datetime,
    completed_at: datetime | None,
) -> SprintReport:
    report = SprintReport(
        sprint_label=sprint_label,
        sprint_number=sprint_number,
        status=status,
        confluence_url=confluence_url,
        requested_at=requested_at,
        completed_at=completed_at,
    )
    db.add(report)
    await db.flush()
    return report


async def list_all(db: AsyncSession) -> list[SprintReport]:
    result = await db.execute(select(SprintReport).order_by(SprintReport.id.desc()))
    return list(result.scalars().all())
