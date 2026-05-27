"""Add nullable custom MQTT topics to device

Revision ID: f1a2b3c4d5e6
Revises: e2b6c4f7a8d1
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e2b6c4f7a8d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("device", sa.Column("sub", sa.String(), nullable=True))
    op.add_column("device", sa.Column("pub", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("device", "pub")
    op.drop_column("device", "sub")
