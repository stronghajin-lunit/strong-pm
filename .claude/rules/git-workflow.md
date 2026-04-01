# Git Workflow Rules

## 브랜치 전략

### 브랜치 네이밍

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `feature/*` | 새 기능 개발 | `feature/user-auth`, `feature/payment-integration` |
| `fix/*` | 버그 수정 | `fix/login-redirect`, `fix/query-n-plus-one` |
| `hotfix/*` | 프로덕션 긴급 수정 | `hotfix/critical-auth-bypass` |
| `chore/*` | 빌드/의존성/설정 변경 | `chore/update-dependencies`, `chore/docker-setup` |
| `refactor/*` | 코드 구조 개선 | `refactor/auth-service-layer` |
| `docs/*` | 문서 작업 | `docs/api-conventions` |

### 브랜치 규칙

- `main`/`master` 브랜치 직접 push 금지 (hooks로 차단)
- 모든 변경은 브랜치 생성 후 PR로 머지
- 브랜치는 작업 단위로 작게 유지 (400줄 초과 시 분할 검토)

---

## Conventional Commits

### 형식

```
<type>(<scope>): <subject>

[body]

[footer]
```

### Type

| type | 사용 시점 |
|------|----------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 (코드 변경 없음) |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 패키지, CI 설정 변경 |
| `style` | 포맷팅, 세미콜론 등 (로직 변경 없음) |
| `perf` | 성능 개선 |

### Scope 예시

| scope | 대상 |
|-------|------|
| `frontend` | React 앱 전반 |
| `backend` | FastAPI 앱 전반 |
| `db` | 데이터베이스, 마이그레이션 |
| `docker` | Docker 설정 |
| `auth` | 인증/인가 모듈 |
| `api` | API 엔드포인트 |
| `ci` | CI/CD 파이프라인 |

### 커밋 메시지 예시

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

### 커밋 단위

- 하나의 커밋 = 하나의 논리적 변경
- 기능 코드와 테스트 코드는 같은 커밋에 포함
- 문서 업데이트도 관련 기능 커밋에 포함

---

## Pull Request

### PR 규칙

- **리뷰어 1명 이상** 승인 필수
- **CI 통과 필수** (lint, type check, test)
- **Squash and Merge** 사용 (커밋 히스토리 정리)
- PR 제목은 Conventional Commits 형식 따름

### PR 체크리스트

```markdown
## 변경 사항
- [ ] 기능/버그 설명

## 테스트
- [ ] 단위/통합 테스트 추가
- [ ] 로컬 테스트 통과

## 문서
- [ ] API 변경 시 docs/api-conventions.md 업데이트
- [ ] 환경변수 추가 시 .env.example 업데이트
- [ ] 아키텍처 변경 시 ADR 추가
```

### PR 크기 기준

| 크기 | 변경 줄 수 | 권장 |
|------|-----------|------|
| Small | ~200줄 | 최적 |
| Medium | 200~400줄 | 허용 |
| Large | 400줄+ | 분할 권장 |
