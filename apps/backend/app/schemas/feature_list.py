from pydantic import BaseModel


class FeatureListRunRequest(BaseModel):
    project_id: str
    prd_page_url: str
    feature_list_page_url: str


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
