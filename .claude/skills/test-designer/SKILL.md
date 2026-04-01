---
name: test-designer
description: |
  테스트 설계 및 스켈레톤 생성. 기획/스펙을 기반으로 개발자 의도가 담긴 테스트를 설계합니다.
  사용 시점: /project:test-design 커맨드 호출 시, 새 기능 개발 전 테스트 설계 시
---

# Test Designer Skill

테스트에 개발자 의도를 심어 팀원들에게 비즈니스 규칙을 전달합니다.

## 사용법

```
/project:test-design                        # 대화형 스펙 입력
/project:test-design docs/specs/foo-spec.md # 스펙 파일 기반
/project:test-design users                  # 기존 모듈 테스트 개선
```

---

## 핵심 원칙: 의도 표현

> 테스트는 **실행 가능한 문서**입니다.
> 코드가 "무엇을 하는지"가 아니라 "왜 그래야 하는지"를 담아야 합니다.

### Python (pytest)

```python
# BAD: 무엇만 검증
async def test_create_user(client):
    response = await client.post("/api/v1/users", json={"name": "테스트"})
    assert response.status_code == 201

# GOOD: 왜를 담은 테스트
class TestCreateUser:
    """POST /api/v1/users - 사용자 생성

    기획 요구사항:
    ============
    1. 목적 - 사용자를 시스템에 등록
    2. 입력 - email (필수), name (필수)
    3. 응답 - id, email, name, role, createdAt
    4. 에러 - 이메일 중복: 409, 빈값: 422
    5. 비즈니스 규칙 - 생성 시 기본 role은 'member'
    """

    @pytest.mark.asyncio
    async def test_creates_user_with_default_member_role(self, client):
        """기본 역할 member로 사용자 생성
        Given: 유효한 이메일과 이름
        When: POST /api/v1/users
        Then: 201 반환, role이 member로 설정됨
        """
        # Given
        payload = {"email": "test@example.com", "name": "Test User"}
        # When
        response = await client.post("/api/v1/users", json=payload)
        # Then
        assert response.status_code == 201
        assert response.json()["role"] == "member"
```

### TypeScript (Vitest + React Testing Library)

```typescript
// BAD: 구현 세부사항 테스트
it('renders', () => {
  render(<UserForm />);
  expect(screen.getByRole('form')).toBeInTheDocument();
});

// GOOD: 사용자 행동 기반 테스트
describe('POST /api/v1/users - 사용자 생성', () => {
  it('빈 이메일로 제출 시 에러 메시지를 표시한다', async () => {
    // Given
    render(<UserForm onSubmit={mockSubmit} />);
    // When - 이메일 비우고 제출
    await userEvent.click(screen.getByRole('button', { name: '가입' }));
    // Then
    expect(screen.getByText('이메일은 필수입니다')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
```

---

## 테스트 시나리오 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| Happy Path | 정상 케이스 | 생성 성공, 조회 성공 |
| Error Cases | 에러 케이스 | 중복, 없음, 권한 없음 |
| Business Rules | 비즈니스 규칙 | 고유성, 상태 전이 규칙 |
| Edge Cases | 경계값 | 빈 입력, 최대 길이 |
| Auth | 인증/권한 | 미인증 401, 권한없음 403 |

---

## 표준 시나리오 체크리스트

```
엔드포인트별 최소 시나리오:
├─ 정상 케이스 (Happy Path)          ← 반드시
├─ 필수 필드 누락 → 422              ← 반드시
├─ 존재하지 않는 리소스 → 404        ← 조회/수정/삭제 시
├─ 중복 → 409                        ← 생성 시
├─ 미인증 → 401                      ← 인증 필요 엔드포인트
└─ 권한 없음 → 403                   ← 권한 제어 시
```

---

## 출력 형식

```markdown
## 테스트 설계 리포트

### 대상
- 모듈: {module}
- 스펙: {docs/specs/... 또는 요약}

### 테스트 시나리오 ({N}개)

| # | 시나리오 | 유형 | Given | When | Then |
|---|---------|------|-------|------|------|
| 1 | 정상 생성 | Happy | 유효한 입력 | POST 호출 | 201 |
| 2 | 중복 거부 | Error | 기존 존재 | POST 호출 | 409 |

### 생성할 파일
- `apps/backend/tests/test_{module}.py`
- `apps/frontend/src/components/{module}/{module}.test.tsx`

### 다음 단계
`/project:test-implement` 으로 TDD 구현을 진행하세요.
```
