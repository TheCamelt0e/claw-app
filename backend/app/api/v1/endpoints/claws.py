"""
Claw endpoints - Protected by JWT authentication
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from app.core.database import get_db
from app.core.config import VIP_EXPIRY_DAYS, HIGH_PRIORITY_EXPIRY_DAYS, DEFAULT_EXPIRY_DAYS, FREE_TIER_CLAW_LIMIT
from app.core.security import get_current_user, get_current_user_optional
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User
from app.services.categorization import categorize_content
from app.services.user_service import increment_claws_created, increment_claws_completed

router = APIRouter()


# Request/Response Models
class CaptureRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, description="The intention content to capture")
    content_type: str = Field(default="text", description="Type of content: text, voice")
    priority: bool = Field(default=False, description="Whether this is a VIP/priority item")
    priority_level: Optional[str] = Field(default=None, description="Priority level: high, medium, low")
    someday: bool = Field(default=False, description="If true, item goes to Someday pile (no expiry)")


class CaptureResponse(BaseModel):
    message: str
    claw: dict


class ExtendRequest(BaseModel):
    days: int = Field(..., ge=1, le=365, description="Number of days to extend")


class StrikeRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("/capture")
async def capture_claw(
    request: CaptureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Capture a new intention (claw)
    Requires authentication
    """
    content = request.content.strip()
    
    # Check limit for free tier
    active_count = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "active"
    ).count()
    
    claw_limit = current_user.get_claw_limit()
    if claw_limit > 0 and active_count >= claw_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Free tier limited to {FREE_TIER_CLAW_LIMIT} active claws. Upgrade to Pro!"
        )
    
    # AI categorization (simplified)
    ai_result = categorize_content(content)
    
    # Determine expiry
    expires_days = DEFAULT_EXPIRY_DAYS
    if request.someday:
        expires_days = 3650  # 10 years = effectively never
        ai_result["category"] = "someday"
    elif request.priority:
        expires_days = VIP_EXPIRY_DAYS
        if request.priority_level == "high":
            expires_days = HIGH_PRIORITY_EXPIRY_DAYS
    
    expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    # Create claw
    new_claw = Claw(
        user_id=current_user.id,
        content=content,
        content_type=request.content_type,
        title=ai_result["title"],
        category=ai_result["category"],
        action_type=ai_result["action_type"],
        app_trigger=ai_result["app_trigger"],
        expires_at=expires_at,
        is_priority=request.priority
    )
    new_claw.set_tags(ai_result["tags"])
    
    # Store priority/someday metadata
    if request.priority:
        new_claw.title = f"🔥 {new_claw.title}"
        tags = new_claw.get_tags()
        tags.append("vip" if request.priority_level == "high" else "priority")
        new_claw.set_tags(tags)
    elif request.someday:
        new_claw.title = f"🔮 {new_claw.title}"
        tags = new_claw.get_tags()
        tags.append("someday")
        new_claw.set_tags(tags)
    
    db.add(new_claw)
    db.commit()
    
    # Update user stats
    increment_claws_created(db, current_user)
    db.refresh(new_claw)
    
    return {
        "message": "Claw captured successfully!",
        "priority": request.priority,
        "priority_level": request.priority_level,
        "expires_in_days": expires_days,
        "claw": new_claw.to_dict()
    }


