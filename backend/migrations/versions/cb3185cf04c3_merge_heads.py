"""merge heads

Revision ID: cb3185cf04c3
Revises: c4d2b9b7f1a2, d2f4d5c9a1ab
Create Date: 2026-02-10 12:43:10.051975

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb3185cf04c3'
down_revision: Union[str, Sequence[str], None] = ('c4d2b9b7f1a2', 'd2f4d5c9a1ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
