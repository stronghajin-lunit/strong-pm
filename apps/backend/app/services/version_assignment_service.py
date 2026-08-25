import asyncio
import re
from datetime import UTC, date, datetime

from fastapi import HTTPException

from app.core.config import settings
from app.integrations import jira
from app.integrations.jira import JiraIntegrationError
from app.schemas.version_assignment import (
    AssignVersionRequest,
    AssignVersionResult,
    UnversionedTicket,
    UnversionedTicketListResponse,
    VersionOption,
    VersionOptionListResponse,
)

_VERSION_DATE_RE = re.compile(r"(\d{2})-(\d{2})-(\d{2})$")
_MAX_VERSIONS = 8
_UNDATED_KEY = "0000-00-00"


def _parse_date(v: VersionOption) -> str | None:
    """Resolve YYYY-MM-DD from releaseDate if available, else the version name."""
    if v.release_date:
        return v.release_date
    m = _VERSION_DATE_RE.search(v.name)
    if m:
        yy, mm, dd = m.groups()
        return f"20{yy}-{mm}-{dd}"
    return None


def _days_from_today(parsed: str | None, today: date) -> int:
    """Distance in days from today, past or future. Undated versions sort last."""
    if parsed is None:
        return 10**9
    return abs((date.fromisoformat(parsed) - today).days)


async def list_versions() -> VersionOptionListResponse:
    """RAD project Fix Versions closest to today, max 8, shown releaseDate desc.

    Versions are picked by proximity to today rather than plain releaseDate desc,
    so versions planned far in the future (e.g. next quarter's placeholders) don't
    crowd out the current, closer-to-release version.
    """
    raw = await jira.fetch_project_versions(settings.JIRA_TICKET_PROJECT_KEY)
    options = [
        VersionOption(id=v.jira_id, name=v.label, release_date=v.release_date)
        for v in raw
    ]

    today = datetime.now(UTC).date()
    parsed_dates = {v.id: _parse_date(v) for v in options}
    options.sort(key=lambda v: _days_from_today(parsed_dates[v.id], today))
    selected = options[:_MAX_VERSIONS]
    selected.sort(key=lambda v: parsed_dates[v.id] or _UNDATED_KEY, reverse=True)
    return VersionOptionListResponse(versions=selected)


async def list_unversioned_tickets(period: str) -> UnversionedTicketListResponse:
    valid_periods = {"15d", "1m", "2m", "3m"}
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PERIOD"})

    raw = await jira.fetch_unversioned_tickets(
        project_key=settings.JIRA_TICKET_PROJECT_KEY,
        period=period,
    )
    tickets = [
        UnversionedTicket(
            id=t.key,
            summary=t.summary,
            status=t.status,
            epic_id=t.epic_key,
            epic_name=t.epic_summary,
        )
        for t in raw
    ]
    return UnversionedTicketListResponse(tickets=tickets)


async def assign_version(body: AssignVersionRequest) -> AssignVersionResult:
    """Append version to all given tickets concurrently. Returns per-ticket results."""
    if not body.ticket_ids:
        raise HTTPException(status_code=400, detail={"code": "NO_TICKETS"})

    async def _assign(ticket_id: str) -> tuple[str, bool]:
        try:
            await jira.assign_fix_version(ticket_id, body.version_id)
            return ticket_id, True
        except JiraIntegrationError:
            return ticket_id, False

    results = await asyncio.gather(*[_assign(tid) for tid in body.ticket_ids])
    succeeded = [tid for tid, ok in results if ok]
    failed = [tid for tid, ok in results if not ok]
    return AssignVersionResult(succeeded=succeeded, failed=failed)
