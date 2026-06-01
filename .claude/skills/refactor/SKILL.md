---
name: refactor
description: |
  Backend layer separation refactoring skill. Applies Router → Service → Repository layer separation.
  Trigger: /project:refactor command, domain-level layer separation work
---

# Refactor Skill

## Usage

```
/project:refactor users             # entire domain
/project:refactor users create_user # specific method in a domain
/project:refactor status            # check progress
```

---

## Absolute Rules (stop work on violation)

### 1. Layer Dependency Direction — One-Way Only

```
Router → Service → Repository → Model
                 ↘ DTO/Schema (shared)
```

| Layer | Allowed imports | Forbidden imports |
|-------|----------------|-------------------|
| **Router** | Service, Schema, Depends | Repository, Model, DTO directly |
| **Service** | Repository, DTO, Enum | Router, Model, direct ORM access |
| **Repository** | Model, DTO, Enum | Service, Router |

### 2. Boundary Objects

| Boundary | Object | Role |
|----------|--------|------|
| Frontend ↔ Router | **Schema** (Pydantic) | API contract, serialization/validation |
| Service ↔ Repository | **DTO** (Pydantic BaseModel) | Isolates DB structure |

**Service method parameters must not accept Schema directly.**
→ Router converts Schema → individual parameters or DTO before passing to Service.

### 3. DI Pattern

```python
# apps/backend/app/services/{domain}_service.py
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

# apps/backend/app/repositories/{domain}_repo.py
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
```

### 4. Transaction Management

- **Repository**: only `flush()`. **Never `commit()`**
- **Service**: decides `commit()` / `rollback()` after calling multiple Repositories

### 5. UTC Time Required

```python
# BAD
datetime.utcnow()   # timezone-naive
datetime.now()      # local timezone

# GOOD
from datetime import datetime, timezone
datetime.now(timezone.utc)
```

### 6. No Magic Strings

```python
# BAD
user.status = "active"

# GOOD — define in apps/backend/app/enums/{domain}.py
from app.enums.user import UserStatus
user.status = UserStatus.ACTIVE
```

### 7. Type Hints Required

```python
# BAD
async def get_user(user_id):
    ...

# GOOD
async def get_user(self, user_id: int) -> Optional[UserDTO]:
    ...
```

---

## Execution Workflow

### Step 0: Pre-Analysis (read only, no changes)

1. Read target domain code:
   - `apps/backend/app/api/v1/{domain}.py` (router)
   - `apps/backend/app/services/{domain}_service.py`
   - `apps/backend/app/models/{domain}.py`
   - `apps/backend/app/schemas/{domain}.py`
   - `apps/backend/app/repositories/{domain}_repo.py` (if exists)

2. **List all violations**

3. **Report change plan → proceed only after user approval**

### Step 1: Create Foundation Structure

```
apps/backend/app/
├── enums/{domain}.py          # magic strings → Enum
├── dtos/{domain}.py           # Service ↔ Repository transfer objects
└── repositories/{domain}_repo.py  # ORM query separation
```

**Repository Pattern:**
```python
# apps/backend/app/repositories/user_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.user import User
from app.dtos.user import UserDTO

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_id(self, user_id: int) -> Optional[UserDTO]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return UserDTO.model_validate(user) if user else None

    async def create(self, **kwargs) -> UserDTO:
        user = User(**kwargs)
        self.db.add(user)
        await self.db.flush()  # absolutely no commit()
        return UserDTO.model_validate(user)
```

### Step 2: Refactor Service

```python
# apps/backend/app/services/user_service.py
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_user(self, user_id: int) -> UserDTO:
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    async def create_user(self, email: str, name: str) -> UserDTO:
        user = await self.user_repo.create(email=email, name=name)
        await self.db.commit()  # commit in Service
        return user
```

### Step 3: Clean Up Router

```python
# apps/backend/app/api/v1/users.py
def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreateRequest,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    # Schema → individual parameters before passing to Service
    user = await service.create_user(email=data.email, name=data.name)
    return UserResponse.model_validate(user)
```

### Step 4: Validation Checklist

```
[ ] No `from app.models.*` import in Service file?
[ ] No `select()`, `db.add()`, `db.execute()` in Service file?
[ ] No `commit()` in Repository file? (only flush allowed)
[ ] No Repository, Model imports in Router file?
[ ] No Schema type in Service method parameters?
[ ] Using Enum instead of magic strings?
[ ] Type hints on all methods?
[ ] Only `datetime.now(timezone.utc)` used?
[ ] No circular imports?
```

---

## File Placement

```
apps/backend/app/
├── enums/{domain}.py              # Enum definitions
├── dtos/{domain}.py               # DTO definitions
├── repositories/{domain}_repo.py  # Repository
├── services/{domain}_service.py   # Service (refactored)
└── api/v1/{domain}.py             # Router (cleaned up)
```
