"""Add department MQTT topic

Revision ID: b2d4f6a8c0e1
Revises: a9c2e4f6b8d0
Create Date: 2026-09-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b2d4f6a8c0e1"
down_revision: Union[str, Sequence[str], None] = "a9c2e4f6b8d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("department", sa.Column("mqtt_topic", sa.String(), nullable=True))
    op.execute("UPDATE department SET mqtt_topic = name WHERE mqtt_topic IS NULL")
    op.alter_column("department", "mqtt_topic", nullable=False)
    op.create_unique_constraint(
        "uq_customer_department_mqtt_topic",
        "department",
        ["customer_id", "mqtt_topic"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_customer_department_mqtt_topic", "department", type_="unique")
    op.drop_column("department", "mqtt_topic")
