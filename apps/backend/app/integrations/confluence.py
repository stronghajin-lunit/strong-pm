"""Atlassian Confluence Cloud REST integration.

Real implementation (no mock fallback): publishes a release note as a new child
page under a configured parent page. Reuses the Atlassian credentials configured
for Jira (JIRA_BASE_URL/EMAIL/API_TOKEN); the Confluence API lives under the
"/wiki" path of the same site.
"""

import html
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings


@dataclass
class ConfluencePublishResult:
    confluence_location: str
    confluence_url: str


class ConfluenceIntegrationError(Exception):
    """Raised when Confluence is unreachable, misconfigured, or returns an error."""


_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_client: httpx.AsyncClient | None = None


def _require_config() -> None:
    missing = [
        name
        for name, value in (
            ("JIRA_BASE_URL", settings.JIRA_BASE_URL),
            ("JIRA_EMAIL", settings.JIRA_EMAIL),
            ("JIRA_API_TOKEN", settings.JIRA_API_TOKEN),
            ("CONFLUENCE_SPACE_KEY", settings.CONFLUENCE_SPACE_KEY),
        )
        if not value.strip()
    ]
    if missing:
        raise ConfluenceIntegrationError(
            f"Confluence integration is not configured: missing {', '.join(missing)}"
        )


def _parent_id_for(confluence_page: str) -> str:
    mapping = {
        "odm": settings.CONFLUENCE_ODM_PARENT_ID,
        "annotation": settings.CONFLUENCE_ANNOTATION_PARENT_ID,
    }
    parent_id = mapping.get(confluence_page, "").strip()
    if not parent_id:
        raise ConfluenceIntegrationError(
            f"No Confluence parent page configured for '{confluence_page}'"
        )
    return parent_id


def _get_client() -> httpx.AsyncClient:
    global _client
    _require_config()
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=settings.JIRA_BASE_URL.rstrip("/") + "/wiki",
            auth=httpx.BasicAuth(settings.JIRA_EMAIL, settings.JIRA_API_TOKEN),
            headers={"Accept": "application/json"},
            timeout=_TIMEOUT,
        )
    return _client


async def aclose() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _ensure_ok(response: httpx.Response) -> dict[str, Any]:
    if response.status_code >= 400:
        raise ConfluenceIntegrationError(
            f"Confluence API error {response.status_code} for {response.request.url}"
        )
    try:
        data: dict[str, Any] = response.json()
    except ValueError as exc:
        raise ConfluenceIntegrationError("Confluence API returned invalid JSON") from exc
    return data


def _markdown_to_storage(md: str) -> str:
    """Minimal Markdown -> Confluence storage (XHTML) conversion.

    Handles the headings, bullet lists, and paragraphs produced by the release
    note generator. Good enough for valid, readable storage format.
    """
    out: list[str] = []
    in_list = False
    for raw in md.split("\n"):
        line = raw.strip()
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{html.escape(line[2:])}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if not line:
            continue
        if line.startswith("### "):
            out.append(f"<h3>{html.escape(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2>{html.escape(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1>{html.escape(line[2:])}</h1>")
        else:
            out.append(f"<p>{html.escape(line)}</p>")
    if in_list:
        out.append("</ul>")
    return "".join(out)


async def _resolve_space_id(space_key: str) -> str:
    try:
        response = await _get_client().get("/api/v2/spaces", params={"keys": space_key})
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    data = _ensure_ok(response)
    results: list[dict[str, Any]] = data.get("results", [])
    if not results:
        raise ConfluenceIntegrationError(f"Confluence space not found: {space_key}")
    return str(results[0]["id"])


async def publish_release_note(
    confluence_page: str,
    jira_version_label: str,
    content: str,
) -> ConfluencePublishResult:
    """Create a new Confluence child page with the release note content."""
    _require_config()
    parent_id = _parent_id_for(confluence_page)
    space_id = await _resolve_space_id(settings.CONFLUENCE_SPACE_KEY)

    title = f"{jira_version_label} Release Note"
    payload = {
        "spaceId": space_id,
        "status": "current",
        "title": title,
        "parentId": parent_id,
        "body": {"representation": "storage", "value": _markdown_to_storage(content)},
    }

    try:
        response = await _get_client().post("/api/v2/pages", json=payload)
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    data = _ensure_ok(response)

    webui = str(data.get("_links", {}).get("webui", ""))
    site = settings.JIRA_BASE_URL.rstrip("/")
    confluence_url = f"{site}/wiki{webui}" if webui else ""
    confluence_location = f"{settings.CONFLUENCE_SPACE_KEY} / {title}"

    return ConfluencePublishResult(
        confluence_location=confluence_location,
        confluence_url=confluence_url,
    )
