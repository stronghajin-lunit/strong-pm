from pydantic import BaseModel


class VersionOption(BaseModel):
    id: str
    name: str
    release_date: str | None


class VersionOptionListResponse(BaseModel):
    versions: list[VersionOption]


class UnversionedTicket(BaseModel):
    id: str
    summary: str
    status: str
    epic_id: str | None
    epic_name: str | None


class UnversionedTicketListResponse(BaseModel):
    tickets: list[UnversionedTicket]


class AssignVersionRequest(BaseModel):
    ticket_ids: list[str]
    version_id: str


class AssignVersionResult(BaseModel):
    succeeded: list[str]
    failed: list[str]
