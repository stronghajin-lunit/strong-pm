---
name: test-designer
description: |
  Test design and skeleton generation. Designs tests that carry developer intent based on specs/requirements.
  Trigger: /project:test-design command, before new feature development for test design
---

# Test Designer Skill

Embeds developer intent in tests to communicate business rules to teammates.

## Usage

```
/project:test-design                        # interactive spec input
/project:test-design docs/specs/foo-spec.md # based on spec file
/project:test-design users                  # improve tests for existing module
```

---

## Core Principle: Express Intent

> Tests are **executable documentation**.
> They should capture not "what the code does" but "why it should do that".

### Python (pytest)

```python
# BAD: only verifies what
async def test_create_user(client):
    response = await client.post("/api/v1/users", json={"name": "test"})
    assert response.status_code == 201

# GOOD: test that carries why
class TestCreateUser:
    """POST /api/v1/users - Create user

    Requirements:
    ============
    1. Purpose - Register a user in the system
    2. Input - email (required), name (required)
    3. Response - id, email, name, role, createdAt
    4. Errors - duplicate email: 409, empty value: 422
    5. Business rule - default role on creation is 'member'
    """

    @pytest.mark.asyncio
    async def test_creates_user_with_default_member_role(self, client):
        """Create user with default role 'member'
        Given: valid email and name
        When: POST /api/v1/users
        Then: 201 returned, role set to member
        """
        # Given
        payload = {"email": "test@example.com", "name": "Test User"}
        # When
        response = await client.post("/api/v1/users", json=payload)
        # Then
        assert response.status_code == 201
        assert response.json()["role"] == "member"
```

### TypeScript (Vitest + React Testing Library)

```typescript
// BAD: testing implementation details
it('renders', () => {
  render(<UserForm />);
  expect(screen.getByRole('form')).toBeInTheDocument();
});

// GOOD: behavior-based test
describe('POST /api/v1/users - Create user', () => {
  it('shows error message when email is empty and form is submitted', async () => {
    // Given
    render(<UserForm onSubmit={mockSubmit} />);
    // When - submit without email
    await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    // Then
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
```

---

## Test Scenario Types

| Type | Description | Example |
|------|-------------|---------|
| Happy Path | Normal case | Successful creation, successful lookup |
| Error Cases | Error case | Duplicate, not found, no permission |
| Business Rules | Business rule | Uniqueness, state transition rules |
| Edge Cases | Boundary values | Empty input, max length |
| Auth | Authentication/authorization | Unauthenticated 401, forbidden 403 |

---

## Standard Scenario Checklist

```
Minimum scenarios per endpoint:
├─ Happy Path                        ← required
├─ Missing required field → 422      ← required
├─ Resource not found → 404          ← for GET/PUT/DELETE
├─ Duplicate → 409                   ← for POST (create)
├─ Unauthenticated → 401             ← for auth-required endpoints
└─ Forbidden → 403                   ← for permission-controlled endpoints
```

---

## Output Format

```markdown
## Test Design Report

### Target
- Module: {module}
- Spec: {docs/specs/... or summary}

### Test Scenarios ({N} total)

| # | Scenario | Type | Given | When | Then |
|---|----------|------|-------|------|------|
| 1 | Successful creation | Happy | valid input | POST call | 201 |
| 2 | Duplicate rejected | Error | existing record | POST call | 409 |

### Files to Create
- `apps/backend/tests/test_{module}.py`
- `apps/frontend/src/components/{module}/{module}.test.tsx`

### Next Step
Run `/project:test-implement` to proceed with TDD implementation.
```
