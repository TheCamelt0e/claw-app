"""
SQLite-compatible User model - SECURITY HARDENED
"""
import uuid
from datetime import datetime, timedelta
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
    
    # Streak System 2.0
    streak_freezes_available = Column(Integer, default=1)  # Freezes per month
    streak_freezes_used_this_month = Column(Integer, default=0)
    streak_freeze_reset_date = Column(DateTime, nullable=True)
    active_streak_bet = Column(String, nullable=True)  # JSON: {"target_strikes": 10, "deadline": "...", "reward": "..."}
    streak_recovery_available = Column(Boolean, default=True)  # One recovery ever
    
    # Token versioning for secure logout/revocation
    token_version = Column(Integer, default=0, nullable=False)
    
    # Email Verification
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True, index=True)
    email_verification_sent_at = Column(DateTime, nullable=True)
    
    # Password Reset
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_sent_at = Column(DateTime, nullable=True)
    
    # Relationships
    groups = relationship('Group', secondary='group_members', back_populates='members')
    
    def is_pro(self) -> bool:
        """Check if user has active Pro subscription"""
        if self.subscription_tier in ["pro", "family"]:
            if self.subscription_expires_at is None or self.subscription_expires_at > datetime.utcnow():
                return True
        return False
    
    def get_claw_limit(self) -> int:
        """Get maximum number of active claws allowed (-1 = unlimited)"""
        if self.is_pro():
            return -1
        return 50  # Free tier limit
    
    def update_streak(self) -> dict:
        """
        Update strike streak. Call this whenever user strikes an item.
        Returns streak info for UI feedback.
        """
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
            "milestones_achieved": self.streak_milestones.split(',') if self.streak_milestones else [],
            "streak_freezes_available": self._get_available_freezes(),
            "streak_recovery_available": self.streak_recovery_available and self.current_streak_days > 0,
            "active_bet": self._parse_active_bet()
        }
    
    def _get_available_freezes(self) -> int:
        """Get available streak freezes (resets monthly)"""
        now = datetime.utcnow()
        
        if self.streak_freeze_reset_date:
            # Check if we need to reset (new month)
            reset_date = self.streak_freeze_reset_date
            if now.month != reset_date.month or now.year != reset_date.year:
                self.streak_freezes_used_this_month = 0
                self.streak_freeze_reset_date = now
        else:
            self.streak_freeze_reset_date = now
        
        return max(0, self.streak_freezes_available - self.streak_freezes_used_this_month)
    
    def use_streak_freeze(self) -> bool:
        """Use a streak freeze to maintain current streak"""
        available = self._get_available_freezes()
        if available > 0:
            self.streak_freezes_used_this_month += 1
            # Update last_strike_date to today to maintain streak
            self.last_strike_date = datetime.utcnow()
            return True
        return False
    
    def use_streak_recovery(self) -> bool:
        """Use the one-time streak recovery (restore broken streak)"""
        if self.streak_recovery_available and self.longest_streak_days > 0:
            self.current_streak_days = min(self.longest_streak_days, self.current_streak_days + 7)
            self.streak_recovery_available = False
            self.last_strike_date = datetime.utcnow()
            return True
        return False
    
    def place_streak_bet(self, target_strikes: int, days: int) -> dict:
        """Place a bet on achieving X strikes in Y days"""
        import json
        now = datetime.utcnow()
        deadline = now + timedelta(days=days)
        
        bet = {
            "target_strikes": target_strikes,
            "current_strikes": 0,
            "deadline": deadline.isoformat(),
            "placed_at": now.isoformat(),
            "reward": self._calculate_bet_reward(target_strikes, days),
            "status": "active"
        }
        
        self.active_streak_bet = json.dumps(bet)
        return bet
    
    def _calculate_bet_reward(self, target: int, days: int) -> str:
        """Calculate reward for completing a bet"""
        difficulty = target / max(days, 1)
        if difficulty >= 2:
            return "legendary_badge"
        elif difficulty >= 1.5:
            return "epic_badge"
        elif difficulty >= 1:
            return "rare_badge"
        return "common_badge"
    
    def update_streak_bet(self) -> dict:
        """Update bet progress when user strikes. Call this after update_streak()."""
        import json
        
        if not self.active_streak_bet:
            return None
        
        bet = json.loads(self.active_streak_bet)
        now = datetime.utcnow()
        deadline = datetime.fromisoformat(bet["deadline"])
        
        # Check if bet expired
        if now > deadline:
            bet["status"] = "failed"
            self.active_streak_bet = None
            return {"status": "failed", "reason": "deadline_passed"}
        
        # Increment progress
        bet["current_strikes"] += 1
        
        # Check if completed
        if bet["current_strikes"] >= bet["target_strikes"]:
            bet["status"] = "completed"
            self.active_streak_bet = None
            return {
                "status": "completed",
                "reward": bet["reward"],
                "target": bet["target_strikes"]
            }
        
        # Update active bet
        self.active_streak_bet = json.dumps(bet)
        return {
            "status": "active",
            "progress": bet["current_strikes"],
            "target": bet["target_strikes"],
            "deadline": bet["deadline"]
        }
    
    def _parse_active_bet(self) -> dict:
        """Parse active bet from JSON string"""
        import json
        if not self.active_streak_bet:
            return None
        try:
            return json.loads(self.active_streak_bet)
        except:
            return None
