from pydantic import BaseModel


class JiraVersionItem(BaseModel):
    id: str
    label: str
    release_date: str | None = None


class JiraVersionListResponse(BaseModel):
    versions: list[JiraVersionItem]
