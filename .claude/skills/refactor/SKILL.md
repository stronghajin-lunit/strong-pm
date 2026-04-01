---
name: refactor
description: |
  백엔드 레이어 분리 리팩토링 실행 스킬. Router → Service → Repository 계층 분리를 적용합니다.
  사용 시점: /project:refactor 커맨드 호출 시, 도메인별 레이어 분리 작업 시
---

# Refactor Skill

## 사용법

```
/project:refactor users             # 특정 도메인 전체
/project:refactor users create_user # 도메인의 특정 메서드
/project:refactor status            # 진행 상황 확인
```

---

## 절대 규칙 (위반 시 작업 중단)

### 1. 레이어 의존 방향 — 단방향만 허용

```
Router → Service → Repository → Model
                 ↘ DTO/Schema (공유 가능)
```

| 레이어 | import 가능 | import 금지 |
|--------|------------|------------|
| **Router** | Service, Schema, Depends | Repository, Model, DTO 직접 |
| **Service** | Repository, DTO, Enum | Router, Model, ORM 직접 접근 |
| **Repository** | Model, DTO, Enum | Service, Router |

### 2. 경계 객체

| 경계 | 객체 | 역할 |
|------|------|------|
| Frontend ↔ Router | **Schema** (Pydantic) | API 계약, 직렬화/검증 |
| Service ↔ Repository | **DTO** (Pydantic BaseModel) | DB 구조 격리 |

**Service 메서드 파라미터에 Schema를 직접 받지 않는다.**
→ Router에서 Schema → 개별 파라미터 또는 DTO로 변환 후 Service에 전달

### 3. DI 패턴

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

### 4. 트랜잭션 관리

- **Repository**: `flush()`만 수행. **절대 `commit()` 안 함**
- **Service**: 여러 Repository 호출 후 `commit()` / `rollback()` 결정

### 5. UTC 시간 필수

```python
# BAD
datetime.utcnow()   # timezone-naive
datetime.now()      # 로컬 타임존

# GOOD
from datetime import datetime, timezone
datetime.now(timezone.utc)
```

### 6. 매직 스트링 금지

```python
# BAD
user.status = "active"

# GOOD — apps/backend/app/enums/{domain}.py 에 정의
from app.enums.user import UserStatus
user.status = UserStatus.ACTIVE
```

### 7. 타입 힌트 필수

```python
# BAD
async def get_user(user_id):
    ...

# GOOD
async def get_user(self, user_id: int) -> Optional[UserDTO]:
    ...
```

---

## 실행 워크플로우

### Step 0: 사전 분석 (코드 읽기만, 수정 없음)

1. 대상 도메인 코드 읽기:
   - `apps/backend/app/api/v1/{domain}.py` (라우터)
   - `apps/backend/app/services/{domain}_service.py`
   - `apps/backend/app/models/{domain}.py`
   - `apps/backend/app/schemas/{domain}.py`
   - `apps/backend/app/repositories/{domain}_repo.py` (있으면)

2. **위반 사항 목록 작성**

3. **변경 계획 보고 → 사용자 승인 후 진행**

### Step 1: 기반 구조 생성

```
apps/backend/app/
├── enums/{domain}.py          # 매직 스트링 → Enum
├── dtos/{domain}.py           # Service ↔ Repository 전달 객체
└── repositories/{domain}_repo.py  # ORM 쿼리 분리
```

**Repository 패턴:**
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
        await self.db.flush()  # commit() 절대 금지
        return UserDTO.model_validate(user)
```

### Step 2: Service 리팩토링

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
        await self.db.commit()  # Service에서 commit
        return user
```

### Step 3: Router 정리

```python
# apps/backend/app/api/v1/users.py
def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreateRequest,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    # Schema → 개별 파라미터로 변환 후 Service 호출
    user = await service.create_user(email=data.email, name=data.name)
    return UserResponse.model_validate(user)
```

### Step 4: 검증 체크리스트

```
[ ] Service 파일에 `from app.models.*` import가 없는가?
[ ] Service 파일에 `select()`, `db.add()`, `db.execute()` 가 없는가?
[ ] Repository 파일에 `commit()` 이 없는가? (flush만 허용)
[ ] Router 파일에 Repository, Model import가 없는가?
[ ] Service 메서드 파라미터에 Schema 타입이 없는가?
[ ] 매직 스트링 대신 Enum을 사용하는가?
[ ] 모든 메서드에 타입 힌트가 있는가?
[ ] datetime.now(timezone.utc) 만 사용하는가?
[ ] 순환참조가 없는가?
```

---

## 파일 생성 위치

```
apps/backend/app/
├── enums/{domain}.py              # Enum 정의
├── dtos/{domain}.py               # DTO 정의
├── repositories/{domain}_repo.py  # Repository
├── services/{domain}_service.py   # Service (리팩토링)
└── api/v1/{domain}.py             # Router (정리)
```
