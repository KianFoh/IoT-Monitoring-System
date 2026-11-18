"""Add no-data alert operator.

Revision ID: d8e4a1c7b902
Revises: b2d4f6a8c0e1
Create Date: 2026-11-18

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d8e4a1c7b902"
down_revision: Union[str, Sequence[str], None] = "b2d4f6a8c0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_alert_rule_operator", "alert_rule", type_="check")
    op.create_check_constraint(
        "ck_alert_rule_operator",
        "alert_rule",
        "operator IN ('==', '!=', 'in', 'not in', '<', '>', '<=', '>=', "
        "'contains', 'not contains', 'contains any', 'contains all', 'is empty', 'no data')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_alert_rule_operator", "alert_rule", type_="check")
    op.create_check_constraint(
        "ck_alert_rule_operator",
        "alert_rule",
        "operator IN ('==', '!=', 'in', 'not in', '<', '>', '<=', '>=', "
        "'contains', 'not contains', 'contains any', 'contains all', 'is empty')",
    )
