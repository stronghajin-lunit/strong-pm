"""Unit tests for the real AI (Anthropic) integration (app.integrations.ai).

The Anthropic client is replaced with a fake via monkeypatch, so no network or
API key is required. These tests verify the prompt-assembly / response-handling
logic and error wrapping, not the SDK itself.
"""

import httpx
import pytest

from app.core.config import settings
from app.integrations import ai
from app.integrations.ai import AIIntegrationError
from app.integrations.jira import JiraTicketData


class _FakeTextBlock:
    type = "text"

    def __init__(self, text: str) -> None:
        self.text = text


class _FakeResponse:
    def __init__(self, text: str) -> None:
        self.content = [_FakeTextBlock(text)]


def _install_fake_client(monkeypatch: pytest.MonkeyPatch, *, create) -> None:
    class _FakeMessages:
        async def create(self, **kwargs):
            return create(**kwargs)

    class _FakeClient:
        messages = _FakeMessages()

    monkeypatch.setattr(ai, "_get_client", lambda: _FakeClient())


class TestGenerateReleaseNote:
    @pytest.mark.asyncio
    async def test_returns_generated_markdown(self, monkeypatch: pytest.MonkeyPatch) -> None:
        captured: dict = {}

        def _create(**kwargs):
            captured.update(kwargs)
            return _FakeResponse("## v1.0\n\n### Features\n\n- RAD-1: thing\n")

        monkeypatch.setattr(settings, "AI_MODEL", "claude-opus-4-8")
        _install_fake_client(monkeypatch, create=_create)

        result = await ai.generate_release_note(
            "AICP Monthly 26-04-01",
            [JiraTicketData("RAD-1", "thing"), JiraTicketData("RAD-2", "other")],
        )

        assert result.body.startswith("## v1.0")
        # The version label and tickets are passed to the model
        assert captured["model"] == "claude-opus-4-8"
        user_msg = captured["messages"][0]["content"]
        assert "AICP Monthly 26-04-01" in user_msg
        assert "RAD-1: thing" in user_msg

    @pytest.mark.asyncio
    async def test_empty_response_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_client(monkeypatch, create=lambda **kw: _FakeResponse("   "))

        with pytest.raises(AIIntegrationError):
            await ai.generate_release_note("v1", [JiraTicketData("RAD-1", "x")])

    @pytest.mark.asyncio
    async def test_api_error_is_wrapped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import anthropic

        def _create(**kwargs):
            raise anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com"))

        _install_fake_client(monkeypatch, create=_create)

        with pytest.raises(AIIntegrationError):
            await ai.generate_release_note("v1", [JiraTicketData("RAD-1", "x")])

    @pytest.mark.asyncio
    async def test_missing_api_key_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Don't patch _get_client here — exercise the real _require_config path.
        monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
        await ai.aclose()

        with pytest.raises(AIIntegrationError):
            await ai.generate_release_note("v1", [JiraTicketData("RAD-1", "x")])
