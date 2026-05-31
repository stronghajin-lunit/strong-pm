from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.release_note import (
    ReleaseNoteListResponse,
    ReleaseNoteResponse,
    ReflectionRequest,
    ReflectionResponse,
    ReleaseNoteRunRequest,
)
from app.services import release_note_service

router = APIRouter()


@router.post("/run", response_model=ReleaseNoteResponse, status_code=201)
async def run_release_note(
    body: ReleaseNoteRunRequest,
    db: AsyncSession = Depends(get_db),
) -> ReleaseNoteResponse:
    return await release_note_service.run(db, body.jira_version_id, body.confluence_page)


@router.get("", response_model=ReleaseNoteListResponse)
async def list_release_notes(db: AsyncSession = Depends(get_db)) -> ReleaseNoteListResponse:
    return await release_note_service.list_notes(db)


@router.patch("/{rn_id}/reflection", response_model=ReflectionResponse)
async def apply_reflection(
    rn_id: str,
    body: ReflectionRequest,
    db: AsyncSession = Depends(get_db),
) -> ReflectionResponse:
    return await release_note_service.apply_reflection(db, rn_id, body.reflection)
