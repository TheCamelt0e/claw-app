"""
Strike Pattern Model - SECURITY HARDENED
Tracks when/where users complete intentions to enable smart resurfacing
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Float, Index, ForeignKey
from app.core.database import Base


def generate_uuid():
    """Generate UUID string - using proper function instead of lambda"""
    return str(uuid.uuid4())


class StrikePattern(Base):
    """
    Records every strike to learn user behavior patterns.
    
    Example patterns learned:
    - User strikes 'shopping' items on Thursdays 6-8pm near grocery stores
    - User strikes 'book' items on Sunday mornings at home
    - User strikes 'task' items on weekday afternoons
    """
    __tablename__ = "strike_patterns"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    
    # Foreign keys with cascade delete
    user_id = Column(
        String(36), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    claw_id = Column(
        String(36), 
        ForeignKey("claws.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    # What was completed
    category = Column(String(50), nullable=True)  # book, movie, product, etc.
    action_type = Column(String(50), nullable=True)  # buy, read, watch, etc.
    
    # When it was struck
    struck_at = Column(DateTime, default=datetime.utcnow)
    day_of_week = Column(Integer)  # 0=Monday, 6=Sunday
    hour_of_day = Column(Integer)  # 0-23
    
    # Where it was struck (if location available)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    near_store = Column(String(100), nullable=True)  # Which store if applicable
    
    # Context
    was_expired = Column(Integer, default=0)  # Was it struck after expiry?
    time_to_strike_hours = Column(Integer)  # How long from capture to strike
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes for fast pattern queries
    __table_args__ = (
        Index('idx_user_category_dow', 'user_id', 'category', 'day_of_week'),
        Index('idx_user_hour', 'user_id', 'hour_of_day'),
        Index('idx_user_store', 'user_id', 'near_store'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "action_type": self.action_type,
            "struck_at": self.struck_at.isoformat() if self.struck_at else None,
            "day_of_week": self.day_of_week,
            "hour_of_day": self.hour_of_day,
            "near_store": self.near_store,
        }
