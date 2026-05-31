from fastapi import APIRouter

from app.api.v1.endpoints import deployments, health, jira_versions, release_notes

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(jira_versions.router, prefix="/jira-versions", tags=["jira-versions"])
api_router.include_router(release_notes.router, prefix="/release-notes", tags=["release-notes"])
api_router.include_router(deployments.router, prefix="/deployments", tags=["deployments"])
