"""Add is_priority column to claws table

Revision ID: 001
Revises: 
Create Date: 2026-02-27 00:02:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_priority column
    op.add_column('claws', sa.Column('is_priority', sa.Boolean(), nullable=True, server_default='0'))
    
    # Update existing VIP claws to have is_priority=True
    op.execute("""
        UPDATE claws 
        SET is_priority = 1 
        WHERE title LIKE '%🔥%' 
           OR tags LIKE '%"vip"%' 
           OR tags LIKE '%"priority"%'
    """)


def downgrade() -> None:
    op.drop_column('claws', 'is_priority')
