"""Atlassian Confluence Cloud REST integration.

Real implementation (no mock fallback): publishes a release note as a new child
page under a configured parent page. Reuses the Atlassian credentials configured
for Jira (JIRA_BASE_URL/EMAIL/API_TOKEN); the Confluence API lives under the
"/wiki" path of the same site.
"""

import html
import re
import uuid as _uuid
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


def _make_uuid() -> str:
    return str(_uuid.uuid4())


def _find_section_content(storage: str, heading_text: str) -> tuple[int, int] | None:
    """Return (start, end) indices of content after the given heading, or None."""
    pattern = re.compile(
        r"<h([1-6])[^>]*>[^<]*" + re.escape(heading_text) + r"[^<]*</h\1>",
        re.IGNORECASE,
    )
    m = pattern.search(storage)
    if not m:
        return None
    level = int(m.group(1))
    start = m.end()
    next_m = re.search(
        r"<h([1-" + str(level) + r"])[^>]*>", storage[start:], re.IGNORECASE
    )
    end = start + next_m.start() if next_m else len(storage)
    return start, end


def _find_table_outside_expand(section_html: str) -> tuple[int, int] | None:
    """Find the first <table> that is NOT inside an ac:structured-macro expand."""
    # Remove expand macros first, then find the table
    no_expand = re.sub(
        r'<ac:structured-macro[^>]*ac:name="expand"[^>]*>.*?</ac:structured-macro>',
        "",
        section_html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    m = re.search(r"<table\b[^>]*>.*?</table>", no_expand, re.DOTALL | re.IGNORECASE)
    if not m:
        return None
    # Search in original using the table open tag
    table_open_re = re.compile(re.escape(m.group(0)[:40]), re.DOTALL)
    orig_m = table_open_re.search(section_html)
    if not orig_m:
        return None
    tbl_m = re.search(r"<table\b[^>]*>.*?</table>", section_html[orig_m.start():],
                      re.DOTALL | re.IGNORECASE)
    if not tbl_m:
        return None
    s = orig_m.start() + tbl_m.start()
    e = s + len(tbl_m.group(0))
    return s, e


def _replace_p_text(cell_html: str, new_text: str) -> str:
    """Replace text inside the first <p> in a cell, preserving all tag attributes.

    Handles both regular <p>...</p> and self-closing <p ... /> (empty paragraphs).
    """
    # Self-closing <p ... /> → convert to <p ...>new_text</p>
    result = re.sub(
        r"(<p\b[^>]*)/\s*>",
        lambda m: f"{m.group(1)}>{new_text}</p>",
        cell_html,
        count=1,
    )
    if result != cell_html:
        return result
    # Regular <p>...</p>
    return re.sub(
        r"(<p[^>]*>).*?(</p>)",
        lambda m: f"{m.group(1)}{new_text}{m.group(2)}",
        cell_html,
        count=1,
        flags=re.DOTALL,
    )


def _build_priority_macro(priority: str) -> str:
    from app.utils.feature_list_config import build_priority_macro
    return build_priority_macro(priority)


def _build_feature_row(feature: dict, show_category: bool) -> str:
    """Build a Confluence storage <tr> for one feature."""
    category = feature["category"] if show_category else ""
    priority_cell = _build_priority_macro(feature["priority"])
    cells = [
        feature["id"],
        category,
        feature["name"],
        feature["description"],
        priority_cell,
        feature["complexity"],
        feature.get("dependencies", "-"),
        feature.get("note", ""),
    ]
    tds = "".join(
        f'<td ac:local-id="{_make_uuid()}"><p>{c}</p></td>' for c in cells
    )
    return f'<tr ac:local-id="{_make_uuid()}">{tds}</tr>'


def _update_overview_table(storage: str, overview_data: dict[str, str]) -> str:
    """Replace <p> text in Overview table value cells, preserving all attributes."""
    from app.utils.feature_list_config import OVERVIEW_LABEL_MAP

    coords = _find_section_content(storage, "Overview")
    if not coords:
        return storage
    s, e = coords
    section = storage[s:e]

    rows = list(re.finditer(r"<tr\b[^>]*>(.*?)</tr>", section, re.DOTALL | re.IGNORECASE))
    updated_section = section
    for row_m in rows:
        row_html = row_m.group(0)
        cells = re.findall(r"<td\b[^>]*>.*?</td>", row_html, re.DOTALL | re.IGNORECASE)
        if len(cells) < 2:
            continue
        label_text = re.sub(r"<[^>]+>", "", cells[0]).strip().lower()
        field_key = OVERVIEW_LABEL_MAP.get(label_text)
        if not field_key or field_key not in overview_data:
            continue
        new_value = overview_data[field_key]
        new_value_cell = _replace_p_text(cells[1], new_value)
        new_row = row_html.replace(cells[1], new_value_cell, 1)
        updated_section = updated_section.replace(row_html, new_row, 1)

    return storage[:s] + updated_section + storage[e:]


def _update_feature_list_table(storage: str, features: list[dict]) -> str:
    """Replace feature rows in the Feature List table (outside expand macros)."""
    coords = _find_section_content(storage, "Feature List")
    if not coords:
        return storage
    s, e = coords
    section = storage[s:e]

    tbl_coords = _find_table_outside_expand(section)
    if not tbl_coords:
        return storage
    ts, te = tbl_coords
    table_html = section[ts:te]

    tbody_m = re.search(r"(<tbody>)(.*?)(</tbody>)", table_html, re.DOTALL | re.IGNORECASE)
    if not tbody_m:
        return storage

    tbody_content = tbody_m.group(2)
    all_rows = re.findall(r"<tr\b[^>]*>.*?</tr>", tbody_content, re.DOTALL | re.IGNORECASE)
    header_rows = [r for r in all_rows if re.search(r"<th\b", r, re.IGNORECASE)]
    if not header_rows:
        header_rows = all_rows[:1]

    # Build feature rows with category grouping
    data_rows: list[str] = []
    seen_category: str | None = None
    for feat in features:
        show_cat = feat["category"] != seen_category
        if show_cat:
            seen_category = feat["category"]
        data_rows.append(_build_feature_row(feat, show_cat))

    new_tbody = tbody_m.group(1) + "".join(header_rows) + "".join(data_rows) + tbody_m.group(3)
    new_table = table_html.replace(tbody_m.group(0), new_tbody)
    new_section = section[:ts] + new_table + section[te:]
    return storage[:s] + new_section + storage[e:]


async def update_feature_list_page(
    page_id: str,
    overview_data: dict[str, str],
    features: list[dict],
) -> ConfluencePublishResult:
    """Update Overview table cells and Feature List table rows in place."""
    _require_config()
    try:
        get_resp = await _get_client().get(
            f"/api/v2/pages/{page_id}", params={"body-format": "storage"}
        )
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    page_data = _ensure_ok(get_resp)

    version: int = (page_data.get("version") or {}).get("number", 1)
    title: str = str(page_data.get("title", "Feature List"))
    existing: str = (page_data.get("body") or {}).get("storage", {}).get("value", "")

    updated = _update_overview_table(existing, overview_data)
    updated = _update_feature_list_table(updated, features)

    payload = {
        "id": page_id, "status": "current", "title": title,
        "version": {"number": version + 1},
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
    return ConfluencePublishResult(
        confluence_location=f"{settings.CONFLUENCE_SPACE_KEY} / {title}",
        confluence_url=confluence_url,
    )


def update_scope_table(
    storage: str,
    in_scope_content: str,
    out_of_scope_content: str,
) -> str:
    """Replace content in the In Scope / Out of Scope two-column table under <h2>Scope</h2>."""
    # Find Scope section
    scope_coords = _find_section_content(storage, "Scope")
    if not scope_coords:
        return storage
    s, e = scope_coords
    section = storage[s:e]

    _tbl = re.compile(r"<table\b[^>]*>.*?</table>", re.DOTALL | re.IGNORECASE)
    _tbody = re.compile(r"(<tbody>)(.*?)(</tbody>)", re.DOTALL | re.IGNORECASE)
    _row = re.compile(r"<tr\b[^>]*>.*?</tr>", re.DOTALL | re.IGNORECASE)

    # Find the table
    table_m = _tbl.search(section)
    if not table_m:
        return storage

    table_html = table_m.group(0)
    tbody_m = _tbody.search(table_html)
    if not tbody_m:
        return storage

    tbody_content = tbody_m.group(2)
    rows = _row.findall(tbody_content)
    if len(rows) < 2:
        return storage

    # Detect column order from header row
    header_row = rows[0]
    header_cells = re.findall(r"<t[hd][^>]*>.*?</t[hd]>", header_row, re.DOTALL | re.IGNORECASE)
    in_scope_col, out_of_scope_col = 0, 1  # default
    for i, cell in enumerate(header_cells):
        text = re.sub(r"<[^>]+>", "", cell).strip().lower()
        if "in scope" in text:
            in_scope_col = i
        elif "out of scope" in text:
            out_of_scope_col = i

    # Find the first data row (non-header)
    data_row = rows[1]
    data_cells = list(re.finditer(r"<td[^>]*>.*?</td>", data_row, re.DOTALL | re.IGNORECASE))
    if len(data_cells) < 2:
        return storage

    new_data_row = data_row
    scope_pairs = [(in_scope_col, in_scope_content), (out_of_scope_col, out_of_scope_content)]
    for col_idx, new_text in scope_pairs:
        if col_idx < len(data_cells):
            old_cell = data_cells[col_idx].group(0)
            new_cell = _replace_p_text(old_cell, new_text)
            new_data_row = new_data_row.replace(old_cell, new_cell, 1)

    new_tbody_content = tbody_m.group(1) + header_row + new_data_row + tbody_m.group(3)  # noqa: E501
    new_table = table_html.replace(tbody_m.group(0), new_tbody_content)
    new_section = section.replace(table_m.group(0), new_table, 1)
    return storage[:s] + new_section + storage[e:]


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


def _storage_to_text(storage_html: str) -> str:
    """Extract readable plain text from Confluence storage-format XHTML."""
    import html as _html
    text = re.sub(r"<[^>]+>", " ", storage_html)
    text = _html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


async def fetch_page_metadata(page_id: str) -> dict[str, str]:
    """Return {id, title, updated_at} for a single Confluence page (no body)."""
    try:
        resp = await _get_client().get(f"/api/v2/pages/{page_id}")
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    data = _ensure_ok(resp)
    updated_at: str = (data.get("version") or {}).get("createdAt", "")
    return {
        "id": str(data.get("id", page_id)),
        "title": str(data.get("title", "")),
        "updated_at": updated_at,
    }


async def fetch_page_text(page_id: str) -> tuple[str, str, str]:
    """Return (title, plain_text, updated_at) for a page."""
    try:
        resp = await _get_client().get(
            f"/api/v2/pages/{page_id}", params={"body-format": "storage"}
        )
    except httpx.HTTPError as exc:
        raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
    data = _ensure_ok(resp)
    title = str(data.get("title", ""))
    updated_at: str = (data.get("version") or {}).get("createdAt", "")
    storage_val: str = (data.get("body") or {}).get("storage", {}).get("value", "")
    return title, _storage_to_text(storage_val), updated_at


async def _collect_child_page_ids(page_id: str, depth: int = 0) -> list[str]:
    """Recursively collect all descendant page IDs (BFS, max depth 6)."""
    if depth > 6:
        return []
    ids: list[str] = []
    cursor: str | None = None
    while True:
        params: dict[str, str | int] = {"limit": 50}
        if cursor:
            params["cursor"] = cursor
        try:
            resp = await _get_client().get(
                f"/api/v2/pages/{page_id}/children", params=params
            )
        except httpx.HTTPError as exc:
            raise ConfluenceIntegrationError(f"Confluence request failed: {exc}") from exc
        data = _ensure_ok(resp)
        results: list[dict] = data.get("results", [])
        for child in results:
            child_id = str(child["id"])
            ids.append(child_id)
            ids.extend(await _collect_child_page_ids(child_id, depth + 1))
        next_link: str = (data.get("_links") or {}).get("next", "")
        if not next_link:
            break
        # Extract cursor from next link query string
        import urllib.parse as _up
        qs = _up.parse_qs(_up.urlparse(next_link).query)
        cursor = qs.get("cursor", [None])[0]
        if not cursor:
            break
    return ids


async def fetch_all_project_pages(
    root_page_id: str,
) -> list[dict[str, str]]:
    """Fetch root page + all descendants.

    Returns list of {id, title, content (plain text), updated_at}.
    """
    all_ids = [root_page_id] + await _collect_child_page_ids(root_page_id)
    pages: list[dict[str, str]] = []
    for pid in all_ids:
        try:
            title, content, updated_at = await fetch_page_text(pid)
            pages.append(
                {"id": pid, "title": title, "content": content, "updated_at": updated_at}
            )
        except ConfluenceIntegrationError:
            continue  # skip inaccessible pages
    return pages


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
    sprint_summary_storage: str,
    key_deliverables_storage: str,
) -> ConfluencePublishResult:
    """Update only 'Sprint Summary' and 'Key Deliverables Completed' sections.

    Fetches the existing page, replaces only those two sections in-place,
    and PUTs the merged result. All other sections remain unchanged.
    """
    _require_config()

    # Fetch current page (metadata + body)
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

    # Replace only the two target sections
    updated = replace_section(existing_storage, "Sprint Summary", sprint_summary_storage)
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
