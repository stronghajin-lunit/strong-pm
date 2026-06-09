from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import slack_qa as slack_qa_crud
from app.crud import project as project_crud
from app.integrations import confluence
from app.integrations.confluence import ConfluenceIntegrationError
from app.schemas.slack_qa import (
    SlackQaItemCreate,
    SlackQaItemListResponse,
    SlackQaItemResponse,
    SlackQaLastSyncedResponse,
)


async def list_items(db: AsyncSession) -> SlackQaItemListResponse:
    rows = await slack_qa_crud.list_all(db)
    return SlackQaItemListResponse(
        items=[SlackQaItemResponse.model_validate(r) for r in rows]
    )


async def create_item(db: AsyncSession, data: SlackQaItemCreate) -> SlackQaItemResponse:
    if await slack_qa_crud.exists_by_ts(db, data.slack_message_ts):
        raise HTTPException(status_code=409, detail="Slack message already imported")
    item = await slack_qa_crud.create(db, **data.model_dump())
    await db.commit()
    return SlackQaItemResponse.model_validate(item)


async def get_last_synced(db: AsyncSession) -> SlackQaLastSyncedResponse:
    ts = await slack_qa_crud.get_latest_message_ts(db)
    return SlackQaLastSyncedResponse(last_message_ts=ts)


async def link_project(
    db: AsyncSession, item_id: int, project_id: int | None
) -> SlackQaItemResponse:
    item = await slack_qa_crud.get_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Slack Q&A item not found")
    item = await slack_qa_crud.update_link(db, item, project_id)
    await db.commit()
    return SlackQaItemResponse.model_validate(item)


async def push_to_prd(db: AsyncSession, item_id: int) -> SlackQaItemResponse:
    item = await slack_qa_crud.get_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Slack Q&A item not found")
    if not item.linked_project_id:
        raise HTTPException(status_code=400, detail="Link a project before pushing to PRD")

    project = await project_crud.get_by_id(db, item.linked_project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Linked project not found")
    if not project.confluence_page_id:
        raise HTTPException(
            status_code=400, detail="Project has no Confluence page configured"
        )

    try:
        await confluence.update_prd_qa_table(
            page_id=project.confluence_page_id,
            question=item.question,
            answer=item.answer,
            answer_date=item.answer_date,
        )
    except ConfluenceIntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    item = await slack_qa_crud.archive(db, item)
    await db.commit()
    return SlackQaItemResponse.model_validate(item)
