import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feature_list_apply_log import FeatureListApplyLog


async def create(
    db: AsyncSession,
    run_id: int | None,
    feature_list_page_url: str,
    applied_at: datetime,
    changes_applied: int,
    comments_resolved: int,
    confluence_url: str,
    change_details: list[dict],
) -> FeatureListApplyLog:
    log = FeatureListApplyLog(
        feature_list_run_id=run_id,
        feature_list_page_url=feature_list_page_url,
        applied_at=applied_at,
        changes_applied=changes_applied,
        comments_resolved=comments_resolved,
        confluence_url=confluence_url,
        change_details=json.dumps(change_details, ensure_ascii=False),
    )
    db.add(log)
    await db.flush()
    return log


async def list_by_page_url(db: AsyncSession, feature_list_page_url: str) -> list[FeatureListApplyLog]:
    result = await db.execute(
        select(FeatureListApplyLog)
        .where(FeatureListApplyLog.feature_list_page_url == feature_list_page_url)
        .order_by(FeatureListApplyLog.applied_at.desc())
    )
    return list(result.scalars().all())
