"""Atlassian Jira Cloud REST integration.

Real implementation (no mock fallback): requires JIRA_* settings to be
configured. Contracts (dataclasses + function signatures) are kept stable so the
service layer is unaffected.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import settings


@dataclass
class JiraVersionData:
    jira_id: str
    label: str
    synced_at: datetime


@dataclass
class JiraTicketData:
    ticket_id: str
    title: str


@dataclass
class JiraSprintData:
    sprint_id: int
    label: str
    state: str  # "active" | "future" | "closed"


@dataclass
class JiraIssueResult:
    key: str
    url: str


class JiraIntegrationError(Exception):
    """Raised when Jira is unreachable, misconfigured, or returns an error."""


_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_client: httpx.AsyncClient | None = None
_agile_client: httpx.AsyncClient | None = None


def _require_config() -> None:
    missing = [
        name
        for name, value in (
            ("JIRA_BASE_URL", settings.JIRA_BASE_URL),
            ("JIRA_EMAIL", settings.JIRA_EMAIL),
            ("JIRA_API_TOKEN", settings.JIRA_API_TOKEN),
            ("JIRA_PROJECT_KEYS", settings.JIRA_PROJECT_KEYS),
        )
        if not value.strip()
    ]
    if missing:
        raise JiraIntegrationError(
            f"Jira integration is not configured: missing {', '.join(missing)}"
        )


def _get_client() -> httpx.AsyncClient:
    """Return a lazily-created shared REST v3 client (keep-alive across calls)."""
    global _client
    _require_config()
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=settings.JIRA_BASE_URL.rstrip("/"),
            auth=httpx.BasicAuth(settings.JIRA_EMAIL, settings.JIRA_API_TOKEN),
            headers={"Accept": "application/json"},
            timeout=_TIMEOUT,
        )
    return _client


def _get_agile_client() -> httpx.AsyncClient:
    """Return a lazily-created shared Agile REST client."""
    global _agile_client
    _require_config()
    if _agile_client is None:
        _agile_client = httpx.AsyncClient(
            base_url=settings.JIRA_BASE_URL.rstrip("/"),
            auth=httpx.BasicAuth(settings.JIRA_EMAIL, settings.JIRA_API_TOKEN),
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=_TIMEOUT,
        )
    return _agile_client


async def aclose() -> None:
    """Close shared clients (call on application shutdown)."""
    global _client, _agile_client
    if _client is not None:
        await _client.aclose()
        _client = None
    if _agile_client is not None:
        await _agile_client.aclose()
        _agile_client = None


async def _get(path: str, params: dict[str, Any] | None = None) -> httpx.Response:
    client = _get_client()
    try:
        return await client.get(path, params=params)
    except httpx.HTTPError as exc:
        raise JiraIntegrationError(f"Jira request failed: {exc}") from exc


async def _post(path: str, json: dict[str, Any], *, agile: bool = False) -> httpx.Response:
    client = _get_agile_client() if agile else _get_client()
    try:
        return await client.post(path, json=json)
    except httpx.HTTPError as exc:
        raise JiraIntegrationError(f"Jira request failed: {exc}") from exc


async def _agile_get(path: str, params: dict[str, Any] | None = None) -> httpx.Response:
    client = _get_agile_client()
    try:
        return await client.get(path, params=params)
    except httpx.HTTPError as exc:
        raise JiraIntegrationError(f"Jira request failed: {exc}") from exc


def _ensure_ok(response: httpx.Response) -> dict[str, Any]:
    if response.status_code >= 400:
        raise JiraIntegrationError(
            f"Jira API error {response.status_code} for {response.request.url}"
        )
    try:
        data: dict[str, Any] = response.json()
    except ValueError as exc:
        raise JiraIntegrationError("Jira API returned invalid JSON") from exc
    return data


async def fetch_fix_versions() -> list[JiraVersionData]:
    """Return fix versions across all configured project keys (newest first)."""
    now = datetime.now(UTC)
    versions: list[JiraVersionData] = []
    for key in settings.jira_project_keys_list:
        start_at = 0
        while True:
            response = await _get(
                f"/rest/api/3/project/{key}/version",
                params={"startAt": start_at, "maxResults": 50, "orderBy": "-sequence"},
            )
            data = _ensure_ok(response)
            values: list[dict[str, Any]] = data.get("values", [])
            for v in values:
                if v.get("archived"):
                    continue
                versions.append(
                    JiraVersionData(
                        jira_id=str(v["id"]),
                        label=str(v["name"]),
                        synced_at=now,
                    )
                )
            if data.get("isLast", True) or not values:
                break
            start_at += len(values)
    return versions


async def fetch_tickets_by_version(jira_version_id: str) -> list[JiraTicketData] | None:
    """Return tickets for a fix version.

    Returns None when the version id does not exist (so services emit 404), and
    an empty list when the version exists but has no issues.
    """
    existence = await _get(f"/rest/api/3/version/{jira_version_id}")
    if existence.status_code == 404:
        return None
    _ensure_ok(existence)
    return await _search_issues(jira_version_id)


async def _search_issues(jira_version_id: str) -> list[JiraTicketData]:
    """Page through issues of a fix version via the enhanced JQL search."""
    tickets: list[JiraTicketData] = []
    jql = f"fixVersion = {jira_version_id} ORDER BY key ASC"
    next_token: str | None = None
    while True:
        params: dict[str, Any] = {"jql": jql, "fields": "summary", "maxResults": 100}
        if next_token:
            params["nextPageToken"] = next_token
        response = await _get("/rest/api/3/search/jql", params=params)
        data = _ensure_ok(response)
        issues: list[dict[str, Any]] = data.get("issues", [])
        for issue in issues:
            fields = issue.get("fields") or {}
            tickets.append(
                JiraTicketData(
                    ticket_id=str(issue["key"]),
                    title=str(fields.get("summary") or ""),
                )
            )
        next_token = data.get("nextPageToken")
        if data.get("isLast", True) or not next_token:
            break
    return tickets


# ─── Jira Ticket Writer ───────────────────────────────────────────────────────


def _to_adf_doc(text: str) -> dict[str, Any]:
    """Wrap plain text into a minimal Atlassian Document Format (ADF) document."""
    paragraphs: list[dict[str, Any]] = []
    for line in text.splitlines():
        paragraphs.append(
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": line or " "}],
            }
        )
    return {
        "version": 1,
        "type": "doc",
        "content": paragraphs or [
            {"type": "paragraph", "content": [{"type": "text", "text": " "}]}
        ],
    }


async def create_issue(
    project_key: str,
    issue_type: str,
    summary: str,
    description: str,
    labels: list[str] | None = None,
) -> JiraIssueResult:
    """Create a Jira issue and return its key and browse URL."""
    fields: dict[str, Any] = {
        "project": {"key": project_key},
        "issuetype": {"name": issue_type},
        "summary": summary,
        "description": _to_adf_doc(description),
    }
    if labels:
        fields["labels"] = labels
    response = await _post("/rest/api/3/issue", {"fields": fields})
    data = _ensure_ok(response)
    key = str(data["key"])
    base = settings.JIRA_BASE_URL.rstrip("/")
    return JiraIssueResult(key=key, url=f"{base}/browse/{key}")


async def fetch_sprints(board_id: int) -> list[JiraSprintData]:
    """Return active and future sprints for a board (Agile API)."""
    sprints: list[JiraSprintData] = []
    start_at = 0
    while True:
        response = await _agile_get(
            f"/rest/agile/1.0/board/{board_id}/sprint",
            params={"state": "active,future", "startAt": start_at, "maxResults": 50},
        )
        data = _ensure_ok(response)
        values: list[dict[str, Any]] = data.get("values", [])
        for s in values:
            sprints.append(
                JiraSprintData(
                    sprint_id=int(s["id"]),
                    label=str(s["name"]),
                    state=str(s["state"]),
                )
            )
        if data.get("isLast", True) or not values:
            break
        start_at += len(values)
    return sprints


async def add_issue_to_sprint(sprint_id: int, issue_key: str) -> None:
    """Move an issue into a sprint (Agile API)."""
    response = await _post(
        f"/rest/agile/1.0/sprint/{sprint_id}/issue",
        {"issues": [issue_key]},
        agile=True,
    )
    if response.status_code >= 400:
        raise JiraIntegrationError(
            f"Failed to add {issue_key} to sprint {sprint_id}: {response.status_code}"
        )


# ─── Sprint Report ────────────────────────────────────────────────────────────


@dataclass
class SprintIssueData:
    key: str
    summary: str
    issue_type: str
    status: str
    assignee_name: str | None
    story_points: float | None
    epic_key: str | None
    epic_summary: str | None


_SPRINT_ISSUE_FIELDS = (
    "summary,issuetype,status,assignee,"
    # story points — field ID varies by Jira instance; try all common ones
    "customfield_10016,customfield_10028,customfield_10004,customfield_10008,"
    "customfield_10030,customfield_10034,story_points,"
    "parent,issuelinks"
)

# Common story-points field IDs across Jira Cloud instances
_SP_FIELD_IDS = (
    "customfield_10016",  # most common in classic projects
    "customfield_10028",  # some team-managed projects
    "customfield_10004",  # legacy/older configs
    "customfield_10008",  # enterprise configs
    "customfield_10030",
    "customfield_10034",
    "story_points",       # Agile API alias
)


def _parse_story_points(fields: dict[str, Any]) -> float | None:
    for field in _SP_FIELD_IDS:
        val = fields.get(field)
        if val is not None:
            try:
                sp = float(val)
                if sp >= 0:
                    return sp
            except (TypeError, ValueError):
                continue
    # Last resort: scan all customfield_* for a plausible numeric SP value
    for key, val in fields.items():
        if key.startswith("customfield_") and key not in _SP_FIELD_IDS:
            if isinstance(val, (int, float)) and 0 < val <= 100:
                return float(val)
    return None


def _parse_epic(fields: dict[str, Any]) -> tuple[str | None, str | None]:
    """Return (epic_key, epic_summary) from an issue's fields."""
    parent = fields.get("parent") or {}
    parent_type = (parent.get("fields") or {}).get("issuetype", {}).get("name", "")
    if parent_type == "Epic":
        return str(parent["key"]), str((parent.get("fields") or {}).get("summary", ""))
    # Classic epic link field
    epic_key = fields.get("customfield_10014")
    if epic_key:
        return str(epic_key), None
    return None, None


