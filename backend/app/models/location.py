"""
Location model for stores, restaurants, and other places
"""
import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.core.database import Base


class Location(Base):
    __tablename__ = "locations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Store info
    name = Column(String(200), nullable=False)
    chain = Column(String(100), nullable=False, index=True)  # bonus, kronan, etc.
    address = Column(String(300), nullable=True)
    
    # Coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Category
    category = Column(String(50), nullable=False)  # grocery, restaurant, bookstore, etc.
    country_code = Column(String(2), default="IS")
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "chain": self.chain,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "country_code": self.country_code,
        }


class UserLocationPattern(Base):
    """Tracks user patterns for AI learning"""
    __tablename__ = "user_location_patterns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Pattern data
    location_chain = Column(String(100), nullable=False)  # "bonus", "kronan"
    category = Column(String(50), nullable=False)  # "grocery"
    
    # Visit patterns
    visit_count = Column(Integer, default=1)
    avg_visit_hour = Column(Float, nullable=True)  # Average hour of day (0-23)
    avg_visit_day = Column(Float, nullable=True)   # Average day of week (0-6)
    
    # Last visit
    last_visit_at = Column(DateTime, default=datetime.utcnow)
    
    # Created
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "location_chain": self.location_chain,
            "category": self.category,
            "visit_count": self.visit_count,
            "avg_visit_hour": self.avg_visit_hour,
            "avg_visit_day": self.avg_visit_day,
            "last_visit_at": self.last_visit_at.isoformat() if self.last_visit_at else None,
        }


class UserTimePattern(Base):
    """Tracks when user typically acts on different categories"""
    __tablename__ = "user_time_patterns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # What
    category = Column(String(50), nullable=False)  # "call", "buy", "read"
    action_type = Column(String(50), nullable=False)
    
    # When (learned from actual usage)
    preferred_hour_start = Column(Integer, nullable=True)  # 9 = 9am
    preferred_hour_end = Column(Integer, nullable=True)    # 17 = 5pm
    preferred_days = Column(String(20), nullable=True)     # "0,6" = Sun,Sat
    
    # Confidence (0-1)
    confidence = Column(Float, default=0.5)
    
    # Stats
    strike_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
