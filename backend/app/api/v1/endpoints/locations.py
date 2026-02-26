"""
Location API endpoints - Find nearby stores and track patterns
"""
from typing import List, Optional
from math import radians, cos, sin, asin, sqrt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.location import Location, UserLocationPattern, UserTimePattern
from app.models.user import User
from app.schemas.location import LocationResponse, NearbyLocationRequest, PatternUpdateRequest
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two lat/lon points"""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Earth radius in meters
    return c * r


@router.get("/icelandic-stores", response_model=List[LocationResponse])
async def get_icelandic_stores(
    chain: Optional[str] = Query(None, description="Filter by chain: bonus, kronan, hagkaup, etc."),
    category: Optional[str] = Query(None, description="Filter by category: grocery, restaurant, etc."),
    db: Session = Depends(get_db)
):
    """Get all Icelandic stores (Bónus, Krónan, etc.)"""
    query = db.query(Location).filter(Location.country_code == "IS", Location.is_active == True)
    
    if chain:
        query = query.filter(Location.chain == chain.lower())
    if category:
        query = query.filter(Location.category == category.lower())
    
    stores = query.all()
    return [store.to_dict() for store in stores]


@router.post("/nearby", response_model=List[dict])
async def find_nearby_stores(
    request: NearbyLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Find stores near user's current location"""
    
    # Get all active stores
    stores = db.query(Location).filter(
        Location.country_code == "IS",
        Location.is_active == True
    ).all()
    
    # Calculate distance and filter
    nearby = []
    for store in stores:
        distance = haversine_distance(
            request.lat, request.lng,
            store.latitude, store.longitude
        )
        
        if distance <= request.radius_meters:
            store_data = store.to_dict()
            store_data["distance_meters"] = round(distance)
            nearby.append(store_data)
    
    # Sort by distance
    nearby.sort(key=lambda x: x["distance_meters"])
    
    # Log this location visit for AI learning
    if nearby and current_user:
        await _log_location_visit(current_user.id, nearby[0], db)
    
    return nearby


@router.get("/search")
async def search_locations(
    q: str = Query(..., description="Search term: 'bonus', 'kaffitar', etc."),
    db: Session = Depends(get_db)
):
    """Search for locations by name or chain"""
    search_term = f"%{q.lower()}%"
    
    stores = db.query(Location).filter(
        Location.is_active == True,
        (
            Location.name.ilike(search_term) |
            Location.chain.ilike(search_term) |
            Location.category.ilike(search_term)
        )
    ).all()
    
    return [store.to_dict() for store in stores]


@router.get("/chains")
async def get_available_chains(db: Session = Depends(get_db)):
    """Get list of all available store chains"""
    chains = db.query(Location.chain, Location.category).filter(
        Location.country_code == "IS",
        Location.is_active == True
    ).distinct().all()
    
    result = {}
    for chain, category in chains:
        if category not in result:
            result[category] = []
        result[category].append(chain)
    
    return result


@router.get("/my-patterns")
async def get_my_patterns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's learned patterns (when/where they typically do things)"""
    
    # Location patterns
    location_patterns = db.query(UserLocationPattern).filter(
        UserLocationPattern.user_id == current_user.id
    ).order_by(UserLocationPattern.visit_count.desc()).all()
    
    # Time patterns
    time_patterns = db.query(UserTimePattern).filter(
        UserTimePattern.user_id == current_user.id
    ).order_by(UserTimePattern.confidence.desc()).all()
    
    return {
        "location_patterns": [p.to_dict() for p in location_patterns],
        "time_patterns": [{
            "id": str(p.id),
            "category": p.category,
            "action_type": p.action_type,
            "preferred_hour_start": p.preferred_hour_start,
            "preferred_hour_end": p.preferred_hour_end,
            "preferred_days": p.preferred_days,
            "confidence": p.confidence,
        } for p in time_patterns]
    }


@router.post("/patterns/log-strike")
async def log_strike_pattern(
    request: PatternUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log when user strikes a claw - for AI learning"""
    
    from datetime import datetime
    
    now = datetime.utcnow()
    current_hour = now.hour
    current_day = now.weekday()
    
    # Update or create time pattern
    pattern = db.query(UserTimePattern).filter(
        UserTimePattern.user_id == current_user.id,
        UserTimePattern.category == request.category,
        UserTimePattern.action_type == request.action_type
    ).first()
    
    if pattern:
        # Update existing pattern
        pattern.strike_count += 1
        
        # Adjust preferred hours (running average)
        if pattern.preferred_hour_start is None:
            pattern.preferred_hour_start = current_hour
            pattern.preferred_hour_end = current_hour
        else:
            # Slowly adjust towards actual time
            pattern.preferred_hour_start = int(
                0.8 * pattern.preferred_hour_start + 0.2 * current_hour
            )
            pattern.preferred_hour_end = int(
                0.8 * pattern.preferred_hour_end + 0.2 * current_hour
            )
        
        pattern.confidence = min(1.0, pattern.confidence + 0.05)
        pattern.updated_at = now
    else:
        # Create new pattern
        pattern = UserTimePattern(
            user_id=current_user.id,
            category=request.category,
            action_type=request.action_type,
            preferred_hour_start=current_hour,
            preferred_hour_end=current_hour,
            preferred_days=str(current_day),
            confidence=0.5,
            strike_count=1
        )
        db.add(pattern)
    
    db.commit()
    return {"status": "logged", "confidence": pattern.confidence}


@router.post("/check-geofence")
async def check_geofence(
    lat: float,
    lng: float,
    claw_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user entered a relevant geofence for their claws"""
    
    from app.models.claw import Claw
    
    # Get active claws with location triggers
    claws = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "active",
        Claw.location_lat.isnot(None),
        Claw.location_lng.isnot(None)
    ).all()
    
    triggered = []
    for claw in claws:
        distance = haversine_distance(
            lat, lng,
            claw.location_lat, claw.location_lng
        )
        
        if distance <= claw.location_radius_meters:
            triggered.append({
                "claw_id": str(claw.id),
                "title": claw.title or claw.content,
                "distance_meters": round(distance),
                "location_name": claw.location_name
            })
    
    return {
        "triggered_claws": triggered,
        "user_location": {"lat": lat, "lng": lng}
    }


# Helper function
async def _log_location_visit(user_id, store_data: dict, db: Session):
    """Log a location visit for AI pattern learning"""
    from datetime import datetime
    
    now = datetime.utcnow()
    
    pattern = db.query(UserLocationPattern).filter(
        UserLocationPattern.user_id == user_id,
        UserLocationPattern.location_chain == store_data["chain"],
        UserLocationPattern.category == store_data["category"]
    ).first()
    
    if pattern:
        pattern.visit_count += 1
        pattern.last_visit_at = now
        
        # Update average visit time
        current_hour = now.hour + now.minute / 60
        current_day = now.weekday()
        
        if pattern.avg_visit_hour is None:
            pattern.avg_visit_hour = current_hour
            pattern.avg_visit_day = current_day
        else:
            # Running average
            pattern.avg_visit_hour = (
                0.8 * pattern.avg_visit_hour + 0.2 * current_hour
            )
            pattern.avg_visit_day = (
                0.8 * pattern.avg_visit_day + 0.2 * current_day
            )
    else:
        pattern = UserLocationPattern(
            user_id=user_id,
            location_chain=store_data["chain"],
            category=store_data["category"],
            visit_count=1,
            avg_visit_hour=now.hour + now.minute / 60,
            avg_visit_day=now.weekday(),
            last_visit_at=now
        )
        db.add(pattern)
    
    db.commit()
