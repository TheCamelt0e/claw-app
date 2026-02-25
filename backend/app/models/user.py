"""
User model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    
    # Profile
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Subscription
    subscription_tier = Column(String(20), default="free")  # free, pro, family
    subscription_expires_at = Column(DateTime, nullable=True)
    
    # Usage tracking
    total_claws_created = Column(Integer, default=0)
    total_claws_completed = Column(Integer, default=0)
    
    # Settings
    notification_preferences = Column(String(50), default="smart")  # all, smart, minimal
    default_expiry_days = Column(Integer, default=7)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    claws = relationship("Claw", back_populates="user", cascade="all, delete-orphan")
    
    def is_pro(self) -> bool:
        if self.subscription_tier in ["pro", "family"]:
            if self.subscription_expires_at is None or self.subscription_expires_at > datetime.utcnow():
                return True
        return False
    
    def get_claw_limit(self) -> int:
        if self.is_pro():
            return -1  # Unlimited
        from app.core.config import settings
        return settings.MAX_FREE_CLAWS
