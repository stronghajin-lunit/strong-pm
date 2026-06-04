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


_FEATURE_LIST_SYSTEM = """\
You are a senior technical PM creating a Feature List from PRD source documents.
Output a single JSON object with this exact structure — no markdown fences, no explanation:
{
  "overview": {
    "project_name": "...",
    "system_function": "...",
    "background": "1-2 sentence summary",
    "goal": "1-2 sentence summary"
  },
  "features": [
    {
      "category": "Category Name",
      "name": "Feature Name in Title Case",
      "description": "Active present tense, user perspective, 1-2 sentences.",
      "priority": "Must Have",
      "complexity": "M",
      "dependencies": "-",
      "note": ""
    }
  ]
}

Feature rules:
- Group by category; within each category sort Must Have → Should Have → Nice to Have.
- Priority values: exactly "Must Have", "Should Have", or "Nice to Have".
- Complexity: S = ≤3 SP simple CRUD; M = 5-8 SP multi-component+API; L = 13+ SP pipeline/integration.
- Dependencies: use "F-NN" referencing the final sorted position. Use "-" if none.
- Note: "[TBD - source unclear]" when uncertain; empty string otherwise.
- Terminology: "page" → "UI", "API endpoint" → "API", "AICP" → "Annotation Admin".
- Extract all meaningful features; do not pad with trivial items.\
"""


async def generate_feature_list(
    project_name: str,
    source_pages: list[dict[str, str]],
    project_context: str,
) -> dict:
    """Generate Feature List overview + features from PRD source pages."""
    import json as _json

    client = _get_client()

    pages_text = "\n\n".join(
        f"=== {p['title']} ===\n{p['content'][:3000]}" for p in source_pages
    )
    user_content = (
        f"Project: {project_name}\n\n"
        f"=== Project Context ===\n{project_context[:1500]}\n\n"
        f"=== PRD Source Pages ===\n{pages_text}"
    )

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=4096,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": _FEATURE_LIST_SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    raw = "".join(block.text for block in response.content if block.type == "text").strip()
    if not raw:
        raise AIIntegrationError("Anthropic returned empty feature list")

    try:
        data = _json.loads(raw)
    except _json.JSONDecodeError:
        # Try to extract JSON from response if wrapped in text
        import re as _re
        m = _re.search(r"\{.*\}", raw, _re.DOTALL)
        if not m:
            raise AIIntegrationError("Could not parse feature list JSON from AI response")
        data = _json.loads(m.group(0))

    # Assign sequential IDs to features
    for i, feat in enumerate(data.get("features", []), 1):
        feat["id"] = f"F-{i:02d}"

    return data


_PRD_SYSTEM = """\
You are a senior technical PM writing a PRD for a medical AI software team.
You will receive:
- Kickoff document content (source of truth)
- Project context (Confluence summary)
- Repo context (tech stack and key terms)
- Target team and their responsibilities

Fill in the following PRD sections with well-structured content.
Output EXACTLY the section delimiters and content as shown below.
Do NOT change section names. Do NOT add extra sections.

Terminology rules:
- "page" → "UI" (e.g. "list UI", "detail UI")
- "Develop" → "Build" or "Implement"
- "API endpoint" → "API"
- "AICP" → "Annotation Admin"

=== Background ===
<2-3 sentences. Why this feature is needed, based on kickoff content.>

=== Goal ===
<Bullet list of 2-4 concrete goals extracted from kickoff.>

=== In Scope ===
<3-6 high-level bullet points copied or lightly paraphrased directly from the kickoff's \
scope section. Keep the same level of detail as the kickoff — short phrases, not sentences. \
Do NOT elaborate or add context beyond what the kickoff states.>

=== Out of Scope ===
<3-6 high-level bullet points copied or lightly paraphrased directly from the kickoff's \
out-of-scope section. Same brevity as the kickoff. Do NOT elaborate.>

=== Target User ===
<Output exactly two sub-sections in Confluence storage format:

1. A bold paragraph <p><strong>User Definition</strong></p> followed by a <ul> where each \
<li> is: <strong>TeamName</strong> — one sentence describing what they do in context of \
this project. Only include teams relevant to this project.

2. A bold paragraph <p><strong>User Story</strong></p> followed by a Confluence storage \
table with 3 columns: As a | I want / need to | so that I can.
3-7 rows. Each row is one concrete user action. "As a" = short role name (e.g. "MDM team"). \
Keep each cell short — a phrase, not a sentence. No trailing period.>

=== User Story ===
<Leave this empty — user stories are already included in Target User above.>

=== Requirements ===
<A Confluence storage-format table with 5 columns: \
Requirement ID | Functional/Non-functional | Requirement | Priority | Acceptance Criteria.
- Requirement ID: REQ-001, REQ-002, ...
- Priority: use a Confluence Status macro:
  MUST HAVE → <ac:structured-macro ac:name="status" ac:schema-version="1"><ac:parameter \
ac:name="colour">Red</ac:parameter><ac:parameter ac:name="title">MUST HAVE\
</ac:parameter></ac:structured-macro>
  SHOULD HAVE → same macro with colour=Yellow and title=SHOULD HAVE
  NICE TO HAVE → same macro with colour=Green and title=NICE TO HAVE
- Include only key requirements. Do not pad.
- Start with <table><tbody><tr><th>...</th></tr> header row, then data rows.>

=== Appendix. Terminology ===
<A Confluence storage-format table with two columns: Term | Definition.
Include technical terms from the repo context relevant to this feature.>\
"""


