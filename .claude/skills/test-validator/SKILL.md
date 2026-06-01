---
name: test-validator
description: |
  Test coverage validation. Checks test coverage and quality against spec.
  Trigger: /project:test-validate command, after /project:test-implement completes
---

# Test Validator Skill

## Usage

```
/project:test-validate              # full validation
/project:test-validate users        # validate specific module
/project:test-validate --coverage   # include coverage report
```

---

## Coverage Standards

### Backend (Python)

| Layer | Minimum | Target |
|-------|---------|--------|
| Service | 80% | **90%** |
| Repository | 70% | **90%** |
| Router | 60% | **80%** |
| Utils | 90% | **95%** |

### Frontend (TypeScript)

| Layer | Minimum | Target | Tool |
|-------|---------|--------|------|
| Hooks (`use-*.ts`) | 80% | **90%** | Vitest |
| Components (`*.tsx`) | 60% | **70%** | RTL |
| API Layer (`api/*.ts`) | 80% | **90%** | Vitest + msw |
| Utils | 90% | **95%** | Vitest |

### Measuring Coverage

```bash
# Backend
cd apps/backend && pytest --cov=app --cov-report=term-missing

# Frontend
cd apps/frontend && npm run test -- --coverage
```

---

## Validation Checklist

### 1. Scenario Coverage

Verify all scenarios below exist based on spec (`docs/specs/`) or requirements:

| Scenario type | Checked |
|---------------|---------|
| Happy Path | [ ] |
| Missing required field (422) | [ ] |
| Duplicate conflict (409) | [ ] |
| Resource not found (404) | [ ] |
| Unauthenticated (401) | [ ] |
| Forbidden (403) | [ ] |
| Business rule violation | [ ] |

### 2. Docstring Quality

```python
# Class: check for requirements
class TestCreateUser:
    """POST /api/v1/users - Create user
    Requirements:
    ...
    """

# Method: check for Given-When-Then
async def test_creates_with_default_role(self, client):
    """Create with default role member
    Given: ...
    When: ...
    Then: ...
    """
```

### 3. Identify Uncovered Lines

```bash
# Backend: find uncovered lines
pytest --cov=app --cov-report=term-missing | grep "MISS"

# Frontend: find uncovered files
npm run test -- --coverage --reporter=text | grep "Uncovered"
```

---

## Coverage Exclusions

```python
# pyproject.toml
[tool.coverage.run]
omit = [
    "app/models/*",       # ORM model definitions
    "app/schemas/*",      # Pydantic schema definitions
    "app/core/config.py", # configuration
    "alembic/*",
]
```

---

## Output Format

```markdown
## Test Validation Report

### Scenario Coverage
| Endpoint | Scenario count | Missing |
|----------|----------------|---------|
| POST /api/v1/users | 5 | none |
| DELETE /api/v1/users/{id} | 0 | Happy Path, 404 |

### Code Coverage
| Layer | Current | Target | Status |
|-------|---------|--------|--------|
| Service | 93% | 90% | ✅ |
| Repository | 78% | 90% | ❌ |

### Missing Items
1. [Required] No tests for DELETE endpoint
2. [Recommended] UserRepository.delete() not covered

### Next Step
Add missing tests then re-run `/project:test-validate`
```
