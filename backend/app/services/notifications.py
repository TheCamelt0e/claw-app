"""
Push notification service for CLAW
Sends alerts when user is near relevant stores, or when it's time to act
"""
from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from collections import Counter

from app.models.claw_sqlite import Claw
from app.models.strike_pattern import StrikePattern
from app.core.config import ICELANDIC_STORES


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
        
        # Check if user is near any Icelandic stores
        nearby_stores = []
        for store in ICELANDIC_STORES:
            distance = haversine(lat, lng, store["lat"], store["lng"])
            if distance <= 200:  # 200m radius
                nearby_stores.append({"store": store, "distance": distance})
        
        if not nearby_stores:
            return notifications
        
        # Get active claws that might be relevant for shopping
        claws = db.query(Claw).filter(
            Claw.user_id == user_id,
            Claw.status == "active",
            Claw.category.in_(["product", "grocery", "restaurant", "task"])
        ).all()
        
        for claw in claws:
            # Check if we already notified recently (prevent spam)
            last_notified = claw.last_surfaced_at
            if not last_notified or (datetime.utcnow() - last_notified) > timedelta(minutes=30):
                store_names = ", ".join([s["store"]["name"] for s in nearby_stores[:2]])
                notifications.append({
                    "claw_id": str(claw.id),
                    "title": "🦀 CLAW Alert",
                    "body": f"You're near {store_names}: {claw.title or claw.content}",
                    "data": {
                        "type": "geofence",
                        "claw_id": str(claw.id),
                        "stores": [s["store"]["chain"] for s in nearby_stores]
                    }
                })
                
                # Update last surfaced
                claw.last_surfaced_at = datetime.utcnow()
                claw.surface_count += 1
        
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        
        return notifications
    
    @staticmethod
    def check_smart_time_notifications(user_id: str, db: Session) -> List[dict]:
        """
        Check if it's a good time to remind user based on learned patterns
        Uses StrikePattern data to determine optimal times
        """
        notifications = []
        now = datetime.utcnow()
        current_hour = now.hour
        current_day = now.weekday()  # 0=Monday, 6=Sunday
        
        # Get user's strike patterns
        patterns = db.query(StrikePattern).filter(
            StrikePattern.user_id == user_id
        ).all()
        
        if not patterns:
            return notifications
        
        # Analyze patterns
        day_counts = Counter(p.day_of_week for p in patterns)
        hour_counts = Counter(p.hour_of_day for p in patterns)
        
        # Check if current time matches user's patterns
        day_match = day_counts.get(current_day, 0) > len(patterns) * 0.2
        hour_match = hour_counts.get(current_hour, 0) > len(patterns) * 0.2
        
        if day_match and hour_match:
            # Find active claws
            claws = db.query(Claw).filter(
                Claw.user_id == user_id,
                Claw.status == "active"
            ).all()
            
            for claw in claws:
                notifications.append({
                    "claw_id": str(claw.id),
                    "title": "🦀 Perfect Time!",
                    "body": f"This is when you usually complete tasks: {claw.title or claw.content}",
                    "data": {
                        "type": "smart_time",
                        "claw_id": str(claw.id)
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
    def create_calendar_event(claw: Claw, db: Session = None) -> dict:
        """
        Generate calendar event data for a claw
        """
        return {
            "title": claw.title or claw.content,
            "description": f"Captured in CLAW: {claw.content}",
            "start_time": claw.created_at.isoformat() if claw.created_at else datetime.utcnow().isoformat(),
            "end_time": ((claw.created_at or datetime.utcnow()) + timedelta(hours=1)).isoformat(),
            "reminder_minutes": 15
        }
    
    @staticmethod
    def schedule_alarm(claw: Claw, scheduled_time: datetime, db: Session = None) -> dict:
        """
        Schedule an alarm/reminder for a claw
        """
        return {
            "claw_id": str(claw.id),
            "title": claw.title or claw.content,
            "scheduled_at": scheduled_time.isoformat(),
            "message": f"Time to: {claw.action_type or 'do'} {claw.title or claw.content}"
        }
