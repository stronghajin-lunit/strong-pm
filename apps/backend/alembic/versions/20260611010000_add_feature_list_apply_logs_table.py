"""add feature_list_apply_logs table

Revision ID: 20260611010000
Revises: 20260609020000
Create Date: 2026-06-11 01:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260611010000"
down_revision = "20260609020000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feature_list_apply_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("feature_list_run_id", sa.Integer(), nullable=True),
        sa.Column("feature_list_page_url", sa.Text(), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changes_applied", sa.Integer(), nullable=False),
        sa.Column("comments_resolved", sa.Integer(), nullable=False),
        sa.Column("confluence_url", sa.Text(), nullable=False),
        sa.Column("change_details", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["feature_list_run_id"],
            ["feature_list_runs.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feature_list_apply_logs_run_id", "feature_list_apply_logs", ["feature_list_run_id"])
    op.create_index("ix_feature_list_apply_logs_page_url", "feature_list_apply_logs", ["feature_list_page_url"])


def downgrade() -> None:
    op.drop_index("ix_feature_list_apply_logs_page_url", table_name="feature_list_apply_logs")
    op.drop_index("ix_feature_list_apply_logs_run_id", table_name="feature_list_apply_logs")
    op.drop_table("feature_list_apply_logs")
