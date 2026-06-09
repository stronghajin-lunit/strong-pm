from pydantic import BaseModel


class SlackQaItemCreate(BaseModel):
    slack_channel_id: str
    slack_channel_name: str
    slack_message_ts: str
    slack_message_url: str
    sender_name: str
    question: str
    answer: str
    answer_date: str
    ai_project_id: int | None = None


class SlackQaItemResponse(BaseModel):
    id: int
    slack_channel_id: str
    slack_channel_name: str
    slack_message_ts: str
    slack_message_url: str
    sender_name: str
    question: str
    answer: str
    answer_date: str
    ai_project_id: int | None
    linked_project_id: int | None
    archived: bool

    model_config = {"from_attributes": True}


class SlackQaItemListResponse(BaseModel):
    items: list[SlackQaItemResponse]


class SlackQaLinkRequest(BaseModel):
    project_id: int | None


class SlackQaLastSyncedResponse(BaseModel):
    last_message_ts: str | None
