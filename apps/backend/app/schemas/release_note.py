from pydantic import BaseModel

VALID_CONFLUENCE_PAGES = {"odm", "annotation"}


class ReleaseNoteRunRequest(BaseModel):
    jira_version_id: str
    confluence_page: str


class ReleaseNoteResponse(BaseModel):
    id: str
    jira_version: str
    confluence_location: str
    requested_at: str
    completed_at: str | None
    status: str
    confluence_url: str | None


class ReleaseNoteListResponse(BaseModel):
    notes: list[ReleaseNoteResponse]
