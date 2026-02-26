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

from app.api.deps import get_current_user, get_db
from app.models import User, Claw, PushToken, Alarm, CalendarEvent
from app.models.claw_sqlite import Claw as ClawModel

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


class NotificationResponse(BaseModel):
    notifications: list[dict]


# ============ Push Token Management ============

@router.post("/register-token")
def register_push_token(
    req: PushTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a push notification token for the current user"""
    # Check if token already exists
    existing = db.query(PushToken).filter(
        PushToken.user_id == current_user.id,
        PushToken.token == req.token
    ).first()
    
    if existing:
        existing.is_active = True
        existing.last_used_at = datetime.utcnow()
    else:
        new_token = PushToken(
            user_id=current_user.id,
            token=req.token,
            platform=req.platform
        )
        db.add(new_token)
    
    db.commit()
    return {"success": True, "message": "Token registered"}


@router.post("/unregister-token")
def unregister_push_token(
    req: PushTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a push token"""
    token = db.query(PushToken).filter(
        PushToken.user_id == current_user.id,
        PushToken.token == req.token
    ).first()
    
    if token:
        token.is_active = False
        db.commit()
    
    return {"success": True, "message": "Token unregistered"}


# ============ Geofence Notifications ============

# Icelandic store locations
ICELANDIC_STORES = [
    {"name": "Bónus Laugavegur", "chain": "bonus", "lat": 64.1466, "lng": -21.9426},
    {"name": "Bónus Hallveigarstígur", "chain": "bonus", "lat": 64.1455, "lng": -21.9390},
    {"name": "Bónus Fiskislóð", "chain": "bonus", "lat": 64.1567, "lng": -21.9434},
    {"name": "Bónus Kópavogur", "chain": "bonus", "lat": 64.1123, "lng": -21.8901},
    {"name": "Krónan Borgartún", "chain": "kronan", "lat": 64.1442, "lng": -21.8853},
    {"name": "Krónan Grandi", "chain": "kronan", "lat": 64.1567, "lng": -21.9434},
    {"name": "Krónan Garðabær", "chain": "kronan", "lat": 64.0889, "lng": -21.9256},
    {"name": "Hagkaup Miklabær", "chain": "hagkaup", "lat": 64.1284, "lng": -21.8845},
    {"name": "Hagkaup Kringlan", "chain": "hagkaup", "lat": 64.1342, "lng": -21.8943},
    {"name": "Nettó Laugavegur", "chain": "netto", "lat": 64.1466, "lng": -21.9426},
    {"name": "Nettó Hamraborg", "chain": "netto", "lat": 64.0889, "lng": -21.9256},
    {"name": "Krambúðin Skeifan", "chain": "krambudin", "lat": 144.1442, "lng": -21.8853},
    {"name": "Samkaup Ströndin", "chain": "samkaup", "lat": 64.1567, "lng": -21.9434},
    {"name": "Víðir Borgartún", "chain": "vidir", "lat": 64.1442, "lng": -21.8853},
    {"name": "Aðalbjörn Hafnarfjörður", "chain": "adalbjorn", "lat": 64.0678, "lng": -21.9489},
    {"name": "Costco Garðabær", "chain": "costco", "lat": 64.0889, "lng": -21.9256},
]


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two coordinates"""
    import math
    
    # Convert to radians
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Earth radius in meters
    
    return c * r


@router.post("/check-geofence")
def check_geofence(
    req: GeofenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user is near any relevant stores and return notifications"""
    notifications = []
    
    # Find nearby stores (within 200m)
    nearby_stores = []
    for store in ICELANDIC_STORES:
        distance = calculate_distance(req.lat, req.lng, store["lat"], store["lng"])
        if distance < 200:  # 200 meters
            nearby_stores.append({**store, "distance": distance})
    
    if not nearby_stores:
        return {"notifications": []}
    
    # Find shopping-related claws
    shopping_claws = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "active"
    ).all()
    
    shopping_keywords = ["buy", "shop", "get", "purchase", "bonus", "kronan", 
                        "hagkaup", "groceries", "shopping", "store", "market"]
    
    relevant_claws = []
    for claw in shopping_claws:
        content_lower = claw.content.lower()
        if any(kw in content_lower for kw in shopping_keywords):
            relevant_claws.append(claw)
    
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
    current_user: User = Depends(get_current_user)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run all notification checks at once"""
    all_notifications = []
    
    # Geofence check
    if lat is not None and lng is not None:
        geofence_result = check_geofence(
            GeofenceRequest(lat=lat, lng=lng),
            db, current_user
        )
        all_notifications.extend(geofence_result.get("notifications", []))
    
    # Smart suggestions
    smart_result = get_smart_suggestions(db, current_user)
    all_notifications.extend(smart_result.get("notifications", []))
    
    return {"notifications": all_notifications}


# ============ Alarms ============

@router.post("/claw/{claw_id}/set-alarm")
def set_alarm(
    claw_id: str,
    req: AlarmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Set an alarm/reminder for a specific claw"""
    # Verify claw exists and belongs to user
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    # Create alarm
    alarm = Alarm(
        user_id=current_user.id,
        claw_id=claw_id,
        scheduled_time=req.scheduled_time,
        message=f"Reminder: {claw.content[:50]}..."
    )
    
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    
    return {
        "success": True,
        "alarm": {
            "id": alarm.id,
            "scheduled_time": alarm.scheduled_time.isoformat(),
            "message": alarm.message
        }
    }


@router.get("/my-alarms")
def get_my_alarms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending alarms for current user"""
    alarms = db.query(Alarm).filter(
        Alarm.user_id == current_user.id,
        Alarm.is_triggered == False,
        Alarm.scheduled_time > datetime.utcnow()
    ).order_by(Alarm.scheduled_time).all()
    
    return {
        "alarms": [
            {
                "id": a.id,
                "claw_id": a.claw_id,
                "scheduled_time": a.scheduled_time.isoformat(),
                "message": a.message
            }
            for a in alarms
        ]
    }


@router.delete("/alarm/{alarm_id}")
def delete_alarm(
    alarm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an alarm"""
    alarm = db.query(Alarm).filter(
        Alarm.id == alarm_id,
        Alarm.user_id == current_user.id
    ).first()
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    db.delete(alarm)
    db.commit()
    
    return {"success": True, "message": "Alarm cancelled"}


# ============ Calendar Integration ============

@router.post("/claw/{claw_id}/add-to-calendar")
def add_to_calendar(
    claw_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a claw to the user's calendar"""
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    # Create calendar event
    event = CalendarEvent(
        user_id=current_user.id,
        claw_id=claw_id,
        provider="local",
        event_date=claw.expires_at
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return {
        "success": True,
        "event": {
            "id": event.id,
            "claw_id": event.claw_id,
            "event_date": event.event_date.isoformat() if event.event_date else None
        }
    }
