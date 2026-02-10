"""add distributor logo variants

Revision ID: 8b4c2a1b5a4e
Revises: cb3185cf04c3
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "8b4c2a1b5a4e"
down_revision: Union[str, Sequence[str], None] = "cb3185cf04c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: variants removed, keep migration for history compatibility.
    pass


def downgrade() -> None:
    # No-op
    pass
