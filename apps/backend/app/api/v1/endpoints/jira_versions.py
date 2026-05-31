from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.jira_version import JiraVersionListResponse
from app.services import jira_version_service

router = APIRouter()


@router.get("", response_model=JiraVersionListResponse)
async def list_jira_versions(db: AsyncSession = Depends(get_db)) -> JiraVersionListResponse:
    return await jira_version_service.list_versions(db)
