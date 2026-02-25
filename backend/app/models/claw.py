"""
Claw model - The core entity representing a captured intention
"""
import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.config import settings


class Claw(Base):
    __tablename__ = "claws"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Content
    content = Column(Text, nullable=False)  # The captured text/voice transcription
    content_type = Column(String(20), default="text")  # text, voice, photo
    raw_media_url = Column(String(500), nullable=True)  # URL to original voice/image
    
    # AI-Generated Context
    title = Column(String(200), nullable=True)  # Auto-generated summary
    category = Column(String(50), nullable=True)  # book, restaurant, product, task, idea, etc.
    tags = Column(JSONB, default=list)  # Extracted tags
    sentiment = Column(String(20), nullable=True)  # urgency level
    action_type = Column(String(50), nullable=True)  # buy, read, watch, try, remember
    
    # Context Triggers (When to resurface)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_radius_meters = Column(Integer, default=100)
    location_name = Column(String(200), nullable=True)  # "Whole Foods Downtown"
    
    time_context = Column(String(50), nullable=True)  # morning, evening, weekend, specific_time
    app_trigger = Column(String(50), nullable=True)  # amazon, netflix, chrome, maps
    
    custom_trigger_conditions = Column(JSONB, default=dict)  # Flexible trigger rules
    
    # Status & Lifecycle
    status = Column(String(20), default="active")  # active, completed, expired, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=settings.DEFAULT_CLAW_EXPIRY_DAYS))
    completed_at = Column(DateTime, nullable=True)
    last_surfaced_at = Column(DateTime, nullable=True)
    surface_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="claws")
    
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    def can_resurface(self) -> bool:
        return self.status == "active" and not self.is_expired()
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "content": self.content,
            "title": self.title,
            "category": self.category,
            "tags": self.tags,
            "status": self.status,
            "location_name": self.location_name,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
