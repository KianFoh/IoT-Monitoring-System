"""Rename alert rule is_enabled to is_active

Revision ID: c9f1a2b8d4e6
Revises: b6e2d4c8a9f1
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c9f1a2b8d4e6"
down_revision: Union[str, Sequence[str], None] = "b6e2d4c8a9f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("alert_rule", "is_enabled", new_column_name="is_active")


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("alert_rule", "is_active", new_column_name="is_enabled")
