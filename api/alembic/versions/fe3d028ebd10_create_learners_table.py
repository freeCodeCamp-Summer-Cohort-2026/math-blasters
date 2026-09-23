"""create learners table

Revision ID: fe3d028ebd10
Revises: acafc186cb2a
Create Date: 2026-09-18 04:12:37.817724
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'fe3d028ebd10'
down_revision: Union[str, None] = 'acafc186cb2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learners",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )

    op.create_index(
        op.f("ix_learners_token"),
        "learners",
        ["token"],
        unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_learners_token"), table_name="learners")
    op.drop_table("learners")
