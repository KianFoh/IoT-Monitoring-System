"""Add device connectivity and cellular metadata fields

Revision ID: b8f3c2a6e2a1
Revises: a7c1d4f9b3e2
Create Date: 2026-02-04 10:00:00.000000

"""
from typing import Sequence, Union
from sqlalchemy.dialects import postgresql

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8f3c2a6e2a1"
down_revision: Union[str, Sequence[str], None] = "a7c1d4f9b3e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    device_connectivity_enum = postgresql.ENUM(
        "wifi",
        "cellular",
        name="device_connectivity",
    )
    device_connectivity_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "device",
        sa.Column(
            "connectivity",
            sa.Enum("wifi", "cellular", name="device_connectivity"),
            nullable=False,
            server_default=sa.text("'wifi'"),
        ),
    )
    op.add_column("device", sa.Column("mobile_number", sa.String(), nullable=True))
    op.add_column("device", sa.Column("sim_id", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("device", "sim_id")
    op.drop_column("device", "mobile_number")
    op.drop_column("device", "connectivity")

    device_connectivity_enum = postgresql.ENUM(
        "wifi",
        "cellular",
        name="device_connectivity",
    )
    device_connectivity_enum.drop(op.get_bind(), checkfirst=True)
