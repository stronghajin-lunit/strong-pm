"""add feature_list_runs table

Revision ID: 20260602160000
Revises: 20260602140000
Create Date: 2026-06-02 16:00:00.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260602160000"
down_revision: Union[str, None] = "20260602140000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feature_list_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("project_name", sa.String(500), nullable=False),
        sa.Column("prd_page_url", sa.Text(), nullable=False),
        sa.Column("prd_page_id", sa.String(50), nullable=True),
        sa.Column("feature_list_page_url", sa.Text(), nullable=False),
        sa.Column("feature_list_page_id", sa.String(50), nullable=True),
        sa.Column("status", sa.String(10), nullable=False, server_default="running"),
        sa.Column("confluence_url", sa.Text(), nullable=True),
        sa.Column("feature_count", sa.Integer(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feature_list_runs_project_id", "feature_list_runs", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_feature_list_runs_project_id", table_name="feature_list_runs")
    op.drop_table("feature_list_runs")
