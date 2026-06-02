from pydantic import BaseModel

VALID_STATUSES = {"not_started", "planning", "active", "done", "archived"}


class ProjectCreateRequest(BaseModel):
    name: str
    epic_link: str | None = None
    confluence_link: str | None = None
    product_ids: list[int]
    background: str | None = None
    hlr: str | None = None


class ProjectUpdateRequest(BaseModel):
    name: str | None = None
    status: str | None = None
    workflow_step: int | None = None
    background: str | None = None
    hlr: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None
    status: str
    epic_link: str | None
    epic_key: str | None
    confluence_link: str | None
    workflow_step: int
    background: str | None
    hlr: str | None
    product_names: list[str]
    updated_at: str


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]


class ProjectContextResponse(BaseModel):
    project_id: str
    context: str | None
    synced_at: str | None
    page_count: int


class SyncStatusResponse(BaseModel):
    status: str
    message: str
