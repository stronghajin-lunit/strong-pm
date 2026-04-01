# Code Style Rules

## TypeScript (Frontend)

### 기본 원칙

- **strict 모드 필수**: `tsconfig.json`에 `"strict": true` 설정
- **`any` 타입 금지**: `unknown` 또는 구체 타입 사용. 불가피한 경우 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + 이유 주석 필수
- **`as` 타입 단언 최소화**: 타입 가드(`typeof`, `instanceof`, `is` 반환 함수) 우선 사용

### 타입 선언

```typescript
// ✅ GOOD: interface 우선 (객체 형태)
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ GOOD: type은 유니온/인터섹션/유틸리티 타입에 사용
type UserRole = 'admin' | 'member' | 'viewer';
type PartialUser = Partial<User>;

// ❌ BAD: any 사용
const data: any = fetchUser();
```

### 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | `kebab-case` | `user-profile.tsx`, `use-auth.ts` |
| 컴포넌트 | `PascalCase` | `UserProfile`, `AuthButton` |
| 훅 | `camelCase` + `use` prefix | `useAuth`, `useUserProfile` |
| 상수 | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| 타입/인터페이스 | `PascalCase` | `UserProfile`, `ApiResponse` |

### 컴포넌트 패턴

```typescript
// ✅ GOOD: 비즈니스 로직은 hooks로 분리
function UserProfile({ userId }: { userId: string }) {
  const { user, isLoading } = useUser(userId);
  if (isLoading) return <Spinner />;
  return <div>{user.name}</div>;
}

// ❌ BAD: 컴포넌트 내 비즈니스 로직 직접 작성
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);
  return <div>{user?.name}</div>;
}
```

### Import 순서

```typescript
// 1. React
import { useState, useEffect } from 'react';
// 2. 외부 라이브러리
import { useQuery } from '@tanstack/react-query';
// 3. 내부 절대 경로 (alias)
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
// 4. 상대 경로
import { UserCard } from './user-card';
// 5. 타입
import type { User } from '@/types/user';
```

---

## Python (Backend)

### 기본 원칙

- **타입 힌트 필수**: 모든 함수의 파라미터와 반환값에 타입 선언
- **ruff 사용**: 린트 + 포맷 모두 ruff 사용 (`black`, `isort` 대체)
- **`Optional[X]` 표기**: Python 3.10+ union syntax(`X | None`)는 ruff 설정에 따라

### 타입 힌트

```python
# ✅ GOOD
from typing import Optional

async def get_user(user_id: int) -> Optional[UserDTO]:
    ...

async def create_user(name: str, email: str) -> UserDTO:
    ...

# ❌ BAD: 타입 힌트 없음
async def get_user(user_id):
    ...
```

### 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | `snake_case` | `user_service.py`, `auth_router.py` |
| 클래스 | `PascalCase` | `UserService`, `AuthRepository` |
| 함수/메서드 | `snake_case` | `get_user`, `create_session` |
| 변수 | `snake_case` | `user_id`, `access_token` |
| 상수 | `UPPER_SNAKE_CASE` | `MAX_TOKEN_EXPIRY` |
| Enum 값 | `UPPER_SNAKE_CASE` | `UserStatus.ACTIVE` |

### FastAPI 패턴

```python
# ✅ GOOD: response_model 항상 명시
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    user_service: UserService = Depends(get_user_service),
) -> UserResponse:
    return await user_service.get_user(user_id)

# ✅ GOOD: Depends()로 의존성 주입
def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)

# ❌ BAD: response_model 누락, 의존성 직접 생성
@router.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    service = UserService(db)  # 직접 생성 지양
    return await service.get_user(user_id)
```

### 계층 의존 방향

```
Router → Service → Repository → Model
                 ↘ DTO/Schema (공유)
```

- **Router**: Service, Schema, Depends만 import
- **Service**: Repository, DTO, Enum만 import. ORM 직접 접근 금지
- **Repository**: Model, DTO만 import. `commit()` 금지 (`flush()`만 허용)

### 에러 처리

```python
# ✅ GOOD: 구체적인 예외
from fastapi import HTTPException

async def get_user(user_id: int) -> UserDTO:
    user = await self.user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ❌ BAD: bare except
try:
    user = await get_user(1)
except:
    pass
```

### 시간 처리

```python
# ✅ GOOD: 항상 UTC
from datetime import datetime, timezone
created_at = datetime.now(timezone.utc)

# ❌ BAD
datetime.utcnow()   # timezone-naive
datetime.now()      # 로컬 타임존
```
