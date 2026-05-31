from pydantic import BaseModel


class DeploymentRunRequest(BaseModel):
    jira_version_id: str


class DeploymentStats(BaseModel):
    total: int
    with_pr: int
    no_pr: int
    merged: int
    deployed_this: int
    deployed_prev: int
    unregistered_prs: int


class UnregisteredBreakdown(BaseModel):
    needed: int
    not_needed: int
    no_ticket: int


class TicketRow(BaseModel):
    id: str
    title: str
    pr: str | None
    merged: bool | None
    status: str


class DeploymentDetailResponse(BaseModel):
    id: str
    version: str
    run_at: str
    stats: DeploymentStats
    repos: list[str]
    no_pr_tickets: list[str]
    unregistered_pr_tickets: list[str]
    unregistered_pr_breakdown: UnregisteredBreakdown | None
    ticket_rows: list[TicketRow]


class DeploymentSummary(BaseModel):
    id: str
    version: str
    run_at: str
    total: int
    deployed_this: int
    no_pr: int
    unregistered_prs: int


class DeploymentListResponse(BaseModel):
    deployments: list[DeploymentSummary]
