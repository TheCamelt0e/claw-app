"""
Group/Shared List Model
Families/partners share grocery lists through groups.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


# Junction table: Group members
# Using SQLite-compatible string-based foreign keys
group_members = Table(
    'group_members',
    Base.metadata,
    Column('group_id', String(36), ForeignKey('groups.id'), primary_key=True),
    Column('user_id', String(36), ForeignKey('users.id'), primary_key=True),
    Column('joined_at', DateTime, default=datetime.utcnow),
    Column('role', String(20), default='member'),  # 'owner', 'admin', 'member'
)


class Group(Base):
    """A shared list group (family, couple, roommates)"""
    __tablename__ = 'groups'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    
    # Group type affects behavior
    group_type = Column(String(20), default='family')  # 'family', 'couple', 'roommates', 'other'
    
    # Who created it
    created_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Group settings
    is_active = Column(Boolean, default=True)
    
    # Relationships
    members = relationship('User', secondary=group_members, back_populates='groups')
    claws = relationship('GroupClaw', back_populates='group', cascade='all, delete-orphan')
    
    def to_dict(self, include_members=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'group_type': self.group_type,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active,
            'member_count': len(self.members),
        }
        
        if include_members:
            data['members'] = [
                {
                    'id': m.id,
                    'display_name': m.display_name,
                    'email': m.email,
                }
                for m in self.members
            ]
        
        return data


class GroupClaw(Base):
    """Links a claw to a group (shared items)"""
    __tablename__ = 'group_claws'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    group_id = Column(String(36), ForeignKey('groups.id'), nullable=False)
    claw_id = Column(String(36), ForeignKey('claws.id'), nullable=False)
    
    # Who captured it (can be different from group creator)
    captured_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Assignment: who should handle this?
    assigned_to = Column(String(36), ForeignKey('users.id'), nullable=True)
    
    # Status
    status = Column(String(20), default='active')  # 'active', 'claimed', 'completed', 'cancelled'
    
    # Claim info ("I got this")
    claimed_by = Column(String(36), ForeignKey('users.id'), nullable=True)
    claimed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    group = relationship('Group', back_populates='claws')
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'claw_id': self.claw_id,
            'captured_by': self.captured_by,
            'assigned_to': self.assigned_to,
            'status': self.status,
            'claimed_by': self.claimed_by,
            'claimed_at': self.claimed_at.isoformat() if self.claimed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
