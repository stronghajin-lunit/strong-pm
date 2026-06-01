---
name: new-feature
description: |
  New feature scaffolding skill. Guides the file creation order for Backend + Frontend.
  Trigger: requests like "add feature", "create API", "create component", "need endpoint", "create CRUD"
---

# New Feature Skill

## Trigger Patterns

This skill activates on requests such as:
- "add ~~ feature"
- "create ~~ API"
- "create ~~ component"
- "create ~~ endpoint"
- "create ~~ CRUD"
- `/project:new-feature <name>` command

---

## Step 0: Report Plan (Required)

> **Absolute rule**: Before creating any file, report the plan in the format below and get approval.

```markdown
## New Feature Implementation Plan: {feature name}

### Files to Create

**Backend:**
- [ ] `apps/backend/app/models/{name}.py` — SQLAlchemy model
- [ ] `apps/backend/app/schemas/{name}.py` — Pydantic schema
- [ ] `apps/backend/app/repositories/{name}_repo.py` — Data access
- [ ] `apps/backend/app/services/{name}_service.py` — Business logic
- [ ] `apps/backend/app/api/v1/{name}.py` — FastAPI router
- [ ] `apps/backend/alembic/versions/{timestamp}_{name}.py` — Migration
- [ ] `apps/backend/tests/test_{name}.py` — Backend tests

**Frontend:**
- [ ] `apps/frontend/src/types/{name}.ts` — TypeScript types
- [ ] `apps/frontend/src/api/use-{name}.ts` — React Query hook
- [ ] `apps/frontend/src/components/{name}/` — Components
- [ ] `apps/frontend/src/pages/{name}/` — Page
- [ ] `apps/frontend/src/components/{name}/{name}.test.tsx` — Frontend tests

**Documentation Updates:**
- [ ] `docs/api-conventions.md` — Add new endpoint
- [ ] `.claude/plan/PLAN.md` — Update current work section

### API Design
{API endpoint list}

Awaiting approval to proceed in order above.
```

---

## Backend Creation Order

### 1. Model (SQLAlchemy)

```python
# apps/backend/app/models/{name}.py
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class {Name}(Base):
    __tablename__ = "{names}"  # snake_case plural

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # domain fields ...
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

### 2. Schema (Pydantic)

```python
# apps/backend/app/schemas/{name}.py
from pydantic import BaseModel
from datetime import datetime

class {Name}Base(BaseModel):
    # shared fields

class {Name}Create(Base):
    # fields required for creation

class {Name}Response({Name}Base):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

### 3. Repository

```python
# apps/backend/app/repositories/{name}_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.{name} import {Name}
from app.schemas.{name} import {Name}Response

class {Name}Repository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_id(self, id: int) -> Optional[{Name}Response]:
        result = await self.db.execute(select({Name}).where({Name}.id == id))
        item = result.scalar_one_or_none()
        return {Name}Response.model_validate(item) if item else None

    async def create(self, **kwargs) -> {Name}Response:
        item = {Name}(**kwargs)
        self.db.add(item)
        await self.db.flush()  # no commit()
        return {Name}Response.model_validate(item)
```

### 4. Service

```python
# apps/backend/app/services/{name}_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.{name}_repo import {Name}Repository
from app.schemas.{name} import {Name}Create, {Name}Response

class {Name}Service:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = {Name}Repository(db)

    async def create(self, data: {Name}Create) -> {Name}Response:
        item = await self.repo.create(**data.model_dump())
        await self.db.commit()
        return item

    async def get(self, id: int) -> {Name}Response:
        item = await self.repo.find_by_id(id)
        if not item:
            raise HTTPException(status_code=404, detail="{Name} not found")
        return item
```

### 5. Router

```python
# apps/backend/app/api/v1/{name}.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.{name}_service import {Name}Service
from app.schemas.{name} import {Name}Create, {Name}Response

router = APIRouter(prefix="/{names}", tags=["{names}"])

def get_{name}_service(db: AsyncSession = Depends(get_db)) -> {Name}Service:
    return {Name}Service(db)

@router.post("/", response_model={Name}Response, status_code=201)
async def create_{name}(
    data: {Name}Create,
    service: {Name}Service = Depends(get_{name}_service),
) -> {Name}Response:
    return await service.create(data)

@router.get("/{id}", response_model={Name}Response)
async def get_{name}(
    id: int,
    service: {Name}Service = Depends(get_{name}_service),
) -> {Name}Response:
    return await service.get(id)
```

### 6. Migration

```bash
cd apps/backend && alembic revision --autogenerate -m "add {names} table"
```

### 7. Test

```python
# apps/backend/tests/test_{name}.py
class TestCreate{Name}:
    """POST /api/v1/{names}

    Business rules:
    1. {rule1}
    2. {rule2}
    """

    @pytest.mark.asyncio
    async def test_creates_successfully(self, client):
        """Successful creation
        Given: valid input
        When: POST call
        Then: 201 returned
        """
        # Given / When / Then
```

---

## Frontend Creation Order

### 1. Types

```typescript
// apps/frontend/src/types/{name}.ts
export interface {Name} {
  id: number;
  // fields...
  createdAt: string;
  updatedAt: string;
}

export interface Create{Name}Request {
  // creation request fields
}
```

### 2. API Hook (React Query)

```typescript
// apps/frontend/src/api/use-{name}.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { {Name}, Create{Name}Request } from '@/types/{name}';

const {NAME}_KEYS = {
  all: ['{names}'] as const,
  detail: (id: number) => ['{names}', id] as const,
};

export function use{Name}(id: number) {
  return useQuery({
    queryKey: {NAME}_KEYS.detail(id),
    queryFn: () => fetch(`/api/v1/{names}/${id}`).then(r => r.json()),
  });
}

export function useCreate{Name}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Create{Name}Request) =>
      fetch('/api/v1/{names}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: {NAME}_KEYS.all }),
  });
}
```

### 3. Component

```typescript
// apps/frontend/src/components/{name}/{name}-card.tsx
import type { {Name} } from '@/types/{name}';

interface {Name}CardProps {
  {name}: {Name};
}

export function {Name}Card({ {name} }: {Name}CardProps) {
  return (
    <div>
      {/* UI rendering */}
    </div>
  );
}
```

### 4. Page

```typescript
// apps/frontend/src/pages/{name}/{name}-page.tsx
import { use{Name}List } from '@/api/use-{name}';
import { {Name}Card } from '@/components/{name}/{name}-card';

export function {Name}Page() {
  const { data, isLoading } = use{Name}List();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      {data?.map(item => <{Name}Card key={item.id} {name}={item} />)}
    </div>
  );
}
```

### 5. Test

```typescript
// apps/frontend/src/components/{name}/{name}.test.tsx
import { render, screen } from '@testing-library/react';
import { {Name}Card } from './{name}-card';

describe('{Name}Card', () => {
  it('renders basic info', () => {
    // Given / When / Then
  });
});
```

---

## Post-Completion Updates

1. **`docs/api-conventions.md`**: Add new endpoint and schema
2. **`.claude/plan/PLAN.md`**: Update current work section, mark as done
3. **`apps/backend/app/main.py`**: Confirm router is registered
