# Backend Feature Skill

## Trigger Patterns

This skill activates on requests such as:
- "add backend ~~ feature"
- "create ~~ API endpoint"
- "create ~~ CRUD"
- "백엔드에 ~~ 추가해줘"
- `/project:new-feature <name>` (backend scope)

---

## Architecture: Layered Structure

```
Schema (Pydantic) → Router (FastAPI) → Service (Business Logic) → CRUD (DB Access) → Model (SQLAlchemy)
```

### Layer Responsibilities

| Layer | File Location | Role |
|-------|---------------|------|
| **Schema** | `app/schemas/{name}.py` | API request/response contract (Pydantic) |
| **Router** | `app/api/v1/endpoints/{name}.py` | HTTP routing, input parsing, response formatting |
| **Service** | `app/services/{name}_service.py` | Business logic, transaction management |
| **CRUD** | `app/crud/{name}.py` | DB queries only. No `commit()` — only `flush()` |
| **Model** | `app/models/{name}.py` | SQLAlchemy ORM table definition |

### Dependency Direction (one-way only)

```
Router → Service → CRUD → Model
              ↘ Schema (shared for I/O)
```

---

## Step 0: Report Plan Before Any Code

```markdown
## Backend Feature Plan: {feature name}

### Files to Create
- [ ] `app/models/{name}.py` — SQLAlchemy model
- [ ] `app/schemas/{name}.py` — Pydantic request/response schemas
- [ ] `app/crud/{name}.py` — DB CRUD operations
- [ ] `app/services/{name}_service.py` — Business logic
- [ ] `app/api/v1/endpoints/{name}.py` — FastAPI router
- [ ] `alembic/versions/{timestamp}_{name}.py` — Migration (auto-generated)
- [ ] `tests/api/test_{name}.py` — Tests

### Endpoints
{list endpoints}

Awaiting approval.
```

---

## Implementation Order

### 1. Model (SQLAlchemy)

```python
# app/models/{name}.py
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class {Name}(Base):
    __tablename__ = "{names}"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # domain fields ...
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

Register in `app/models/__init__.py`:
```python
from app.models.{name} import {Name}  # noqa: F401
```

### 2. Schema (Pydantic)

```python
# app/schemas/{name}.py
from pydantic import BaseModel
from datetime import datetime


class {Name}Base(BaseModel):
    # shared fields


class {Name}Create({Name}Base):
    # creation-only fields


class {Name}Response({Name}Base):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

### 3. CRUD

```python
# app/crud/{name}.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.{name} import {Name}
from app.schemas.{name} import {Name}Response


class {Name}CRUD:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, id: int) -> Optional[{Name}Response]:
        result = await self.db.execute(select({Name}).where({Name}.id == id))
        item = result.scalar_one_or_none()
        return {Name}Response.model_validate(item) if item else None

    async def get_all(self) -> list[{Name}Response]:
        result = await self.db.execute(select({Name}).order_by({Name}.created_at.desc()))
        return [{Name}Response.model_validate(r) for r in result.scalars().all()]

    async def create(self, **kwargs: object) -> {Name}Response:
        item = {Name}(**kwargs)
        self.db.add(item)
        await self.db.flush()  # NO commit() in CRUD
        return {Name}Response.model_validate(item)
```

### 4. Service

```python
# app/services/{name}_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.crud.{name} import {Name}CRUD
from app.schemas.{name} import {Name}Create, {Name}Response


class {Name}Service:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.crud = {Name}CRUD(db)

    async def get(self, id: int) -> {Name}Response:
        item = await self.crud.get_by_id(id)
        if not item:
            raise HTTPException(status_code=404, detail="{Name} not found")
        return item

    async def get_all(self) -> list[{Name}Response]:
        return await self.crud.get_all()

    async def create(self, data: {Name}Create) -> {Name}Response:
        item = await self.crud.create(**data.model_dump())
        await self.db.commit()  # commit() only in Service
        return item
```

### 5. Router

```python
# app/api/v1/endpoints/{name}.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.services.{name}_service import {Name}Service
from app.schemas.{name} import {Name}Create, {Name}Response

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_db)) -> {Name}Service:
    return {Name}Service(db)


@router.get("", response_model=list[{Name}Response])
async def list_{names}(
    service: {Name}Service = Depends(get_service),
) -> list[{Name}Response]:
    return await service.get_all()


@router.get("/{id}", response_model={Name}Response)
async def get_{name}(
    id: int,
    service: {Name}Service = Depends(get_service),
) -> {Name}Response:
    return await service.get(id)


@router.post("", response_model={Name}Response, status_code=201)
async def create_{name}(
    data: {Name}Create,
    service: {Name}Service = Depends(get_service),
) -> {Name}Response:
    return await service.create(data)
```

Register in `app/api/v1/router.py`:
```python
from app.api.v1.endpoints import {name}
api_router.include_router({name}.router, prefix="/{names}", tags=["{names}"])
```

### 6. Migration

```bash
cd apps/backend && alembic revision --autogenerate -m "add {names} table"
alembic upgrade head
```

### 7. Test

```python
# tests/api/test_{name}.py
import pytest
from httpx import AsyncClient


class TestList{Names}:
    """GET /api/v1/{names}"""

    @pytest.mark.asyncio
    async def test_returns_empty_list(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/{names}")
        assert response.status_code == 200
        assert response.json() == []


class TestCreate{Name}:
    """POST /api/v1/{names}

    Business rules:
    1. {rule}
    """

    @pytest.mark.asyncio
    async def test_creates_successfully(self, client: AsyncClient) -> None:
        """Successful creation
        Given: valid input
        When: POST /api/v1/{names}
        Then: 201, returns created resource
        """
        response = await client.post("/api/v1/{names}", json={...})
        assert response.status_code == 201
```

---

## Absolute Rules

| Rule | Detail |
|------|--------|
| No `commit()` in CRUD | Only `flush()`. Commit is Service's responsibility |
| No ORM access in Service | Service uses CRUD only |
| No Repository/Model import in Router | Router imports Service and Schema only |
| `response_model` required | Always declare on every endpoint |
| `Depends()` for DI | Never instantiate Service directly in endpoint |
| UTC time only | `datetime.now(timezone.utc)`, never `utcnow()` or `now()` |
| Type hints required | All function parameters and return types |

---

## Error Handling

```python
# Standard HTTP errors
raise HTTPException(status_code=404, detail="Item not found")
raise HTTPException(status_code=409, detail="Already exists")
raise HTTPException(status_code=400, detail="Invalid input")
```

---

## Directory Summary

```
app/
├── models/{name}.py          ← ORM table definition
├── schemas/{name}.py         ← Pydantic I/O contract
├── crud/{name}.py            ← DB queries (flush only)
├── services/{name}_service.py ← Business logic + commit
└── api/v1/endpoints/{name}.py ← HTTP routing
```
