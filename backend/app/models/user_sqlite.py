"""
SQLite-compatible User model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    
    # Profile
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Subscription
    subscription_tier = Column(String(20), default="free")
    subscription_expires_at = Column(DateTime, nullable=True)
    
    # Usage tracking
    total_claws_created = Column(Integer, default=0)
    total_claws_completed = Column(Integer, default=0)
    
    # Settings
    notification_preferences = Column(String(50), default="smart")
    default_expiry_days = Column(Integer, default=7)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    
    # Strike Streak (Gamification)
    current_streak_days = Column(Integer, default=0)
    longest_streak_days = Column(Integer, default=0)
    last_strike_date = Column(DateTime, nullable=True)
    streak_milestones = Column(String, default="")  # JSON array: ["7_day", "30_day", "100_day"]
    
    # Email Verification
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True, index=True)
    email_verification_sent_at = Column(DateTime, nullable=True)
    
    # Password Reset
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_sent_at = Column(DateTime, nullable=True)
    
    def is_pro(self) -> bool:
        if self.subscription_tier in ["pro", "family"]:
            if self.subscription_expires_at is None or self.subscription_expires_at > datetime.utcnow():
                return True
        return False
    
    # Relationships
    groups = relationship('Group', secondary='group_members', back_populates='members')
    
    def get_claw_limit(self) -> int:
        if self.is_pro():
            return -1
        return 50
    
    def update_streak(self) -> dict:
        """
        Update strike streak. Call this whenever user strikes an item.
        Returns streak info for UI feedback.
        """
        from datetime import datetime, timedelta
        
        now = datetime.utcnow()
        today = now.date()
        
        if self.last_strike_date:
            last_date = self.last_strike_date.date()
            days_diff = (today - last_date).days
            
            if days_diff == 0:
                # Already struck today, streak unchanged
                pass
            elif days_diff == 1:
                # Streak continues!
                self.current_streak_days += 1
                if self.current_streak_days > self.longest_streak_days:
                    self.longest_streak_days = self.current_streak_days
            else:
                # Streak broken :(
                self.current_streak_days = 1
        else:
            # First strike ever
            self.current_streak_days = 1
        
        self.last_strike_date = now
        
        # Check for milestones
        milestones = self.streak_milestones.split(',') if self.streak_milestones else []
        new_milestones = []
        
        for days in [7, 30, 100, 365]:
            milestone_key = f"{days}_day"
            if self.current_streak_days >= days and milestone_key not in milestones:
                milestones.append(milestone_key)
                new_milestones.append(days)
        
        self.streak_milestones = ','.join(milestones)
        
        return {
            "current_streak": self.current_streak_days,
            "longest_streak": self.longest_streak_days,
            "new_milestones": new_milestones,
            "streak_maintained": True
        }
    
    def get_streak_status(self) -> dict:
        """Get current streak status for display"""
        from datetime import datetime, timedelta
        
        now = datetime.utcnow()
        expires_at = None
        
        if self.last_strike_date:
            # Streak expires at midnight UTC tomorrow
            tomorrow = (self.last_strike_date + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            expires_at = tomorrow.isoformat()
        
        return {
            "current_streak": self.current_streak_days,
            "longest_streak": self.longest_streak_days,
            "last_strike_date": self.last_strike_date.isoformat() if self.last_strike_date else None,
            "streak_expires_at": expires_at,
            "milestones_achieved": self.streak_milestones.split(',') if self.streak_milestones else []
        }
