"""Rename token_version to one_time_token_version and added refresh token to user table

Revision ID: 80505d77537e
Revises: 142d3a52995a
Create Date: 2025-12-24 15:17:02.359383

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '80505d77537e'
down_revision: Union[str, Sequence[str], None] = '142d3a52995a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('user')]
    
    # Only add constraint if it doesn't exist
    try:
        op.create_unique_constraint('uq_customer_department', 'department', ['customer_id', 'name'])
    except:
        pass
    
    # Only add one_time_token_version if it doesn't exist
    if 'one_time_token_version' not in columns:
        op.add_column('user', sa.Column('one_time_token_version', sa.Integer(), nullable=False))
    
    # Only add refresh_token_version if it doesn't exist
    if 'refresh_token_version' not in columns:
        op.add_column('user', sa.Column('refresh_token_version', sa.Integer(), nullable=False))
    
    # Only drop token_version if it exists
    if 'token_version' in columns:
        op.drop_column('user', 'token_version')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('user', sa.Column('token_version', sa.INTEGER(), autoincrement=False, nullable=False))
    op.drop_column('user', 'refresh_token_version')
    op.drop_column('user', 'one_time_token_version')
    op.drop_constraint('uq_customer_department', 'department', type_='unique')
