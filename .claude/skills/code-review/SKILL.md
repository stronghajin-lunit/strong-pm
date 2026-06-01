---
name: code-review
description: |
  Reviews project Convention compliance and creates a fix plan.
  Trigger: /project:review command, pre-PR quality review, post-feature review request
---

# Code Review Skill

## Usage

```
/project:review                    # changed files based on git diff
/project:review path/to/file.py    # specific file
/project:review auth               # entire module
```

---

## 4-Phase Review Process

### Phase 1: Understand Context

- [ ] Check change scope (**consider splitting if over 400 lines**)
- [ ] Identify related module/domain
- [ ] Check existing code patterns (based on `@rules/code-style.md`)
- [ ] Understand purpose of change (new feature, bug fix, refactoring)

### Phase 2: High-Level Review

**Architecture & Design**
- [ ] Layer separation principle followed (`Router → Service → Repository`)
- [ ] Appropriate separation of concerns
- [ ] Correct file/directory structure (`apps/frontend/`, `apps/backend/`)

**Dependency Direction**
- [ ] Dependencies flow top-to-bottom only
- [ ] No reverse dependencies
- [ ] No circular dependencies

### Phase 3: Line-by-Line Review

**Convention Violations** (based on `@rules/code-style.md`)
- [ ] Project coding style followed
- [ ] Naming convention consistency
- [ ] Error handling pattern followed

**Python Anti-patterns**
- [ ] Missing type hints
- [ ] `datetime.utcnow()` / `datetime.now()` usage (→ `datetime.now(timezone.utc)`)
- [ ] Magic strings (→ Enum)
- [ ] `commit()` called in Repository (→ only `flush()` allowed)
- [ ] Direct ORM access in Service
- [ ] `bare except` usage
- [ ] Mixing `Optional[X]` and `X | None` (follow project standard)

**TypeScript/React Anti-patterns**
- [ ] `any` type usage
- [ ] Missing/incomplete `useEffect` dependency array
- [ ] Business logic written directly in component (→ extract to hooks)
- [ ] Unnecessary re-renders (missing memoization)
- [ ] Overuse of `as` type assertions

```typescript
// BAD: business logic in component
function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    fetch('/api/v1/items').then(r => r.json()).then(setItems);
  }, []);
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}

// GOOD: extracted to hook
function ItemList() {
  const { items } = useItems();
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}
```

**FastAPI Patterns**
- [ ] Missing `response_model`
- [ ] Not using `Depends()` (dependency created directly)
- [ ] Schema passed directly as Service parameter

**Security & Performance**
- [ ] SQL injection risk (raw query)
- [ ] N+1 query problem
- [ ] Sensitive data exposure (`.env` hardcoded)
- [ ] XSS / CSRF

### Phase 4: Summary

- [ ] Classify issues by severity
- [ ] Determine fix priority
- [ ] Include positive feedback

---

## Severity Classification

| Level | Meaning | Examples |
|-------|---------|---------|
| **blocking** | Must fix, cannot merge | Missing validation, type error, security vulnerability |
| **important** | Strongly recommended | Convention violation, naming inconsistency |
| **nit** | Optional | Code style, comments |
| **suggestion** | Alternative proposed | Better approach available |
| **praise** | Positive feedback | Well-written code |

---

## Output Format

```markdown
## Code Review Report

### Context
- Target: {file/module}
- Change size: {N} lines (acceptable / consider splitting)
- Change type: {new feature / bug fix / refactoring}

### Summary
- Blocking: {N} / Important: {N} / Nit: {N}

---

### Blocking Issues

#### [B-001] {title}
- **File**: `path:line`
- **Problem**: {description}
- **Basis**: {rule violated}
- **Fix**:
  ```
  # Before
  ...
  # After
  ...
  ```

### What's Good
- {positive feedback}

### Next Step
Run `/project:pipeline` to proceed with the full fix flow.
```
