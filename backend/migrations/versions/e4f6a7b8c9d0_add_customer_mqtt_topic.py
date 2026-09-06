"""Add customer MQTT topic segment

Revision ID: e4f6a7b8c9d0
Revises: d7e8f9a1b2c3
Create Date: 2026-09-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e4f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d7e8f9a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("customer", sa.Column("mqtt_topic", sa.String(), nullable=True))
    op.execute("UPDATE customer SET mqtt_topic = name WHERE mqtt_topic IS NULL")
    op.alter_column("customer", "mqtt_topic", nullable=False)
    op.create_unique_constraint("uq_customer_mqtt_topic", "customer", ["mqtt_topic"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_customer_mqtt_topic", "customer", type_="unique")
    op.drop_column("customer", "mqtt_topic")
