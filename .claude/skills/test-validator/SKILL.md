---
name: test-validator
description: |
  테스트 커버리지 검증. 스펙 대비 테스트 커버리지와 품질을 확인합니다.
  사용 시점: /project:test-validate 커맨드 호출 시, /project:test-implement 완료 후
---

# Test Validator Skill

## 사용법

```
/project:test-validate              # 전체 검증
/project:test-validate users        # 모듈별 검증
/project:test-validate --coverage   # 커버리지 리포트 포함
```

---

## 커버리지 기준

### Backend (Python)

| 레이어 | 최소 | 목표 |
|--------|------|------|
| Service | 80% | **90%** |
| Repository | 70% | **90%** |
| Router | 60% | **80%** |
| Utils | 90% | **95%** |

### Frontend (TypeScript)

| 레이어 | 최소 | 목표 | 도구 |
|--------|------|------|------|
| Hooks (`use-*.ts`) | 80% | **90%** | Vitest |
| Components (`*.tsx`) | 60% | **70%** | RTL |
| API Layer (`api/*.ts`) | 80% | **90%** | Vitest + msw |
| Utils | 90% | **95%** | Vitest |

### 커버리지 측정

```bash
# Backend
cd apps/backend && pytest --cov=app --cov-report=term-missing

# Frontend
cd apps/frontend && npm run test -- --coverage
```

---

## 검증 항목

### 1. 시나리오 커버리지

스펙(`docs/specs/`) 또는 기획 기준으로 아래 시나리오가 모두 있는지 확인:

| 시나리오 유형 | 확인 여부 |
|-------------|----------|
| Happy Path | [ ] |
| 필수 필드 누락 (422) | [ ] |
| 중복 충돌 (409) | [ ] |
| 존재하지 않는 리소스 (404) | [ ] |
| 미인증 (401) | [ ] |
| 권한 없음 (403) | [ ] |
| 비즈니스 규칙 위반 | [ ] |

### 2. Docstring 품질

```python
# 클래스: 기획 요구사항 포함 여부
class TestCreateUser:
    """POST /api/v1/users - 사용자 생성
    기획 요구사항:
    ...
    """

# 메서드: Given-When-Then 포함 여부
async def test_creates_with_default_role(self, client):
    """기본 역할 member로 생성
    Given: ...
    When: ...
    Then: ...
    """
```

### 3. 커버리지 미달 항목 식별

```bash
# Backend: 미커버 줄 확인
pytest --cov=app --cov-report=term-missing | grep "MISS"

# Frontend: 미커버 파일 확인
npm run test -- --coverage --reporter=text | grep "Uncovered"
```

---

## 커버리지 제외 대상

```python
# pyproject.toml
[tool.coverage.run]
omit = [
    "app/models/*",      # ORM 모델 정의
    "app/schemas/*",     # Pydantic 스키마 정의
    "app/core/config.py", # 설정
    "alembic/*",
]
```

---

## 출력 형식

```markdown
## 테스트 검증 리포트

### 시나리오 커버리지
| 엔드포인트 | 시나리오 수 | 누락 |
|-----------|------------|------|
| POST /api/v1/users | 5 | 없음 |
| DELETE /api/v1/users/{id} | 0 | Happy Path, 404 |

### 코드 커버리지
| 레이어 | 현재 | 목표 | 상태 |
|--------|------|------|------|
| Service | 93% | 90% | ✅ |
| Repository | 78% | 90% | ❌ |

### 누락 항목
1. [필수] DELETE 엔드포인트 테스트 없음
2. [권장] UserRepository.delete() 미커버

### 다음 단계
누락 테스트 추가 후 `/project:test-validate` 재실행
```
