from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import jira_ticket as jira_ticket_crud
from app.crud import jira_version as jira_version_crud
from app.crud import release_note as release_note_crud
from app.integrations import ai, confluence, jira
from app.models.jira_version import JiraVersion
from app.models.release_note import ReleaseNote
from app.schemas.release_note import (
    VALID_CONFLUENCE_PAGES,
    ReflectionResponse,
    ReleaseNoteListResponse,
    ReleaseNoteResponse,
)
from app.utils import fmt_dt, fmt_dt_required, make_rn_id, parse_rn_id


def _to_response(note: ReleaseNote, version: JiraVersion) -> ReleaseNoteResponse:
    return ReleaseNoteResponse(
        id=make_rn_id(note.id),
        jira_version=version.label,
        confluence_location=note.confluence_location,
        requested_at=fmt_dt_required(note.requested_at),
        completed_at=fmt_dt(note.completed_at),
        status=note.status,
        confluence_url=note.confluence_url,
        reflection=note.reflection,
    )


async def run(db: AsyncSession, jira_version_id: str, confluence_page: str) -> ReleaseNoteResponse:
    if confluence_page not in VALID_CONFLUENCE_PAGES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_CONFLUENCE_PAGE"})

    raw_versions = await jira.fetch_fix_versions()
    version_data = next((v for v in raw_versions if v.jira_id == jira_version_id), None)
    if version_data is None:
        raise HTTPException(status_code=404, detail={"code": "JIRA_VERSION_NOT_FOUND"})

    raw_tickets = await jira.fetch_tickets_by_version(jira_version_id)
    if raw_tickets is None:
        raise HTTPException(status_code=404, detail={"code": "JIRA_VERSION_NOT_FOUND"})

    ticket_id_map = await jira_ticket_crud.upsert_many(
        db, [(t.ticket_id, t.title) for t in raw_tickets]
    )
    versions = await jira_version_crud.upsert_many(
        db, [(version_data.jira_id, version_data.label, version_data.synced_at)]
    )
    version_record = versions[0]

    content = await ai.generate_release_note(version_data.label, raw_tickets)
    publish_result = await confluence.publish_release_note(
        confluence_page, version_data.label, content.body, jira_version_id=version_data.jira_id
    )

    now = datetime.now(timezone.utc)
    note = await release_note_crud.create(
        db,
        jira_version_id=version_record.id,
        confluence_page=confluence_page,
        confluence_location=publish_result.confluence_location,
        confluence_url=publish_result.confluence_url,
        status="done",
        requested_at=now,
        completed_at=now,
    )
    await release_note_crud.add_tickets(db, note.id, list(ticket_id_map.values()))
    await db.commit()

    return _to_response(note, version_record)


async def list_notes(db: AsyncSession) -> ReleaseNoteListResponse:
    notes = await release_note_crud.list_all(db)
    result = []
    for note in notes:
        version = await jira_version_crud.get_by_id(db, note.jira_version_id)
        if version:
            result.append(_to_response(note, version))
    return ReleaseNoteListResponse(notes=result)


async def apply_reflection(db: AsyncSession, rn_id: str, reflection: str) -> ReflectionResponse:
    try:
        note_db_id = parse_rn_id(rn_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

    note = await release_note_crud.get_by_id(db, note_db_id)
    if note is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    if note.reflection is not None:
        raise HTTPException(status_code=409, detail={"code": "CONFLICT"})

    await release_note_crud.update_reflection(db, note, reflection)
    await db.commit()
    return ReflectionResponse(id=rn_id, reflection=reflection)
