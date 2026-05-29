"""Add alert rule notification fields

Revision ID: a4d7e9c2b1f0
Revises: f3a8c1d9e6b2
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4d7e9c2b1f0"
down_revision: Union[str, Sequence[str], None] = "f3a8c1d9e6b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "alert_rule",
        sa.Column("notification_method", sa.String(), nullable=False, server_default="email"),
    )
    op.add_column("alert_rule", sa.Column("message", sa.String(), nullable=True))
    op.add_column(
        "alert_rule",
        sa.Column("include_data_in_message", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "alert_rule",
        sa.Column("cooldown_seconds", sa.Integer(), nullable=False, server_default="300"),
    )
    op.create_check_constraint(
        "ck_alert_rule_cooldown_seconds_nonnegative",
        "alert_rule",
        "cooldown_seconds >= 0",
    )

    op.alter_column("alert_rule", "notification_method", server_default=None)
    op.alter_column("alert_rule", "include_data_in_message", server_default=None)
    op.alter_column("alert_rule", "cooldown_seconds", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_alert_rule_cooldown_seconds_nonnegative", "alert_rule", type_="check")
    op.drop_column("alert_rule", "cooldown_seconds")
    op.drop_column("alert_rule", "include_data_in_message")
    op.drop_column("alert_rule", "message")
    op.drop_column("alert_rule", "notification_method")
