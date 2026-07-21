"""Tests for project context endpoints.

Covers:
  GET  /api/v1/projects/{id}/context
  PUT  /api/v1/projects/{id}/context   ← Save button
  POST /api/v1/projects/{id}/context/preview
"""

import pytest
from httpx import AsyncClient

from app.integrations import ai as ai_integration
from app.models.project import Project

_PID = "proj-1"


# ─── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def stub_ai_translation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the real AI translation call with a fast stub."""

    async def _translate(text: str) -> str:
        return f"[KO] {text[:60]}"

    monkeypatch.setattr(ai_integration, "translate_context_to_korean", _translate)


@pytest.fixture
async def project(db) -> Project:
    """A single committed project row; API client sessions can see it."""
    p = Project(name="Alpha Project")
    db.add(p)
    await db.flush()
    await db.commit()
    return p


# ─── GET /api/v1/projects/{id}/context ───────────────────────────────────────


class TestGetProjectContext:
    """GET /api/v1/projects/{id}/context

    Business rules:
    1. Returns null fields when no context has been saved yet
    2. Returns saved context text and metadata
    3. Returns 404 for an unknown project
    """

    @pytest.mark.asyncio
    async def test_returns_null_context_when_none_set(self, client: AsyncClient, project: Project) -> None:
        """Context is null before any save
        Given: project with no saved context
        When:  GET /api/v1/projects/proj-1/context
        Then:  200, context=null, page_count=0
        """
        response = await client.get(f"/api/v1/projects/{_PID}/context")

        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == _PID
        assert data["context"] is None
        assert data["context_ko"] is None
        assert data["synced_at"] is None
        assert data["page_count"] == 0

    @pytest.mark.asyncio
    async def test_returns_saved_context(self, client: AsyncClient, project: Project) -> None:
        """Saved context is returned on subsequent GET
        Given: context was previously saved via PUT
        When:  GET /api/v1/projects/proj-1/context
        Then:  200, context matches the saved text
        """
        await client.put(f"/api/v1/projects/{_PID}/context", json={"context": "Existing context."})

        response = await client.get(f"/api/v1/projects/{_PID}/context")

        assert response.status_code == 200
        assert response.json()["context"] == "Existing context."

    @pytest.mark.asyncio
    async def test_returns_404_for_unknown_project(self, client: AsyncClient) -> None:
        """404 for a project that does not exist
        Given: no project with id proj-999
        When:  GET /api/v1/projects/proj-999/context
        Then:  404
        """
        response = await client.get("/api/v1/projects/proj-999/context")
        assert response.status_code == 404


# ─── PUT /api/v1/projects/{id}/context ───────────────────────────────────────


class TestSaveProjectContext:
    """PUT /api/v1/projects/{id}/context — Save button

    Business rules:
    1. Creates a new context record when none exists
    2. Updates existing context text
    3. Also regenerates the Korean (context_ko) translation
    4. Returns 404 for an unknown project
    5. Saves even when translation fails (non-fatal)
    """

    @pytest.mark.asyncio
    async def test_creates_context_for_new_project(self, client: AsyncClient, project: Project) -> None:
        """Creates context record when none exists
        Given: project with no saved context
        When:  PUT /api/v1/projects/proj-1/context { context: "..." }
        Then:  200, returns saved context with Korean translation
        """
        response = await client.put(
            f"/api/v1/projects/{_PID}/context",
            json={"context": "Project context text."},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["context"] == "Project context text."
        assert data["context_ko"] == "[KO] Project context text."
        assert data["project_id"] == _PID
        assert data["page_count"] == 0  # no Confluence pages for manual save

    @pytest.mark.asyncio
    async def test_updates_existing_context(self, client: AsyncClient, project: Project) -> None:
        """Updates context when one already exists
        Given: existing saved context
        When:  PUT with updated text
        Then:  200, context updated
        """
        await client.put(f"/api/v1/projects/{_PID}/context", json={"context": "Old context."})

        response = await client.put(
            f"/api/v1/projects/{_PID}/context",
            json={"context": "Updated context."},
        )

        assert response.status_code == 200
        assert response.json()["context"] == "Updated context."

    @pytest.mark.asyncio
    async def test_returns_404_for_unknown_project(self, client: AsyncClient) -> None:
        """404 for a project that does not exist
        Given: no project with id proj-999
        When:  PUT /api/v1/projects/proj-999/context
        Then:  404
        """
        response = await client.put(
            "/api/v1/projects/proj-999/context",
            json={"context": "Hello."},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_saves_even_when_translation_fails(
        self,
        client: AsyncClient,
        project: Project,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Saves context even when AI translation throws
        Given: AI translation is unavailable
        When:  PUT with context text
        Then:  200, context saved, context_ko is None (non-fatal failure)
        """

        async def _fail_translate(text: str) -> str:
            raise RuntimeError("AI unavailable")

        monkeypatch.setattr(ai_integration, "translate_context_to_korean", _fail_translate)

        response = await client.put(
            f"/api/v1/projects/{_PID}/context",
            json={"context": "My context."},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["context"] == "My context."
        assert data["context_ko"] is None

    @pytest.mark.asyncio
    async def test_get_after_save_reflects_updated_content(
        self, client: AsyncClient, project: Project
    ) -> None:
        """GET returns content saved by the most recent PUT
        Given: context saved via PUT
        When:  GET /api/v1/projects/proj-1/context
        Then:  200, context matches the PUT payload
        """
        await client.put(
            f"/api/v1/projects/{_PID}/context",
            json={"context": "Round-trip text."},
        )

        response = await client.get(f"/api/v1/projects/{_PID}/context")

        assert response.status_code == 200
        assert response.json()["context"] == "Round-trip text."


# ─── POST /api/v1/projects/{id}/context/preview ──────────────────────────────


class TestPreviewContextSync:
    """POST /api/v1/projects/{id}/context/preview

    Business rules:
    1. Returns 400 when the project has no Confluence link
    2. Returns 404 for an unknown project
    """

    @pytest.mark.asyncio
    async def test_400_when_no_confluence_link(
        self, client: AsyncClient, project: Project
    ) -> None:
        """Returns 400 when project has no Confluence page ID
        Given: project without confluence_page_id
        When:  POST /api/v1/projects/proj-1/context/preview
        Then:  400 NO_CONFLUENCE_LINK
        """
        response = await client.post(f"/api/v1/projects/{_PID}/context/preview")

        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "NO_CONFLUENCE_LINK"

    @pytest.mark.asyncio
    async def test_404_for_unknown_project(self, client: AsyncClient) -> None:
        """Returns 404 for a project that does not exist
        Given: no project with id proj-999
        When:  POST /api/v1/projects/proj-999/context/preview
        Then:  404
        """
        response = await client.post("/api/v1/projects/proj-999/context/preview")
        assert response.status_code == 404
