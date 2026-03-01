"""
Claw endpoints - Protected by JWT authentication - SECURITY HARDENED
"""
from typing import List, Optional
from enum import Enum
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import logging

from app.core.database import get_db
from app.core.config import VIP_EXPIRY_DAYS, HIGH_PRIORITY_EXPIRY_DAYS, DEFAULT_EXPIRY_DAYS, FREE_TIER_CLAW_LIMIT
from app.core.security import get_current_user, get_current_user_optional
from app.core.rate_limit_safe import safe_rate_limit
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User
from app.services.categorization import categorize_content
from app.services.user_service import increment_claws_created, increment_claws_completed

router = APIRouter()
logger = logging.getLogger(__name__)


# Enums for validation
class ClawStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    ARCHIVED = "archived"


class ContentType(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    PHOTO = "photo"


class PriorityLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Request/Response Models
class CaptureRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, description="The intention content to capture")
    content_type: ContentType = Field(default=ContentType.TEXT, description="Type of content")
    priority: bool = Field(default=False, description="Whether this is a VIP/priority item")
    priority_level: Optional[PriorityLevel] = Field(default=None, description="Priority level")
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
@safe_rate_limit(requests_per_minute=30)  # Prevent spam
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
    
    # Check limit for free tier (with user lock to prevent race conditions)
    # Lock the user row to prevent concurrent limit bypass
    from sqlalchemy import func
    from sqlalchemy.orm import with_for_update
    
    # Re-fetch user with lock
    user_locked = db.query(User).filter(
        User.id == current_user.id
    ).with_for_update().first()
    
    active_count = db.query(func.count(Claw.id)).filter(
        Claw.user_id == current_user.id,
        Claw.status == ClawStatus.ACTIVE
    ).scalar()
    
    claw_limit = user_locked.get_claw_limit()
    if claw_limit > 0 and active_count >= claw_limit:
        db.rollback()  # Release lock
        raise HTTPException(
            status_code=403,
            detail=f"Free tier limited to {FREE_TIER_CLAW_LIMIT} active claws. Upgrade to Pro!"
        )
    
    # ENFORCE: Only Pro users can create VIP items
    is_priority = request.priority
    priority_level = request.priority_level.value if request.priority_level else None
    
    if is_priority and not current_user.is_pro():
        logger.warning(f"Non-pro user {current_user.id} attempted VIP capture - downgrading to normal")
        is_priority = False
        priority_level = None
    
    # ENFORCE: Only Pro users can use HIGH priority
    if is_priority and priority_level == "high" and current_user.subscription_tier != "pro":
        logger.warning(f"Non-pro user {current_user.id} attempted HIGH priority - downgrading to medium")
        priority_level = "medium"
    
    # AI categorization
    ai_result = categorize_content(content)
    
    # Determine expiry
    expires_days = DEFAULT_EXPIRY_DAYS
    if request.someday:
        expires_days = 3650  # 10 years = effectively never
        ai_result["category"] = "someday"
    elif is_priority:
        expires_days = VIP_EXPIRY_DAYS
        if priority_level == "high":
            expires_days = HIGH_PRIORITY_EXPIRY_DAYS
    
    expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    # Create claw
    new_claw = Claw(
        user_id=current_user.id,
        content=content,
        content_type=request.content_type.value,
        title=ai_result["title"],
        category=ai_result["category"],
        action_type=ai_result["action_type"],
        app_trigger=ai_result["app_trigger"],
        expires_at=expires_at,
        is_priority=is_priority
    )
    new_claw.set_tags(ai_result["tags"])
    
    # Store priority/someday metadata
    if is_priority:
        new_claw.title = f"🔥 {new_claw.title}"
        tags = new_claw.get_tags()
        tags.append("vip" if priority_level == "high" else "priority")
        new_claw.set_tags(tags)
    elif request.someday:
        new_claw.title = f"🔮 {new_claw.title}"
        tags = new_claw.get_tags()
        tags.append("someday")
        new_claw.set_tags(tags)
    
    try:
        db.add(new_claw)
        db.flush()  # Get the ID without committing
        
        # Update user stats
        increment_claws_created(db, current_user)
        db.refresh(new_claw)
        db.commit()
        
        return {
            "message": "Claw captured successfully!",
            "priority": is_priority,
            "priority_level": priority_level,
            "expires_in_days": expires_days,
            "claw": new_claw.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to capture claw: {e}")
        raise HTTPException(status_code=500, detail="Failed to capture claw")


@router.get("/me")
async def get_my_claws(
    status: Optional[ClawStatus] = Query(ClawStatus.ACTIVE),  # Use enum for validation
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
        query = query.filter(Claw.status == status.value)
    
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
        "pages": (total + per_page - 1) // per_page,
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
    # Validate coordinates if provided
    if (lat is not None and lng is None) or (lat is None and lng is not None):
        raise HTTPException(status_code=400, detail="Both lat and lng must be provided together")
    
    if lat is not None and not (-90 <= lat <= 90):
        raise HTTPException(status_code=400, detail="Invalid latitude")
    
    if lng is not None and not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid longitude")
    
    # Get active claws for this user only
    claws = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == ClawStatus.ACTIVE,
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
    
    # Update last_surfaced (limit to top 3)
    surfaced = []
    for claw, score in scored_claws[:3]:
        claw.last_surfaced_at = datetime.utcnow()
        claw.surface_count += 1
        surfaced.append(claw)
    
    db.commit()
    
    return [c.to_dict() for c in surfaced]


@router.post("/{claw_id}/strike")
@safe_rate_limit(requests_per_minute=60)  # Prevent strike spam
async def strike_claw(
    claw_id: str,
    request: Optional[StrikeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a claw as completed - records pattern for smart resurfacing"""
    from app.services.pattern_analyzer import PatternAnalyzer
    
    # Get claw with ownership check
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    # AUTHORIZATION: Check if already completed
    if claw.status == ClawStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Claw already completed")
    
    # AUTHORIZATION: Allow striking expired but warn
    if claw.status == ClawStatus.EXPIRED:
        logger.info(f"User {current_user.id} striking expired claw {claw_id}")
    
    # Calculate resurface score BEFORE marking as completed
    resurface_score = None
    resurface_reason = None
    if request and request.lat is not None and request.lng is not None:
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
    
    try:
        # Mark as completed
        claw.status = ClawStatus.COMPLETED
        claw.completed_at = datetime.utcnow()
        
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
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to strike claw: {e}")
        raise HTTPException(status_code=500, detail="Failed to strike claw")


@router.post("/{claw_id}/release")
@safe_rate_limit(requests_per_minute=30)
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
    
    # AUTHORIZATION: Only active claws can be released
    if claw.status != ClawStatus.ACTIVE:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot release claw with status: {claw.status}"
        )
    
    # AUTHORIZATION: Warn about releasing VIP items
    if claw.is_vip():
        logger.warning(f"User {current_user.id} releasing VIP claw: {claw_id}")
    
    try:
        claw.status = ClawStatus.EXPIRED
        claw.expires_at = datetime.utcnow()  # Mark as expired now
        db.commit()
        
        return {"message": "Claw released.", "claw_id": claw_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to release claw: {e}")
        raise HTTPException(status_code=500, detail="Failed to release claw")


@router.post("/{claw_id}/extend")
@safe_rate_limit(requests_per_minute=30)
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
    
    # AUTHORIZATION: Only active claws can be extended
    if claw.status != ClawStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot extend claw with status: {claw.status}"
        )
    
    try:
        # Extend expiration
        current_expires = claw.expires_at or datetime.utcnow()
        claw.expires_at = current_expires + timedelta(days=request.days)
        
        db.commit()
        db.refresh(claw)
        
        return {
            "message": f"Extended by {request.days} days",
            "claw": claw.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to extend claw: {e}")
        raise HTTPException(status_code=500, detail="Failed to extend claw")


@router.post("/demo-data")
@safe_rate_limit(requests_per_minute=1)  # Very strict rate limit
async def create_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create sample claws for testing - rate limited to prevent abuse"""
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
    
    created_claws = []
    try:
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
            created_claws.append(claw)
        
        current_user.total_claws_created += len(demo_claws)
        db.commit()
        
        # Return actual claw objects instead of just strings
        return {
            "message": f"Created {len(created_claws)} demo claws",
            "claws": [c.to_dict() for c in created_claws]
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create demo data: {e}")
        raise HTTPException(status_code=500, detail="Failed to create demo data")
