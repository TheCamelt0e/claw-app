"""
Notification endpoints for CLAW
- Push token registration
- Geofence notifications (when near stores)
- Smart time suggestions
- Alarms and reminders
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import math

from app.core.database import get_db
from app.core.config import ICELANDIC_STORES, GEOFENCE_RADIUS_METERS
from app.core.security import get_current_user
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User
from app.services.categorization import is_shopping_related

router = APIRouter()


# ============ Request/Response Models ============

class PushTokenRequest(BaseModel):
    token: str
    platform: str = "unknown"


class GeofenceRequest(BaseModel):
    lat: float
    lng: float


class AlarmRequest(BaseModel):
    scheduled_time: datetime


class PatternUpdateRequest(BaseModel):
    category: str
    action_type: str


# ============ Helper Functions ============

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two coordinates"""
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Earth radius in meters
    return c * r


# ============ Push Token Management ============

@router.post("/register-token")
def register_push_token(
    req: PushTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a push notification token for the current user"""
    # For SQLite version, just acknowledge - no PushToken model
    return {"success": True, "message": "Token registered"}


# ============ Geofence Notifications ============

@router.post("/check-geofence")
def check_geofence(
    req: GeofenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user is near any relevant stores and return notifications"""
    notifications = []
    
    # Find nearby stores
    nearby_stores = []
    for store in ICELANDIC_STORES:
        distance = calculate_distance(req.lat, req.lng, store["lat"], store["lng"])
        if distance < GEOFENCE_RADIUS_METERS:
            nearby_stores.append({**store, "distance": distance})
    
    if not nearby_stores:
        return {"notifications": []}
    
    # Find shopping-related claws
    shopping_claws = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "active"
    ).all()
    
    relevant_claws = [
        claw for claw in shopping_claws 
        if is_shopping_related(claw.content)
    ]
    
    if relevant_claws and nearby_stores:
        # Create notification
        store_names = ", ".join([s["name"] for s in nearby_stores[:2]])
        item_count = len(relevant_claws)
        
        notifications.append({
            "type": "geofence",
            "title": f"🛒 You're near {store_names.split()[0]}",
            "body": f"You have {item_count} items on your shopping list. Time to strike?",
            "data": {
                "type": "geofence",
                "stores": nearby_stores,
                "claw_count": item_count
            }
        })
    
    return {"notifications": notifications}


@router.get("/nearby-stores")
def get_nearby_stores(
    lat: float,
    lng: float,
    radius: int = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get stores near the given location"""
    stores_with_distance = []
    
    for store in ICELANDIC_STORES:
        distance = calculate_distance(lat, lng, store["lat"], store["lng"])
        if distance < radius:
            stores_with_distance.append({
                **store,
                "distance": round(distance)
            })
    
    # Sort by distance
    stores_with_distance.sort(key=lambda x: x["distance"])
    
    return {"stores": stores_with_distance}


# ============ Smart Time Notifications ============

@router.get("/smart-suggestions")
def get_smart_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get smart time-based suggestions based on user's patterns"""
    notifications = []
    now = datetime.utcnow()
    hour = now.hour
    
    # Check for morning routine
    if 7 <= hour <= 9:
        # Check if user has captured anything today
        today_claws = db.query(Claw).filter(
            Claw.user_id == current_user.id,
            Claw.created_at >= now.replace(hour=0, minute=0, second=0)
        ).count()
        
        if today_claws == 0:
            notifications.append({
                "type": "smart_time",
                "title": "🌅 Good morning!",
                "body": "Start your day by capturing your intentions",
                "data": {"type": "smart_time", "action": "capture"}
            })
    
    # Check for evening review
    if 18 <= hour <= 21:
        active_count = db.query(Claw).filter(
            Claw.user_id == current_user.id,
            Claw.status == "active"
        ).count()
        
        if active_count > 0:
            notifications.append({
                "type": "smart_time",
                "title": "🌙 Evening review",
                "body": f"You have {active_count} active intentions. Time to strike some?",
                "data": {"type": "smart_time", "action": "strike"}
            })
    
    # Check for expired items
    expired_count = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "expired"
    ).count()
    
    if expired_count > 0:
        notifications.append({
            "type": "smart_time",
            "title": "⏰ Expired intentions",
            "body": f"{expired_count} intentions expired. Review or extend them?",
            "data": {"type": "smart_time", "action": "vault"}
        })
    
    return {"notifications": notifications}


# ============ All Notification Checks ============

@router.get("/all-checks")
def check_all_notifications(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run all notification checks at once"""
    all_notifications = []
    
    # Geofence check
    if lat is not None and lng is not None:
        geofence_result = check_geofence(
            GeofenceRequest(lat=lat, lng=lng),
            current_user,
            db
        )
        all_notifications.extend(geofence_result.get("notifications", []))
    
    # Smart suggestions
    smart_result = get_smart_suggestions(current_user, db)
    all_notifications.extend(smart_result.get("notifications", []))
    
    return {"notifications": all_notifications}


# ============ Alarms ============

@router.post("/claw/{claw_id}/set-alarm")
def set_alarm(
    claw_id: str,
    req: AlarmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set an alarm/reminder for a specific claw"""
    # Verify claw exists and belongs to user
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    # For SQLite version, just acknowledge - no Alarm model
    return {
        "success": True,
        "alarm": {
            "claw_id": claw_id,
            "scheduled_time": req.scheduled_time.isoformat(),
            "message": f"Reminder: {claw.content[:50]}..."
        }
    }


# ============ Calendar Integration ============

@router.post("/claw/{claw_id}/add-to-calendar")
def add_to_calendar(
    claw_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a claw to the user's calendar"""
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    return {
        "success": True,
        "event": {
            "claw_id": claw_id,
            "event_date": claw.expires_at.isoformat() if claw.expires_at else None
        }
    }


# ============ Pattern Learning ============

@router.get("/my-patterns")
def get_my_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's learned patterns (simplified for SQLite)"""
    return {
        "location_patterns": [],
        "time_patterns": []
    }


@router.post("/patterns/log-strike")
def log_strike_pattern(
    req: PatternUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log when user strikes a claw - for AI learning (simplified)"""
    return {"status": "logged", "confidence": 0.5}
