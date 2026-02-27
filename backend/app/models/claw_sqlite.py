"""
SQLite-compatible Claw model with indexes for performance
"""
import uuid
import json
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer, Float, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Claw(Base):
    __tablename__ = "claws"
    
    # Composite indexes for common query patterns
    __table_args__ = (
        # Index for: get user's active claws (most common query)
        Index('idx_user_status_created', 'user_id', 'status', 'created_at'),
        # Index for: find expired claws
        Index('idx_status_expires', 'status', 'expires_at'),
        # Index for: find claws by category
        Index('idx_user_category', 'user_id', 'category'),
    )
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    content_type = Column(String(20), default="text")
    raw_media_url = Column(String(500), nullable=True)
    
    # AI-Generated Context
    title = Column(String(200), nullable=True)
    category = Column(String(50), nullable=True, index=True)
    tags = Column(Text, default="[]")  # JSON string for SQLite
    sentiment = Column(String(20), nullable=True)
    action_type = Column(String(50), nullable=True)
    
    # Context Triggers
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_radius_meters = Column(Integer, default=100)
    location_name = Column(String(200), nullable=True)
    
    time_context = Column(String(50), nullable=True)
    app_trigger = Column(String(50), nullable=True)
    
    custom_trigger_conditions = Column(Text, default="{}")  # JSON string
    
    # Status & Lifecycle
    status = Column(String(20), default="active", index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))
    completed_at = Column(DateTime, nullable=True)
    last_surfaced_at = Column(DateTime, nullable=True)
    surface_count = Column(Integer, default=0)
    
    # VIP/Priority flag
    is_priority = Column(Boolean, default=False)
    
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    def can_resurface(self) -> bool:
        return self.status == "active" and not self.is_expired()
    
    def get_tags(self):
        try:
            return json.loads(self.tags) if self.tags else []
        except:
            return []
    
    def set_tags(self, tags_list):
        self.tags = json.dumps(tags_list)
    
    def is_vip(self) -> bool:
        """Check if this claw is a VIP/priority item"""
        if self.is_priority:
            return True
        tags = self.get_tags()
        return "vip" in tags or "priority" in tags or (self.title and "🔥" in self.title)
    
    def to_dict(self):
        tags = self.get_tags()
        
        return {
            "id": self.id,
            "content": self.content,
            "title": self.title,
            "category": self.category,
            "tags": tags,
            "status": self.status,
            "location_name": self.location_name,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_vip": self.is_vip(),
            "is_priority": self.is_priority,
        }
