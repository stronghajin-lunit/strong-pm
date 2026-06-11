"""Anthropic Claude integration for AI-generated content.

Real implementation (no mock fallback): requires ANTHROPIC_API_KEY.
- generate_release_note: Markdown release note from a Jira version + tickets.
- generate_jira_ticket: summary + ADF description for a Jira issue.
Function contracts (dataclasses + signatures) are kept stable for the service layer.
"""

from dataclasses import dataclass

import anthropic

from app.core.ai_model_config import get_model
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
class FeatureListContextConfig:
    project_summary_position: str = "beginning"
    project_summary_char_limit: int = 1500
    prd_pages_position: str = "middle"
    prd_pages_char_limit: int = 10000
    reference_docs_position: str = "end"
    reference_docs_char_limit: int = 10000


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
            model=get_model("release_note_creator"),
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
            model=get_model("jira_ticket_writer"),
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
- When [HIGH-PRIORITY REFERENCE] sections appear in the context, treat them as primary specification sources; their content takes precedence over and supplements the PRD pages.
- Extract all meaningful features; do not pad with trivial items.\
"""


_POSITION_ORDER = {"beginning": 0, "middle": 1, "end": 2}


async def generate_feature_list(
    project_name: str,
    source_pages: list[dict[str, str]],
    project_context: str,
    reference_pages: list[dict[str, str]] | None = None,
    context_config: FeatureListContextConfig | None = None,
) -> dict:
    """Generate Feature List overview + features from PRD source pages."""
    import json as _json

    client = _get_client()
    cfg = context_config or FeatureListContextConfig()

    summary_block = (
        f"Project: {project_name}\n\n"
        f"=== Project Context ===\n{project_context[:cfg.project_summary_char_limit]}"
    )

    prd_raw = "\n\n".join(f"=== {p['title']} ===\n{p['content']}" for p in source_pages)
    prd_block = f"=== PRD Source Pages ===\n{prd_raw[:cfg.prd_pages_char_limit]}"

    ref_block: str | None = None
    if reference_pages:
        ref_raw = "\n\n".join(
            f"=== [HIGH-PRIORITY REFERENCE] {p['title']} ===\n{p['content']}"
            for p in reference_pages
        )
        ref_block = f"=== Reference Documents ===\n{ref_raw[:cfg.reference_docs_char_limit]}"

    blocks: list[tuple[int, str]] = [
        (_POSITION_ORDER.get(cfg.project_summary_position, 0), summary_block),
        (_POSITION_ORDER.get(cfg.prd_pages_position, 1), prd_block),
    ]
    if ref_block is not None:
        blocks.append((_POSITION_ORDER.get(cfg.reference_docs_position, 2), ref_block))
    blocks.sort(key=lambda x: x[0])

    user_content = "\n\n".join(text for _, text in blocks)

    try:
        response = await client.messages.create(
            model=get_model("feature_list_writer"),
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
            model=get_model("prd_writer"),
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

_SINGLE_PAGE_CONTEXT_SYSTEM = (
    "You are a technical PM assistant summarising a single Confluence page "
    "for a software project's engineering context.\n"
    "\n"
    "Write 2–4 sentences capturing what matters for engineers and PMs: "
    "purpose, key decisions, requirements, current status, and constraints.\n"
    "\n"
    "Write in English. Be specific and factual. "
    "Plain text only — no Markdown, no bullet points. "
    "Do not restate the page title in your summary."
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
            model=get_model("project_context_sync"),
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


async def summarize_single_page(
    project_name: str,
    page_title: str,
    page_content: str,
) -> str:
    """Summarise a single Confluence page into 2–4 sentences."""
    client = _get_client()
    if not page_content.strip():
        raise AIIntegrationError(f"Page '{page_title}' has no content to summarise")

    user_content = f"Project: {project_name}\nPage: {page_title}\n\n{page_content}"

    try:
        response = await client.messages.create(
            model=get_model("project_context_sync"),
            max_tokens=256,
            thinking={"type": "disabled"},
            system=[
                {
                    "type": "text",
                    "text": _SINGLE_PAGE_CONTEXT_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    result = "".join(block.text for block in response.content if block.type == "text").strip()
    if not result:
        raise AIIntegrationError(f"Anthropic returned empty summary for page '{page_title}'")
    return result


_TRANSLATE_KO_SYSTEM = (
    "Translate the following English project context into Korean.\n"
    "Keep all proper nouns, product names, and technical terms in English.\n"
    "Use natural, professional Korean. Plain text only — no Markdown."
)


async def _translate_chunk(client: anthropic.AsyncAnthropic, chunk: str) -> str:
    """Translate a single text chunk to Korean."""
    try:
        response = await client.messages.create(
            model=get_model("project_context_sync"),
            max_tokens=4096,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": _TRANSLATE_KO_SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": chunk}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    result = "".join(block.text for block in response.content if block.type == "text").strip()
    if not result:
        raise AIIntegrationError("Anthropic returned empty Korean translation")
    return result


async def translate_context_to_korean(context: str) -> str:
    """Translate English project context to Korean, section by section."""
    client = _get_client()

    # Split on section boundaries (## heading) so each chunk fits in one API call
    raw_sections = context.split("\n\n## ")
    sections: list[str] = []
    for i, s in enumerate(raw_sections):
        sections.append(s if i == 0 else f"## {s}")

    translated = [await _translate_chunk(client, s) for s in sections if s.strip()]
    return "\n\n".join(translated)


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
            model=get_model("sprint_report_creator"),
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


_APPLY_COMMENTS_SYSTEM = """\
You are a technical PM assistant. You will receive a Feature List and a list of Confluence comments.
Your job is to produce a minimal set of changes that exactly reflect what the comments request.

