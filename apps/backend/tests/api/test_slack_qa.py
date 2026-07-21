"""Tests for the Slack Q&A Linker endpoints.

Covers:
  GET    /api/v1/slack-qa
  POST   /api/v1/slack-qa
  POST   /api/v1/slack-qa/from-thread
  GET    /api/v1/slack-qa/last-synced
  PATCH  /api/v1/slack-qa/{id}/link
  DELETE /api/v1/slack-qa/{id}
"""

import pytest
from httpx import AsyncClient

from app.integrations import ai as ai_integration
from app.integrations.ai import SlackQaSummary
from app.models.project import Project


@pytest.fixture
async def project(db) -> Project:
    """A single committed project row; API client sessions can see it."""
    p = Project(name="Alpha Project")
    db.add(p)
    await db.flush()
    await db.commit()
    return p


def _create_payload(message_ts: str = "1700000000.000100") -> dict:
    return {
        "slack_channel_id": "C123",
        "slack_channel_name": "#private-onco-squad",
        "slack_message_ts": message_ts,
        "slack_message_url": "https://lunit.slack.com/archives/C123/p1700000000000100",
        "sender_name": "Hajin Lee",
        "question": "How do we handle sprint carryover?",
        "answer": "Carry over to the next sprint and re-estimate.",
        "answer_date": "2026-06-01",
    }


