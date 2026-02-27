"""Add groups and shared lists tables

Revision ID: 004
Revises: 003
Create Date: 2026-02-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Create groups table
    op.create_table(
        'groups',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('group_type', sa.String(20), default='family'),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_active', sa.Boolean, default=True),
    )
    
    # Create group_members junction table
    op.create_table(
        'group_members',
        sa.Column('group_id', sa.String(36), sa.ForeignKey('groups.id'), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), primary_key=True),
        sa.Column('joined_at', sa.DateTime, default=sa.func.now()),
        sa.Column('role', sa.String(20), default='member'),
    )
    
    # Create group_claws table (links claws to groups)
    op.create_table(
        'group_claws',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('group_id', sa.String(36), sa.ForeignKey('groups.id'), nullable=False),
        sa.Column('claw_id', sa.String(36), sa.ForeignKey('claws.id'), nullable=False),
        sa.Column('captured_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('assigned_to', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('claimed_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('claimed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('completed_at', sa.DateTime, nullable=True),
    )


def downgrade():
    op.drop_table('group_claws')
    op.drop_table('group_members')
    op.drop_table('groups')
