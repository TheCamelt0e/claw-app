"""
Smart resurfacing engine - The heart of CLAW
Determines when and how to bring claws back to user's attention
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.database import SessionLocal
from app.models.claw import Claw
from app.models.user import User


class ResurfacingEngine:
    """
    The core intelligence that determines WHEN to resurface a claw
    based on user context, time, location, and behavioral patterns
    """
    
    async def check_and_resurface(self, user_id: str, context: dict) -> List[Claw]:
        """
        Check if any claws should be resurfaced based on current context
        
        Args:
            user_id: The user's ID
            context: Current context including:
                - location: (lat, lng)
                - time: current time
                - active_app: currently open app
                - activity: detected activity (driving, walking, etc.)
        
        Returns:
            List of claws to surface
        """
        db = SessionLocal()
        try:
            claws = db.query(Claw).filter(
                and_(
                    Claw.user_id == user_id,
                    Claw.status == "active",
                    Claw.expires_at > datetime.utcnow()
                )
            ).all()
            
            to_surface = []
            for claw in claws:
                score = self._calculate_relevance_score(claw, context)
                if score > 0.7:  # Threshold for surfacing
                    to_surface.append((claw, score))
            
            # Sort by relevance score
            to_surface.sort(key=lambda x: x[1], reverse=True)
            
            # Update last_surfaced for returned claws
            surfaced_claws = []
            for claw, score in to_surface[:3]:  # Max 3 at a time
                claw.last_surfaced_at = datetime.utcnow()
                claw.surface_count += 1
                surfaced_claws.append(claw)
            
            db.commit()
            return surfaced_claws
            
        finally:
            db.close()
    
    def _calculate_relevance_score(self, claw: Claw, context: dict) -> float:
        """
        Calculate how relevant a claw is to the current context (0-1)
        """
        scores = []
        
        # Location match
        if claw.location_lat and claw.location_lng and context.get("location"):
            user_lat, user_lng = context["location"]
            distance = self._haversine_distance(
                claw.location_lat, claw.location_lng,
                user_lat, user_lng
            )
            if distance <= claw.location_radius_meters:
                scores.append(0.9)
        
        # Time context match
        current_hour = datetime.utcnow().hour
        if claw.time_context:
            time_match = self._check_time_context(claw.time_context, current_hour)
            if time_match:
                scores.append(0.7)
        
        # App trigger match
        if claw.app_trigger and context.get("active_app"):
            if claw.app_trigger.lower() in context["active_app"].lower():
                scores.append(1.0)
        
        # Prevent over-surfacing
        if claw.surface_count > 3:
            scores.append(0.1)  # Penalty
        
        if claw.last_surfaced_at:
            hours_since = (datetime.utcnow() - claw.last_surfaced_at).total_seconds() / 3600
            if hours_since < 4:
                scores.append(0.0)  # Don't surface if shown recently
        
        return max(scores) if scores else 0.0
    
    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance in meters between two coordinates"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371000  # Earth's radius in meters
        
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def _check_time_context(self, time_context: str, current_hour: int) -> bool:
        """Check if current time matches the time context"""
        time_ranges = {
            "morning": (6, 12),
            "afternoon": (12, 17),
            "evening": (17, 22),
            "night": (22, 6),
            "weekend": None,  # Special case
        }
        
        if time_context in time_ranges:
            start, end = time_ranges[time_context]
            if start < end:
                return start <= current_hour < end
            else:  # night spans midnight
                return current_hour >= start or current_hour < end
        
        return False
    
    async def get_expiring_soon(self, user_id: str, hours: int = 24) -> List[Claw]:
        """Get claws expiring within the next N hours"""
        db = SessionLocal()
        try:
            cutoff = datetime.utcnow() + timedelta(hours=hours)
            return db.query(Claw).filter(
                and_(
                    Claw.user_id == user_id,
                    Claw.status == "active",
                    Claw.expires_at <= cutoff,
                    Claw.expires_at > datetime.utcnow()
                )
            ).order_by(Claw.expires_at).all()
        finally:
            db.close()


# Background scheduler for periodic resurfacing checks
resurfacing_engine = ResurfacingEngine()


def start_resurfacing_scheduler():
    """Start background task for periodic resurfacing"""
    asyncio.create_task(_resurfacing_loop())


async def _resurfacing_loop():
    """Background loop that checks for expiring claws"""
    while True:
        await asyncio.sleep(3600)  # Check every hour
        # Implementation for batch resurfacing would go here
        print("Resurfacing check completed")
