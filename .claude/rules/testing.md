# Testing Rules

## Frontend (React + TypeScript)

### Tools

| Tool | Role |
|------|------|
| **Vitest** | Test runner |
| **React Testing Library** | Component rendering + interaction |
| **msw (Mock Service Worker)** | API request mocking |
| **@testing-library/user-event** | User event simulation |

### Core Principle: Test from the User's Perspective

```typescript
// ✅ GOOD: behavior-based
it('saves when name is typed and save button is clicked', async () => {
  render(<ProfileForm />);
  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
});

// ❌ BAD: testing implementation details
it('calls setState', () => {
  const { result } = renderHook(() => useState(''));
  act(() => result.current[1]('John'));
  expect(result.current[0]).toBe('John');
});
```

### API Mocking (msw)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'John' });
  }),
];

// Override handler in a test
it('shows error message on API error', async () => {
  server.use(
    http.get('/api/users/:id', () =>
      HttpResponse.json({ error: 'Not found' }, { status: 404 })
    )
  );
  render(<UserProfile userId="999" />);
  expect(await screen.findByText('User not found')).toBeInTheDocument();
});
```

### Test Structure

```typescript
describe('ComponentName / HookName', () => {
  beforeEach(() => {
    server.resetHandlers(); // reset msw handlers
  });

  describe('happy path', () => {
    it('renders by default', () => { ... });
    it('displays list after data loads', async () => { ... });
  });

  describe('error cases', () => {
    it('shows error message when required field is missing', async () => { ... });
    it('shows error state on API failure', async () => { ... });
  });
});
```

### Coverage Targets

| Target | Goal |
|--------|------|
| Components (`*.tsx`) | **70%** or above |
| Hooks (`use-*.ts`) | **90%** or above |
| API layer (`api/*.ts`) | **90%** or above |
| Utilities (`utils/*.ts`) | **95%** or above |

---

## Backend (FastAPI + Python)

### Tools

| Tool | Role |
|------|------|
| **pytest** | Test runner |
| **pytest-asyncio** | Async test support |
| **httpx / AsyncClient** | FastAPI test client |
| **pytest-cov** | Coverage measurement |

### conftest.py Fixture Pattern

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
    """Isolate each test with transaction rollback"""
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

### Rollback After Each Test

```python
# Isolate tests with transaction rollback
class TestCreateUser:
    """POST /api/v1/users - Create user

    Business rules:
    1. Email must be unique
    2. Default role on creation is 'member'
    """

    @pytest.mark.asyncio
    async def test_creates_user_successfully(self, client: AsyncClient):
        """Successful creation
        Given: valid email and name
        When: POST /api/v1/users
        Then: 201, returns user data
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
        """Reject duplicate email
        Given: user with same email already exists
        When: POST with the same email
        Then: returns 409
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

### Coverage Targets

| Target | Goal |
|--------|------|
| Service layer | **90%** or above |
| Repository layer | **90%** or above |
| Router (API endpoints) | **80%** or above |
| Utilities | **95%** or above |

### Running Tests

```bash
# All tests
pytest apps/backend/tests/ -v

# Specific module
pytest apps/backend/tests/test_users.py -v

# With coverage
pytest apps/backend/tests/ --cov=app --cov-report=html

# Fail fast (stop on first failure)
pytest apps/backend/tests/ -x
```
