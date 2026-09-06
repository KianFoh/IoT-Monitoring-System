"""Add distributor subdomain and MQTT topic

Revision ID: a9c2e4f6b8d0
Revises: f5a7c9d2e8b1
Create Date: 2026-09-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a9c2e4f6b8d0"
down_revision: Union[str, Sequence[str], None] = "f5a7c9d2e8b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("distributor", sa.Column("subdomain", sa.String(), nullable=True))
    op.add_column("distributor", sa.Column("mqtt_topic", sa.String(), nullable=True))
    op.execute(
        """
        UPDATE distributor
        SET subdomain = btrim(
            regexp_replace(
                regexp_replace(lower(name), '[^a-z0-9-]+', '-', 'g'),
                '-{2,}',
                '-',
                'g'
            ),
            '-'
        )
        WHERE subdomain IS NULL
        """
    )
    op.execute("UPDATE distributor SET mqtt_topic = name WHERE mqtt_topic IS NULL")
    op.alter_column("distributor", "subdomain", nullable=False)
    op.alter_column("distributor", "mqtt_topic", nullable=False)
    op.create_unique_constraint("uq_distributor_subdomain", "distributor", ["subdomain"])
    op.create_unique_constraint("uq_distributor_mqtt_topic", "distributor", ["mqtt_topic"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_distributor_mqtt_topic", "distributor", type_="unique")
    op.drop_constraint("uq_distributor_subdomain", "distributor", type_="unique")
    op.drop_column("distributor", "mqtt_topic")
    op.drop_column("distributor", "subdomain")
