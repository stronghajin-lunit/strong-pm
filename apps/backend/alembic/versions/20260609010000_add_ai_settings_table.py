"""add ai_settings table

Revision ID: 20260609010000
Revises: 20260609000000
Create Date: 2026-06-09 01:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260609010000"
down_revision = "20260609000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_settings",
        sa.Column("feature_key", sa.String(64), primary_key=True),
        sa.Column("model", sa.String(128), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ai_settings")