How to identify which feature a comment refers to:
- If the comment includes [anchored to: "..."], that is the exact text selected in the Confluence page when the comment was written. Match it to the feature whose name, description, or ID contains that text.
- If the comment explicitly mentions a feature ID (F-01, F-02, ...) or feature name, use that.
- If both are present, use the anchored text for matching.

Rules (CRITICAL — follow exactly):
- ONLY produce changes for features that are directly identified by a comment using the matching rules above.
- Each change you output MUST correspond to exactly one comment. If you cannot point to a specific comment that requests the change, do NOT output it.
- For "update" actions: change only the specific fields indicated by the comment. Leave all other fields untouched.
- For "delete" actions: remove that feature.
- Do NOT change features that are not mentioned in any comment — even if you think a change would be beneficial.
- Do NOT rewrite or paraphrase existing field values unless the comment explicitly asks for a change to that field.
- Do NOT infer or guess changes beyond what the comment literally requests.

Transformation rules (apply ONLY when a comment explicitly requests a transformation):
- "Note로 이동" / "move to Note" with anchored text: write a concise, human-readable sentence in the "note" field that captures what the anchored text implies should be noted. Do NOT copy the raw anchored text verbatim — synthesize it into a clear note.
- "Description으로 이동" / "move to Description": synthesize the anchored text into a clear description sentence.
- Similar transformation comments: use the anchored text as input context and write a clean, synthesized value for the target field.

IMPORTANT: Output ONLY the raw JSON array. No explanation, no markdown, no text before or after. Start your response with [ and end with ].
Each element must have one of these shapes:
  { "action": "update", "feature_id": "F-01", "changes": { "<field>": "<new value>" } }
  { "action": "delete", "feature_id": "F-03" }

