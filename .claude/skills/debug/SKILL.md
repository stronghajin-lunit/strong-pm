---
name: debug
description: |
  에러/버그 디버깅 스킬. 로그 분석 → 재현 테스트 → 수정 → 회귀 테스트 순서로 진행합니다.
  사용 시점: 에러 메시지, 스택 트레이스, "안 된다", "오류", "에러", "작동 안 해" 등의 표현 등장 시
---

# Debug Skill

## 트리거 패턴

다음 패턴의 요청 시 이 스킬이 활성화됩니다:
- 에러 메시지나 스택 트레이스가 포함된 메시지
- "안 된다", "오류가 난다", "에러가 뜬다", "작동 안 해"
- "왜 이게 안 되지?", "버그 잡아줘"
- HTTP 상태 코드 에러 (500, 404, 422 등) 언급

---

## 디버깅 절차

### Step 1: 로그 확인

에러 메시지, 스택 트레이스를 파악합니다.

**확인 사항:**
- [ ] 에러 유형 파악 (TypeError, HTTPException, DatabaseError 등)
- [ ] 에러 발생 위치 (파일명, 줄 번호)
- [ ] 에러 발생 시점 (언제, 어떤 조건에서)
- [ ] 관련 로그 수집

**Backend 로그 확인:**
```bash
# 개발 서버 실시간 로그
cd apps/backend && uvicorn app.main:app --reload --log-level debug

# Docker 로그
docker logs strongpm-backend -f --tail 100
```

**Frontend 로그 확인:**
```bash
# 브라우저 콘솔 확인 (Network 탭 포함)
# React Query DevTools 활성화 확인
```

---

### Step 2: 에러 분류 및 원인 가설 수립

| 에러 유형 | 주요 원인 | 확인 위치 |
|----------|----------|----------|
| `500 Internal Server Error` | 미처리 예외, DB 연결, 타입 오류 | 서버 로그, Service/Repository |
| `422 Unprocessable Entity` | Pydantic 검증 실패, 타입 불일치 | 요청 바디, Schema 정의 |
| `404 Not Found` | 리소스 없음, 잘못된 경로 | Router 설정, DB 쿼리 |
| `401/403` | 인증/권한 오류 | 미들웨어, 토큰 검증 |
| TypeScript 타입 에러 | 타입 불일치, null 처리 누락 | 타입 정의, API 응답 |
| React 렌더링 에러 | 잘못된 훅 사용, 의존성 누락 | 컴포넌트, useEffect |

---

### Step 3: 재현 테스트 작성

> 수정 전에 반드시 실패하는 테스트를 먼저 작성합니다 (TDD Red 단계).

**Backend 재현 테스트:**
```python
@pytest.mark.asyncio
async def test_reproduces_{bug_description}(self, client):
    """버그 재현 테스트
    
    Given: {버그 발생 조건}
    When: {버그 유발 행동}
    Then: {올바른 동작 (버그 수정 후 통과해야 함)}
    
    See: {이슈 번호 또는 에러 메시지}
    """
    # Given
    ...
    # When
    response = await client.{method}(...)
    # Then (현재 실패, 수정 후 통과)
    assert response.status_code == {expected_code}
```

**Frontend 재현 테스트:**
```typescript
it('{버그 설명} 시 올바르게 동작한다', async () => {
  // Given: 버그 발생 조건 세팅
  server.use(
    http.get('/api/...', () => HttpResponse.json(...))
  );
  
  // When: 버그 유발 행동
  render(<Component />);
  await userEvent.click(screen.getByRole('button', { name: '...' }));
  
  // Then: 올바른 동작 (현재 실패)
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

---

### Step 4: 수정

**수정 원칙:**
- 최소한의 변경으로 버그 수정 (관련 없는 리팩토링 금지)
- 근본 원인(root cause) 수정 (증상만 가리는 방어 코드 지양)
- 수정 내용을 코멘트로 설명 (왜 이 수정이 필요한지)

**일반적인 Python 버그 패턴:**
```python
# ❌ timezone-naive datetime
expires_at = datetime.utcnow() + timedelta(hours=1)
# ✅ timezone-aware
from datetime import datetime, timezone, timedelta
expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

# ❌ Repository에서 commit (트랜잭션 충돌)
await self.db.commit()
# ✅ flush만
await self.db.flush()

# ❌ N+1 쿼리
for user in users:
    profile = await get_profile(user.id)
# ✅ eager loading
from sqlalchemy.orm import selectinload
stmt = select(User).options(selectinload(User.profile))
```

**일반적인 TypeScript/React 버그 패턴:**
```typescript
// ❌ useEffect 의존성 누락 (stale closure)
useEffect(() => {
  fetchData(userId);
}, []); // userId 누락
// ✅
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ❌ null 체크 누락
const name = user.profile.name; // user.profile이 null일 수 있음
// ✅
const name = user.profile?.name ?? '이름 없음';
```

---

### Step 5: 회귀 테스트 실행

수정 후 전체 테스트를 실행하여 새로운 버그가 생기지 않았는지 확인합니다.

```bash
# Backend 전체 테스트
cd apps/backend && pytest -v

# Frontend 전체 테스트
cd apps/frontend && npm run test

# 타입 체크
cd apps/frontend && npx tsc --noEmit
cd apps/backend && mypy app/
```

---

## 디버깅 출력 형식

```markdown
## 디버깅 리포트

### 에러 요약
- **유형**: {에러 타입}
- **위치**: `{파일경로}:{줄번호}`
- **메시지**: {에러 메시지}

### 근본 원인
{원인 설명}

### 수정 내용
**파일**: `{파일경로}`

```
# Before
{문제 코드}

# After
{수정 코드}
```

### 재현 테스트
`tests/{test_file}.py` — `test_{bug_description}` 추가

### 회귀 테스트 결과
- pytest: {N} passed
- tsc: No errors

### 재발 방지
{향후 동일 버그 예방 방법}
```
