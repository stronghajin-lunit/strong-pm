# Docker & Database Rules

## Alembic 마이그레이션

### 규칙

1. **`upgrade()` + `downgrade()` 모두 구현 필수**
2. 마이그레이션 파일은 직접 수정 금지 — 새 마이그레이션 생성
3. 마이그레이션은 반드시 개발/스테이징에서 검증 후 프로덕션 적용
4. 데이터 마이그레이션은 스키마 마이그레이션과 분리

### 마이그레이션 파일 패턴

```python
# alembic/versions/20240101_add_users_table.py
"""add users table

Revision ID: abc123def456
Revises: previous_revision_id
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'abc123def456'
down_revision = 'previous_revision_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_email', 'users', ['email'])


def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
```

### 마이그레이션 커맨드

```bash
# 자동 생성 (모델 변경 감지)
cd apps/backend && alembic revision --autogenerate -m "add users table"

# 적용
alembic upgrade head

# 한 단계 롤백
alembic downgrade -1

# 특정 버전으로 롤백
alembic downgrade <revision_id>

# 현재 버전 확인
alembic current

# 히스토리 확인
alembic history
```

---

## DB 네이밍 컨벤션

### 테이블

| 규칙 | 예시 |
|------|------|
| `snake_case` 복수형 | `users`, `user_profiles`, `refresh_tokens` |
| 조인 테이블 | `user_roles`, `post_tags` (양쪽 테이블명 조합) |

### 컬럼

| 규칙 | 예시 |
|------|------|
| `snake_case` | `user_id`, `created_at`, `is_active` |
| Boolean: `is_` 또는 `has_` prefix | `is_active`, `has_profile` |
| 날짜/시간: `_at` suffix | `created_at`, `deleted_at`, `expires_at` |
| 외래키: `{table_singular}_id` | `user_id`, `post_id` |

### 필수 컬럼 (모든 테이블)

```python
# ✅ 모든 테이블에 반드시 포함
class BaseModel(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

### 인덱스

- 외래키 컬럼에는 항상 인덱스 생성
- 자주 검색되는 컬럼 (`email`, `slug`, `status`)에 인덱스
- 복합 인덱스는 선택도(cardinality) 높은 컬럼 먼저

---

## .env 관리

### 규칙

1. **`.env` 파일은 절대 git에 커밋하지 않는다** (`.gitignore`에 포함)
2. **`.env.example`만 커밋**: 실제 값 없이 키만 포함
3. 새 환경변수 추가 시 `.env.example`도 반드시 업데이트
4. 시크릿은 환경변수로만 관리 (코드에 하드코딩 금지)

### .env.example 형식

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
DATABASE_POOL_SIZE=10

# Auth
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# External Services
REDIS_URL=redis://localhost:6379/0

# App
APP_ENV=development
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Docker Compose

### 개발 환경 구조

```yaml
# docker/docker-compose.dev.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-dev}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-devpass}
      POSTGRES_DB: ${POSTGRES_DB:-strongpm_dev}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dev}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 컨테이너 네이밍

| 서비스 | 컨테이너명 |
|--------|-----------|
| PostgreSQL | `strongpm-postgres` |
| Redis | `strongpm-redis` |
| Backend | `strongpm-backend` |
| Frontend | `strongpm-frontend` |
