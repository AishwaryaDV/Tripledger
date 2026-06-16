"""add_ai_messages_table

Revision ID: 11eacbc5f38e
Revises: 051cc28df235
Create Date: 2026-06-16

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '11eacbc5f38e'
down_revision: Union[str, None] = '051cc28df235'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('trip_id', UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_messages_trip_id', 'ai_messages', ['trip_id'])


def downgrade() -> None:
    op.drop_index('ix_ai_messages_trip_id', table_name='ai_messages')
    op.drop_table('ai_messages')
