"""add context_ko to project_contexts

Revision ID: 20260609020000
Revises: 20260609010000
Create Date: 2026-06-09 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "20260609020000"
down_revision = "20260609010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_contexts", sa.Column("context_ko", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("project_contexts", "context_ko")
