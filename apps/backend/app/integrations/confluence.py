from dataclasses import dataclass


_CONFLUENCE_LOCATIONS: dict[str, str] = {
    "odm": "AIP / ODM Release Notes / 2026",
    "annotation": "AIP / Annotation Tool Release Notes / 2026",
}

_CONFLUENCE_BASE_URL = "https://lunit.atlassian.net/wiki/spaces/AIP/pages"


@dataclass
class ConfluencePublishResult:
    confluence_location: str
    confluence_url: str


async def publish_release_note(
    confluence_page: str,
    jira_version_label: str,
    content: str,
) -> ConfluencePublishResult:
    """Mock: publishes release note to Confluence."""
    location = _CONFLUENCE_LOCATIONS.get(confluence_page, "AIP / Release Notes / 2026")
    mock_page_id = abs(hash(jira_version_label + confluence_page)) % 10_000_000
    url = f"{_CONFLUENCE_BASE_URL}/{mock_page_id}"
    return ConfluencePublishResult(confluence_location=location, confluence_url=url)
