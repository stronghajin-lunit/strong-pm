import pytest
from httpx import AsyncClient

from app.core.ai_model_config import (
    AVAILABLE_MODELS,
    FEATURE_DEFAULTS,
    FEATURE_KEYS,
    FEATURE_LABELS,
    _overrides,
    get_model,
    set_all_overrides,
)


@pytest.fixture(autouse=True)
def reset_overrides():
    """Ensure the in-memory override cache is clean before and after each test."""
    set_all_overrides({})
    yield
    set_all_overrides({})


class TestGetAiSettings:
    """GET /api/v1/ai-settings

    Requirements:
    1. Returns all feature keys with their labels, current model, and default model
    2. Returns the list of available models
    3. Falls back to FEATURE_DEFAULTS when no DB override exists
    """

    @pytest.mark.asyncio
    async def test_returns_all_features(self, client: AsyncClient) -> None:
        """All feature keys are present in the response.
        Given: no overrides in DB
        When: GET /api/v1/ai-settings
        Then: 200 with all FEATURE_KEYS present
        """
        response = await client.get("/api/v1/ai-settings")

        assert response.status_code == 200
        data = response.json()
        returned_keys = {s["feature_key"] for s in data["settings"]}
        assert returned_keys == set(FEATURE_KEYS)

    @pytest.mark.asyncio
    async def test_returns_available_models(self, client: AsyncClient) -> None:
        """available_models list matches the known model list.
        Given: clean state
        When: GET /api/v1/ai-settings
        Then: available_models equals AVAILABLE_MODELS
        """
        response = await client.get("/api/v1/ai-settings")

        assert response.status_code == 200
        assert response.json()["available_models"] == AVAILABLE_MODELS

    @pytest.mark.asyncio
    async def test_default_model_matches_feature_defaults(self, client: AsyncClient) -> None:
        """default_model reflects FEATURE_DEFAULTS, not any override.
        Given: no overrides
        When: GET /api/v1/ai-settings
        Then: each item's default_model equals FEATURE_DEFAULTS[key]
        """
        response = await client.get("/api/v1/ai-settings")

        for item in response.json()["settings"]:
            assert item["default_model"] == FEATURE_DEFAULTS[item["feature_key"]]

    @pytest.mark.asyncio
    async def test_label_matches_feature_labels(self, client: AsyncClient) -> None:
        """label field reflects FEATURE_LABELS.
        Given: no overrides
        When: GET /api/v1/ai-settings
        Then: each item's label equals FEATURE_LABELS[key]
        """
        response = await client.get("/api/v1/ai-settings")

        for item in response.json()["settings"]:
            assert item["label"] == FEATURE_LABELS[item["feature_key"]]


