"""Atlassian Confluence Cloud REST integration.

Real implementation (no mock fallback): publishes a release note as a new child
page under a configured parent page. Reuses the Atlassian credentials configured
for Jira (JIRA_BASE_URL/EMAIL/API_TOKEN); the Confluence API lives under the
"/wiki" path of the same site.
"""

import html
import re
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

_DATE_RE = re.compile(r"(\d{2,4})-(\d{2})-(\d{2})")


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


def _extract_dates(label: str) -> tuple[str | None, str | None]:
    """Return (display_date, iso_date) parsed from a version label, or (None, None).

    'AICP Monthly 26-06-04' -> ('26-06-04', '2026-06-04')
    'Case Curator 2025-09-11' -> ('2025-09-11', '2025-09-11')
    """
    m = _DATE_RE.search(label)
    if not m:
        return None, None
    display = m.group(0)
    year = m.group(1)
    iso_year = year if len(year) == 4 else f"20{year}"
    iso = f"{iso_year}-{m.group(2)}-{m.group(3)}"
    return display, iso


def _build_title(label: str) -> str:
    """Date-prefixed title, e.g. 'AICP Monthly 26-06-04' -> '26-06-04 AICP Monthly'."""
    display, _ = _extract_dates(label)
    if not display:
        return label
    remainder = label.replace(display, "").strip(" -/")
    return f"{display} {remainder}".strip() if remainder else display


def _inline(text: str) -> str:
    """Escape HTML, then convert inline Markdown (**bold**, `code`)."""
    s = html.escape(text)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s


def _markdown_to_storage(md: str) -> str:
    """Markdown -> Confluence storage (XHTML): headings, bullet lists, paragraphs,
    and inline bold/code."""
    out: list[str] = []
    in_list = False
    for raw in md.split("\n"):
        line = raw.strip()
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{_inline(line[2:])}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if not line:
            continue
        if line.startswith("### "):
            out.append(f"<h3>{_inline(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2>{_inline(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1>{_inline(line[2:])}</h1>")
        else:
            out.append(f"<p>{_inline(line)}</p>")
    if in_list:
        out.append("</ul>")
    return "".join(out)


def _metadata_table(jira_version_label: str, jira_version_id: str) -> str:
    """Build the top metadata table (Release link / Date / Version)."""
    rows: list[str] = []
    if jira_version_id:
        site = settings.JIRA_BASE_URL.rstrip("/")
        url = f"{site}/issues/?jql=fixVersion%3D{jira_version_id}"
        rows.append(
            f"<tr><td><p><strong>Release</strong></p></td>"
            f'<td><p><a href="{html.escape(url)}">{_inline(jira_version_label)}</a></p></td></tr>'
        )
    _, iso = _extract_dates(jira_version_label)
    if iso:
        rows.append(
            f"<tr><td><p><strong>Date</strong></p></td>"
            f'<td><p><time datetime="{iso}" /></p></td></tr>'
        )
    rows.append(
        f"<tr><td><p><strong>Version</strong></p></td>"
        f"<td><p>{_inline(jira_version_label)}</p></td></tr>"
    )
    return f'<table data-layout="default"><tbody>{"".join(rows)}</tbody></table>'


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


_TABLE_RE = re.compile(r"<table\b[^>]*>.*?</table>", re.DOTALL | re.IGNORECASE)
_TBODY_RE = re.compile(r"(<tbody>)(.*?)(</tbody>)", re.DOTALL | re.IGNORECASE)
_ROW_RE = re.compile(r"<tr\b[^>]*>.*?</tr>", re.DOTALL | re.IGNORECASE)


def _fill_total_row_values(total_row: str, total_count: int, total_sp: float) -> str:
    """Replace the first two numeric <strong> values in the Total row."""
    sp_str = str(int(total_sp)) if total_sp == int(total_sp) else f"{total_sp:.1f}"
    replacements = iter([str(total_count), sp_str])

    def _sub(m: re.Match) -> str:
        val = next(replacements, None)
        return f"{m.group(1)}{val}{m.group(2)}" if val is not None else m.group(0)

    return re.sub(
        r"(<strong[^>]*>)\s*\d+\.?\d*\s*(</strong>)", _sub, total_row, flags=re.IGNORECASE
    )


def splice_sprint_table(
    existing_section: str,
    data_rows_html: str,
    total_count: int,
    total_sp: float,
) -> str:
    """Replace only data rows in the Sprint Summary table.

    Keeps header rows (containing <th>) and the last row (Total, provided by template).
    Fills in numeric values in the Total row.
    """
    table_m = _TABLE_RE.search(existing_section)
    if not table_m:
        return data_rows_html  # no table in section — fallback

    table_html = table_m.group(0)
    tbody_m = _TBODY_RE.search(table_html)
    if not tbody_m:
        return data_rows_html

    tbody_open, tbody_content, tbody_close = tbody_m.groups()
    rows = _ROW_RE.findall(tbody_content)

    if len(rows) < 2:
        return data_rows_html

    header_rows = [r for r in rows if re.search(r"<th\b", r, re.IGNORECASE)]
    if not header_rows:
        header_rows = rows[:1]  # treat first row as header

    total_row = _fill_total_row_values(rows[-1], total_count, total_sp)

    new_tbody = tbody_open + "".join(header_rows) + data_rows_html + total_row + tbody_close
    new_table = table_html.replace(tbody_m.group(0), new_tbody)

    return (
        existing_section[: table_m.start()]
        + new_table
        + existing_section[table_m.end() :]
    )


