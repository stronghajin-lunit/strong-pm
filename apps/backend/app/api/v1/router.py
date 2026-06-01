from fastapi import APIRouter

from app.api.v1.endpoints import (
    deployments,
    health,
    jira_tickets,
    jira_versions,
    release_notes,
    sprint_reports,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(jira_versions.router, prefix="/jira-versions", tags=["jira-versions"])
api_router.include_router(release_notes.router, prefix="/release-notes", tags=["release-notes"])
api_router.include_router(deployments.router, prefix="/deployments", tags=["deployments"])
api_router.include_router(jira_tickets.router, prefix="/jira-tickets", tags=["jira-tickets"])
api_router.include_router(sprint_reports.router, prefix="/sprint-reports", tags=["sprint-reports"])
