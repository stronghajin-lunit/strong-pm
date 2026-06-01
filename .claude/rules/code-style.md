# Code Style Rules

## Language

**All code artifacts must be written in English.** This applies to:

- Variable, function, class, and type names
- Code comments (`//`, `#`, `/* */`)
- Test descriptions (`describe`, `it`, `test`, pytest docstrings)
- Commit messages (see `git-workflow.md`)
- File names and directory names
- Error messages in source code
- API field names and enum values

**Exception — UI-facing strings**: Hardcoded text that users see in the product (labels, placeholders, button text, etc.) follows the product language and is exempt from this rule.

```typescript
// ✅ GOOD
// Fetch user profile and merge with default preferences
const merged = mergeWithDefaults(profile)

it('shows error message when email is empty', () => { ... })

// ❌ BAD
// 사용자 프로필을 가져와서 기본 설정과 합침
const merged = mergeWithDefaults(profile)

it('이메일이 비어있을 때 에러 메시지를 표시한다', () => { ... })
```

```python
# ✅ GOOD
async def get_user(user_id: int) -> Optional[UserDTO]:
    """Fetch a single user by ID. Returns None if not found."""

# ❌ BAD
async def get_user(user_id: int) -> Optional[UserDTO]:
    """ID로 사용자를 조회합니다. 없으면 None을 반환합니다."""
```

---

## TypeScript (Frontend)

### Core Principles

- **Strict mode required**: set `"strict": true` in `tsconfig.json`
- **No `any` type**: use `unknown` or a concrete type. If unavoidable, add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a reason comment
- **Minimize `as` type assertions**: prefer type guards (`typeof`, `instanceof`, `is` return functions)

### Type Declarations

```typescript
// ✅ GOOD: prefer interface for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ GOOD: use type for unions, intersections, and utility types
type UserRole = 'admin' | 'member' | 'viewer';
type PartialUser = Partial<User>;

// ❌ BAD: any usage
const data: any = fetchUser();
```

### Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| File name | `kebab-case` | `user-profile.tsx`, `use-auth.ts` |
| Component | `PascalCase` | `UserProfile`, `AuthButton` |
| Hook | `camelCase` + `use` prefix | `useAuth`, `useUserProfile` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Type / Interface | `PascalCase` | `UserProfile`, `ApiResponse` |

### Component Pattern

```typescript
// ✅ GOOD: extract business logic into hooks
function UserProfile({ userId }: { userId: string }) {
  const { user, isLoading } = useUser(userId);
  if (isLoading) return <Spinner />;
  return <div>{user.name}</div>;
}

// ❌ BAD: business logic written directly inside component
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);
  return <div>{user?.name}</div>;
}
```

### Import Order

```typescript
// 1. React
import { useState, useEffect } from 'react';
// 2. External libraries
import { useQuery } from '@tanstack/react-query';
// 3. Internal absolute paths (alias)
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
// 4. Relative paths
import { UserCard } from './user-card';
// 5. Types
import type { User } from '@/types/user';
```

---

## Python (Backend)

### Core Principles

- **Type hints required**: declare types on all function parameters and return values
- **Use ruff**: for both linting and formatting (replaces `black` and `isort`)
- **`Optional[X]` notation**: whether to use Python 3.10+ union syntax (`X | None`) follows the ruff config

### Type Hints

```python
# ✅ GOOD
from typing import Optional

async def get_user(user_id: int) -> Optional[UserDTO]:
    ...

async def create_user(name: str, email: str) -> UserDTO:
    ...

# ❌ BAD: missing type hints
async def get_user(user_id):
    ...
```

### Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| File name | `snake_case` | `user_service.py`, `auth_router.py` |
| Class | `PascalCase` | `UserService`, `AuthRepository` |
| Function / Method | `snake_case` | `get_user`, `create_session` |
| Variable | `snake_case` | `user_id`, `access_token` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_TOKEN_EXPIRY` |
| Enum value | `UPPER_SNAKE_CASE` | `UserStatus.ACTIVE` |

### FastAPI Pattern

```python
# ✅ GOOD: always specify response_model
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    user_service: UserService = Depends(get_user_service),
) -> UserResponse:
    return await user_service.get_user(user_id)

# ✅ GOOD: inject dependencies via Depends()
def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)

# ❌ BAD: missing response_model, dependency created directly
@router.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    service = UserService(db)  # avoid direct instantiation
    return await user_service.get_user(user_id)
```

### Layer Dependency Direction

```
Router → Service → Repository → Model
                 ↘ DTO/Schema (shared)
```

- **Router**: import only Service, Schema, Depends
- **Service**: import only Repository, DTO, Enum. No direct ORM access
- **Repository**: import only Model, DTO. No `commit()` — only `flush()`

### Error Handling

```python
# ✅ GOOD: specific exception
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

### Datetime Handling

```python
# ✅ GOOD: always UTC
from datetime import datetime, timezone
created_at = datetime.now(timezone.utc)

# ❌ BAD
datetime.utcnow()   # timezone-naive
datetime.now()      # local timezone
```
