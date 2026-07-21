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
from app.integrations.github import GithubDeploymentResult, GithubTicketRow
from app.integrations.jira import (
    JiraIssueResult,
    JiraSprintData,
    JiraTicketData,
    JiraVersionData,
    SprintIssueData,
)
from app.services import deployment_service

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


_GITHUB_REPO_MAP: dict[str, list[str]] = {
    "aicp-0401": [
        "scope-dp-console (v4.8.0)",
        "scope-annotation-tool-front (v4.7.0)",
    ],
    "odm-0401": [
        "scope-odm-backend (v2.3.1)",
    ],
    "aicp-0301": [
        "scope-dp-console (v4.7.0)",
    ],
}

_GITHUB_STATUS_MAP: dict[str, tuple[str | None, bool | None, str]] = {
    "RAD-9372": (None, None, "no_pr"),
    "RAD-9362": (None, None, "no_pr"),
    "RAD-9100": ("#1801", True, "deployed_this"),
    "RAD-9241": ("#1790", True, "unregistered"),
    "RAD-9242": ("#1792", True, "unregistered"),
    "RAD-9300": ("#1805", True, "deployed_this"),
    "ODM-1001": ("#301", True, "deployed_this"),
    "ODM-1002": ("#302", True, "deployed_this"),
    "ODM-1003": (None, None, "no_pr"),
    "RAD-8900": ("#1750", True, "deployed_this"),
    "RAD-8901": ("#1751", True, "deployed_this"),
    "RAD-8902": ("#1752", True, "deployed_prev"),
}


@pytest.fixture(autouse=True)
def stub_github(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fetch_deployment_data(
        jira_version_id: str,
        ticket_ids: list[str],
        version_date: datetime | None = None,
    ) -> GithubDeploymentResult:
        rows: list[GithubTicketRow] = []
        no_pr: list[str] = []
        unregistered: list[str] = []

        for tid in ticket_ids:
            pr, merged, status = _GITHUB_STATUS_MAP.get(tid, (None, None, "no_pr"))
            rows.append(GithubTicketRow(ticket_id=tid, pr=pr, merged=merged, status=status))
            if status == "no_pr":
                no_pr.append(tid)
            elif status == "unregistered":
                unregistered.append(tid)

        return GithubDeploymentResult(
            repos=_GITHUB_REPO_MAP.get(jira_version_id, ["unknown-repo (v0.0.0)"]),
            no_pr_tickets=no_pr,
            unregistered_pr_tickets=unregistered,
            unregistered_breakdown_needed=len(unregistered) - 1 if len(unregistered) > 1 else None,
            unregistered_breakdown_not_needed=1 if len(unregistered) > 1 else None,
            unregistered_breakdown_no_ticket=1 if len(unregistered) > 0 else None,
            ticket_rows=rows,
        )

    monkeypatch.setattr(deployment_service, "fetch_deployment_data", _fetch_deployment_data)


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

    async def _generate_ticket_description(
        feature_description: str, definition_of_done: str, issue_type: str
    ) -> str:
        return (
            "Context\n"
            "Add a license field to the block registration form so users can associate "
            "a license with each block.\n\n"
            "DoD\n"
            "- [ ] License dropdown is displayed on the block registration form\n"
            "- [ ] Selected license_id is sent to POST /api/v1/blocks"
        )

    monkeypatch.setattr(ai_integration, "generate_release_note", _generate_release_note)
    monkeypatch.setattr(ai_integration, "generate_ticket_action", _generate_ticket_action)
    monkeypatch.setattr(
        ai_integration, "generate_ticket_description", _generate_ticket_description
    )


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
    monkeypatch.setattr(settings, "JIRA_BOARD_IDS", "ODM=42,Annotation Admin=43,Annotation Tool=44")


_STUB_SPRINT_ISSUES: list[SprintIssueData] = [
    SprintIssueData(
        key="RAD-100", summary="Build TMA Registration Page",
        issue_type="Story", status="Done",
        assignee_name="Hajin Lee", story_points=3.0,
        epic_key="RAD-90", epic_summary="TMA Module",
    ),
    SprintIssueData(
        key="RAD-101", summary="Add license field to block form",
        issue_type="Task", status="Done",
        assignee_name="Yiseul Kwon", story_points=2.0,
        epic_key="RAD-90", epic_summary="TMA Module",
    ),
]


@pytest.fixture(autouse=True)
def stub_sprint_report(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fetch_sprint_issues(sprint_id: int) -> list[SprintIssueData]:
        return list(_STUB_SPRINT_ISSUES)

    async def _resolve_initiative_from_epic(epic_key: str) -> str | None:
        return "[Onco] Core Platform"

    async def _fetch_page_storage(page_id: str) -> str:
        return "<table><tbody><tr><td>Example</td></tr></tbody></table>"

    async def _generate_sprint_report(
        sprint_label: str,
        week_number: int,
        grouped_data: list[dict],
        total_sp: float,
        example_page_storage: str,
    ) -> str:
        return "<table><tbody><tr><td>Core Platform</td><td>TMA Module</td></tr></tbody></table>"

    async def _update_sprint_report(page_id: str, content_storage: str) -> object:
        from app.integrations.confluence import ConfluencePublishResult
        return ConfluencePublishResult(
            confluence_location="AIP / Week19 Sprint 80 Report",
            confluence_url="https://example.atlassian.net/wiki/spaces/AIP/pages/99999",
        )

    monkeypatch.setattr(jira_integration, "fetch_sprint_issues", _fetch_sprint_issues)
    monkeypatch.setattr(
        jira_integration, "resolve_initiative_from_epic", _resolve_initiative_from_epic
    )
    monkeypatch.setattr(confluence_integration, "fetch_page_storage", _fetch_page_storage)
    monkeypatch.setattr(ai_integration, "generate_sprint_report", _generate_sprint_report)
    monkeypatch.setattr(confluence_integration, "update_sprint_report", _update_sprint_report)
    monkeypatch.setattr(settings, "JIRA_SPRINT_BOARD_ID", 324)
