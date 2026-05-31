from pydantic import BaseModel


class JiraVersionItem(BaseModel):
    id: str
    label: str


class JiraVersionListResponse(BaseModel):
    versions: list[JiraVersionItem]
