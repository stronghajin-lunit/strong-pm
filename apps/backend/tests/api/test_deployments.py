import pytest
from httpx import AsyncClient


async def _run_deployment(client: AsyncClient, jira_version_id: str = "aicp-0401") -> dict:
    response = await client.post(
        "/api/v1/deployments/run",
        json={"jira_version_id": jira_version_id},
    )
    assert response.status_code == 201, response.text
    return response.json()


class TestRunDeployment:
    """POST /api/v1/deployments/run - Cross-validate Jira tickets with GitHub PRs

    Requirements:
    ============
    1. Purpose - For a Jira Fix Version, reconcile its tickets against GitHub PR
       deployment status and persist a deployment snapshot
    2. Input - jira_version_id (required)
    3. Response - id, version, run_at, stats, repos, ticket_rows, ...
    4. Errors - unknown version: 404, missing field: 422
    5. Business rule - stats are derived from per-ticket PR status
       (no_pr / deployed_this / deployed_prev / unregistered)
    """

    @pytest.mark.asyncio
    async def test_creates_deployment_snapshot(self, client: AsyncClient) -> None:
        """Successful run
        Given: a valid Fix Version with six tickets
        When: POST /api/v1/deployments/run
        Then: 201, version label and derived stats are returned
        """
        data = await _run_deployment(client, "aicp-0401")

        assert data["id"].startswith("dt-")
        assert data["version"] == "AICP Monthly 26-04-01"
        assert len(data["ticket_rows"]) == 6

        stats = data["stats"]
        assert stats["total"] == 6
        assert stats["no_pr"] == 2  # RAD-9372, RAD-9362
        assert stats["deployed_this"] == 2  # RAD-9100, RAD-9300
        assert stats["unregistered_prs"] == 2  # RAD-9241, RAD-9242
        assert stats["merged"] == 4

    @pytest.mark.asyncio
    async def test_rejects_unknown_version(self, client: AsyncClient) -> None:
        """Reject unknown Fix Version
        Given: a jira_version_id that does not exist in Jira
        When: POST /api/v1/deployments/run
        Then: 404 with code JIRA_VERSION_NOT_FOUND
        """
        response = await client.post(
            "/api/v1/deployments/run",
            json={"jira_version_id": "does-not-exist"},
        )

        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "JIRA_VERSION_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_rejects_missing_field(self, client: AsyncClient) -> None:
        """Reject missing required field
        Given: a request body without jira_version_id
        When: POST /api/v1/deployments/run
        Then: 422 (Pydantic validation)
        """
        response = await client.post("/api/v1/deployments/run", json={})

        assert response.status_code == 422


class TestListDeployments:
    """GET /api/v1/deployments - List deployment snapshots"""

    @pytest.mark.asyncio
    async def test_returns_empty_list_initially(self, client: AsyncClient) -> None:
        """No deployments yet
        Given: no deployment has been run
        When: GET /api/v1/deployments
        Then: 200, empty list
        """
        response = await client.get("/api/v1/deployments")

        assert response.status_code == 200
        assert response.json()["deployments"] == []

    @pytest.mark.asyncio
    async def test_returns_summary_after_run(self, client: AsyncClient) -> None:
        """List reflects a completed run
        Given: one deployment has been run
        When: GET /api/v1/deployments
        Then: 200, list contains a matching summary
        """
        created = await _run_deployment(client)

        response = await client.get("/api/v1/deployments")

        assert response.status_code == 200
        deployments = response.json()["deployments"]
        assert len(deployments) == 1
        assert deployments[0]["id"] == created["id"]
        assert deployments[0]["version"] == "AICP Monthly 26-04-01"
        assert deployments[0]["total"] == 6


class TestGetDeployment:
    """GET /api/v1/deployments/{dt_id} - Deployment detail

    Business rules:
    1. Unknown / malformed id: 404
    """

    @pytest.mark.asyncio
    async def test_returns_detail(self, client: AsyncClient) -> None:
        """Fetch a stored deployment
        Given: a deployment has been run
        When: GET /api/v1/deployments/{dt_id}
        Then: 200, detail matches the run response
        """
        created = await _run_deployment(client)

        response = await client.get(f"/api/v1/deployments/{created['id']}")

        assert response.status_code == 200
        detail = response.json()
        assert detail["id"] == created["id"]
        assert detail["version"] == "AICP Monthly 26-04-01"
        assert detail["stats"]["total"] == 6
        assert len(detail["ticket_rows"]) == 6

    @pytest.mark.asyncio
    async def test_rejects_unknown_id(self, client: AsyncClient) -> None:
        """Unknown deployment id
        Given: a deployment id that does not exist
        When: GET /api/v1/deployments/{dt_id}
        Then: 404 with code NOT_FOUND
        """
        response = await client.get("/api/v1/deployments/dt-999")

        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_rejects_malformed_id(self, client: AsyncClient) -> None:
        """Malformed deployment id
        Given: an id that is not in the 'dt-<int>' form
        When: GET /api/v1/deployments/{dt_id}
        Then: 404 with code NOT_FOUND
        """
        response = await client.get("/api/v1/deployments/not-an-id")

        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "NOT_FOUND"
