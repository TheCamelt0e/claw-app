"""Add strike patterns for smart resurfacing

Revision ID: 002
Revises: 001
Create Date: 2026-02-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'strike_patterns',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('claw_id', sa.String(36), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('action_type', sa.String(50), nullable=True),
        sa.Column('struck_at', sa.DateTime, default=sa.func.now()),
        sa.Column('day_of_week', sa.Integer, nullable=True),  # 0=Monday
        sa.Column('hour_of_day', sa.Integer, nullable=True),  # 0-23
        sa.Column('location_lat', sa.Float, nullable=True),
        sa.Column('location_lng', sa.Float, nullable=True),
        sa.Column('near_store', sa.String(100), nullable=True),
        sa.Column('was_expired', sa.Integer, default=0),
        sa.Column('time_to_strike_hours', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )
    
    # Create indexes for fast queries
    op.create_index('idx_user_category_dow', 'strike_patterns', ['user_id', 'category', 'day_of_week'])
    op.create_index('idx_user_hour', 'strike_patterns', ['user_id', 'hour_of_day'])
    op.create_index('idx_user_store', 'strike_patterns', ['user_id', 'near_store'])


def downgrade():
    op.drop_table('strike_patterns')
