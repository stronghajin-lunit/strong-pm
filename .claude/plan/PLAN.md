# strong-pm 프로젝트 플랜

> Claude는 매 세션에서 "현재 작업" 섹션을 업데이트합니다.
> 마일스톤 완료 항목은 `- [x]`로 체크합니다.

---

## 프로젝트 개요

PM 업무 자동화 도구. 핵심 기능 묶음:

- **PRD Writer** — PRD 작성/Q&A
- **Jira Ticket Writer** — Jira 티켓 초안 생성
- **Release Note Creator** — 릴리즈 노트 생성 (AI)
- **Deployment Tracker** — 배포 추적
- **Version Assignment** — Jira 버전 할당
- **Slack Q&A Linker** — Slack 질의응답 수집/요약/아카이브
- **Sprint Report** — 스프린트 리포트
- **PR Tracker** — PR 추적

---

## 현재 작업

> 마지막 업데이트: 2026-05-31

| 항목 | 상태 | 비고 |
|------|------|------|
| 프론트엔드 페이지 11종 구현 | 🟡 진행 중 | 다수 변경분 미커밋 (브랜치 `feature/ui-prd-jira-writer`) |
| 백엔드 레이어 구조 + 도메인 4종 | 🟡 진행 중 | **전체 git untracked — 커밋 이력 없음** |
| 백엔드 테스트 보강 | 🔴 미흡 | `test_health.py` 1개뿐 (절대규칙 #2 위반 상태) |
| `apps/backend/` git 커밋 정리 | 🔲 대기 | 논리 단위로 분할 커밋 필요 |
| `.gitignore` 정리 | 🔲 대기 | `.next/`, `node_modules/`, `.DS_Store`, `.env.local` 노출 |

### 다음 우선순위

1. 백엔드 `.gitignore` 점검 후 논리 단위 커밋 (모델/스키마/CRUD/서비스/엔드포인트)
2. 백엔드 도메인별 테스트 추가 (Service 90% / Repo 90% / Router 80% 목표)
3. 프론트 변경분 커밋 정리 및 PR

---

## Phase 1: 인프라 셋업

### 모노레포 구조

- [x] `apps/frontend` — Next.js + React 18 + TypeScript strict (Vite → Next.js로 전환됨)
- [x] `apps/backend` — FastAPI + Python 3.12 프로젝트 초기화
- [x] `pyproject.toml` — ruff, mypy, pytest 설정
- [x] `tsconfig.json` — strict 모드, path alias 설정

### Docker 환경

- [x] `apps/backend/Dockerfile`
- [x] `docker/` 구성 존재
- [ ] `.env.example` — 필수 환경변수 템플릿 점검 필요
- [ ] DB 컨테이너 healthcheck 확정

### CI/CD 기반

- [ ] GitHub Actions 워크플로우 (lint, type check, test)
- [ ] PR 자동 체크 설정
- [ ] 브랜치 보호 규칙 설정

---

## Phase 2: 핵심 기능 개발

### 백엔드 (FastAPI)

> 레이어 구조(Model → CRUD → Service → Router) 완비. 도메인별 진행 현황:

| 도메인 | Model | Schema | CRUD | Service | Endpoint | 테스트 |
|--------|:-----:|:------:|:----:|:-------:|:--------:|:------:|
| deployment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| release_note | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| jira_version | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| jira_ticket | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| repo | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

- [x] Alembic 초기 마이그레이션 (`031f265fd4c5_initial_schema`)
- [x] 외부 연동 모듈: GitHub, Jira, Confluence, AI (`app/integrations/`)
- [x] health 엔드포인트 + 테스트
- [ ] jira_ticket 도메인 Service/Endpoint 완성
- [ ] repo 도메인 Service/Endpoint 완성
- [ ] 도메인별 API 테스트 (conftest 픽스처 기반)

### 프론트엔드 (Next.js + React Query)

> 페이지 11종 구현. 현재 상당수가 미커밋 상태.

- [x] Projects (목록 / 상세 `[id]` / 신규 프로젝트 모달 / 워크플로우 스테퍼)
- [x] PR Tracker (Author 컬럼 포함)
- [x] PRD Writer
- [x] Jira Ticket Writer
- [x] Release Note Creator (`releases/notes`)
- [x] Deployment Tracker (`releases/deployment`)
- [x] Version Assignment (`releases/version-assignment`)
- [x] Slack Q&A Linker (DM 스크리닝, AI 요약, 아카이브 탭)
- [x] Sprint Report
- [x] 디자인 시스템 (Manrope/FiraCode 폰트, teal accent)
- [x] mock 데이터 + msw 핸들러
- [ ] 실제 백엔드 API 연동 (현재 mock 기반)

### 테스트 기반

- [x] Frontend: Vitest + RTL + msw 세팅, 테스트 14개 파일
- [x] Backend: pytest + conftest.py 픽스처 세팅
- [ ] Backend 도메인 테스트 보강 (현재 health만)
- [ ] 커버리지 목표 달성 (컴포넌트 70%, 서비스 90%)

---

## Phase 3: 기능 고도화

- [ ] 프론트 ↔ 백엔드 실제 연동 (mock 제거)
- [ ] 페이지네이션 / 정렬 / 필터 공통 패턴
- [ ] 인증 (필요 시) — User 모델 + JWT
- [ ] 실시간 기능 (WebSocket 또는 SSE)
- [ ] 알림 (`notifications` 타입 존재 — 구현 연결 필요)
- [ ] 권한 관리 (RBAC)

---

## Phase 4: 배포

### 인프라

- [ ] 프로덕션 Docker 이미지 최적화
- [ ] 환경별 설정 분리 (dev / staging / prod)
- [ ] DB 마이그레이션 자동화 (배포 파이프라인)
- [x] 헬스체크 엔드포인트

### 모니터링

- [ ] 에러 트래킹 (Sentry 등)
- [ ] 로그 수집
- [ ] 성능 모니터링

### 배포

- [ ] 스테이징 환경 배포
- [ ] 프로덕션 배포
- [ ] 롤백 절차 문서화

---

## 아키텍처 결정 기록 (ADR)

| # | 날짜 | 결정 | 이유 | 상태 |
|---|------|------|------|------|
| ADR-001 | 2026-04-01 | 모노레포 구조 채택 | FE/BE 코드 공유 및 일관된 개발 환경 | 확정 |
| ADR-002 | 2026-04-01 | FastAPI + SQLAlchemy 2.x | 비동기 지원, 타입 안전성 | 확정 |
| ADR-003 | 2026-04-01 | React Query로 서버 상태 관리 | 캐싱, 동기화, 로딩 상태 처리 자동화 | 확정 |
| ADR-004 | 2026-04-01 | Alembic 마이그레이션 | SQLAlchemy 네이티브 마이그레이션 도구 | 확정 |
| ADR-005 | 2026-04-01 | Vitest + RTL + msw | Vite 네이티브, 사용자 관점 테스트 | 확정 |
| ADR-006 | 2026-05-31 | 프론트엔드 Vite → Next.js 전환 | App Router 기반 페이지 구조 채택 | 확정(소급 기록) |

> ⚠️ ADR-006은 실제 코드 기준 소급 기록. `next.config.mjs` / `src/app/` 구조 사용 중이며,
> CLAUDE.md·rules 문서의 "Vite" 서술과 불일치 → 문서 갱신 필요.

---

## 참고 문서

- `docs/specs/` — deployment-tracker / jira-ticket-writer / release-note-creator API spec
- `docs/plans/` — releases DB 설계(2026-04-29), release-note run API(2026-05-04)
- `docs/api-conventions.md` — API 설계 원칙
- `.claude/rules/` — 코딩 스타일, 테스트, Git 워크플로우
- `.claude/skills/` — 반복 작업 자동화 스킬
