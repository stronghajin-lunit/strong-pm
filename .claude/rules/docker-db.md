# Docker & Database Rules

## Alembic Migrations

### Rules

1. **Both `upgrade()` and `downgrade()` must be implemented**
2. Never edit migration files directly — create a new migration instead
3. Always validate migrations in dev/staging before applying to production
4. Keep data migrations separate from schema migrations

### Migration File Pattern

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

### Migration Commands

```bash
# Auto-generate (detects model changes)
cd apps/backend && alembic revision --autogenerate -m "add users table"

# Apply
alembic upgrade head

# Roll back one step
alembic downgrade -1

# Roll back to specific version
alembic downgrade <revision_id>

# Check current version
alembic current

# View history
alembic history
```

---

## DB Naming Conventions

### Tables

| Rule | Example |
|------|---------|
| `snake_case` plural | `users`, `user_profiles`, `refresh_tokens` |
| Join tables | `user_roles`, `post_tags` (combine both table names) |

### Columns

| Rule | Example |
|------|---------|
| `snake_case` | `user_id`, `created_at`, `is_active` |
| Boolean: `is_` or `has_` prefix | `is_active`, `has_profile` |
| Date/time: `_at` suffix | `created_at`, `deleted_at`, `expires_at` |
| Foreign key: `{table_singular}_id` | `user_id`, `post_id` |

### Required Columns (all tables)

```python
# ✅ Required in every table
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

### Indexes

- Always create an index on foreign key columns
- Index frequently queried columns (`email`, `slug`, `status`)
- Put higher-cardinality columns first in composite indexes

---

## .env Management

### Rules

1. **Never commit `.env` files to git** (included in `.gitignore`)
2. **Only commit `.env.example`**: keys only, no real values
3. Always update `.env.example` when adding new environment variables
4. Secrets must be managed via environment variables only (never hardcode in source)

### .env.example Format

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

### Dev Environment Structure

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

### Container Naming

| Service | Container name |
|---------|----------------|
| PostgreSQL | `strongpm-postgres` |
| Redis | `strongpm-redis` |
| Backend | `strongpm-backend` |
| Frontend | `strongpm-frontend` |
