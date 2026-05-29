"""Add alert rule field label

Revision ID: b6e2d4c8a9f1
Revises: a4d7e9c2b1f0
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b6e2d4c8a9f1"
down_revision: Union[str, Sequence[str], None] = "a4d7e9c2b1f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("alert_rule", sa.Column("field_label", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("alert_rule", "field_label")
