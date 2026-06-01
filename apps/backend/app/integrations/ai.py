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
class JiraTicketAction:
    action: str  # verb + feature name, e.g. "Build TMA Registration Page"


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


_JIRA_TICKET_SUMMARY_SYSTEM = (
    "Generate a concise action phrase for a Jira issue summary.\n"
    "\n"
    "Rules:\n"
    "- Start with one verb: Build Create Implement Add Update Fix Remove Migrate Define\n"
    "- Follow with the concise feature name as a noun phrase (title case)\n"
    "- Max 80 characters total\n"
    "- No product name, no area prefix, no colon\n"
    "- Return ONLY the action phrase. Nothing else.\n"
    "\n"
    "Examples:\n"
    "Input: TMA registration Page UI\n"
    "Output: Build TMA Registration Page\n"
    "Input: Add license field to block registration form\n"
    "Output: Add License Field to Block Registration Form"
)


_JIRA_TICKET_DESCRIPTION_SYSTEM = (
    "You write Jira ticket descriptions for a medical AI software team.\n"
    "Given a feature description and a Definition of Done, produce exactly two sections.\n"
    "\n"
    "Output format (plain text, no Markdown headers or fences):\n"
    "Context\n"
    "<2–3 sentences. Explain what needs to be built and why, using reasonable inference "
    "about the system based on the input. Write in English. Be specific and engineer-facing.>\n"
    "\n"
    "DoD\n"
    "<1–3 checkbox items ONLY. Directly reflect what the user wrote — do not expand, "
    "do not add implied sub-tasks (no responsive layout, no design review, no cross-browser). "
    "Each line: '- [ ] ...'. Keep each item short (one clause).>\n"
    "\n"
    "Rules:\n"
    "- No Background section, no Scope section, no other sections.\n"
    "- DoD must stay minimal — closer to the user's words is better.\n"
    "- Write Context in English even if the input is in Korean."
)


async def generate_ticket_description(
    feature_description: str,
    definition_of_done: str,
    issue_type: str,
) -> str:
    """Generate formatted ticket description (Context+DoD or Bug template) via Claude."""
    client = _get_client()

    if issue_type.lower() == "bug":
        system = (
            "You write Jira bug ticket descriptions.\n"
            "Given a bug description and expected behaviour, produce:\n"
            "\n"
            "Current behaviour\n"
            "<concise description of the bug>\n"
            "\n"
            "Expected behaviour\n"
            "<what should happen instead, as checkbox items '- [ ] ...'>\n"
            "\n"
            "No other sections. Plain text only."
        )
        user_content = (
            f"Current behaviour (raw):\n{feature_description}\n\n"
            f"Expected behaviour (raw):\n{definition_of_done}"
        )
    else:
        system = _JIRA_TICKET_DESCRIPTION_SYSTEM
        user_content = (
            f"Feature Description:\n{feature_description}\n\n"
            f"Definition of Done:\n{definition_of_done}"
        )

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=512,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    body = "".join(block.text for block in response.content if block.type == "text").strip()
    if not body:
        raise AIIntegrationError("Anthropic returned empty ticket description")
    return body


_SPRINT_REPORT_SYSTEM = """\
You are a technical PM writing two specific sections of a Confluence sprint report \
for a medical AI software team.
You will receive structured sprint data and an existing Confluence page as reference \
for the table format to match exactly.

Output EXACTLY two blocks separated by the delimiter lines shown below. \
No other text, no markdown fences.

=== SPRINT_SUMMARY ===
<Sprint Summary table as Confluence storage-format XHTML, matching the reference table format.
Columns: Initiative | Epic | Summary | Count | SP | % of Planned Capacity | Contributors
Rules:
- One row per (Initiative, Epic) group.
- Summary cell: <ul><li>one bullet per ticket</li></ul>. Apply: "page"→"UI", \
"Develop"→"Build"/"Implement", "API endpoint"→"API".
- "% of Planned Capacity" = (group SP / total SP) * 100 as "X%". Show "—" when SP is 0.
- "Main Contributors" = comma-separated short names by SP descending.>

=== KEY_DELIVERABLES ===
<Key Deliverables Completed section as Confluence storage-format XHTML.
For EACH initiative group: <p><strong>{Initiative name}</strong></p> then \
<ul><li>one concise sentence per epic summarising what was delivered</li></ul>.
Cover all initiatives. No ticket IDs.>\
"""


async def generate_sprint_report(
    sprint_label: str,
    week_number: int,
    grouped_data: list[dict],
    total_sp: float,
    example_page_storage: str,
) -> str:
    """Generate Confluence sprint report as storage-format XML."""
    client = _get_client()

    rows_text = "\n".join(
        f"Initiative: {row['initiative']}\n"
        f"  Epic: {row['epic']}\n"
        f"  Tickets: {', '.join(row['summaries'])}\n"
        f"  Story count: {row['story_count']} | Task count: {row['task_count']}\n"
        f"  Story Points: {row['story_points']}\n"
        f"  Contributors: {', '.join(row['contributors'])}"
        for row in grouped_data
    )
    user_content = (
        f"Sprint: {sprint_label} (Week {week_number})\n"
        f"Total Story Points: {total_sp}\n\n"
        f"=== Sprint Data ===\n{rows_text}\n\n"
        f"=== Example Confluence Page (reference format) ===\n{example_page_storage[:8000]}"
    )

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=4096,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": _SPRINT_REPORT_SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    result = "".join(block.text for block in response.content if block.type == "text").strip()
    if not result:
        raise AIIntegrationError("Anthropic returned empty sprint report")
    return result


async def generate_ticket_action(feature_description: str) -> JiraTicketAction:
    """Generate a verb+feature_name action phrase for the Jira summary."""
    client = _get_client()

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=64,
            thinking={"type": "disabled"},
            system=[
                {
                    "type": "text",
                    "text": _JIRA_TICKET_SUMMARY_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": feature_description.strip()}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    action = "".join(block.text for block in response.content if block.type == "text").strip()
    if not action:
        raise AIIntegrationError("Anthropic returned empty action phrase")
    return JiraTicketAction(action=action)