class TestUpdateAiSettings:
    """PUT /api/v1/ai-settings

    Requirements:
    1. Persists the new model for each feature key to DB
    2. Updates the in-memory cache so get_model() reflects changes immediately
    3. Ignores unknown feature keys (no error)
    4. Ignores unknown model values (no error)
    5. Returns the updated settings in the response
    """

    @pytest.mark.asyncio
    async def test_persists_model_change(self, client: AsyncClient) -> None:
        """Model change is reflected in a subsequent GET.
        Given: prd_writer defaults to AI_MODEL
        When: PUT sets prd_writer to claude-haiku-4-5-20251001
        Then: GET returns claude-haiku-4-5-20251001 for prd_writer
        """
        await client.put(
            "/api/v1/ai-settings",
            json={"settings": {"prd_writer": "claude-haiku-4-5-20251001"}},
        )

        response = await client.get("/api/v1/ai-settings")
        prd = next(s for s in response.json()["settings"] if s["feature_key"] == "prd_writer")
        assert prd["model"] == "claude-haiku-4-5-20251001"

    @pytest.mark.asyncio
    async def test_updates_in_memory_cache(self, client: AsyncClient) -> None:
        """get_model() reflects the new value immediately after PUT.
        Given: clean overrides
        When: PUT sets sprint_report_creator to claude-haiku-4-5-20251001
        Then: get_model('sprint_report_creator') == 'claude-haiku-4-5-20251001'
        """
        await client.put(
            "/api/v1/ai-settings",
            json={"settings": {"sprint_report_creator": "claude-haiku-4-5-20251001"}},
        )

        assert get_model("sprint_report_creator") == "claude-haiku-4-5-20251001"

    @pytest.mark.asyncio
    async def test_response_contains_updated_model(self, client: AsyncClient) -> None:
        """PUT response already reflects the change (no need for a second GET).
        Given: clean state
        When: PUT sets jira_ticket_writer to claude-haiku-4-5-20251001
        Then: response body shows updated model for jira_ticket_writer
        """
        response = await client.put(
            "/api/v1/ai-settings",
            json={"settings": {"jira_ticket_writer": "claude-haiku-4-5-20251001"}},
        )

        assert response.status_code == 200
        jira = next(
            s for s in response.json()["settings"] if s["feature_key"] == "jira_ticket_writer"
        )
        assert jira["model"] == "claude-haiku-4-5-20251001"

    @pytest.mark.asyncio
    async def test_ignores_unknown_feature_key(self, client: AsyncClient) -> None:
        """Unknown feature keys are silently ignored.
        Given: unknown key 'nonexistent_feature'
        When: PUT includes it alongside a valid key
        Then: 200, valid key is updated, no error for unknown key
        """
        response = await client.put(
            "/api/v1/ai-settings",
            json={
                "settings": {
                    "nonexistent_feature": "claude-haiku-4-5-20251001",
                    "release_note_creator": "claude-haiku-4-5-20251001",
                }
            },
        )

        assert response.status_code == 200
        release = next(
            s for s in response.json()["settings"] if s["feature_key"] == "release_note_creator"
        )
        assert release["model"] == "claude-haiku-4-5-20251001"

    @pytest.mark.asyncio
    async def test_ignores_unknown_model_value(self, client: AsyncClient) -> None:
        """Unknown model values are silently ignored — original model is preserved.
        Given: prd_writer has default model
        When: PUT sends an invalid model name
        Then: 200, prd_writer model unchanged
        """
        original = get_model("prd_writer")

        response = await client.put(
            "/api/v1/ai-settings",
            json={"settings": {"prd_writer": "gpt-99-turbo"}},
        )

        assert response.status_code == 200
        prd = next(s for s in response.json()["settings"] if s["feature_key"] == "prd_writer")
        assert prd["model"] == original

    @pytest.mark.asyncio
    async def test_partial_update_does_not_reset_other_features(self, client: AsyncClient) -> None:
        """Updating one feature does not revert others to defaults.
        Given: prd_writer already set to haiku
        When: PUT only updates feature_list_writer
        Then: prd_writer still returns haiku
        """
        await client.put(
            "/api/v1/ai-settings",
            json={"settings": {"prd_writer": "claude-haiku-4-5-20251001"}},
        )

        await client.put(
            "/api/v1/ai-settings",
            json={"settings": {"feature_list_writer": "claude-haiku-4-5-20251001"}},
        )

        assert get_model("prd_writer") == "claude-haiku-4-5-20251001"


class TestGetModelCacheIntegration:
    """get_model() cache behaviour — unit-level integration tests.

    Requirements:
    1. Returns default when no override is set
    2. Returns override after set_all_overrides()
    3. Returns default again after overrides are cleared
    """

    def test_returns_default_when_no_override(self) -> None:
        assert get_model("prd_writer") == FEATURE_DEFAULTS["prd_writer"]

    def test_returns_override_after_set(self) -> None:
        set_all_overrides({"prd_writer": "claude-haiku-4-5-20251001"})
        assert get_model("prd_writer") == "claude-haiku-4-5-20251001"

    def test_returns_default_after_override_cleared(self) -> None:
        set_all_overrides({"prd_writer": "claude-haiku-4-5-20251001"})
        set_all_overrides({})
        assert get_model("prd_writer") == FEATURE_DEFAULTS["prd_writer"]

    def test_unaffected_feature_still_returns_default(self) -> None:
        set_all_overrides({"prd_writer": "claude-haiku-4-5-20251001"})
        assert get_model("slack_qa_summary") == FEATURE_DEFAULTS["slack_qa_summary"]
