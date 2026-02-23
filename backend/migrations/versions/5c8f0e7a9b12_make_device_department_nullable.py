"""Make device.department_id nullable.

Revision ID: 5c8f0e7a9b12
Revises: 9f1a2b3c4d5e
Create Date: 2026-02-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5c8f0e7a9b12"
down_revision: Union[str, Sequence[str], None] = "9f1a2b3c4d5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "device",
        "department_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "device",
        "department_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )
