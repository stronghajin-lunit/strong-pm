import pytest
from httpx import AsyncClient

_VALID_RUN_PAYLOAD = {
    "sprint_id": 324,
    "sprint_number": 80,
    "sprint_label": "Onco Sprint 80",
    "confluence_page_url": "https://lunit.atlassian.net/wiki/spaces/AIP/pages/99999",
}


class TestListSprintSprints:
    """GET /api/v1/sprint-reports/sprints — List available sprints"""

    @pytest.mark.asyncio
    async def test_returns_sprint_list(self, client: AsyncClient) -> None:
        """Returns sprint options from Jira board
        Given: board is configured
        When: GET /api/v1/sprint-reports/sprints
        Then: 200, list with sprint_id, label, status
        """
        response = await client.get("/api/v1/sprint-reports/sprints")
        assert response.status_code == 200
        sprints = response.json()["sprints"]
        assert len(sprints) == 2
        assert sprints[0]["label"] == "Onco Sprint 79"
        assert sprints[0]["sprint_id"] == 101
        assert sprints[0]["status"] == "active"


class TestRunSprintReport:
    """POST /api/v1/sprint-reports/run — Generate sprint report"""

    @pytest.mark.asyncio
    async def test_creates_report_successfully(self, client: AsyncClient) -> None:
        """Successful report generation
        Given: valid sprint payload, board and Confluence configured
        When: POST /api/v1/sprint-reports/run
        Then: 201, status done, confluence_url returned
        """
        response = await client.post("/api/v1/sprint-reports/run", json=_VALID_RUN_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "done"
        assert data["sprint_label"] == "Onco Sprint 80"
        assert data["id"].startswith("sr-")
        assert data["confluence_url"] is not None

    @pytest.mark.asyncio
    async def test_rejects_missing_field(self, client: AsyncClient) -> None:
        """Reject payload missing required field
        Given: payload without sprint_number
        When: POST /api/v1/sprint-reports/run
        Then: 422
        """
        payload = {k: v for k, v in _VALID_RUN_PAYLOAD.items() if k != "sprint_number"}
        response = await client.post("/api/v1/sprint-reports/run", json=payload)
        assert response.status_code == 422


class TestListSprintReports:
    """GET /api/v1/sprint-reports — List run history"""

    @pytest.mark.asyncio
    async def test_returns_empty_list_initially(self, client: AsyncClient) -> None:
        """Empty list on fresh DB
        Given: no reports generated
        When: GET /api/v1/sprint-reports
        Then: 200, reports=[]
        """
        response = await client.get("/api/v1/sprint-reports")
        assert response.status_code == 200
        assert response.json()["reports"] == []

    @pytest.mark.asyncio
    async def test_returns_created_report(self, client: AsyncClient) -> None:
        """List contains generated report
        Given: one report generated via POST /run
        When: GET /api/v1/sprint-reports
        Then: 200, list has one item
        """
        await client.post("/api/v1/sprint-reports/run", json=_VALID_RUN_PAYLOAD)
        response = await client.get("/api/v1/sprint-reports")
        assert response.status_code == 200
        reports = response.json()["reports"]
        assert len(reports) == 1
        assert reports[0]["sprint_label"] == "Onco Sprint 80"
