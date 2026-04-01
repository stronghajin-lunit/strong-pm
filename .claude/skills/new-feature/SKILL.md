---
name: new-feature
description: |
  새 기능 스캐폴딩 스킬. Backend + Frontend 파일 생성 순서를 가이드합니다.
  사용 시점: "기능 추가", "API 만들어", "컴포넌트 만들어", "엔드포인트 필요" 등의 요청
---

# New Feature Skill

## 트리거 패턴

다음 패턴의 요청 시 이 스킬이 활성화됩니다:
- "~~ 기능 추가해줘"
- "~~ API 만들어줘"
- "~~ 컴포넌트 만들어줘"
- "~~ 엔드포인트 만들어줘"
- "~~ CRUD 만들어줘"
- `/project:new-feature <name>` 커맨드 호출

---

## 0단계: 계획 보고 (필수)

> **절대 규칙**: 파일 생성 전 반드시 아래 형식으로 계획을 보고하고 승인을 받는다.

```markdown
## 새 기능 구현 계획: {기능명}

### 생성할 파일 목록

**Backend:**
- [ ] `apps/backend/app/models/{name}.py` — SQLAlchemy 모델
- [ ] `apps/backend/app/schemas/{name}.py` — Pydantic 스키마
- [ ] `apps/backend/app/repositories/{name}_repo.py` — 데이터 접근
- [ ] `apps/backend/app/services/{name}_service.py` — 비즈니스 로직
- [ ] `apps/backend/app/api/v1/{name}.py` — FastAPI 라우터
- [ ] `apps/backend/alembic/versions/{timestamp}_{name}.py` — 마이그레이션
- [ ] `apps/backend/tests/test_{name}.py` — 백엔드 테스트

**Frontend:**
- [ ] `apps/frontend/src/types/{name}.ts` — TypeScript 타입
- [ ] `apps/frontend/src/api/use-{name}.ts` — React Query 훅
- [ ] `apps/frontend/src/components/{name}/` — 컴포넌트
- [ ] `apps/frontend/src/pages/{name}/` — 페이지
- [ ] `apps/frontend/src/components/{name}/{name}.test.tsx` — 프론트 테스트

**문서 업데이트:**
- [ ] `docs/api-conventions.md` — 새 엔드포인트 추가
- [ ] `.claude/plan/PLAN.md` — 현재 작업 섹션 업데이트

### API 설계
{API 엔드포인트 목록}

승인하시면 위 순서대로 진행합니다.
```

---

## Backend 생성 순서

### 1. Model (SQLAlchemy)

```python
# apps/backend/app/models/{name}.py
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class {Name}(Base):
    __tablename__ = "{names}"  # snake_case 복수형

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 도메인 필드 ...
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
    # 공통 필드

class {Name}Create(Base):
    # 생성 시 필요한 필드

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
        await self.db.flush()  # commit() 금지
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

    비즈니스 규칙:
    1. {규칙1}
    2. {규칙2}
    """

    @pytest.mark.asyncio
    async def test_creates_successfully(self, client):
        """정상 생성"""
        # Given / When / Then
```

---

## Frontend 생성 순서

### 1. Types

```typescript
// apps/frontend/src/types/{name}.ts
export interface {Name} {
  id: number;
  // 필드...
  createdAt: string;
  updatedAt: string;
}

export interface Create{Name}Request {
  // 생성 요청 필드
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
      {/* UI 렌더링 */}
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
  it('기본 정보를 렌더링한다', () => {
    // Given / When / Then
  });
});
```

---

## 완료 후 업데이트 항목

1. **`docs/api-conventions.md`**: 새 엔드포인트 및 스키마 추가
2. **`.claude/plan/PLAN.md`**: 현재 작업 섹션 업데이트, 완료 체크
3. **`apps/backend/app/main.py`**: 라우터 등록 확인