async def generate_prd_sections(
    project_name: str,
    target_team_label: str,
    target_team_description: str,
    kickoff_content: str,
    project_context: str,
    repo_context: str,
) -> str:
    """Generate PRD section content from kickoff + project context + repo index."""
    client = _get_client()

    user_content = (
        f"Project: {project_name}\n"
        f"Target Team: {target_team_label}\n"
        f"Team responsibilities: {target_team_description}\n\n"
        f"=== Kickoff Document ===\n{kickoff_content[:6000]}\n\n"
        f"=== Project Context ===\n{project_context[:2000]}\n\n"
        f"=== Repo Context ===\n{repo_context[:2000]}"
    )

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=4096,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": _PRD_SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    result = "".join(block.text for block in response.content if block.type == "text").strip()
    if not result:
        raise AIIntegrationError("Anthropic returned empty PRD content")
    return result


_PROJECT_CONTEXT_SYSTEM = (
    "You are a technical PM assistant. You will receive the content of one or more "
    "Confluence pages belonging to a software project.\n"
    "\n"
    "Summarise the project into a concise context block that another AI can use "
    "to understand the project. Cover:\n"
    "- Purpose and background\n"
    "- Key requirements and goals\n"
    "- Architecture or technical decisions (if present)\n"
    "- Current status or progress\n"
    "- Important constraints or risks\n"
    "\n"
    "Write in English. Be specific and engineer-facing. "
    "Max 600 words. Plain text only — no Markdown headers or bullet markers."
)


async def summarize_project_context(
    project_name: str,
    pages: list[dict[str, str]],
) -> str:
    """Summarise all Confluence pages into a single project context string."""
    client = _get_client()

    pages_text = "\n\n".join(
        f"=== {p['title']} ===\n{p['content']}" for p in pages if p.get("content")
    )
    if not pages_text.strip():
        raise AIIntegrationError("No page content to summarise")

    user_content = f"Project: {project_name}\n\nConfluence pages:\n\n{pages_text}"

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1024,
            thinking={"type": "disabled"},
            system=[
                {
                    "type": "text",
                    "text": _PROJECT_CONTEXT_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    result = "".join(block.text for block in response.content if block.type == "text").strip()
    if not result:
        raise AIIntegrationError("Anthropic returned empty project context")
    return result


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
    example_page_storage: str = "",  # kept for API compat; no longer sent to AI
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
        f"=== Sprint Data ===\n{rows_text}"
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
    """Generate a verb+feature_name action phrase for the Jira summary (uses fast/cheap model)."""
    client = _get_client()

    try:
        response = await client.messages.create(
            model=settings.AI_MODEL_FAST,
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
