"""add jira_ticket_runs table

Revision ID: 20260601094537
Revises: 031f265fd4c5
Create Date: 2026-06-01 09:45:37.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260601094537"
down_revision: Union[str, None] = "031f265fd4c5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "jira_ticket_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product", sa.String(50), nullable=False),
        sa.Column("sprint", sa.String(100), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("summary", sa.String(500), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("jira_url", sa.Text(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("jira_ticket_runs")
