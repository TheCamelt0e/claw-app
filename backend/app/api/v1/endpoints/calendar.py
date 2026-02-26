"""
Calendar integration API - Connect with Google/Apple calendar
"""
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class CalendarEvent:
    """Simple calendar event model"""
    def __init__(self, title: str, start_time: datetime, end_time: datetime, 
                 location: Optional[str] = None, event_type: str = "default"):
        self.title = title
        self.start_time = start_time
        self.end_time = end_time
        self.location = location
        self.event_type = event_type


@router.get("/connected")
async def check_calendar_connected(
    current_user: User = Depends(get_current_user)
):
    """Check if user has connected their calendar"""
    # For now, return false - will implement OAuth later
    return {
        "google_connected": False,
        "apple_connected": False,
        "outlook_connected": False,
        "can_connect": True
    }


@router.post("/connect/{provider}")
async def connect_calendar(
    provider: str,  # google, apple, outlook
    current_user: User = Depends(get_current_user)
):
    """Initiate calendar connection (OAuth flow)"""
    # Placeholder - full OAuth implementation would go here
    if provider not in ["google", "apple", "outlook"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    return {
        "status": "not_implemented",
        "message": f"{provider} calendar integration coming soon. For now, CLAW uses learned patterns."
    }


@router.get("/events")
async def get_calendar_events(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user)
):
    """Get upcoming calendar events (mock for now)"""
    # This would integrate with Google Calendar API
    # For now, return empty and rely on AI patterns
    
    return {
        "events": [],
        "message": "Calendar integration coming soon. CLAW is learning your patterns instead!"
    }


@router.get("/best-time-to-call")
async def get_best_time_to_call(
    person_type: str = Query(..., description="family, friend, work, business"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI-suggested best time to call someone
    Based on learned patterns from user behavior
    """
    from app.models.location import UserTimePattern
    
    # Get user's patterns for "call" actions
    patterns = db.query(UserTimePattern).filter(
        UserTimePattern.user_id == current_user.id,
        UserTimePattern.action_type == "call"
    ).order_by(UserTimePattern.confidence.desc()).all()
    
    if patterns and patterns[0].confidence > 0.3:
        best = patterns[0]
        return {
            "suggested_time": f"{best.preferred_hour_start}:00 - {best.preferred_hour_end}:00",
            "confidence": best.confidence,
            "based_on": f"{best.strike_count} previous calls",
            "reasoning": "Based on when you typically complete calls"
        }
    
    # Default suggestion based on person type
    defaults = {
        "family": {"time": "Weekend afternoon or Sunday evening", "reason": "Family typically free"},
        "friend": {"time": "Weekday evening 6-9pm", "reason": "After work, before dinner"},
        "work": {"time": "Tuesday-Thursday 10am-4pm", "reason": "Business hours"},
        "business": {"time": "Tuesday-Thursday 10am-4pm", "reason": "Professional hours"},
    }
    
    default = defaults.get(person_type, defaults["friend"])
    return {
        "suggested_time": default["time"],
        "confidence": 0.0,
        "based_on": "general recommendation",
        "reasoning": default["reason"]
    }


@router.get("/free-slots")
async def find_free_time_slots(
    duration_minutes: int = Query(30, ge=15, le=180),
    days_ahead: int = Query(7, ge=1, le=14),
    current_user: User = Depends(get_current_user)
):
    """Find free time slots in user's calendar"""
    # This would analyze calendar + learned patterns
    # Return good times to schedule things
    
    now = datetime.utcnow()
    
    # Mock response - would integrate with real calendar
    slots = []
    for day in range(days_ahead):
        date = now + timedelta(days=day)
        if date.weekday() < 5:  # Weekday
            slots.append({
                "date": date.strftime("%Y-%m-%d"),
                "start_time": "09:00",
                "end_time": "10:00",
                "confidence": 0.8
            })
    
    return {
        "free_slots": slots[:5],
        "message": f"Top {len(slots[:5])} suggested times for {duration_minutes}min task"
    }


@router.post("/smart-reminder")
async def create_smart_reminder(
    title: str,
    preferred_time_context: str,  # morning, afternoon, evening, weekend
    duration_estimate: int = 30,  # minutes
    current_user: User = Depends(get_current_user)
):
    """
    Create a reminder that finds the best time based on calendar + patterns
    """
    from app.models.location import UserTimePattern
    
    # Get user's preferred times for this context
    patterns = db.query(UserTimePattern).filter(
        UserTimePattern.user_id == current_user.id
    ).all()
    
    # Find best slot
    best_hour = 10  # default morning
    if preferred_time_context == "evening":
        best_hour = 19
    elif preferred_time_context == "afternoon":
        best_hour = 14
    
    # Adjust based on patterns
    for p in patterns:
        if p.preferred_hour_start and p.confidence > 0.3:
            if preferred_time_context == "morning" and 6 <= p.preferred_hour_start <= 12:
                best_hour = p.preferred_hour_start
            elif preferred_time_context == "afternoon" and 12 <= p.preferred_hour_start <= 17:
                best_hour = p.preferred_hour_start
            elif preferred_time_context == "evening" and 17 <= p.preferred_hour_start <= 22:
                best_hour = p.preferred_hour_start
    
    return {
        "reminder_title": title,
        "suggested_time": f"{best_hour}:00",
        "context": preferred_time_context,
        "message": f"We'll remind you around {best_hour}:00 when you're likely free"
    }
