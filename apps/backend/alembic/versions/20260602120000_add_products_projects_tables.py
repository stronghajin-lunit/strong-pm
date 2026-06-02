"""add products, projects, project_products, project_contexts tables

Revision ID: 20260602120000
Revises: 20260601110000
Create Date: 2026-06-02 12:00:00.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "20260602120000"
down_revision: Union[str, None] = "20260601110000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="not_started"),
        sa.Column("epic_link", sa.Text(), nullable=True),
        sa.Column("epic_key", sa.String(50), nullable=True),
        sa.Column("confluence_link", sa.Text(), nullable=True),
        sa.Column("confluence_page_id", sa.String(50), nullable=True),
        sa.Column("workflow_step", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("background", sa.Text(), nullable=True),
        sa.Column("hlr", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "project_products",
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "product_id"),
    )

    op.create_table(
        "project_contexts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("page_cache", JSONB(), nullable=False, server_default="{}"),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id"),
    )

    # Seed initial products
    op.execute(
        "INSERT INTO products (name, created_at) VALUES "
        "('ODM', NOW()), "
        "('Annotation Admin', NOW()), "
        "('Annotation Tool', NOW())"
    )


def downgrade() -> None:
    op.drop_table("project_contexts")
    op.drop_table("project_products")
    op.drop_table("projects")
    op.drop_table("products")
