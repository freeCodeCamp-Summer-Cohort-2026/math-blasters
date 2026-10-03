"""create completions table

Revision ID: 7759b8f44dbd
Revises: 204c040e4e91
Create Date: 2026-09-30 10:16:11.031550
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7759b8f44dbd'
down_revision: Union[str, None] = '204c040e4e91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    
    op.create_table('completions',
    sa.Column('account_id', sa.Uuid(), nullable=False),
    sa.Column('lesson_slug', sa.String(length=255), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('account_id', 'lesson_slug')
    )
    


def downgrade() -> None:
    
    op.drop_table('completions')
