"""Runtime AI model configuration.

Stores per-feature model overrides in memory.
Defaults come from environment settings; overrides are loaded from DB on startup.
"""

from app.core.config import settings

AVAILABLE_MODELS: list[str] = [
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
]

FEATURE_KEYS: list[str] = [
    "prd_writer",
    "feature_list_writer",
    "jira_ticket_writer",
    "sprint_report_creator",
    "release_note_creator",
    "project_context_sync",
    "slack_qa_summary",
]

FEATURE_LABELS: dict[str, str] = {
    "prd_writer": "PRD Writer",
    "feature_list_writer": "Feature List Writer",
    "jira_ticket_writer": "Jira Ticket Writer",
    "sprint_report_creator": "Sprint Report Creator",
    "release_note_creator": "Release Note Creator",
    "project_context_sync": "Project Context Sync",
    "slack_qa_summary": "Slack Q&A Summary",
}

FEATURE_DEFAULTS: dict[str, str] = {
    "prd_writer": settings.AI_MODEL,
    "feature_list_writer": settings.AI_MODEL,
    "jira_ticket_writer": settings.AI_MODEL,
    "sprint_report_creator": settings.AI_MODEL,
    "release_note_creator": settings.AI_MODEL,
    "project_context_sync": settings.AI_MODEL,
    "slack_qa_summary": settings.AI_MODEL_FAST,
}

_overrides: dict[str, str] = {}


def get_model(feature_key: str) -> str:
    return _overrides.get(feature_key, FEATURE_DEFAULTS[feature_key])


def set_all_overrides(overrides: dict[str, str]) -> None:
    _overrides.clear()
    _overrides.update(overrides)
