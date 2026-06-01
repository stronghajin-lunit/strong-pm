# strong-pm Project — Claude Guidelines

## ⚠️ ABSOLUTE RULES

> **These rules apply at all times without exception.**

| # | Rule | On Violation |
|---|------|--------------|
| **1** | **Show a plan and get user approval before changing any code** | Stop work immediately |
| **2** | **Always create test files alongside new feature code** | No solo feature commits |
| **3** | **Commit messages must strictly follow Conventional Commits format** | Do not run `git commit` |
| **4** | **Update related docs automatically when changing APIs, env vars, or architecture** | Do not merge the PR |

---

## Project Structure

```
strong-pm/
├── apps/
│   ├── frontend/          # React 18 + TypeScript
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── api/
│   │   │   └── types/
│   │   ├── package.json
│   │   └── next.config.mjs
│   └── backend/           # FastAPI + Python 3.12
│       ├── app/
│       │   ├── api/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── services/
│       │   ├── repositories/
│       │   └── core/
│       ├── alembic/
│       ├── tests/
│       └── pyproject.toml
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
├── docs/                        # Project docs (shared, git-committed)
│   ├── plans/                   # Feature plans and design docs
│   ├── specs/                   # Feature specs, samples, requirements
│   ├── adr/                     # Architecture Decision Records
│   └── api-conventions.md       # API design principles and endpoint list
└── .claude/
    └── plan/
        └── PLAN.md              # Claude session tracking only (milestones, current session)
```

---

## File Placement Rules

> Always use this table to decide where a file belongs.

| What | Where | Example |
|------|-------|---------|
| Claude session tracking, milestone checks | `.claude/plan/PLAN.md` | Current phase, completion checks, ADR |
| Feature plans, design docs | `docs/plans/` | `2026-04-01-auth-design.md` |
| Feature specs, requirements, sample definitions | `docs/specs/` | `user-profile-spec.md`, `payment-flow.md` |
| Architecture Decision Records | `docs/adr/` | `ADR-001-monorepo.md` |
| API design principles + endpoint list | `docs/api-conventions.md` | (single file) |
| Coding style / testing / git rules | `.claude/rules/` | `code-style.md` |
| Repeatable task automation skills | `.claude/skills/` | `new-feature/SKILL.md` |
| Custom commands | `.claude/commands/` | `new-feature.md` |

### File Naming Rules

- `docs/plans/` → `YYYY-MM-DD-{kebab-case-title}.md` (date prefix required)
- `docs/specs/` → `{feature-name}-spec.md`
- `docs/adr/` → `ADR-{NNN}-{kebab-case-title}.md`

---

## Core Commands

| Purpose | Command |
|---------|---------|
| Frontend dev server | `cd apps/frontend && npm run dev` |
| Backend dev server | `cd apps/backend && uvicorn app.main:app --reload` |
| Apply DB migration | `cd apps/backend && alembic upgrade head` |
| Generate migration | `cd apps/backend && alembic revision --autogenerate -m "<message>"` |
| Frontend tests | `cd apps/frontend && npm run test` |
| Backend tests | `cd apps/backend && pytest` |
| Full lint | `npm run lint` (root) |
| Run Docker | `docker compose -f docker/docker-compose.dev.yml up -d` |
| Type check (FE) | `cd apps/frontend && npx tsc --noEmit` |
| Type check (BE) | `cd apps/backend && mypy app/` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript (strict), Next.js, Vitest, React Testing Library, msw |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.x, Alembic, pytest, pydantic v2 |
| Database | PostgreSQL 16 |
| Infra | Docker, Docker Compose |

---

## Rule Files (@import)

@rules/code-style.md
@rules/testing.md
@rules/git-workflow.md
@rules/docker-db.md

---

## Skills (@import)

@skills/new-feature/SKILL.md
@skills/debug/SKILL.md
@skills/code-review/SKILL.md
@skills/test-designer/SKILL.md
@skills/test-implementer/SKILL.md
@skills/test-validator/SKILL.md
@skills/review-pipeline/SKILL.md
@skills/refactor/SKILL.md
@skills/backend-feature/SKILL.md

---

## Custom Commands

| Command | Description |
|---------|-------------|
| `/project:new-feature <name>` | Scaffold a new feature (BE + FE) |
| `/project:pr-review` | Code review for PR (legacy; prefer pipeline) |
| `/project:db-migrate <message>` | Generate and apply Alembic migration |
| `/project:review [file/module]` | Code review (4 phases) |
| `/project:test-design [spec/module]` | TDD test design + skeleton generation |
| `/project:test-implement [file/module]` | TDD RED-GREEN-REFACTOR execution |
| `/project:test-validate [module]` | Coverage validation |
| `/project:pipeline [file/module]` | Full flow: review → analyze → plan → fix → verify |
| `/project:refactor <domain>` | Layer-separation refactoring |
