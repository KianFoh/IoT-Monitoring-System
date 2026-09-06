"""Add device machine series and installation date

Revision ID: f5a7c9d2e8b1
Revises: e4f6a7b8c9d0
Create Date: 2026-09-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f5a7c9d2e8b1"
down_revision: Union[str, Sequence[str], None] = "e4f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("device", sa.Column("machine_series_number", sa.String(), nullable=True))
    op.add_column("device", sa.Column("installation_date", sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("device", "installation_date")
    op.drop_column("device", "machine_series_number")
