---
name: review-pipeline
description: |
  Full Convention review pipeline. Runs sequentially: review → analyze → plan → fix (TDD) → verify.
  Trigger: /project:pipeline command, large-scale modifications or refactoring work
---

# Review Pipeline Skill

## Usage

```
/project:pipeline                   # changed files based on git diff
/project:pipeline apps/backend/app/services/user_service.py  # specific file
/project:pipeline auth              # entire module
/project:pipeline --dry-run         # plan only (no changes)
```

---

## Pipeline Flow

```
1. REVIEW   → 4-phase review (context → design → line-by-line → summary)
      ↓
2. ANALYZE  → severity classification, dependency analysis, priority ordering
      ↓
3. PLAN     → per-phase fix plan + Before/After + impact scope
      ↓
   [await user approval]  ← must proceed only after approval
      ↓
4. FIX      → RED-GREEN-REFACTOR (one cycle per issue)
      ↓
5. VERIFY   → Lint + Type + Test + Convention re-check
```

---

## Stage 1: REVIEW

Perform the 4-phase review based on `@skills/code-review/SKILL.md`.

**Validation targets:**
- Layer separation (`Router → Service → Repository`)
- Python: type hints, UTC time, magic strings, commit() in repo
- TypeScript: any, useEffect dependencies, business logic in component
- FastAPI: response_model, Depends()

---

## Stage 2: ANALYZE

Classify issues and determine fix order.

### Dependency Patterns

```
Backend:
  Base class fix → subclass fix
  Repository fix → Service fix → Router fix

Frontend:
  types/ fix → api/ → hooks/ → components/ → pages/
```

### Priority Determination

| Factor | Weight |
|--------|--------|
| Severity (Blocking > Important > Nit) | High |
| Dependencies (prerequisite work) | Medium |
| Impact scope (multiple files) | Medium |

---

## Stage 3: PLAN

Write a fix plan for each issue in the format below.

```markdown
### Phase 1: {title}

#### [B-001] {issue}
**File to fix**: `apps/backend/app/services/user_service.py`
**Basis**: commit() not allowed in Repository (@rules/code-style.md)
**Change**:
  Before: await self.db.commit()
  After:  await self.db.flush()
**Impacted files**: none
```

> After completing the plan, get user approval before proceeding to Stage 4.

---

## Stage 4: FIX (RED-GREEN-REFACTOR)

Apply the TDD cycle to each issue.

### RED: Confirm Failure

```bash
# Backend
cd apps/backend && pytest tests/test_{module}.py -k "test_{scenario}" -v

# Frontend
cd apps/frontend && npm run test -- {module}
```

### GREEN: Minimal Fix

- Minimum code to pass the test
- No new features (save for next cycle)

### REFACTOR: Clean Up

```bash
# Backend validation
cd apps/backend && ruff check app/ && mypy app/ && pytest -v

# Frontend validation
cd apps/frontend && npx tsc --noEmit && npm run test
```

---

## Stage 5: VERIFY

Final validation after all fixes are complete.

```bash
# Backend full
cd apps/backend && ruff check app/ && mypy app/ && pytest --cov=app

# Frontend full
cd apps/frontend && npx tsc --noEmit && npm run test -- --coverage

# Convention re-check (confirm Blocking = 0)
# re-run /project:review
```

---

## Output Format

```markdown
## Pipeline Report

### Pipeline Summary
- Target: {file/module}
- Issues found: Blocking {N} / Important {N} / Nit {N}
- Files to fix: {N}

---

### Stage 1: REVIEW Results
(see code-review output format)

### Stage 2: ANALYZE Results
Priority ordering and dependency graph

### Stage 3: PLAN
Per-phase fix plan

### Stage 4: FIX Results
| Issue | RED | GREEN | REFACTOR |
|-------|-----|-------|----------|
| B-001 | confirmed failure | passed | done |

### Stage 5: VERIFY Results
| Item | Result |
|------|--------|
| Lint (ruff/eslint) | Pass |
| Type (mypy/tsc) | Pass |
| Test | {N} passed |
| Convention Blocking | 0 |

---

### Final Result
| Before | After |
|--------|-------|
| Blocking {N} | 0 |
| Important {N} | 0 |
```
