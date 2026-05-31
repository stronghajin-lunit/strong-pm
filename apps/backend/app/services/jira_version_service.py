from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import jira_version as jira_version_crud
from app.integrations.jira import fetch_fix_versions
from app.schemas.jira_version import JiraVersionItem, JiraVersionListResponse


async def list_versions(db: AsyncSession) -> JiraVersionListResponse:
    raw = await fetch_fix_versions()
    await jira_version_crud.upsert_many(db, [(v.jira_id, v.label, v.synced_at) for v in raw])
    await db.commit()
    return JiraVersionListResponse(versions=[JiraVersionItem(id=v.jira_id, label=v.label) for v in raw])


async def resolve_version_label(jira_id: str) -> str:
    """Returns the label for a jira_id. Raises 404 if not found in mock data."""
    raw = await fetch_fix_versions()
    match = next((v for v in raw if v.jira_id == jira_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail={"code": "JIRA_VERSION_NOT_FOUND"})
    return match.label
