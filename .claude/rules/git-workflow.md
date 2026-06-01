# Git Workflow Rules

## Branch Strategy

### Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/*` | New feature development | `feature/user-auth`, `feature/payment-integration` |
| `fix/*` | Bug fixes | `fix/login-redirect`, `fix/query-n-plus-one` |
| `hotfix/*` | Production emergency fix | `hotfix/critical-auth-bypass` |
| `chore/*` | Build/dependency/config changes | `chore/update-dependencies`, `chore/docker-setup` |
| `refactor/*` | Code structure improvement | `refactor/auth-service-layer` |
| `docs/*` | Documentation work | `docs/api-conventions` |

### Branch Rules

- Direct push to `main`/`master` is forbidden (blocked by hooks)
- All changes must go through a branch and be merged via PR
- Keep branches small and focused (consider splitting if over 400 lines)

---

## Conventional Commits

### Format

```
<type>(<scope>): <subject>

[body]

[footer]
```

### Type

| type | When to use |
|------|-------------|
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `docs` | Documentation changes only (no code changes) |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or modifying tests |
| `chore` | Build, package, CI configuration changes |
| `style` | Formatting, semicolons, etc. (no logic changes) |
| `perf` | Performance improvements |

### Scope Examples

| scope | Target |
|-------|--------|
| `frontend` | React app overall |
| `backend` | FastAPI app overall |
| `db` | Database, migrations |
| `docker` | Docker configuration |
| `auth` | Authentication/authorization module |
| `api` | API endpoints |
| `ci` | CI/CD pipeline |

### Commit Message Examples

```bash
# ✅ GOOD
feat(backend): add user profile endpoint with avatar upload
fix(frontend): resolve infinite loop in useAuth hook
docs(api): update user endpoint request/response schema
refactor(auth): extract token validation to repository layer
test(backend): add integration tests for payment service
chore(docker): upgrade PostgreSQL image to 16.2

# ❌ BAD
fix: bug fix
update code
WIP
```

### Commit Scope

- One commit = one logical change
- Feature code and test code go in the same commit
- Documentation updates are included in the related feature commit

---

## Pull Request

### PR Rules

- **At least 1 reviewer** approval required
- **CI must pass** (lint, type check, test)
- **Squash and Merge** (keep commit history clean)
- PR title follows Conventional Commits format

### PR Checklist

```markdown
## Changes
- [ ] Feature/bug description

## Testing
- [ ] Unit/integration tests added
- [ ] Local tests pass

## Documentation
- [ ] docs/api-conventions.md updated for API changes
- [ ] .env.example updated for new env vars
- [ ] ADR added for architecture changes
```

### PR Size Guidelines

| Size | Lines changed | Recommendation |
|------|---------------|----------------|
| Small | ~200 lines | Optimal |
| Medium | 200–400 lines | Acceptable |
| Large | 400+ lines | Consider splitting |
