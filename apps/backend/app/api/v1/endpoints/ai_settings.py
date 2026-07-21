from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_model_config import AVAILABLE_MODELS, FEATURE_KEYS
from app.core.dependencies import get_db
from app.services import ai_settings_service

router = APIRouter()


class AiSettingItem(BaseModel):
    feature_key: str
    label: str
    model: str
    default_model: str


class AiSettingsResponse(BaseModel):
    settings: list[AiSettingItem]
    available_models: list[str]


class AiSettingsUpdateRequest(BaseModel):
    settings: dict[str, str]


@router.get("", response_model=AiSettingsResponse)
async def get_ai_settings(db: AsyncSession = Depends(get_db)) -> AiSettingsResponse:
    items = await ai_settings_service.get_all(db)
    return AiSettingsResponse(
        settings=[AiSettingItem(**item) for item in items],
        available_models=AVAILABLE_MODELS,
    )


@router.put("", response_model=AiSettingsResponse)
async def update_ai_settings(
    body: AiSettingsUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> AiSettingsResponse:
    items = await ai_settings_service.update_all(db, body.settings)
    return AiSettingsResponse(
        settings=[AiSettingItem(**item) for item in items],
        available_models=AVAILABLE_MODELS,
    )