def _extract_section_body(storage: str, section_title: str) -> str:
    """Return the content of a section (text between its heading and the next)."""
    pattern = re.compile(
        r"(<h([1-6])[^>]*>[^<]*" + re.escape(section_title) + r"[^<]*</h\2>)",
        re.IGNORECASE,
    )
    m = pattern.search(storage)
    if not m:
        return ""
    heading_end = m.end()
    heading_level = int(m.group(2))
    next_m = re.search(
        r"<h([1-" + str(heading_level) + r"])[^>]*>", storage[heading_end:], re.IGNORECASE
    )
    section_end = heading_end + next_m.start() if next_m else len(storage)
    return storage[heading_end:section_end]


def replace_section(storage: str, section_title: str, new_content: str) -> str:
    """Replace a section's body in Confluence storage XML.

    Finds the heading element whose text contains section_title (any h1-h6 level),
    then replaces everything from after that heading up to the next heading of
    equal or higher rank (lower number). Other sections are left untouched.
    """
    pattern = re.compile(
        r"(<h([1-6])[^>]*>[^<]*"
        + re.escape(section_title)
        + r"[^<]*</h\2>)",
        re.IGNORECASE,
    )
    m = pattern.search(storage)
    if not m:
        return storage

    heading_end = m.end()
    heading_level = int(m.group(2))

    # Find next heading of same or higher rank (h1..hN where N <= heading_level)
    next_pattern = re.compile(
        r"<h([1-" + str(heading_level) + r"])[^>]*>",
        re.IGNORECASE,
    )
    next_m = next_pattern.search(storage, heading_end)
    section_end = next_m.start() if next_m else len(storage)

    return storage[:heading_end] + new_content + storage[section_end:]


def extract_page_id_from_url(url: str) -> str:
    """Extract Confluence page ID from a URL.

    Supports:
    - /wiki/spaces/.../pages/1234567890
    - /pages/1234567890
    - bare numeric ID
    """
    import re as _re
    m = _re.search(r"/pages/(\d+)", url)
    if m:
        return m.group(1)
    m = _re.search(r"^\d+$", url.strip())
    if m:
        return url.strip()
    raise ConfluenceIntegrationError(f"Could not extract page ID from URL: {url}")


async def fetch_page_storage(page_id: str) -> str:
    """Return Confluence page body in storage format (for few-shot reference)."""
    try:
        response = await _get_client().get(
            f"/api/v2/pages/{page_id}",
            params={"body-format": "storage"},
        )
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    data = _ensure_ok(response)
    return str((data.get("body") or {}).get("storage", {}).get("value", ""))


async def update_sprint_report(
    page_id: str,
    sprint_data_rows: str,
    total_count: int,
    total_sp: float,
    completion_prefix: str,
    key_deliverables_storage: str,
) -> ConfluencePublishResult:
    """Update Sprint Summary (data rows only) and Key Deliverables Completed.

    For Sprint Summary:
    - Keeps the existing table structure (header rows + Total row) from the template.
    - Splices new data <tr> rows into the table body.
    - Fills numeric values in the Total row.
    - Prepends completion_prefix (Sprint Completion Rate) if provided.

    All other page sections remain unchanged.
    """
    _require_config()

    try:
        get_resp = await _get_client().get(
            f"/api/v2/pages/{page_id}",
            params={"body-format": "storage"},
        )
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    page_data = _ensure_ok(get_resp)

    current_version: int = (page_data.get("version") or {}).get("number", 1)
    title: str = str(page_data.get("title", "Sprint Report"))
    existing_storage: str = (page_data.get("body") or {}).get("storage", {}).get("value", "")

    # Build new Sprint Summary section: keep table structure, only swap data rows
    existing_sprint_body = _extract_section_body(existing_storage, "Sprint Summary")
    new_sprint_body = completion_prefix + splice_sprint_table(
        existing_sprint_body, sprint_data_rows, total_count, total_sp
    )

    updated = replace_section(existing_storage, "Sprint Summary", new_sprint_body)
    updated = replace_section(updated, "Key Deliverables Completed", key_deliverables_storage)

    payload = {
        "id": page_id,
        "status": "current",
        "title": title,
        "version": {"number": current_version + 1},
        "body": {"representation": "storage", "value": updated},
    }
    try:
        put_resp = await _get_client().put(f"/api/v2/pages/{page_id}", json=payload)
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    data = _ensure_ok(put_resp)

    webui = str(data.get("_links", {}).get("webui", ""))
    site = settings.JIRA_BASE_URL.rstrip("/")
    confluence_url = f"{site}/wiki{webui}" if webui else f"{site}/wiki/pages/{page_id}"
    confluence_location = f"{settings.CONFLUENCE_SPACE_KEY} / {title}"
    return ConfluencePublishResult(
        confluence_location=confluence_location,
        confluence_url=confluence_url,
    )


async def publish_release_note(
    confluence_page: str,
    jira_version_label: str,
    content: str,
    jira_version_id: str = "",
) -> ConfluencePublishResult:
    """Create a new Confluence child page with the release note content."""
    _require_config()
    parent_id = _parent_id_for(confluence_page)
    space_id = await _resolve_space_id(settings.CONFLUENCE_SPACE_KEY)

    title = _build_title(jira_version_label)
    body = _metadata_table(jira_version_label, jira_version_id) + _markdown_to_storage(content)
    payload = {
        "spaceId": space_id,
        "status": "current",
        "title": title,
        "parentId": parent_id,
        "body": {"representation": "storage", "value": body},
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
