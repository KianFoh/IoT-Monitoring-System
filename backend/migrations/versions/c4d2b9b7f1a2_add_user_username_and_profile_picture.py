"""Add username and profile picture to user

Revision ID: c4d2b9b7f1a2
Revises: b8f3c2a6e2a1
Create Date: 2026-02-04 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d2b9b7f1a2"
down_revision: Union[str, Sequence[str], None] = "b8f3c2a6e2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("user", sa.Column("username", sa.String(), nullable=True))
    op.add_column("user", sa.Column("profile_picture", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("user", "profile_picture")
    op.drop_column("user", "username")
