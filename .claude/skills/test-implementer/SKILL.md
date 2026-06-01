---
name: test-implementer
description: |
  Implements tests and code in TDD style. Follows the RED-GREEN-REFACTOR cycle.
  Trigger: /project:test-implement command, after /project:test-design completes
---

# Test Implementer Skill

Proceeds with tests and implementation using the RED-GREEN-REFACTOR cycle.

## Usage

```
/project:test-implement                              # implement designed tests
/project:test-implement apps/backend/tests/test_users.py  # specific file
/project:test-implement users                        # entire module
```

---

## TDD Cycle

```
RED: Confirm test failure
  ├─ Write test code
  ├─ Run test → confirm failure
  └─ Confirm failure reason is "no implementation"
          ↓
GREEN: Pass with minimal implementation
  ├─ Minimum code to pass the test
  └─ Working code before perfect code
          ↓
REFACTOR: Improve code
  ├─ Remove duplication / clear naming
  ├─ Follow Convention (@rules/code-style.md)
  └─ Tests must keep passing
```

---

## Implementation Order

```
Backend:   Model → Repository → Service → Router → Schema
Frontend:  Types → API Hook → Component → Page
```

---

## Test Isolation Patterns

```python
# BAD: manual cleanup
async def test_create_user(client):
    await User.all().delete()
    ...

# GOOD: use conftest.py fixture (apps/backend/tests/conftest.py)
async def test_create_user(client, db):
    # db fixture auto-rolls back after each test
    ...
```

```typescript
// GOOD: isolate API with msw
beforeEach(() => {
  server.resetHandlers();  // reset handlers
});

it('shows error on API failure', async () => {
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

## Backend Implementation Pattern (FastAPI)

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

### Test File Structure

```python
# apps/backend/tests/test_{module}.py
class TestCreate{Module}:
    """POST /api/v1/{modules}

    Requirements:
    ============
    1. Purpose - {purpose}
    2. Input - {fields}
    3. Response - {fields}
    4. Errors - {scenarios}
    5. Business rules - {rules}
    """

    @pytest.mark.asyncio
    async def test_creates_successfully(self, client: AsyncClient):
        """Successful creation
        Given: valid input
        When: POST call
        Then: 201 returned
        """
        response = await client.post("/api/v1/{modules}", json={...})
        assert response.status_code == 201
```

---

## Frontend Implementation Pattern (Vitest + RTL)

```typescript
// apps/frontend/src/components/{module}/{module}.test.tsx
describe('{Module}Form', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('calls onSubmit after valid input and submit', async () => {
    // Given
    render(<{Module}Form onSubmit={mockSubmit} />);
    // When
    await userEvent.type(screen.getByLabelText('Name'), 'test');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    // Then
    expect(mockSubmit).toHaveBeenCalledWith({ name: 'test' });
  });
});
```

---

## Verification Commands

```bash
# Backend
cd apps/backend && pytest tests/test_{module}.py -v

# Frontend
cd apps/frontend && npm run test -- {module}

# Type check
cd apps/frontend && npx tsc --noEmit
cd apps/backend && mypy app/
```

---

## Output Format

```markdown
## TDD Implementation Report

### Cycle Summary

| Scenario | RED | GREEN | REFACTOR |
|----------|-----|-------|----------|
| Successful creation | confirmed failure | passed | done |
| Duplicate rejected | confirmed failure | passed | done |

### Files Created/Modified
**Tests:** `apps/backend/tests/test_{module}.py`
**Implementation:** `apps/backend/app/services/{module}_service.py` and others

### Test Results
pytest: {N} passed / vitest: {N} passed

### Next Step
Run `/project:test-validate` to validate coverage.
```
