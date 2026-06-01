"""Anthropic Claude integration for AI-generated content.

Real implementation (no mock fallback): requires ANTHROPIC_API_KEY.
- generate_release_note: Markdown release note from a Jira version + tickets.
- generate_jira_ticket: summary + ADF description for a Jira issue.
Function contracts (dataclasses + signatures) are kept stable for the service layer.
"""

from dataclasses import dataclass

import anthropic

from app.core.config import settings
from app.integrations.jira import JiraTicketData

_MAX_TOKENS = 4096

_SYSTEM_PROMPT = (
    "You are a release manager writing concise, professional release notes from a "
    "Jira fix version and its tickets.\n"
    "\n"
    "Output Markdown with EXACTLY this structure:\n"
    "1. A first line `# Highlights`, followed by one or two sentences summarizing "
    "the most important user-facing changes in this release.\n"
    "2. Then grouped sections using `### ` headings, only for groups that have items: "
    "`### New Features`, `### Improvements`, `### Fixes`, `### Maintenance`.\n"
    "3. Under each heading, bullet points in the form:\n"
    "   `- **Short title** — plain-language description for end users. (TICKET-ID, ...)`\n"
    "\n"
    "Rules: use `**bold**` for the short title; write descriptions for end users, not "
    "developers; keep every ticket's ID for traceability; merge closely related tickets "
    "into one bullet. Do NOT include the version label as a heading, an intro/preamble, "
    "HTML entities (use a plain '-' dash), or code fences. Output only the Markdown body."
)


@dataclass
class ReleaseNoteContent:
    body: str


@dataclass
class JiraTicketContent:
    summary: str
    description: str  # plain text; callers wrap into ADF


class AIIntegrationError(Exception):
    """Raised when the Anthropic API is unreachable, misconfigured, or errors."""


_client: anthropic.AsyncAnthropic | None = None


def _require_config() -> None:
    if not settings.ANTHROPIC_API_KEY.strip():
        raise AIIntegrationError("AI integration is not configured: missing ANTHROPIC_API_KEY")


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    _require_config()
    if _client is None:
        base_url = settings.ANTHROPIC_BASE_URL.strip() or None
        _client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            base_url=base_url,
        )
    return _client


async def aclose() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


async def generate_release_note(
    jira_version_label: str,
    tickets: list[JiraTicketData],
) -> ReleaseNoteContent:
    """Generate Markdown release-note content from the version's tickets."""
    client = _get_client()

    ticket_lines = "\n".join(f"- {t.ticket_id}: {t.title}" for t in tickets)
    user_content = f"Jira fix version: {jira_version_label}\n\nTickets:\n{ticket_lines}\n"

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=_MAX_TOKENS,
            thinking={"type": "disabled"},
            system=[
                {
                    "type": "text",
                    "text": _SYSTEM_PROMPT,
                    # Caches the stable instructions once they exceed the model's
                    # minimum cacheable prefix; harmless below it.
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    body = "".join(block.text for block in response.content if block.type == "text")
    if not body.strip():
        raise AIIntegrationError("Anthropic returned an empty release note")
    return ReleaseNoteContent(body=body)


_JIRA_TICKET_SYSTEM = (
    "You are a senior product manager writing Jira issue content from a feature description "
    "and a Definition of Done.\n"
    "\n"
    "Output exactly two sections separated by a blank line:\n"
    "LINE 1: A concise one-line issue summary (max 120 chars). No prefix, no label.\n"
    "LINE 3+: A plain-text description (no Markdown headers or fences) with these parts:\n"
    "  Background: one sentence explaining why this work is needed.\n"
    "  Scope: bullet points listing what must be built or changed.\n"
    "  Definition of Done: bullet points, each starting with '- [ ]'.\n"
    "\n"
    "Rules: write for engineers; be specific; avoid vague words like 'improve' or 'enhance'."
)


async def generate_jira_ticket(
    product: str,
    issue_type: str,
    feature_description: str,
    definition_of_done: str,
) -> JiraTicketContent:
    """Generate a Jira issue summary and description via Claude."""
    client = _get_client()

    user_content = (
        f"Product: {product}\n"
        f"Type: {issue_type}\n"
        f"Feature Description:\n{feature_description}\n\n"
        f"Definition of Done:\n{definition_of_done}\n"
    )

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1024,
            thinking={"type": "disabled"},
            system=[
                {
                    "type": "text",
                    "text": _JIRA_TICKET_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    raw = "".join(block.text for block in response.content if block.type == "text").strip()
    if not raw:
        raise AIIntegrationError("Anthropic returned empty ticket content")

    lines = raw.splitlines()
    summary = lines[0].strip()
    description = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""
    return JiraTicketContent(summary=summary, description=description)