class TestListSlackQaItems:
    """GET /api/v1/slack-qa"""

    @pytest.mark.asyncio
    async def test_returns_empty_list_initially(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/slack-qa")
        assert response.status_code == 200
        assert response.json() == {"items": []}

    @pytest.mark.asyncio
    async def test_returns_created_items_newest_first(self, client: AsyncClient) -> None:
        await client.post("/api/v1/slack-qa", json=_create_payload("1700000000.000100"))
        await client.post("/api/v1/slack-qa", json=_create_payload("1700000000.000200"))

        response = await client.get("/api/v1/slack-qa")

        items = response.json()["items"]
        assert len(items) == 2
        assert items[0]["slack_message_ts"] == "1700000000.000200"


class TestCreateSlackQaItem:
    """POST /api/v1/slack-qa

    Business rules:
    1. A Slack message can only be imported once (unique by slack_message_ts)
    """

    @pytest.mark.asyncio
    async def test_creates_successfully(self, client: AsyncClient) -> None:
        """Successful creation
        Given: a Slack message not yet imported
        When: POST /api/v1/slack-qa
        Then: 201, item is returned unarchived and unlinked
        """
        response = await client.post("/api/v1/slack-qa", json=_create_payload())

        assert response.status_code == 201
        data = response.json()
        assert data["question"] == "How do we handle sprint carryover?"
        assert data["archived"] is False
        assert data["linked_project_id"] is None

    @pytest.mark.asyncio
    async def test_rejects_duplicate_message_ts(self, client: AsyncClient) -> None:
        """Reject duplicate import
        Given: a message already imported
        When: POST with the same slack_message_ts
        Then: 409
        """
        payload = _create_payload()
        await client.post("/api/v1/slack-qa", json=payload)

        response = await client.post("/api/v1/slack-qa", json=payload)

        assert response.status_code == 409


class TestCreateSlackQaItemFromThread:
    """POST /api/v1/slack-qa/from-thread

    Business rules:
    1. Raw thread messages are summarized into question/answer via AI
    2. The AI's suggested project name is resolved to a project id when it matches
    3. A Slack message can only be imported once
    """

    @pytest.fixture(autouse=True)
    def stub_summarize(self, monkeypatch: pytest.MonkeyPatch) -> None:
        async def _summarize(raw_messages: list[str], project_names: list[str]) -> SlackQaSummary:
            return SlackQaSummary(
                question="How do we handle sprint carryover?",
                answer="Carry over to the next sprint and re-estimate.",
                ai_project_name="Alpha Project" if "Alpha Project" in project_names else None,
            )

        monkeypatch.setattr(ai_integration, "summarize_slack_thread", _summarize)

    def _thread_payload(self, message_ts: str = "1700000000.000100") -> dict:
        return {
            "slack_channel_id": "C123",
            "slack_channel_name": "#private-onco-squad",
            "slack_message_ts": message_ts,
            "slack_message_url": "https://lunit.slack.com/archives/C123/p1700000000000100",
            "sender_name": "Hajin Lee",
            "answer_date": "2026-06-01",
            "raw_messages": ["[Hajin Lee] how do we handle sprint carryover?", "[Yiseul Kwon] carry it over"],
            "project_names": [],
        }

    @pytest.mark.asyncio
    async def test_creates_item_with_ai_summary(self, client: AsyncClient) -> None:
        """Successful creation from raw thread
        Given: raw Slack thread messages
        When: POST /api/v1/slack-qa/from-thread
        Then: 201, question/answer come from the AI summary
        """
        response = await client.post("/api/v1/slack-qa/from-thread", json=self._thread_payload())

        assert response.status_code == 201
        data = response.json()
        assert data["question"] == "How do we handle sprint carryover?"
        assert data["answer"] == "Carry over to the next sprint and re-estimate."

    @pytest.mark.asyncio
    async def test_resolves_ai_project_name_to_project_id(
        self, client: AsyncClient, project
    ) -> None:
        """AI project match resolves to a project id
        Given: the AI summary names a project that exists
        When: POST /api/v1/slack-qa/from-thread with that project in project_names
        Then: ai_project_id is set to the matching project's id
        """
        payload = self._thread_payload()
        payload["project_names"] = ["Alpha Project"]

        response = await client.post("/api/v1/slack-qa/from-thread", json=payload)

        assert response.json()["ai_project_id"] == project.id

    @pytest.mark.asyncio
    async def test_rejects_duplicate_message_ts(self, client: AsyncClient) -> None:
        """Reject duplicate import
        Given: a message already imported
        When: POST /from-thread with the same slack_message_ts
        Then: 409
        """
        payload = self._thread_payload()
        await client.post("/api/v1/slack-qa/from-thread", json=payload)

        response = await client.post("/api/v1/slack-qa/from-thread", json=payload)

        assert response.status_code == 409


class TestGetLastSynced:
    """GET /api/v1/slack-qa/last-synced"""

    @pytest.mark.asyncio
    async def test_returns_null_when_no_items(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/slack-qa/last-synced")
        assert response.status_code == 200
        assert response.json() == {"last_message_ts": None}

    @pytest.mark.asyncio
    async def test_returns_latest_message_ts(self, client: AsyncClient) -> None:
        await client.post("/api/v1/slack-qa", json=_create_payload("1700000000.000100"))
        await client.post("/api/v1/slack-qa", json=_create_payload("1700000000.000200"))

        response = await client.get("/api/v1/slack-qa/last-synced")

        assert response.json()["last_message_ts"] == "1700000000.000200"


class TestLinkProject:
    """PATCH /api/v1/slack-qa/{id}/link"""

    @pytest.mark.asyncio
    async def test_links_item_to_project(self, client: AsyncClient, project) -> None:
        """Successful link
        Given: an existing Slack Q&A item and project
        When: PATCH .../link with project_id
        Then: 200, linked_project_id is set
        """
        created = await client.post("/api/v1/slack-qa", json=_create_payload())
        item_id = created.json()["id"]

        response = await client.patch(
            f"/api/v1/slack-qa/{item_id}/link", json={"project_id": project.id}
        )

        assert response.status_code == 200
        assert response.json()["linked_project_id"] == project.id

    @pytest.mark.asyncio
    async def test_returns_404_for_unknown_item(self, client: AsyncClient, project) -> None:
        response = await client.patch(
            "/api/v1/slack-qa/999999/link", json={"project_id": project.id}
        )
        assert response.status_code == 404


class TestDeleteSlackQaItem:
    """DELETE /api/v1/slack-qa/{id}"""

    @pytest.mark.asyncio
    async def test_deletes_item(self, client: AsyncClient) -> None:
        """Successful deletion
        Given: an existing Slack Q&A item
        When: DELETE /api/v1/slack-qa/{id}
        Then: 204, item no longer appears in the list
        """
        created = await client.post("/api/v1/slack-qa", json=_create_payload())
        item_id = created.json()["id"]

        response = await client.delete(f"/api/v1/slack-qa/{item_id}")

        assert response.status_code == 204
        listed = await client.get("/api/v1/slack-qa")
        assert listed.json()["items"] == []

    @pytest.mark.asyncio
    async def test_returns_404_for_unknown_item(self, client: AsyncClient) -> None:
        response = await client.delete("/api/v1/slack-qa/999999")
        assert response.status_code == 404
