from fastapi import APIRouter

from app.api.v1.endpoints import (
    deployments,
    feature_list,
    health,
    jira_tickets,
    jira_versions,
    prd,
    products,
    projects,
    release_notes,
    sprint_reports,
    version_assignment,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(jira_versions.router, prefix="/jira-versions", tags=["jira-versions"])
api_router.include_router(release_notes.router, prefix="/release-notes", tags=["release-notes"])
api_router.include_router(deployments.router, prefix="/deployments", tags=["deployments"])
api_router.include_router(jira_tickets.router, prefix="/jira-tickets", tags=["jira-tickets"])
api_router.include_router(sprint_reports.router, prefix="/sprint-reports", tags=["sprint-reports"])
api_router.include_router(
    version_assignment.router, prefix="/version-assignment", tags=["version-assignment"]
)
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(prd.router, prefix="/prd", tags=["prd"])
api_router.include_router(feature_list.router, prefix="/feature-list", tags=["feature-list"])