@router.get("/me")
async def get_my_claws(
    status: Optional[str] = Query("active"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's claws with pagination
    Requires authentication
    """
    # Build base query
    query = db.query(Claw).filter(Claw.user_id == current_user.id)
    
    # Apply status filter
    if status:
        query = query.filter(Claw.status == status)
    
    # Get total count for pagination
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    claws = query.order_by(Claw.created_at.desc()).offset(offset).limit(per_page).all()
    
    result = [claw.to_dict() for claw in claws]
    
    return {
        "items": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,  # Ceiling division
        "has_next": offset + len(result) < total,
        "has_prev": page > 1
    }


@router.get("/surface")
async def get_surface_claws(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    active_app: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get claws that should be surfaced based on current context
    """
    # Get active claws for this user only
    claws = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "active",
        Claw.expires_at > datetime.utcnow()
    ).all()
    
    # Simple scoring based on context
    scored_claws = []
    for claw in claws:
        score = 0.5  # Base score
        
        # Boost if app trigger matches
        if active_app and claw.app_trigger:
            if active_app.lower() in claw.app_trigger.lower():
                score = 1.0
        
        # Random slight variation for demo
        score += random.uniform(-0.1, 0.1)
        
        if score > 0.7:
            scored_claws.append((claw, score))
    
    # Sort by score
    scored_claws.sort(key=lambda x: x[1], reverse=True)
    
    # Update last_surfaced
    surfaced = []
    for claw, score in scored_claws[:3]:
        claw.last_surfaced_at = datetime.utcnow()
        claw.surface_count += 1
        surfaced.append(claw)
    
    db.commit()
    
    return [c.to_dict() for c in surfaced]


@router.post("/{claw_id}/strike")
async def strike_claw(
    claw_id: str,
    request: Optional[StrikeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a claw as completed - records pattern for smart resurfacing"""
    from app.services.pattern_analyzer import PatternAnalyzer
    
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    # Calculate resurface score BEFORE marking as completed
    resurface_score = None
    resurface_reason = None
    if request and request.lat and request.lng:
        score, reason = PatternAnalyzer.calculate_resurface_score(
            db=db,
            claw=claw,
            current_lat=request.lat,
            current_lng=request.lng,
            current_hour=datetime.utcnow().hour,
            current_dow=datetime.utcnow().weekday()
        )
        resurface_score = score
        resurface_reason = reason
    
    claw.status = "completed"
    claw.completed_at = datetime.utcnow()
    db.commit()
    
    # Record strike pattern for AI learning
    PatternAnalyzer.record_strike(
        db=db,
        user_id=current_user.id,
        claw_id=claw.id,
        category=claw.category,
        action_type=claw.action_type,
        captured_at=claw.created_at,
        lat=request.lat if request else None,
        lng=request.lng if request else None
    )
    
    # Update user stats
    increment_claws_completed(db, current_user)
    
    # Update strike streak (gamification)
    streak_info = current_user.update_streak()
    db.commit()
    
    return {
        "message": "STRIKE! Great job!",
        "claw_id": claw_id,
        "streak": streak_info,
        "resurface_score": resurface_score,
        "resurface_reason": resurface_reason,
        "oracle_moment": resurface_score and resurface_score > 0.7
    }


@router.post("/{claw_id}/release")
async def release_claw(
    claw_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Let a claw expire early"""
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    claw.status = "expired"
    db.commit()
    
    return {"message": "Claw released.", "claw_id": claw_id}


@router.post("/{claw_id}/extend")
async def extend_claw(
    claw_id: str,
    request: ExtendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extend a claw's expiration date"""
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    # Extend expiration
    current_expires = claw.expires_at or datetime.utcnow()
    claw.expires_at = current_expires + timedelta(days=request.days)
    
    db.commit()
    db.refresh(claw)
    
    return {
        "message": f"Extended by {request.days} days",
        "claw": claw.to_dict()
    }


@router.get("/demo-data")
async def create_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create sample claws for testing"""
    demo_claws = [
        "That book Sarah mentioned about atomic habits",
        "Try that new Italian restaurant downtown",
        "Buy batteries for the TV remote",
        "Watch that Netflix documentary about FTX",
        "Call mom about weekend plans",
        "Research standing desks for home office",
        "Order new running shoes",
        "Schedule dentist appointment",
    ]
    
    created = []
    for content in demo_claws:
        ai_result = categorize_content(content)
        claw = Claw(
            user_id=current_user.id,
            content=content,
            title=ai_result["title"],
            category=ai_result["category"],
            action_type=ai_result["action_type"],
            app_trigger=ai_result["app_trigger"]
        )
        claw.set_tags(ai_result["tags"])
        db.add(claw)
        created.append(content)
    
    current_user.total_claws_created += len(demo_claws)
    db.commit()
    
    return {
        "message": f"Created {len(created)} demo claws",
        "claws": created
    }
