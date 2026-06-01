---
name: debug
description: |
  Error/bug debugging skill. Proceeds in order: log analysis → reproduction test → fix → regression test.
  Trigger: error messages, stack traces, "doesn't work", "error", "bug", HTTP status code errors (500, 404, 422, etc.)
---

# Debug Skill

## Trigger Patterns

This skill activates on requests such as:
- Messages containing error messages or stack traces
- "doesn't work", "getting an error", "broken"
- "why isn't this working?", "fix the bug"
- Mentions of HTTP status code errors (500, 404, 422, etc.)

---

## Debugging Procedure

### Step 1: Check Logs

Identify the error message and stack trace.

**Checklist:**
- [ ] Identify error type (TypeError, HTTPException, DatabaseError, etc.)
- [ ] Find error location (filename, line number)
- [ ] Determine when it occurs (under what conditions)
- [ ] Collect relevant logs

**Backend log check:**
```bash
# Live log from dev server
cd apps/backend && uvicorn app.main:app --reload --log-level debug

# Docker logs
docker logs strongpm-backend -f --tail 100
```

**Frontend log check:**
```bash
# Check browser console (including Network tab)
# Verify React Query DevTools is enabled
```

---

### Step 2: Classify Error and Form Hypotheses

| Error type | Main causes | Where to check |
|-----------|-------------|----------------|
| `500 Internal Server Error` | Unhandled exception, DB connection, type error | Server logs, Service/Repository |
| `422 Unprocessable Entity` | Pydantic validation failure, type mismatch | Request body, Schema definition |
| `404 Not Found` | Resource not found, incorrect path | Router config, DB query |
| `401/403` | Auth/permission error | Middleware, token validation |
| TypeScript type error | Type mismatch, missing null check | Type definitions, API response |
| React render error | Incorrect hook usage, missing dependency | Component, useEffect |

---

### Step 3: Write Reproduction Test

> Always write a failing test first before fixing (TDD Red stage).

**Backend reproduction test:**
```python
@pytest.mark.asyncio
async def test_reproduces_{bug_description}(self, client):
    """Bug reproduction test

    Given: {conditions that cause the bug}
    When: {action that triggers the bug}
    Then: {correct behavior — should pass after fix}

    See: {issue number or error message}
    """
    # Given
    ...
    # When
    response = await client.{method}(...)
    # Then (currently fails, passes after fix)
    assert response.status_code == {expected_code}
```

**Frontend reproduction test:**
```typescript
it('behaves correctly when {bug description}', async () => {
  // Given: set up conditions that trigger the bug
  server.use(
    http.get('/api/...', () => HttpResponse.json(...))
  );

  // When: trigger the bug
  render(<Component />);
  await userEvent.click(screen.getByRole('button', { name: '...' }));

  // Then: correct behavior (currently fails)
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

---

### Step 4: Fix

**Fix principles:**
- Minimal changes to fix the bug (no unrelated refactoring)
- Fix the root cause (avoid defensive code that only hides symptoms)
- Add a comment explaining why the fix is needed

**Common Python bug patterns:**
```python
# ❌ timezone-naive datetime
expires_at = datetime.utcnow() + timedelta(hours=1)
# ✅ timezone-aware
from datetime import datetime, timezone, timedelta
expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

# ❌ commit() in Repository (transaction conflict)
await self.db.commit()
# ✅ flush only
await self.db.flush()

# ❌ N+1 query
for user in users:
    profile = await get_profile(user.id)
# ✅ eager loading
from sqlalchemy.orm import selectinload
stmt = select(User).options(selectinload(User.profile))
```

**Common TypeScript/React bug patterns:**
```typescript
// ❌ missing useEffect dependency (stale closure)
useEffect(() => {
  fetchData(userId);
}, []); // missing userId
// ✅
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ❌ missing null check
const name = user.profile.name; // user.profile may be null
// ✅
const name = user.profile?.name ?? 'Unknown';
```

---

### Step 5: Run Regression Tests

After fixing, run the full test suite to ensure no new bugs were introduced.

```bash
# Backend all tests
cd apps/backend && pytest -v

# Frontend all tests
cd apps/frontend && npm run test

# Type check
cd apps/frontend && npx tsc --noEmit
cd apps/backend && mypy app/
```

---

## Debug Report Format

```markdown
## Debug Report

### Error Summary
- **Type**: {error type}
- **Location**: `{file path}:{line number}`
- **Message**: {error message}

### Root Cause
{cause description}

### Fix
**File**: `{file path}`

```
# Before
{problematic code}

# After
{fixed code}
```

### Reproduction Test
`tests/{test_file}.py` — added `test_{bug_description}`

### Regression Test Results
- pytest: {N} passed
- tsc: No errors

### Prevention
{how to prevent the same bug in the future}
```
