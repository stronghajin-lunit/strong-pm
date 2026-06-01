"""Unit tests for the real Jira HTTP client (app.integrations.jira).

Uses respx to mock the httpx transport, so no network or live Jira is needed.
"""

import httpx
import pytest
import respx

from app.core.config import settings
from app.integrations import jira
from app.integrations.jira import JiraIntegrationError, JiraTicketData, JiraVersionData

BASE = "https://jira.test"


@pytest.fixture(autouse=True)
async def configure_jira(monkeypatch: pytest.MonkeyPatch):
    """Configure credentials and reset the shared client around each test."""
    monkeypatch.setattr(settings, "JIRA_BASE_URL", BASE)
    monkeypatch.setattr(settings, "JIRA_EMAIL", "bot@example.com")
    monkeypatch.setattr(settings, "JIRA_API_TOKEN", "secret-token")
    monkeypatch.setattr(settings, "JIRA_PROJECT_KEYS", "RAD")
    await jira.aclose()
    yield
    await jira.aclose()


class TestFetchFixVersions:
    @respx.mock
    @pytest.mark.asyncio
    async def test_paginates_and_maps_skipping_archived(self) -> None:
        """Pages until isLast, maps id/name, and drops archived versions."""
        route = respx.get(f"{BASE}/rest/api/3/project/RAD/version")
        route.side_effect = [
            httpx.Response(
                200,
                json={
                    "values": [
                        {"id": 10042, "name": "RAD 1.0"},
                        {"id": 10043, "name": "RAD 1.1", "archived": True},
                    ],
                    "isLast": False,
                },
            ),
            httpx.Response(
                200,
                json={"values": [{"id": 10044, "name": "RAD 1.2"}], "isLast": True},
            ),
        ]

        versions = await jira.fetch_fix_versions()

        assert versions == [
            JiraVersionData("10042", "RAD 1.0", versions[0].synced_at),
            JiraVersionData("10044", "RAD 1.2", versions[1].synced_at),
        ]

    @respx.mock
    @pytest.mark.asyncio
    async def test_auth_failure_raises(self) -> None:
        """A 401 from Jira surfaces as JiraIntegrationError (not swallowed)."""
        respx.get(f"{BASE}/rest/api/3/project/RAD/version").mock(
            return_value=httpx.Response(401, json={"message": "unauthorized"})
        )

        with pytest.raises(JiraIntegrationError):
            await jira.fetch_fix_versions()

    @respx.mock
    @pytest.mark.asyncio
    async def test_network_error_raises(self) -> None:
        """A transport timeout surfaces as JiraIntegrationError."""
        respx.get(f"{BASE}/rest/api/3/project/RAD/version").mock(
            side_effect=httpx.ConnectTimeout("timed out")
        )

        with pytest.raises(JiraIntegrationError):
            await jira.fetch_fix_versions()


class TestFetchTicketsByVersion:
    @respx.mock
    @pytest.mark.asyncio
    async def test_maps_key_and_summary(self) -> None:
        """Known version → issues mapped to (key, summary)."""
        respx.get(f"{BASE}/rest/api/3/version/10042").mock(
            return_value=httpx.Response(200, json={"id": "10042", "name": "RAD 1.0"})
        )
        respx.get(f"{BASE}/rest/api/3/search/jql").mock(
            return_value=httpx.Response(
                200,
                json={
                    "issues": [
                        {"key": "RAD-1", "fields": {"summary": "First"}},
                        {"key": "RAD-2", "fields": {"summary": "Second"}},
                    ],
                    "isLast": True,
                },
            )
        )

        tickets = await jira.fetch_tickets_by_version("10042")

        assert tickets == [
            JiraTicketData("RAD-1", "First"),
            JiraTicketData("RAD-2", "Second"),
        ]

    @respx.mock
    @pytest.mark.asyncio
    async def test_unknown_version_returns_none(self) -> None:
        """Unknown version id (404 on /version/{id}) → None (→ 404 in services)."""
        respx.get(f"{BASE}/rest/api/3/version/999").mock(
            return_value=httpx.Response(404, json={"errorMessages": ["not found"]})
        )

        assert await jira.fetch_tickets_by_version("999") is None

    @respx.mock
    @pytest.mark.asyncio
    async def test_existing_version_no_issues_returns_empty(self) -> None:
        """Version exists but has no issues → empty list (not None)."""
        respx.get(f"{BASE}/rest/api/3/version/10042").mock(
            return_value=httpx.Response(200, json={"id": "10042"})
        )
        respx.get(f"{BASE}/rest/api/3/search/jql").mock(
            return_value=httpx.Response(200, json={"issues": [], "isLast": True})
        )

        assert await jira.fetch_tickets_by_version("10042") == []
