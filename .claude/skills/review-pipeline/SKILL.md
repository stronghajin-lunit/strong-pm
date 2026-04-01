---
name: review-pipeline
description: |
  Convention 리뷰 전체 파이프라인. 리뷰 → 분석 → 계획 → 수정(TDD) → 검증까지 순차 진행합니다.
  사용 시점: /project:pipeline 커맨드 호출 시, 대규모 수정이나 리팩토링 작업 시
---

# Review Pipeline Skill

## 사용법

```
/project:pipeline                   # git diff 기반 변경 파일
/project:pipeline apps/backend/app/services/user_service.py  # 특정 파일
/project:pipeline auth              # 모듈 전체
/project:pipeline --dry-run         # 계획까지만 (수정 안 함)
```

---

## 파이프라인 흐름

```
1. REVIEW   → 4단계 리뷰 (맥락 → 설계 → 줄 단위 → 요약)
      ↓
2. ANALYZE  → 심각도 분류, 의존성 분석, 우선순위 정렬
      ↓
3. PLAN     → Phase별 수정 계획 + Before/After + 영향 범위
      ↓
   [사용자 승인 대기]  ← 반드시 승인 후 진행
      ↓
4. FIX      → RED-GREEN-REFACTOR (각 이슈마다 사이클 적용)
      ↓
5. VERIFY   → Lint + Type + Test + Convention 재검증
```

---

## Stage 1: REVIEW

`@skills/code-review/SKILL.md` 기준으로 4단계 리뷰 수행.

**검증 대상:**
- 계층 분리 (`Router → Service → Repository`)
- Python: 타입 힌트, UTC 시간, 매직 스트링, commit() in repo
- TypeScript: any, useEffect 의존성, 컴포넌트 내 비즈니스 로직
- FastAPI: response_model, Depends()

---

## Stage 2: ANALYZE

이슈를 분류하고 수정 순서를 결정합니다.

### 의존성 패턴

```
Backend:
  Base 클래스 수정 → 하위 클래스 수정
  Repository 수정 → Service 수정 → Router 수정

Frontend:
  types/ 수정 → api/ → hooks/ → components/ → pages/
```

### 우선순위 결정

| 요소 | 가중치 |
|------|--------|
| 심각도 (Blocking > Important > Nit) | 높음 |
| 의존성 (선행 작업 여부) | 중간 |
| 영향 범위 (다중 파일) | 중간 |

---

## Stage 3: PLAN

각 이슈에 대해 아래 형식으로 수정 계획을 작성합니다.

```markdown
### Phase 1: {제목}

#### [B-001] {이슈}
**수정 파일**: `apps/backend/app/services/user_service.py`
**근거**: Repository에서 commit() 금지 (@rules/code-style.md)
**수정 내용**:
  Before: await self.db.commit()
  After:  await self.db.flush()
**영향 파일**: 없음
```

> 계획 완성 후 반드시 사용자 승인을 받고 Stage 4로 진행합니다.

---

## Stage 4: FIX (RED-GREEN-REFACTOR)

각 이슈에 대해 TDD 사이클을 적용합니다.

### RED: 실패 확인

```bash
# Backend
cd apps/backend && pytest tests/test_{module}.py -k "test_{scenario}" -v

# Frontend
cd apps/frontend && npm run test -- {module}
```

### GREEN: 최소 수정

- 해당 테스트를 통과시키는 최소한의 코드
- 새 기능 추가 금지 (다음 사이클에서)

### REFACTOR: 정리

```bash
# Backend 검증
cd apps/backend && ruff check app/ && mypy app/ && pytest -v

# Frontend 검증
cd apps/frontend && npx tsc --noEmit && npm run test
```

---

## Stage 5: VERIFY

모든 수정 완료 후 최종 검증.

```bash
# Backend 전체
cd apps/backend && ruff check app/ && mypy app/ && pytest --cov=app

# Frontend 전체
cd apps/frontend && npx tsc --noEmit && npm run test -- --coverage

# Convention 재검증 (Blocking = 0 확인)
# /project:review 재실행
```

---

## 출력 형식

```markdown
## Pipeline Report

### 파이프라인 요약
- 대상: {파일/모듈}
- 발견 이슈: Blocking {N} / Important {N} / Nit {N}
- 수정 파일: {N}개

---

### Stage 1: REVIEW 결과
(code-review 출력 형식 참조)

### Stage 2: ANALYZE 결과
우선순위 정렬 및 의존성 그래프

### Stage 3: PLAN
Phase별 수정 계획

### Stage 4: FIX 결과
| 이슈 | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| B-001 | 실패 확인 | 통과 | 완료 |

### Stage 5: VERIFY 결과
| 항목 | 결과 |
|------|------|
| Lint (ruff/eslint) | Pass |
| Type (mypy/tsc) | Pass |
| Test | {N} passed |
| Convention Blocking | 0 |

---

### 최종 결과
| Before | After |
|--------|-------|
| Blocking {N} | 0 |
| Important {N} | 0 |
```
