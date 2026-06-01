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
        assert data["reflection"] is None

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


class TestApplyReflection:
    """PATCH /api/v1/release-notes/{rn_id}/reflection - Attach a reflection

    Business rules:
    1. Reflection can be set only once (second attempt: 409)
    2. Unknown / malformed id: 404
    """

    @pytest.mark.asyncio
    async def test_applies_reflection(self, client: AsyncClient) -> None:
        """Attach a reflection to a note
        Given: a generated release note with no reflection
        When: PATCH .../reflection with a reflection body
        Then: 200, reflection stored and echoed back
        """
        created = await _run_note(client)

        response = await client.patch(
            f"/api/v1/release-notes/{created['id']}/reflection",
            json={"reflection": "Shipped to ODM customers"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == created["id"]
        assert body["reflection"] == "Shipped to ODM customers"

    @pytest.mark.asyncio
    async def test_rejects_second_reflection(self, client: AsyncClient) -> None:
        """Reflection is write-once
        Given: a note that already has a reflection
        When: PATCH .../reflection again
        Then: 409 with code CONFLICT
        """
        created = await _run_note(client)
        await client.patch(
            f"/api/v1/release-notes/{created['id']}/reflection",
            json={"reflection": "first"},
        )

        response = await client.patch(
            f"/api/v1/release-notes/{created['id']}/reflection",
            json={"reflection": "second"},
        )

        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "CONFLICT"

    @pytest.mark.asyncio
    async def test_rejects_unknown_id(self, client: AsyncClient) -> None:
        """Unknown note id
        Given: a release note id that does not exist
        When: PATCH .../reflection
        Then: 404 with code NOT_FOUND
        """
        response = await client.patch(
            "/api/v1/release-notes/rn-999/reflection",
            json={"reflection": "x"},
        )

        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_rejects_malformed_id(self, client: AsyncClient) -> None:
        """Malformed note id
        Given: an id that is not in the 'rn-<int>' form
        When: PATCH .../reflection
        Then: 404 with code NOT_FOUND
        """
        response = await client.patch(
            "/api/v1/release-notes/not-an-id/reflection",
            json={"reflection": "x"},
        )

        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "NOT_FOUND"
