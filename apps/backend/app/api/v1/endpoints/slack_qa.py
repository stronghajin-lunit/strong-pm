from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.slack_qa import (
    SlackQaItemCreate,
    SlackQaItemListResponse,
    SlackQaItemResponse,
    SlackQaLastSyncedResponse,
    SlackQaLinkRequest,
    SlackThreadRequest,
)
from app.services import slack_qa_service

router = APIRouter()


@router.get("", response_model=SlackQaItemListResponse)
async def list_items(db: AsyncSession = Depends(get_db)) -> SlackQaItemListResponse:
    return await slack_qa_service.list_items(db)


@router.post("", response_model=SlackQaItemResponse, status_code=201)
async def create_item(
    body: SlackQaItemCreate,
    db: AsyncSession = Depends(get_db),
) -> SlackQaItemResponse:
    return await slack_qa_service.create_item(db, body)


@router.post("/from-thread", response_model=SlackQaItemResponse, status_code=201)
async def create_from_thread(
    body: SlackThreadRequest,
    db: AsyncSession = Depends(get_db),
) -> SlackQaItemResponse:
    return await slack_qa_service.create_from_thread(db, body)


@router.get("/last-synced", response_model=SlackQaLastSyncedResponse)
async def get_last_synced(db: AsyncSession = Depends(get_db)) -> SlackQaLastSyncedResponse:
    return await slack_qa_service.get_last_synced(db)


@router.patch("/{item_id}/link", response_model=SlackQaItemResponse)
async def link_project(
    item_id: int,
    body: SlackQaLinkRequest,
    db: AsyncSession = Depends(get_db),
) -> SlackQaItemResponse:
    return await slack_qa_service.link_project(db, item_id, body.project_id)


@router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    await slack_qa_service.delete_item(db, item_id)


@router.post("/{item_id}/push-to-prd", response_model=SlackQaItemResponse)
async def push_to_prd(
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> SlackQaItemResponse:
    return await slack_qa_service.push_to_prd(db, item_id)
