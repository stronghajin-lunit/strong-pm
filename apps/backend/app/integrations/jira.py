"""Atlassian Jira Cloud REST integration.

Real implementation (no mock fallback): requires JIRA_* settings to be
configured. Contracts (dataclasses + function signatures) are kept stable so the
service layer is unaffected.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
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


class JiraIntegrationError(Exception):
    """Raised when Jira is unreachable, misconfigured, or returns an error."""


_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_client: httpx.AsyncClient | None = None


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
    """Return a lazily-created shared client (keep-alive across calls)."""
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


async def aclose() -> None:
    """Close the shared client (call on application shutdown)."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def _get(path: str, params: dict[str, Any] | None = None) -> httpx.Response:
    client = _get_client()
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
    now = datetime.now(timezone.utc)
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
