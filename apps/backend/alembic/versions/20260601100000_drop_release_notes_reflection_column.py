"""drop release_notes reflection column

Revision ID: 20260601100000
Revises: 20260601094537
Create Date: 2026-06-01 10:00:00.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260601100000"
down_revision: Union[str, None] = "20260601094537"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("release_notes", "reflection")


def downgrade() -> None:
    op.add_column(
        "release_notes",
        sa.Column("reflection", sa.Text(), nullable=True),
    )
