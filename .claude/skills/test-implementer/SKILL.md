---
name: test-implementer
description: |
  TDD 방식으로 테스트와 구현을 진행합니다. RED-GREEN-REFACTOR 사이클을 따릅니다.
  사용 시점: /project:test-implement 커맨드 호출 시, /project:test-design 완료 후
---

# Test Implementer Skill

RED-GREEN-REFACTOR 사이클로 테스트와 구현을 진행합니다.

## 사용법

```
/project:test-implement                              # 설계된 테스트 구현
/project:test-implement apps/backend/tests/test_users.py  # 특정 파일
/project:test-implement users                        # 모듈 전체
```

---

## TDD 사이클

```
RED: 테스트 실패 확인
  ├─ 테스트 코드 작성
  ├─ 테스트 실행 → 실패 확인
  └─ 실패 이유가 "구현 없음"인지 확인
          ↓
GREEN: 최소 구현으로 통과
  ├─ 테스트를 통과시킬 최소한의 코드
  └─ 완벽함보다 동작이 먼저
          ↓
REFACTOR: 코드 개선
  ├─ 중복 제거 / 명확한 네이밍
  ├─ Convention 준수 (@rules/code-style.md)
  └─ 테스트는 계속 통과 상태 유지
```

---

## 구현 순서

```
Backend:   Model → Repository → Service → Router → Schema
Frontend:  Types → API Hook → Component → Page
```

---

## 테스트 격리 패턴

```python
# BAD: 수동 cleanup
async def test_create_user(client):
    await User.all().delete()
    ...

# GOOD: conftest.py fixture 사용 (apps/backend/tests/conftest.py)
async def test_create_user(client, db):
    # db fixture가 각 테스트 후 자동 rollback
    ...
```

```typescript
// GOOD: msw로 API 격리
beforeEach(() => {
  server.resetHandlers();  // 핸들러 초기화
});

it('API 에러 시 에러를 표시한다', async () => {
  server.use(
    http.post('/api/v1/users', () =>
      HttpResponse.json({ detail: 'Conflict' }, { status: 409 })
    )
  );
  render(<UserForm />);
  // ...
});
```

---

## Backend 구현 패턴 (FastAPI)

### conftest.py

```python
# apps/backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.main import app
from app.core.database import Base

@pytest.fixture
async def db(engine):
    """각 테스트마다 트랜잭션 롤백으로 격리"""
    async with engine.begin() as conn:
        async with AsyncSession(bind=conn) as session:
            yield session
            await session.rollback()

@pytest.fixture
async def client(db) -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
```

### 테스트 파일 구조

```python
# apps/backend/tests/test_{module}.py
class TestCreate{Module}:
    """POST /api/v1/{modules}

    기획 요구사항:
    ============
    1. 목적 - {목적}
    2. 입력 - {필드}
    3. 응답 - {필드}
    4. 에러 - {시나리오}
    5. 비즈니스 규칙 - {규칙}
    """

    @pytest.mark.asyncio
    async def test_creates_successfully(self, client: AsyncClient):
        """정상 생성
        Given: 유효한 입력
        When: POST 호출
        Then: 201 반환
        """
        response = await client.post("/api/v1/{modules}", json={...})
        assert response.status_code == 201
```

---

## Frontend 구현 패턴 (Vitest + RTL)

```typescript
// apps/frontend/src/components/{module}/{module}.test.tsx
describe('{Module}Form', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('유효한 입력 후 제출하면 onSubmit을 호출한다', async () => {
    // Given
    render(<{Module}Form onSubmit={mockSubmit} />);
    // When
    await userEvent.type(screen.getByLabelText('이름'), '테스트');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    // Then
    expect(mockSubmit).toHaveBeenCalledWith({ name: '테스트' });
  });
});
```

---

## 검증 커맨드

```bash
# Backend
cd apps/backend && pytest tests/test_{module}.py -v

# Frontend
cd apps/frontend && npm run test -- {module}

# 타입 체크
cd apps/frontend && npx tsc --noEmit
cd apps/backend && mypy app/
```

---

## 출력 형식

```markdown
## TDD 구현 리포트

### 사이클 요약

| 시나리오 | RED | GREEN | REFACTOR |
|----------|-----|-------|----------|
| 정상 생성 | 실패 확인 | 통과 | 완료 |
| 중복 거부 | 실패 확인 | 통과 | 완료 |

### 생성/수정 파일
**테스트:** `apps/backend/tests/test_{module}.py`
**구현:** `apps/backend/app/services/{module}_service.py` 외

### 테스트 결과
pytest: {N} passed / vitest: {N} passed

### 다음 단계
`/project:test-validate` 로 커버리지를 검증하세요.
```
