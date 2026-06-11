from typing import Literal

from pydantic import BaseModel


class SourceConfig(BaseModel):
    position: Literal["beginning", "middle", "end"] = "middle"
    char_limit: int = 3000


class ContextConfig(BaseModel):
    project_summary: SourceConfig = SourceConfig(position="beginning", char_limit=1500)
    prd_pages: SourceConfig = SourceConfig(position="middle", char_limit=10000)
    reference_docs: SourceConfig = SourceConfig(position="end", char_limit=10000)


class FeatureListRunRequest(BaseModel):
    project_id: str
    prd_page_url: str
    feature_list_page_url: str
    reference_urls: list[str] = []
    context_config: ContextConfig = ContextConfig()


class FeatureListRunResponse(BaseModel):
    id: str
    project_id: str | None
    project_name: str
    prd_page_url: str
    feature_list_page_url: str
    requested_at: str
    completed_at: str | None
    status: str
    confluence_url: str | None
    feature_count: int | None


class FeatureListRunListResponse(BaseModel):
    runs: list[FeatureListRunResponse]


class ApplyCommentsRequest(BaseModel):
    feature_list_page_url: str


class ChangeDetail(BaseModel):
    action: str  # "update" or "delete"
    feature_id: str
    feature_name: str
    changes: dict[str, str] = {}


class ApplyCommentsResponse(BaseModel):
    changes_applied: int
    comments_resolved: int
    confluence_url: str
    change_details: list[ChangeDetail]


class ApplyLogEntry(BaseModel):
    id: int
    applied_at: str
    changes_applied: int
    comments_resolved: int
    confluence_url: str
    change_details: list[ChangeDetail]


class ApplyLogListResponse(BaseModel):
    logs: list[ApplyLogEntry]
