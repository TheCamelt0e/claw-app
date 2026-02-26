"""
Push notification service for CLAW
Sends alerts when user is near relevant stores, or when it's time to act
"""
import json
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.claw import Claw
from app.models.user import User
from app.models.location import Location, UserLocationPattern, UserTimePattern


class NotificationService:
    """Handles push notifications for CLAW"""
    
    @staticmethod
    def check_geofence_notifications(user_id: str, lat: float, lng: float, db: Session) -> List[dict]:
        """
        Check if user entered a geofence for any of their claws
        Returns list of notifications to send
        """
        from math import radians, cos, sin, asin, sqrt
        
        def haversine(lat1, lon1, lat2, lon2):
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            return 6371000 * 2 * asin(sqrt(a))  # Distance in meters
        
        notifications = []
        
        # Get active claws with location triggers
        claws = db.query(Claw).filter(
            Claw.user_id == user_id,
            Claw.status == "active",
            Claw.location_lat.isnot(None),
            Claw.location_lng.isnot(None)
        ).all()
        
        for claw in claws:
            distance = haversine(lat, lng, claw.location_lat, claw.location_lng)
            
            if distance <= claw.location_radius_meters:
                # Check if we already notified recently (prevent spam)
                last_notified = claw.last_surfaced_at
                if not last_notified or (datetime.utcnow() - last_notified) > timedelta(minutes=30):
                    notifications.append({
                        "claw_id": str(claw.id),
                        "title": "🦀 CLAW Alert",
                        "body": f"You're near {claw.location_name}: {claw.title or claw.content}",
                        "data": {
                            "type": "geofence",
                            "claw_id": str(claw.id),
                            "distance": round(distance)
                        }
                    })
                    
                    # Update last surfaced
                    claw.last_surfaced_at = datetime.utcnow()
                    claw.surface_count += 1
        
        db.commit()
        return notifications
    
    @staticmethod
    def check_smart_time_notifications(user_id: str, db: Session) -> List[dict]:
        """
        Check if it's a good time to remind user based on learned patterns
        """
        notifications = []
        now = datetime.utcnow()
        current_hour = now.hour
        current_day = now.weekday()  # 0=Monday, 6=Sunday
        
        # Get user's time patterns
        patterns = db.query(UserTimePattern).filter(
            UserTimePattern.user_id == user_id,
            UserTimePattern.confidence > 0.5
        ).all()
        
        for pattern in patterns:
            # Check if current time matches pattern
            hour_match = False
            if pattern.preferred_hour_start and pattern.preferred_hour_end:
                hour_match = pattern.preferred_hour_start <= current_hour <= pattern.preferred_hour_end
            
            day_match = True
            if pattern.preferred_days:
                days = [int(d) for d in pattern.preferred_days.split(',')]
                day_match = current_day in days
            
            if hour_match and day_match:
                # Find matching claws
                claws = db.query(Claw).filter(
                    Claw.user_id == user_id,
                    Claw.status == "active",
                    Claw.category == pattern.category
                ).all()
                
                for claw in claws:
                    notifications.append({
                        "claw_id": str(claw.id),
                        "title": "🦀 Perfect Time!",
                        "body": f"This is when you usually {pattern.action_type}: {claw.title or claw.content}",
                        "data": {
                            "type": "smart_time",
                            "claw_id": str(claw.id),
                            "pattern": pattern.action_type
                        }
                    })
        
        return notifications
    
    @staticmethod
    def check_expiry_notifications(user_id: str, db: Session) -> List[dict]:
        """
        Check for items expiring soon
        """
        notifications = []
        now = datetime.utcnow()
        
        # Items expiring in next 24 hours
        expiring_soon = db.query(Claw).filter(
            Claw.user_id == user_id,
            Claw.status == "active",
            Claw.expires_at <= now + timedelta(hours=24),
            Claw.expires_at > now
        ).all()
        
        for claw in expiring_soon:
            hours_left = int((claw.expires_at - now).total_seconds() / 3600)
            
            notifications.append({
                "claw_id": str(claw.id),
                "title": "⏰ Expiring Soon",
                "body": f"'{claw.title or claw.content}' expires in {hours_left} hours",
                "data": {
                    "type": "expiry",
                    "claw_id": str(claw.id),
                    "hours_left": hours_left
                }
            })
        
        return notifications
    
    @staticmethod
    def create_calendar_event(claw: Claw, db: Session) -> dict:
        """
        Generate calendar event data for a claw
        """
        return {
            "title": claw.title or claw.content,
            "description": f"Captured in CLAW: {claw.content}",
            "start_time": claw.created_at.isoformat(),
            "end_time": (claw.created_at + timedelta(hours=1)).isoformat(),
            "location": claw.location_name,
            "reminder_minutes": 15
        }
    
    @staticmethod
    def schedule_alarm(claw: Claw, scheduled_time: datetime, db: Session) -> dict:
        """
        Schedule an alarm/reminder for a claw
        """
        return {
            "claw_id": str(claw.id),
            "title": claw.title or claw.content,
            "scheduled_at": scheduled_time.isoformat(),
            "message": f"Time to: {claw.action_type or 'do'} {claw.title or claw.content}"
        }
