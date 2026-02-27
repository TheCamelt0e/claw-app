"""Add strike streak columns to users table

Revision ID: 003
Revises: 002
Create Date: 2026-02-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Add streak columns to users table
    op.add_column('users', sa.Column('current_streak_days', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('longest_streak_days', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('last_strike_date', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('streak_milestones', sa.String(), nullable=True, server_default=''))


def downgrade():
    # Remove streak columns
    op.drop_column('users', 'streak_milestones')
    op.drop_column('users', 'last_strike_date')
    op.drop_column('users', 'longest_streak_days')
    op.drop_column('users', 'current_streak_days')
