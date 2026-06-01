from pydantic import BaseModel


class SprintReportRunRequest(BaseModel):
    sprint_id: int
    sprint_number: int
    sprint_label: str
    confluence_page_url: str  # URL of the Confluence page to update
    sp_goal: int | None = None  # planned story point capacity; used for completion rate


class SprintReportResponse(BaseModel):
    id: str
    sprint_label: str
    requested_at: str
    completed_at: str | None
    status: str
    confluence_url: str | None


class SprintReportListResponse(BaseModel):
    reports: list[SprintReportResponse]


class SprintOptionResponse(BaseModel):
    sprint_id: int
    sprint_number: int
    label: str
    status: str


class SprintOptionListResponse(BaseModel):
    sprints: list[SprintOptionResponse]
