# strong-pm Project — Claude Guidelines

## ⚠️ 절대 규칙 (ABSOLUTE RULES)

> **이 규칙들은 예외 없이 항상 적용됩니다.**

| # | 규칙 | 위반 시 |
|---|------|---------|
| **1** | **코드 변경 전 반드시 계획을 보여주고 사용자 승인을 받는다** | 즉시 작업 중단 |
| **2** | **새 기능 구현 시 테스트 파일을 반드시 동시에 생성한다** | 기능 코드 단독 커밋 금지 |
| **3** | **커밋 메시지는 Conventional Commits 형식을 엄수한다** | `git commit` 실행 금지 |
| **4** | **API/환경변수/아키텍처 변경 시 관련 문서를 자동으로 업데이트한다** | 변경 PR 머지 금지 |

---

## 프로젝트 구조

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
│   │   └── vite.config.ts
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
├── docs/                        # 프로젝트 문서 (팀 공유, git 커밋)
│   ├── plans/                   # 기능 구현 계획, 설계 문서
│   ├── specs/                   # 기능 스펙, 샘플, 요구사항 정의
│   ├── adr/                     # 아키텍처 결정 기록
│   └── api-conventions.md       # API 설계 원칙 및 엔드포인트 목록
└── .claude/
    └── plan/
        └── PLAN.md              # Claude 작업 추적 전용 (마일스톤, 현재 세션)
```

---

## 문서 배치 규칙

> 파일을 어디에 넣을지 항상 이 표를 기준으로 결정한다.

| 무엇 | 어디 | 예시 |
|------|------|------|
| Claude 세션 작업 추적, 마일스톤 체크 | `.claude/plan/PLAN.md` | 현재 Phase, 완료 체크, ADR |
| 기능 구현 계획, 설계 문서 | `docs/plans/` | `2026-04-01-auth-design.md` |
| 기능 스펙, 요구사항, 샘플 정의 | `docs/specs/` | `user-profile-spec.md`, `payment-flow.md` |
| 아키텍처 결정 기록 (ADR) | `docs/adr/` | `ADR-001-monorepo.md` |
| API 설계 원칙 + 엔드포인트 목록 | `docs/api-conventions.md` | (단일 파일) |
| 코딩 스타일 / 테스트 / Git 규칙 | `.claude/rules/` | `code-style.md` |
| 반복 작업 자동화 스킬 | `.claude/skills/` | `new-feature/SKILL.md` |
| 커스텀 커맨드 | `.claude/commands/` | `new-feature.md` |

### 파일명 규칙

- `docs/plans/` → `YYYY-MM-DD-{kebab-case-title}.md` (날짜 prefix 필수)
- `docs/specs/` → `{feature-name}-spec.md`
- `docs/adr/` → `ADR-{NNN}-{kebab-case-title}.md`

---

## 핵심 커맨드

| 목적 | 커맨드 |
|------|--------|
| 프론트엔드 개발 서버 | `cd apps/frontend && npm run dev` |
| 백엔드 개발 서버 | `cd apps/backend && uvicorn app.main:app --reload` |
| DB 마이그레이션 적용 | `cd apps/backend && alembic upgrade head` |
| 마이그레이션 생성 | `cd apps/backend && alembic revision --autogenerate -m "<message>"` |
| 프론트 테스트 | `cd apps/frontend && npm run test` |
| 백엔드 테스트 | `cd apps/backend && pytest` |
| 전체 린트 | `npm run lint` (root) |
| Docker 실행 | `docker compose -f docker/docker-compose.dev.yml up -d` |
| 타입 체크 (FE) | `cd apps/frontend && npx tsc --noEmit` |
| 타입 체크 (BE) | `cd apps/backend && mypy app/` |

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18, TypeScript (strict), Vite, Vitest, React Testing Library, msw |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.x, Alembic, pytest, pydantic v2 |
| Database | PostgreSQL 16 |
| Infra | Docker, Docker Compose |

---

## 규칙 파일 (@import)

@rules/code-style.md
@rules/testing.md
@rules/git-workflow.md
@rules/docker-db.md

---

## 스킬 (@import)

@skills/new-feature/SKILL.md
@skills/debug/SKILL.md
@skills/code-review/SKILL.md
@skills/test-designer/SKILL.md
@skills/test-implementer/SKILL.md
@skills/test-validator/SKILL.md
@skills/review-pipeline/SKILL.md
@skills/refactor/SKILL.md

---

## 커스텀 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/project:new-feature <name>` | 새 기능 스캐폴딩 (BE + FE) |
| `/project:pr-review` | PR 코드 리뷰 (구버전, pipeline 권장) |
| `/project:db-migrate <message>` | Alembic 마이그레이션 생성 + 적용 |
| `/project:review [파일/모듈]` | 코드 리뷰 (4단계) |
| `/project:test-design [스펙/모듈]` | TDD 테스트 설계 + 스켈레톤 생성 |
| `/project:test-implement [파일/모듈]` | TDD RED-GREEN-REFACTOR 실행 |
| `/project:test-validate [모듈]` | 커버리지 검증 |
| `/project:pipeline [파일/모듈]` | 리뷰→분석→계획→수정→검증 전체 흐름 |
| `/project:refactor <도메인>` | 레이어 분리 리팩토링 |
