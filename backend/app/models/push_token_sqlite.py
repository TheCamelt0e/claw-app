"""
Push Token model for notifications
SQLite-compatible
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class PushToken(Base):
    __tablename__ = "push_tokens"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(500), nullable=False)
    platform = Column(String(20), default="unknown")  # ios, android, web
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="push_tokens")


class Alarm(Base):
    __tablename__ = "alarms"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    claw_id = Column(String(36), ForeignKey("claws.id"), nullable=False, index=True)
    scheduled_time = Column(DateTime, nullable=False)
    message = Column(String(500), nullable=True)
    is_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="alarms")
    claw = relationship("Claw", backref="alarms")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    claw_id = Column(String(36), ForeignKey("claws.id"), nullable=False, index=True)
    external_event_id = Column(String(200), nullable=True)  # Google/Apple calendar ID
    provider = Column(String(50), default="local")  # local, google, apple, outlook
    event_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="calendar_events")
    claw = relationship("Claw", backref="calendar_events")
