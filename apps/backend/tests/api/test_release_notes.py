import pytest
from httpx import AsyncClient


async def _run_note(
    client: AsyncClient,
    jira_version_id: str = "aicp-0401",
    confluence_page: str = "annotation",
) -> dict:
    response = await client.post(
        "/api/v1/release-notes/run",
        json={"jira_version_id": jira_version_id, "confluence_page": confluence_page},
    )
    assert response.status_code == 201, response.text
    return response.json()


class TestRunReleaseNote:
    """POST /api/v1/release-notes/run - Generate and publish a release note

    Requirements:
    ============
    1. Purpose - Generate a release note from a Jira Fix Version's tickets and
       publish it to a Confluence page
    2. Input - jira_version_id (required), confluence_page (required)
    3. Response - id, jira_version, confluence_location, status, confluence_url
    4. Errors - invalid confluence_page: 400, unknown version: 404, missing field: 422
    5. Business rule - only 'odm' and 'annotation' Confluence pages are allowed;
       a successful run is marked status 'done'
    """

    @pytest.mark.asyncio
    async def test_creates_release_note(self, client: AsyncClient) -> None:
        """Successful generation
        Given: a valid Fix Version and an allowed Confluence page
        When: POST /api/v1/release-notes/run
        Then: 201, status 'done', version label and Confluence location returned
        """
        data = await _run_note(client, "aicp-0401", "annotation")

        assert data["jira_version"] == "AICP Monthly 26-04-01"
        assert data["status"] == "done"
        assert data["confluence_location"]
        assert data["confluence_url"]
        assert data["id"].startswith("rn-")

    @pytest.mark.asyncio
    async def test_rejects_invalid_confluence_page(self, client: AsyncClient) -> None:
        """Reject unsupported Confluence page
        Given: a confluence_page outside {odm, annotation}
        When: POST /api/v1/release-notes/run
        Then: 400 with code INVALID_CONFLUENCE_PAGE
        """
        response = await client.post(
            "/api/v1/release-notes/run",
            json={"jira_version_id": "aicp-0401", "confluence_page": "unknown-page"},
        )

        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "INVALID_CONFLUENCE_PAGE"

    @pytest.mark.asyncio
    async def test_rejects_unknown_version(self, client: AsyncClient) -> None:
        """Reject unknown Fix Version
        Given: a jira_version_id that does not exist in Jira
        When: POST /api/v1/release-notes/run
        Then: 404 with code JIRA_VERSION_NOT_FOUND
        """
        response = await client.post(
            "/api/v1/release-notes/run",
            json={"jira_version_id": "does-not-exist", "confluence_page": "odm"},
        )

        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "JIRA_VERSION_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_rejects_missing_field(self, client: AsyncClient) -> None:
        """Reject missing required field
        Given: a request body without confluence_page
        When: POST /api/v1/release-notes/run
        Then: 422 (Pydantic validation)
        """
        response = await client.post(
            "/api/v1/release-notes/run",
            json={"jira_version_id": "aicp-0401"},
        )

        assert response.status_code == 422


class TestListReleaseNotes:
    """GET /api/v1/release-notes - List generated release notes"""

    @pytest.mark.asyncio
    async def test_returns_empty_list_initially(self, client: AsyncClient) -> None:
        """No notes yet
        Given: no release note has been generated
        When: GET /api/v1/release-notes
        Then: 200, empty list
        """
        response = await client.get("/api/v1/release-notes")

        assert response.status_code == 200
        assert response.json()["notes"] == []

    @pytest.mark.asyncio
    async def test_returns_generated_note(self, client: AsyncClient) -> None:
        """List reflects generated notes
        Given: one release note has been generated
        When: GET /api/v1/release-notes
        Then: 200, list contains that note
        """
        created = await _run_note(client)

        response = await client.get("/api/v1/release-notes")

        assert response.status_code == 200
        notes = response.json()["notes"]
        assert len(notes) == 1
        assert notes[0]["id"] == created["id"]
