"""add slack_qa_items table

Revision ID: 20260609000000
Revises: 20260602160000
Create Date: 2026-06-09 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260609000000"
down_revision = "20260602160000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "slack_qa_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slack_channel_id", sa.String(50), nullable=False),
        sa.Column("slack_channel_name", sa.String(200), nullable=False),
        sa.Column("slack_message_ts", sa.String(50), nullable=False),
        sa.Column("slack_message_url", sa.Text(), nullable=False),
        sa.Column("sender_name", sa.String(200), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("answer_date", sa.String(20), nullable=False),
        sa.Column("ai_project_id", sa.Integer(), nullable=True),
        sa.Column("linked_project_id", sa.Integer(), nullable=True),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ai_project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["linked_project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slack_message_ts", name="uq_slack_qa_message_ts"),
    )


def downgrade() -> None:
    op.drop_table("slack_qa_items")
