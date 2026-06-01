import pytest
from httpx import AsyncClient

_VALID_PAYLOAD = {
    "product": "ODM",
    "sprint_id": 101,
    "sprint": "Onco Sprint 79",
    "type": "Task",
    "feature_description": "Add a license field to the block registration form.",
    "definition_of_done": "The license dropdown is displayed on the form.",
}


class TestRunJiraTicket:
    """POST /api/v1/jira-tickets/run — Create a Jira ticket via AI

    Business rules:
    1. product must be one of: ODM, Annotation Admin, Annotation Tool
    2. type must be Task or Bug
    3. Calls AI to generate summary + description, then creates Jira issue
    4. Assigns the issue to the given sprint via Agile API
    5. Saves run history and returns 201
    """

    @pytest.mark.asyncio
    async def test_creates_ticket_successfully(self, client: AsyncClient) -> None:
        """Successful ticket creation
        Given: valid payload with known product and sprint
        When: POST /api/v1/jira-tickets/run
        Then: 201, returns run record with jira_url and status done
        """
        response = await client.post("/api/v1/jira-tickets/run", json=_VALID_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["product"] == "ODM"
        assert data["sprint"] == "Onco Sprint 79"
        assert data["type"] == "Task"
        assert data["status"] == "done"
        assert data["jira_url"] == "https://lunit.atlassian.net/browse/RAD-9999"
        assert data["id"].startswith("jt-")
        assert data["summary"] != ""

    @pytest.mark.asyncio
    async def test_rejects_invalid_product(self, client: AsyncClient) -> None:
        """Reject unknown product
        Given: payload with product='Unknown'
        When: POST /api/v1/jira-tickets/run
        Then: 400 INVALID_PRODUCT
        """
        payload = {**_VALID_PAYLOAD, "product": "Unknown"}
        response = await client.post("/api/v1/jira-tickets/run", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "INVALID_PRODUCT"

    @pytest.mark.asyncio
    async def test_rejects_invalid_type(self, client: AsyncClient) -> None:
        """Reject unknown issue type
        Given: payload with type='Story'
        When: POST /api/v1/jira-tickets/run
        Then: 400 INVALID_ISSUE_TYPE
        """
        payload = {**_VALID_PAYLOAD, "type": "Story"}
        response = await client.post("/api/v1/jira-tickets/run", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "INVALID_ISSUE_TYPE"

    @pytest.mark.asyncio
    async def test_rejects_missing_required_field(self, client: AsyncClient) -> None:
        """Reject payload missing required field
        Given: payload without feature_description
        When: POST /api/v1/jira-tickets/run
        Then: 422
        """
        payload = {k: v for k, v in _VALID_PAYLOAD.items() if k != "feature_description"}
        response = await client.post("/api/v1/jira-tickets/run", json=payload)
        assert response.status_code == 422


class TestListJiraTickets:
    """GET /api/v1/jira-tickets — List ticket creation history

    Business rules:
    1. Returns empty list when no runs exist
    2. Returns runs in descending order (most recent first)
    """

    @pytest.mark.asyncio
    async def test_returns_empty_list_initially(self, client: AsyncClient) -> None:
        """Empty list on fresh DB
        Given: no runs exist
        When: GET /api/v1/jira-tickets
        Then: 200, tickets=[]
        """
        response = await client.get("/api/v1/jira-tickets")
        assert response.status_code == 200
        assert response.json()["tickets"] == []

    @pytest.mark.asyncio
    async def test_returns_created_run(self, client: AsyncClient) -> None:
        """List contains created run
        Given: one run created via POST /run
        When: GET /api/v1/jira-tickets
        Then: 200, list has one item with matching product/sprint
        """
        await client.post("/api/v1/jira-tickets/run", json=_VALID_PAYLOAD)
        response = await client.get("/api/v1/jira-tickets")
        assert response.status_code == 200
        tickets = response.json()["tickets"]
        assert len(tickets) == 1
        assert tickets[0]["product"] == "ODM"
        assert tickets[0]["sprint"] == "Onco Sprint 79"


class TestListSprints:
    """GET /api/v1/jira-tickets/sprints — List sprints for a product

    Business rules:
    1. Returns active and future sprints for the given product's board
    2. Rejects unknown product with 400
    """

    @pytest.mark.asyncio
    async def test_returns_sprints_for_product(self, client: AsyncClient) -> None:
        """Returns sprint list
        Given: product=ODM (board configured in stub)
        When: GET /api/v1/jira-tickets/sprints?product=ODM
        Then: 200, sprints list with sprint_id and label
        """
        response = await client.get("/api/v1/jira-tickets/sprints", params={"product": "ODM"})
        assert response.status_code == 200
        sprints = response.json()["sprints"]
        assert len(sprints) == 2
        assert sprints[0]["label"] == "Onco Sprint 79"
        assert sprints[0]["sprint_id"] == 101

    @pytest.mark.asyncio
    async def test_rejects_invalid_product(self, client: AsyncClient) -> None:
        """Reject unknown product
        Given: product=Unknown
        When: GET /api/v1/jira-tickets/sprints?product=Unknown
        Then: 400 INVALID_PRODUCT
        """
        response = await client.get("/api/v1/jira-tickets/sprints", params={"product": "Unknown"})
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "INVALID_PRODUCT"
