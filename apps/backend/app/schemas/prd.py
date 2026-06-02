from pydantic import BaseModel


class PrdRunRequest(BaseModel):
    project_id: str
    target_team: str
    kickoff_url: str
    prd_page_url: str


class PrdRunResponse(BaseModel):
    id: str
    project_id: str | None
    project_name: str
    target_team: str
    kickoff_url: str
    prd_page_url: str
    requested_at: str
    completed_at: str | None
    status: str
    confluence_url: str | None


class PrdRunListResponse(BaseModel):
    runs: list[PrdRunResponse]


class PrdTeamOption(BaseModel):
    key: str
    label: str
    description: str


class PrdTeamListResponse(BaseModel):
    teams: list[PrdTeamOption]