async def fetch_sprint_issues(sprint_id: int) -> list[SprintIssueData]:
    """Return all issues in a sprint (Agile API), excluding sub-tasks."""
    issues: list[SprintIssueData] = []
    start_at = 0
    while True:
        response = await _agile_get(
            f"/rest/agile/1.0/sprint/{sprint_id}/issue",
            params={
                "fields": _SPRINT_ISSUE_FIELDS,
                "startAt": start_at,
                "maxResults": 100,
            },
        )
        data = _ensure_ok(response)
        raw_issues: list[dict[str, Any]] = data.get("issues", [])
        for raw in raw_issues:
            fields = raw.get("fields") or {}
            issue_type = (fields.get("issuetype") or {}).get("name", "")
            if issue_type in ("Sub-task", "Subtask"):
                continue
            epic_key, epic_summary = _parse_epic(fields)
            assignee = fields.get("assignee") or {}
            issues.append(
                SprintIssueData(
                    key=str(raw["key"]),
                    summary=str(fields.get("summary") or ""),
                    issue_type=issue_type,
                    status=str((fields.get("status") or {}).get("name", "")),
                    assignee_name=assignee.get("displayName"),
                    story_points=_parse_story_points(fields),
                    epic_key=epic_key,
                    epic_summary=epic_summary,
                )
            )
        total = data.get("total", 0)
        start_at += len(raw_issues)
        if start_at >= total or not raw_issues:
            break
    return issues


