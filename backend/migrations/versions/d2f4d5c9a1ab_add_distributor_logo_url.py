"""add distributor logo url

Revision ID: d2f4d5c9a1ab
Revises: b8f3c2a6e2a1
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d2f4d5c9a1ab"
down_revision: Union[str, Sequence[str], None] = "b8f3c2a6e2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("distributor", sa.Column("logo_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("distributor", "logo_url")
