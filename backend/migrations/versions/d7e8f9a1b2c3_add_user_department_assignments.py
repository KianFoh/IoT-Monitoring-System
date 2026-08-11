"""Add user department assignments

Revision ID: d7e8f9a1b2c3
Revises: c9f1a2b8d4e6
Create Date: 2026-08-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d7e8f9a1b2c3"
down_revision: Union[str, Sequence[str], None] = "c9f1a2b8d4e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_department",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("department_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["department_id"], ["department.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "department_id"),
    )
    op.create_index("ix_user_department_user_id", "user_department", ["user_id"])
    op.create_index("ix_user_department_department_id", "user_department", ["department_id"])
    op.execute(
        """
        INSERT INTO user_department (user_id, department_id)
        SELECT id, department_id
        FROM "user"
        WHERE department_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_user_department_department_id", table_name="user_department")
    op.drop_index("ix_user_department_user_id", table_name="user_department")
    op.drop_table("user_department")