async def fetch_issue_fields(issue_key: str, fields: str) -> dict[str, Any]:
    """Fetch a single issue and return its fields dict."""
    response = await _get(f"/rest/api/3/issue/{issue_key}", params={"fields": fields})
    if response.status_code == 404:
        return {}
    data = _ensure_ok(response)
    return dict(data.get("fields") or {})


async def resolve_initiative_from_epic(epic_key: str) -> str | None:
    """
    RAD Epic → any link to a PM-* ticket → parent Epic summary → initiative.

    Searches all issue links (regardless of link type name) for a PM-* key.
    Falls back to checking both outward and inward directions.
    Returns None if the chain cannot be resolved.
    """
    epic_fields = await fetch_issue_fields(epic_key, "issuelinks")
    if not epic_fields:
        return None

    pm_key: str | None = None
    for link in epic_fields.get("issuelinks") or []:
        for direction in ("outwardIssue", "inwardIssue"):
            target = link.get(direction) or {}
            key = str(target.get("key", ""))
            if key.upper().startswith("PM-"):
                pm_key = key
                break
        if pm_key:
            break

    if not pm_key:
        return None

    pm_fields = await fetch_issue_fields(pm_key, "parent")
    if not pm_fields:
        return None

    parent = pm_fields.get("parent") or {}
    parent_summary = ((parent.get("fields") or {}).get("summary") or "").strip()
    return parent_summary if parent_summary else None
