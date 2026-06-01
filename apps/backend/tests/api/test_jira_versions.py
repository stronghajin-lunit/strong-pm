import pytest
from httpx import AsyncClient


class TestListJiraVersions:
    """GET /api/v1/jira-versions - List Jira Fix Versions

    Requirements:
    ============
    1. Purpose - Sync Jira Fix Versions and return them for selection
    2. Response - { versions: [{ id, label }] }
    3. Business rule - versions are upserted into the DB on every fetch
       (idempotent: repeated calls do not duplicate rows)
    """

    @pytest.mark.asyncio
    async def test_returns_synced_versions(self, client: AsyncClient) -> None:
        """Return the Jira Fix Version list
        Given: the stubbed Jira integration exposes three Fix Versions
        When: GET /api/v1/jira-versions
        Then: 200, all three versions are returned with id and label
        """
        response = await client.get("/api/v1/jira-versions")

        assert response.status_code == 200
        versions = response.json()["versions"]
        assert len(versions) == 3
        ids = {v["id"] for v in versions}
        assert ids == {"aicp-0401", "odm-0401", "aicp-0301"}
        aicp = next(v for v in versions if v["id"] == "aicp-0401")
        assert aicp["label"] == "AICP Monthly 26-04-01"

    @pytest.mark.asyncio
    async def test_repeated_sync_is_idempotent(self, client: AsyncClient) -> None:
        """Upsert does not duplicate versions
        Given: jira-versions has already been synced once
        When: GET /api/v1/jira-versions again
        Then: still exactly three versions (upsert on jira_id)
        """
        await client.get("/api/v1/jira-versions")
        response = await client.get("/api/v1/jira-versions")

        assert response.status_code == 200
        assert len(response.json()["versions"]) == 3
