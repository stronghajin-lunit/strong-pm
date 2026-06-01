"""Unit tests for the real Confluence HTTP client (app.integrations.confluence).

Uses respx to mock the httpx transport, so no network or live Confluence is needed.
"""

import httpx
import pytest
import respx

from app.core.config import settings
from app.integrations import confluence
from app.integrations.confluence import ConfluenceIntegrationError

BASE = "https://atlassian.test"
WIKI = f"{BASE}/wiki"


@pytest.fixture(autouse=True)
async def configure_confluence(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "JIRA_BASE_URL", BASE)
    monkeypatch.setattr(settings, "JIRA_EMAIL", "bot@example.com")
    monkeypatch.setattr(settings, "JIRA_API_TOKEN", "secret-token")
    monkeypatch.setattr(settings, "CONFLUENCE_SPACE_KEY", "AIP")
    monkeypatch.setattr(settings, "CONFLUENCE_ODM_PARENT_ID", "1001")
    monkeypatch.setattr(settings, "CONFLUENCE_ANNOTATION_PARENT_ID", "2002")
    await confluence.aclose()
    yield
    await confluence.aclose()


class TestPublishReleaseNote:
    @respx.mock
    @pytest.mark.asyncio
    async def test_creates_child_page_and_returns_url(self) -> None:
        """Resolves space id, posts a child page (date-prefixed title, metadata
        table, bold rendered), and builds the page URL."""
        respx.get(f"{WIKI}/api/v2/spaces").mock(
            return_value=httpx.Response(200, json={"results": [{"id": "555", "key": "AIP"}]})
        )
        create = respx.post(f"{WIKI}/api/v2/pages").mock(
            return_value=httpx.Response(
                200,
                json={"id": "999", "_links": {"webui": "/spaces/AIP/pages/999/Note"}},
            )
        )

        result = await confluence.publish_release_note(
            "annotation",
            "AICP Monthly 26-04-01",
            "# Highlights\n\nBig release.\n\n### New Features\n\n"
            "- **Cool thing** — does X. (RAD-1)",
            jira_version_id="10042",
        )

        body = create.calls.last.request.content.decode()
        assert '"parentId": "2002"' in body or '"parentId":"2002"' in body
        assert '"spaceId": "555"' in body or '"spaceId":"555"' in body
        # date-prefixed title, not "<label> Release Note"
        assert "26-04-01 AICP Monthly" in body
        # metadata table + version link + ISO date
        assert "<table" in body
        assert "fixVersion%3D10042" in body
        assert 'datetime=\\"2026-04-01\\"' in body or 'datetime="2026-04-01"' in body
        # inline bold is rendered, not literal asterisks
        assert "<strong>Cool thing</strong>" in body
        assert result.confluence_url == f"{WIKI}/spaces/AIP/pages/999/Note"
        assert result.confluence_location == "AIP / 26-04-01 AICP Monthly"

    @respx.mock
    @pytest.mark.asyncio
    async def test_unknown_space_raises(self) -> None:
        """Empty space lookup → ConfluenceIntegrationError."""
        respx.get(f"{WIKI}/api/v2/spaces").mock(
            return_value=httpx.Response(200, json={"results": []})
        )

        with pytest.raises(ConfluenceIntegrationError):
            await confluence.publish_release_note("odm", "ODM Monthly", "body")

    @respx.mock
    @pytest.mark.asyncio
    async def test_create_failure_raises(self) -> None:
        """A 400 on page creation → ConfluenceIntegrationError."""
        respx.get(f"{WIKI}/api/v2/spaces").mock(
            return_value=httpx.Response(200, json={"results": [{"id": "555"}]})
        )
        respx.post(f"{WIKI}/api/v2/pages").mock(
            return_value=httpx.Response(400, json={"errors": [{"title": "bad"}]})
        )

        with pytest.raises(ConfluenceIntegrationError):
            await confluence.publish_release_note("odm", "ODM Monthly", "body")

    @pytest.mark.asyncio
    async def test_unconfigured_parent_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A page type without a configured parent id → ConfluenceIntegrationError."""
        monkeypatch.setattr(settings, "CONFLUENCE_ODM_PARENT_ID", "")

        with pytest.raises(ConfluenceIntegrationError):
            await confluence.publish_release_note("odm", "ODM Monthly", "body")
