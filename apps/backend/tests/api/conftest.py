"""Stub the Jira and Confluence integrations for API tests.

API tests exercise service/endpoint behaviour, not the Atlassian wire formats, so
we replace the integration coroutines with deterministic fakes. The real HTTP code
is covered separately by tests/integration/test_{jira,confluence}_client.py.

This conftest applies only to tests under tests/api/, so the integration tests
still call the real functions.
"""

from datetime import UTC, datetime

import pytest

from app.core.config import settings
from app.integrations import ai as ai_integration
from app.integrations import confluence as confluence_integration
from app.integrations import jira as jira_integration
from app.integrations.ai import JiraTicketAction, ReleaseNoteContent
from app.integrations.confluence import ConfluencePublishResult
from app.integrations.jira import JiraIssueResult, JiraSprintData, JiraTicketData, JiraVersionData

_SYNCED_AT = datetime(2026, 4, 1, tzinfo=UTC)

_STUB_VERSIONS: list[JiraVersionData] = [
    JiraVersionData("aicp-0401", "AICP Monthly 26-04-01", _SYNCED_AT),
    JiraVersionData("odm-0401", "ODM Monthly 26-04-01", _SYNCED_AT),
    JiraVersionData("aicp-0301", "AICP Monthly 26-03-01", _SYNCED_AT),
]

_STUB_TICKETS: dict[str, list[tuple[str, str]]] = {
    "aicp-0401": [
        ("RAD-9372", "Add annotation batch export"),
        ("RAD-9362", "Fix label rendering on retina display"),
        ("RAD-9100", "Payment gateway webhook handler"),
        ("RAD-9241", "Refactor dataset pipeline"),
        ("RAD-9242", "Improve model inference latency"),
        ("RAD-9300", "Add multi-language support"),
    ],
    "odm-0401": [
        ("ODM-1001", "Export DICOM metadata to CSV"),
        ("ODM-1002", "Fix pagination bug in study list"),
        ("ODM-1003", "Update study sharing permissions"),
    ],
    "aicp-0301": [
        ("RAD-8900", "Integrate new AI model v3"),
        ("RAD-8901", "Fix timeout on large image load"),
        ("RAD-8902", "Add audit log for admin actions"),
    ],
}


@pytest.fixture(autouse=True)
def stub_jira(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fetch_fix_versions() -> list[JiraVersionData]:
        return list(_STUB_VERSIONS)

    async def _fetch_tickets_by_version(jira_version_id: str) -> list[JiraTicketData] | None:
        rows = _STUB_TICKETS.get(jira_version_id)
        if rows is None:
            return None
        return [JiraTicketData(ticket_id, title) for ticket_id, title in rows]

    monkeypatch.setattr(jira_integration, "fetch_fix_versions", _fetch_fix_versions)
    monkeypatch.setattr(jira_integration, "fetch_tickets_by_version", _fetch_tickets_by_version)


@pytest.fixture(autouse=True)
def stub_confluence(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _publish_release_note(
        confluence_page: str, jira_version_label: str, content: str, jira_version_id: str = ""
    ) -> ConfluencePublishResult:
        return ConfluencePublishResult(
            confluence_location=f"AIP / {jira_version_label} Release Note",
            confluence_url="https://example.atlassian.net/wiki/spaces/AIP/pages/12345",
        )

    monkeypatch.setattr(confluence_integration, "publish_release_note", _publish_release_note)


@pytest.fixture(autouse=True)
def stub_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _generate_release_note(
        jira_version_label: str, tickets: list[JiraTicketData]
    ) -> ReleaseNoteContent:
        lines = "\n".join(f"- {t.ticket_id}: {t.title}" for t in tickets)
        return ReleaseNoteContent(body=f"## {jira_version_label}\n\n### Changes\n\n{lines}\n")

    async def _generate_ticket_action(feature_description: str) -> JiraTicketAction:
        return JiraTicketAction(action="Add License Field to Block Registration Form")

    monkeypatch.setattr(ai_integration, "generate_release_note", _generate_release_note)
    monkeypatch.setattr(ai_integration, "generate_ticket_action", _generate_ticket_action)


_STUB_SPRINTS: list[JiraSprintData] = [
    JiraSprintData(sprint_id=101, label="Onco Sprint 79", state="active"),
    JiraSprintData(sprint_id=100, label="Onco Sprint 78", state="future"),
]

_STUB_ISSUE = JiraIssueResult(key="RAD-9999", url="https://lunit.atlassian.net/browse/RAD-9999")


@pytest.fixture(autouse=True)
def stub_jira_ticket_writer(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _create_issue(
        project_key: str,
        issue_type: str,
        summary: str,
        description: str,
        labels: list[str] | None = None,
    ) -> JiraIssueResult:
        return _STUB_ISSUE

    async def _fetch_sprints(board_id: int) -> list[JiraSprintData]:
        return list(_STUB_SPRINTS)

    async def _add_issue_to_sprint(sprint_id: int, issue_key: str) -> None:
        return None

    monkeypatch.setattr(jira_integration, "create_issue", _create_issue)
    monkeypatch.setattr(jira_integration, "fetch_sprints", _fetch_sprints)
    monkeypatch.setattr(jira_integration, "add_issue_to_sprint", _add_issue_to_sprint)
    # Provide a board ID for "ODM" so the service doesn't 502
    monkeypatch.setattr(settings, "JIRA_BOARD_IDS", "ODM=42,Annotation Admin=43,Annotation Tool=44")
