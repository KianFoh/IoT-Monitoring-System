"""drop distributor logo variants if exist

Revision ID: 9f1a2b3c4d5e
Revises: 8b4c2a1b5a4e
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9f1a2b3c4d5e"
down_revision: Union[str, Sequence[str], None] = "8b4c2a1b5a4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE distributor DROP COLUMN IF EXISTS logo_url_table")
    op.execute("ALTER TABLE distributor DROP COLUMN IF EXISTS logo_url_login")
    op.execute("ALTER TABLE distributor DROP COLUMN IF EXISTS logo_url_favicon")


def downgrade() -> None:
    # No-op: columns intentionally removed
    pass