Valid field names for "changes": name, category, description, priority, complexity, dependencies, note
Priority values must be exactly: "Must Have", "Should Have", or "Nice to Have"
Complexity values must be exactly: "S", "M", or "L"
If a comment cannot be matched to any feature, skip it.
If you are uncertain whether a comment requests a change to a feature, skip it — do NOT guess.\
"""


@dataclass
class FeatureChange:
    action: str  # "update" or "delete"
    feature_id: str
    changes: dict[str, str]  # empty for delete


async def apply_feature_comments(
    features: list[dict],
    comments: list[str],
) -> list[FeatureChange]:
    """Parse Confluence comments and return minimal feature changes."""
    import json as _json

    client = _get_client()

    features_text = _json.dumps(features, ensure_ascii=False, indent=2)
    comments_text = "\n".join(f"- {c}" for c in comments)
    user_content = (
        f"=== Current Feature List ===\n{features_text}\n\n"
        f"=== Comments to Apply ===\n{comments_text}"
    )

    try:
        response = await client.messages.create(
            model=get_model("feature_list_writer"),
            max_tokens=2048,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": _APPLY_COMMENTS_SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    raw = "".join(block.text for block in response.content if block.type == "text").strip()
    if not raw:
        raise AIIntegrationError("Anthropic returned empty feature changes")

    try:
        data = _json.loads(raw)
    except _json.JSONDecodeError:
        # Try each '[' position until we find a valid JSON array
        data = None
        pos = 0
        while True:
            start = raw.find("[", pos)
            if start == -1:
                break
            # Walk to matching ']'
            depth = 0
            end = -1
            in_string = False
            escape_next = False
            for i, ch in enumerate(raw[start:], start):
                if escape_next:
                    escape_next = False
                    continue
                if ch == "\\" and in_string:
                    escape_next = True
                    continue
                if ch == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            if end == -1:
                break
            try:
                data = _json.loads(raw[start : end + 1])
                break  # parsed successfully
            except _json.JSONDecodeError:
                pos = start + 1  # try next '[' position
        if data is None:
            raise AIIntegrationError("Could not parse feature changes JSON from AI response")

    return [
        FeatureChange(
            action=item["action"],
            feature_id=item["feature_id"],
            changes=item.get("changes", {}),
        )
        for item in data
        if item.get("action") in ("update", "delete") and item.get("feature_id")
    ]


async def generate_ticket_action(feature_description: str) -> JiraTicketAction:
    """Generate a verb+feature_name action phrase for the Jira summary (uses fast/cheap model)."""
    client = _get_client()

    try:
        response = await client.messages.create(
            model=get_model("jira_ticket_writer"),
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


_SLACK_QA_SYSTEM = (
    "You are a product manager assistant. Extract the Q&A from the provided Slack conversation.\n"
    "\n"
    "Rules:\n"
    "- question: the question(s) asked. If multiple questions, use bullet points starting with '• '. "
    "Always write in English, translating from Korean if needed.\n"
    "- answer: a concise summary of the answer. Always write in English, translating from Korean if needed.\n"
    "- ai_project_name: the most relevant project name from the provided list, or null if unclear.\n"
    "\n"
    "Return ONLY a JSON object with exactly these keys: question, answer, ai_project_name.\n"
    "No markdown fences, no extra text."
)


@dataclass
class SlackQaSummary:
    question: str
    answer: str
    ai_project_name: str | None


async def summarize_slack_thread(
    raw_messages: list[str],
    project_names: list[str],
) -> SlackQaSummary:
    """Summarize a Slack thread into Q&A using the fast/cheap model."""
    import json as _json

    client = _get_client()

    conversation = "\n".join(f"- {m}" for m in raw_messages)
    projects_hint = ", ".join(project_names) if project_names else "none"
    user_content = (
        f"Available projects: {projects_hint}\n\n"
        f"Slack conversation:\n{conversation}"
    )

    try:
        response = await client.messages.create(
            model=get_model("slack_qa_summary"),
            max_tokens=512,
            thinking={"type": "disabled"},
            system=[{"type": "text", "text": _SLACK_QA_SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.AnthropicError as exc:
        raise AIIntegrationError(f"Anthropic request failed: {exc}") from exc

    raw = "".join(block.text for block in response.content if block.type == "text").strip()
    if not raw:
        raise AIIntegrationError("Anthropic returned empty Slack Q&A summary")

    try:
        data = _json.loads(raw)
    except _json.JSONDecodeError:
        import re as _re
        m = _re.search(r"\{.*\}", raw, _re.DOTALL)
        if not m:
            raise AIIntegrationError("Could not parse Slack Q&A JSON from AI response")
        data = _json.loads(m.group(0))

    return SlackQaSummary(
        question=data.get("question", ""),
        answer=data.get("answer", ""),
        ai_project_name=data.get("ai_project_name"),
    )
