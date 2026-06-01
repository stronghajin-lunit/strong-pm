import asyncio
import re

from fastapi import HTTPException

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
_VERSION_PROJECT = "RAD"
_MAX_VERSIONS = 8


def _sort_key(v: VersionOption) -> str:
    """Sort key: releaseDate if available, else parse YY-MM-DD from version name."""
    if v.release_date:
        return v.release_date
    m = _VERSION_DATE_RE.search(v.name)
    if m:
        yy, mm, dd = m.groups()
        return f"20{yy}-{mm}-{dd}"
    return "0000-00-00"


async def list_versions() -> VersionOptionListResponse:
    """RAD project Fix Versions, sorted by releaseDate desc, max 8."""
    raw = await jira.fetch_project_versions(_VERSION_PROJECT)
    options = [
        VersionOption(id=v.jira_id, name=v.label, release_date=v.release_date)
        for v in raw
    ]
    options.sort(key=_sort_key, reverse=True)
    return VersionOptionListResponse(versions=options[:_MAX_VERSIONS])


async def list_unversioned_tickets(period: str) -> UnversionedTicketListResponse:
    valid_periods = {"15d", "1m", "2m", "3m"}
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PERIOD"})

    raw = await jira.fetch_unversioned_tickets(
        project_key=_VERSION_PROJECT,
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
