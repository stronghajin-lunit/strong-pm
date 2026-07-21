from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_model_config import (
    AVAILABLE_MODELS,
    FEATURE_DEFAULTS,
    FEATURE_KEYS,
    FEATURE_LABELS,
    set_all_overrides,
)
from app.crud import ai_settings as ai_settings_crud


async def load_into_cache(db: AsyncSession) -> None:
    """Load DB overrides into the in-memory model config cache."""
    rows = await ai_settings_crud.get_all(db)
    set_all_overrides({r.feature_key: r.model for r in rows})


async def get_all(db: AsyncSession) -> list[dict]:
    rows = await ai_settings_crud.get_all(db)
    db_map = {r.feature_key: r.model for r in rows}
    return [
        {
            "feature_key": key,
            "label": FEATURE_LABELS[key],
            "model": db_map.get(key, FEATURE_DEFAULTS[key]),
            "default_model": FEATURE_DEFAULTS[key],
        }
        for key in FEATURE_KEYS
    ]


async def update_all(db: AsyncSession, updates: dict[str, str]) -> list[dict]:
    for feature_key, model in updates.items():
        if feature_key not in FEATURE_KEYS:
            continue
        if model not in AVAILABLE_MODELS:
            continue
        await ai_settings_crud.upsert(db, feature_key, model)
    await db.commit()
    rows = await ai_settings_crud.get_all(db)
    set_all_overrides({r.feature_key: r.model for r in rows})
    return await get_all(db)
