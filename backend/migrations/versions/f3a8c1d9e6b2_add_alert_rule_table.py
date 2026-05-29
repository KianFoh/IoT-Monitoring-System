"""Add alert rule table

Revision ID: f3a8c1d9e6b2
Revises: f1a2b3c4d5e6
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3a8c1d9e6b2"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "alert_rule",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("device_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("field", sa.String(), nullable=False),
        sa.Column("field_type", sa.String(), nullable=False),
        sa.Column("operator", sa.String(), nullable=False),
        sa.Column("value", sa.JSON(), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "field_type IN ('text', 'number', 'boolean', 'list')",
            name="ck_alert_rule_field_type",
        ),
        sa.CheckConstraint(
            "operator IN ('==', '!=', 'in', 'not in', '<', '>', '<=', '>=', "
            "'contains', 'not contains', 'contains any', 'contains all', 'is empty')",
            name="ck_alert_rule_operator",
        ),
        sa.ForeignKeyConstraint(["device_id"], ["device.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alert_rule_device_id", "alert_rule", ["device_id"])
    op.create_index("ix_alert_rule_device_field", "alert_rule", ["device_id", "field"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_alert_rule_device_field", table_name="alert_rule")
    op.drop_index("ix_alert_rule_device_id", table_name="alert_rule")
    op.drop_table("alert_rule")
