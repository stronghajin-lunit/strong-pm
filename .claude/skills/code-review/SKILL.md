---
name: code-review
description: |
  프로젝트 Convention 준수 여부를 검토하고 수정 계획을 수립합니다.
  사용 시점: /project:review 커맨드 호출 시, PR 생성 전 코드 품질 검토 시, 새 기능 구현 후 리뷰 요청 시
---

# Code Review Skill

## 사용법

```
/project:review                    # git diff 기반 변경 파일
/project:review path/to/file.py    # 특정 파일
/project:review auth               # 모듈 전체
```

---

## 4단계 리뷰 프로세스

### Phase 1: 맥락 파악

- [ ] 변경 범위 확인 (**400줄 초과 시 분할 권장**)
- [ ] 관련 모듈/도메인 파악
- [ ] 기존 코드 패턴 확인 (`@rules/code-style.md` 기준)
- [ ] 변경 목적 이해 (새 기능, 버그 수정, 리팩토링)

### Phase 2: 높은 수준 검토

**아키텍처 & 설계**
- [ ] 계층 분리 원칙 준수 (`Router → Service → Repository`)
- [ ] 책임 분리 적절성
- [ ] 파일/디렉토리 구조 적절성 (`apps/frontend/`, `apps/backend/`)

**의존성 방향**
- [ ] 상위 → 하위 방향 의존성 유지
- [ ] 역방향 의존성 없음
- [ ] 순환 의존성 없음

### Phase 3: 줄 단위 검토

**Convention 위반** (`@rules/code-style.md` 기준)
- [ ] 프로젝트 코딩 스타일 준수
- [ ] 네이밍 컨벤션 일관성
- [ ] 에러 처리 패턴 준수

**Python 안티패턴**
- [ ] 타입 힌트 누락
- [ ] `datetime.utcnow()` / `datetime.now()` 사용 (→ `datetime.now(timezone.utc)`)
- [ ] 매직 스트링 사용 (→ Enum)
- [ ] Repository에서 `commit()` 호출 (→ `flush()`만 허용)
- [ ] Service에서 ORM 직접 접근
- [ ] `bare except` 사용
- [ ] `Optional[X]` 대신 `X | None` 혼용 (프로젝트 통일 기준 적용)

**TypeScript/React 안티패턴**
- [ ] `any` 타입 사용
- [ ] `useEffect` 의존성 배열 누락/불완전
- [ ] 컴포넌트 내 비즈니스 로직 직접 작성 (→ hooks로 분리)
- [ ] 불필요한 리렌더링 (메모이제이션 누락)
- [ ] `as` 타입 단언 남용

```typescript
// BAD: 컴포넌트 내 비즈니스 로직
function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    fetch('/api/v1/items').then(r => r.json()).then(setItems);
  }, []);
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}

// GOOD: hooks로 분리
function ItemList() {
  const { items } = useItems();
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}
```

**FastAPI 패턴**
- [ ] `response_model` 누락
- [ ] `Depends()` 미사용 (의존성 직접 생성)
- [ ] Schema를 Service 파라미터로 직접 전달

**보안 & 성능**
- [ ] SQL 인젝션 위험 (raw query)
- [ ] N+1 쿼리 문제
- [ ] 민감 데이터 노출 (`.env` 하드코딩)
- [ ] XSS / CSRF

### Phase 4: 요약

- [ ] 심각도별 이슈 분류
- [ ] 수정 우선순위 결정
- [ ] 긍정적 피드백 포함

---

## 심각도 분류

| 레벨 | 의미 | 예시 |
|------|------|------|
| **blocking** | 필수 수정, 머지 불가 | 검증 누락, 타입 오류, 보안 취약점 |
| **important** | 강력 권장 | Convention 위반, 네이밍 불일치 |
| **nit** | 선택 사항 | 코드 스타일, 주석 |
| **suggestion** | 대안 제시 | 더 나은 방법 제안 |
| **praise** | 칭찬 | 잘 작성된 코드 |

---

## 출력 형식

```markdown
## Code Review Report

### 맥락
- 대상: {파일/모듈}
- 변경 규모: {N}줄 (적정 / 분할 권장)
- 변경 유형: {새 기능 / 버그 수정 / 리팩토링}

### 요약
- Blocking: {N}개 / Important: {N}개 / Nit: {N}개

---

### Blocking Issues

#### [B-001] {제목}
- **파일**: `path:line`
- **문제**: {설명}
- **근거**: {위반한 규칙}
- **해결방안**:
  ```
  # Before
  ...
  # After
  ...
  ```

### 잘된 점
- {긍정적 피드백}

### 다음 단계
`/project:pipeline` 으로 전체 수정 흐름을 진행하세요.
```
