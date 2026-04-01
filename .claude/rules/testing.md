# Testing Rules

## Frontend (React + TypeScript)

### 도구

| 도구 | 역할 |
|------|------|
| **Vitest** | 테스트 러너 |
| **React Testing Library** | 컴포넌트 렌더링 + 인터랙션 |
| **msw (Mock Service Worker)** | API 요청 모킹 |
| **@testing-library/user-event** | 사용자 이벤트 시뮬레이션 |

### 핵심 원칙: 사용자 관점 테스트

```typescript
// ✅ GOOD: 사용자 행동 기반
it('이름을 입력하고 저장 버튼을 누르면 저장된다', async () => {
  render(<ProfileForm />);
  await userEvent.type(screen.getByLabelText('이름'), 'John');
  await userEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(await screen.findByText('저장되었습니다')).toBeInTheDocument();
});

// ❌ BAD: 구현 세부사항 테스트
it('setState가 호출된다', () => {
  const { result } = renderHook(() => useState(''));
  act(() => result.current[1]('John'));
  expect(result.current[0]).toBe('John');
});
```

### API 모킹 (msw)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'John' });
  }),
];

// 테스트에서 핸들러 오버라이드
it('API 에러 시 에러 메시지를 표시한다', async () => {
  server.use(
    http.get('/api/users/:id', () =>
      HttpResponse.json({ error: 'Not found' }, { status: 404 })
    )
  );
  render(<UserProfile userId="999" />);
  expect(await screen.findByText('사용자를 찾을 수 없습니다')).toBeInTheDocument();
});
```

### 테스트 구조

```typescript
describe('컴포넌트/훅 이름', () => {
  beforeEach(() => {
    server.resetHandlers(); // msw 핸들러 초기화
  });

  describe('정상 케이스', () => {
    it('기본 렌더링이 된다', () => { ... });
    it('데이터 로드 후 목록을 표시한다', async () => { ... });
  });

  describe('에러 케이스', () => {
    it('필수 입력 누락 시 에러 메시지를 표시한다', async () => { ... });
    it('API 오류 시 에러 상태를 표시한다', async () => { ... });
  });
});
```

### 커버리지 목표

| 대상 | 목표 |
|------|------|
| 컴포넌트 (`*.tsx`) | **70%** 이상 |
| 훅 (`use-*.ts`) | **90%** 이상 |
| API 레이어 (`api/*.ts`) | **90%** 이상 |
| 유틸리티 (`utils/*.ts`) | **95%** 이상 |

---

## Backend (FastAPI + Python)

### 도구

| 도구 | 역할 |
|------|------|
| **pytest** | 테스트 러너 |
| **pytest-asyncio** | 비동기 테스트 지원 |
| **httpx / AsyncClient** | FastAPI 테스트 클라이언트 |
| **pytest-cov** | 커버리지 측정 |

### conftest.py 픽스처 패턴

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.main import app
from app.core.database import Base

DATABASE_URL = "postgresql+asyncpg://test:test@localhost/test_db"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db(engine) -> AsyncSession:
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

### 각 테스트 후 Rollback

```python
# 트랜잭션 롤백으로 테스트 간 데이터 격리
class TestCreateUser:
    """POST /api/v1/users - 사용자 생성

    비즈니스 규칙:
    1. 이메일은 고유해야 함
    2. 생성 시 기본 역할은 'member'
    """

    @pytest.mark.asyncio
    async def test_creates_user_successfully(self, client: AsyncClient):
        """정상 생성
        Given: 유효한 이메일과 이름
        When: POST /api/v1/users
        Then: 201, 사용자 데이터 반환
        """
        # Given
        payload = {"email": "test@example.com", "name": "Test User"}

        # When
        response = await client.post("/api/v1/users", json=payload)

        # Then
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["role"] == "member"

    @pytest.mark.asyncio
    async def test_rejects_duplicate_email(self, client: AsyncClient, create_user):
        """중복 이메일 거부
        Given: 동일 이메일 사용자가 이미 존재
        When: 같은 이메일로 POST
        Then: 409 반환
        """
        # Given
        await create_user(email="dup@example.com")

        # When
        response = await client.post(
            "/api/v1/users", json={"email": "dup@example.com", "name": "Another"}
        )

        # Then
        assert response.status_code == 409
```

### 커버리지 목표

| 대상 | 목표 |
|------|------|
| Service 레이어 | **90%** 이상 |
| Repository 레이어 | **90%** 이상 |
| Router (API 엔드포인트) | **80%** 이상 |
| 유틸리티 | **95%** 이상 |

### 테스트 실행

```bash
# 전체 테스트
pytest apps/backend/tests/ -v

# 특정 모듈
pytest apps/backend/tests/test_users.py -v

# 커버리지 포함
pytest apps/backend/tests/ --cov=app --cov-report=html

# 빠른 실패 (첫 번째 실패 시 중단)
pytest apps/backend/tests/ -x
```
