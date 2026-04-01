# strong-pm 프로젝트 플랜

> Claude는 매 세션에서 "현재 작업" 섹션을 업데이트합니다.
> 마일스톤 완료 항목은 `- [x]`로 체크합니다.

---

## 현재 작업

> 마지막 업데이트: 2026-04-01

| 항목 | 상태 | 담당 |
|------|------|------|
| `.claude/` 초기 설정 | ✅ 완료 | Claude |
| 모노레포 초기 구조 세팅 | 🔲 대기 | - |
| Docker 개발 환경 구성 | 🔲 대기 | - |

---

## Phase 1: 인프라 셋업

### 모노레포 구조

- [ ] 루트 `package.json` + `workspaces` 설정
- [ ] `apps/frontend` — Vite + React 18 + TypeScript strict 초기화
- [ ] `apps/backend` — FastAPI + Python 3.12 프로젝트 초기화
- [ ] `pyproject.toml` — ruff, mypy, pytest 설정
- [ ] `tsconfig.json` — strict 모드, path alias 설정

### Docker 환경

- [ ] `docker/docker-compose.dev.yml` — PostgreSQL 16, Redis
- [ ] `docker/docker-compose.yml` — 프로덕션 설정
- [ ] `.env.example` — 필수 환경변수 템플릿
- [ ] DB 컨테이너 healthcheck 설정

### CI/CD 기반

- [ ] GitHub Actions 워크플로우 (lint, type check, test)
- [ ] PR 자동 체크 설정
- [ ] 브랜치 보호 규칙 설정

---

## Phase 2: 핵심 기능 개발

### 인증 (Auth)

- [ ] User 모델 + Alembic 마이그레이션
- [ ] 회원가입 / 로그인 API
- [ ] JWT 액세스 토큰 + 리프레시 토큰
- [ ] 프론트엔드 인증 상태 관리

### 기본 CRUD

- [ ] 도메인 모델 설계
- [ ] Backend CRUD API (FastAPI)
- [ ] Frontend API 훅 (React Query)
- [ ] 기본 UI 컴포넌트

### 테스트 기반

- [ ] Backend: pytest + conftest.py 픽스처 세팅
- [ ] Frontend: Vitest + msw 서버 세팅
- [ ] 커버리지 목표 달성 (컴포넌트 70%, 서비스 90%)

---

## Phase 3: 기능 고도화

- [ ] 페이지네이션 / 정렬 / 필터 공통 패턴
- [ ] 파일 업로드
- [ ] 실시간 기능 (WebSocket 또는 SSE)
- [ ] 이메일 알림
- [ ] 권한 관리 (RBAC)

---

## Phase 4: 배포

### 인프라

- [ ] 프로덕션 Docker 이미지 최적화
- [ ] 환경별 설정 분리 (dev / staging / prod)
- [ ] DB 마이그레이션 자동화 (배포 파이프라인)
- [ ] 헬스체크 엔드포인트

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

---

## 참고 문서

- `docs/api-conventions.md` — API 설계 원칙
- `.claude/rules/` — 코딩 스타일, 테스트, Git 워크플로우
- `.claude/skills/` — 반복 작업 자동화 스킬
