"""Stub the Jira and Confluence integrations for API tests.

API tests exercise service/endpoint behaviour, not the Atlassian wire formats, so
we replace the integration coroutines with deterministic fakes. The real HTTP code
is covered separately by tests/integration/test_{jira,confluence}_client.py.

This conftest applies only to tests under tests/api/, so the integration tests
still call the real functions.
"""

from datetime import datetime, timezone

import pytest

from app.integrations import confluence as confluence_integration
from app.integrations import jira as jira_integration
from app.integrations.confluence import ConfluencePublishResult
from app.integrations.jira import JiraTicketData, JiraVersionData

_SYNCED_AT = datetime(2026, 4, 1, tzinfo=timezone.utc)

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
        confluence_page: str, jira_version_label: str, content: str
    ) -> ConfluencePublishResult:
        return ConfluencePublishResult(
            confluence_location=f"AIP / {jira_version_label} Release Note",
            confluence_url="https://example.atlassian.net/wiki/spaces/AIP/pages/12345",
        )

    monkeypatch.setattr(confluence_integration, "publish_release_note", _publish_release_note)
