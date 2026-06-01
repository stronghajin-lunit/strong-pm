"""add sprint_reports table

Revision ID: 20260601110000
Revises: 20260601100000
Create Date: 2026-06-01 11:00:00.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260601110000"
down_revision: Union[str, None] = "20260601100000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sprint_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sprint_label", sa.String(100), nullable=False),
        sa.Column("sprint_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("confluence_url", sa.Text(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("sprint_reports")
