from pydantic import BaseModel

VALID_PRODUCTS = {"ODM", "Annotation Admin", "Annotation Tool"}
VALID_ISSUE_TYPES = {"Task", "Bug"}


class JiraTicketRunRequest(BaseModel):
    product: str
    sprint_id: int
    sprint: str
    type: str
    feature_description: str
    definition_of_done: str


class JiraTicketRunResponse(BaseModel):
    id: str
    summary: str
    product: str
    sprint: str
    type: str
    requested_at: str
    status: str
    jira_url: str | None


class JiraTicketListResponse(BaseModel):
    tickets: list[JiraTicketRunResponse]


class JiraSprintResponse(BaseModel):
    sprint_id: int
    label: str
    state: str


class JiraSprintListResponse(BaseModel):
    sprints: list[JiraSprintResponse]
