"""
SQLite-compatible Claw model
"""
import uuid
import json
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer, Float
from sqlalchemy.orm import relationship

from app.core.database_sqlite import Base


def generate_uuid():
    return str(uuid.uuid4())


class Claw(Base):
    __tablename__ = "claws"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Content
    content = Column(Text, nullable=False)
    content_type = Column(String(20), default="text")
    raw_media_url = Column(String(500), nullable=True)
    
    # AI-Generated Context
    title = Column(String(200), nullable=True)
    category = Column(String(50), nullable=True)
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
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))
    completed_at = Column(DateTime, nullable=True)
    last_surfaced_at = Column(DateTime, nullable=True)
    surface_count = Column(Integer, default=0)
    
    # Relationships
    # Relationship disabled for circular import fix
    # user = relationship("User", back_populates="claws")
    
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
    
    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "title": self.title,
            "category": self.category,
            "tags": self.get_tags(),
            "status": self.status,
            "location_name": self.location_name,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
