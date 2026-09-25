"""add accounts and oauth identities tables

Revision ID: 204c040e4e91
Revises: fe3d028ebd10
Create Date: 2026-09-24 04:19:08.537250
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '204c040e4e91'
down_revision: Union[str, None] = 'fe3d028ebd10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create accounts table
    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create index for accounts table
    op.create_index(op.f("ix_accounts_email"), "accounts", ["email"], unique=False)

    # Create oauth_identities table
    op.create_table(
        "oauth_identities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("provider_account_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_account_id", name="uq_provider_provider_account_id"),
    )

    # Create index for oauth_identities table
    op.create_index(op.f("ix_oauth_identities_account_id"), "oauth_identities", ["account_id"], unique=False)

    # Add nullable account_id foreign key to learners table
    op.add_column("learners", sa.Column("account_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_learners_account_id_accounts",
        "learners",
        "accounts",
        ["account_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_learners_account_id"), "learners", ["account_id"], unique=False)


def downgrade() -> None:
    # Reverse changes in opposite order of creation
    op.drop_index(op.f("ix_learners_account_id"), table_name="learners")
    op.drop_constraint("fk_learners_account_id_accounts", "learners", type_="foreignkey")
    op.drop_column("learners", "account_id")

    op.drop_index(op.f("ix_oauth_identities_account_id"), table_name="oauth_identities")
    op.drop_table("oauth_identities")

    op.drop_index(op.f("ix_accounts_email"), table_name="accounts")
    op.drop_table("accounts")
