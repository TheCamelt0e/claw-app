"""
Claw API endpoints - Core functionality for capturing and managing intentions
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.claw import Claw
from app.models.user import User
from app.schemas.claw import ClawCreate, ClawResponse, ClawUpdate, ClawListResponse
from app.services.ai_processor import ai_processor
from app.services.resurfacing import resurfacing_engine

router = APIRouter()


# Temp: Mock auth - replace with real JWT verification
async def get_current_user(db: Session = Depends(get_db)) -> User:
    """TODO: Implement real JWT auth"""
    # For now, return first user or create one
    user = db.query(User).first()
    if not user:
        user = User(email="demo@claw.app", display_name="Demo User")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/capture", response_model=ClawResponse)
async def capture_claw(
    claw_data: ClawCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Capture a new intention (claw)
    
    This is the main endpoint for creating a new claw.
    The content is processed by AI to extract categories, tags, and suggested triggers.
    """
    # Check user's claw limit
    active_count = db.query(Claw).filter(
        Claw.user_id == current_user.id,
        Claw.status == "active"
    ).count()
    
    claw_limit = current_user.get_claw_limit()
    if claw_limit != -1 and active_count >= claw_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Free tier limited to {claw_limit} active claws. Upgrade to Pro!"
        )
    
    # Create the claw
    new_claw = Claw(
        user_id=current_user.id,
        content=claw_data.content,
        content_type=claw_data.content_type,
        location_lat=claw_data.location_lat,
        location_lng=claw_data.location_lng,
        location_name=claw_data.location_name,
        time_context=claw_data.time_context,
        app_trigger=claw_data.app_trigger
    )
    
    db.add(new_claw)
    db.commit()
    db.refresh(new_claw)
    
    # Process with AI in background
    background_tasks.add_task(_process_claw_ai, new_claw.id, claw_data.content, db)
    
    # Update user stats
    current_user.total_claws_created += 1
    current_user.last_active_at = __import__('datetime').datetime.utcnow()
    db.commit()
    
    return new_claw


async def _process_claw_ai(claw_id: UUID, content: str, db: Session):
    """Background task to process claw with AI"""
    # Need fresh session for background task
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        claw = db.query(Claw).filter(Claw.id == claw_id).first()
        if claw:
            result = await ai_processor.process_claw(content)
            
            claw.title = result.get("title")
            claw.category = result.get("category")
            claw.tags = result.get("tags", [])
            claw.action_type = result.get("action_type")
            claw.time_context = result.get("time_context") or claw.time_context
            claw.app_trigger = result.get("app_suggestion") or claw.app_trigger
            
            # Auto-set urgency-based expiry
            if result.get("urgency") == "high":
                claw.expires_at = __import__('datetime').datetime.utcnow() + __import__('datetime').timedelta(days=3)
            
            db.commit()
    finally:
        db.close()


@router.get("/me", response_model=ClawListResponse)
async def get_my_claws(
    status: Optional[str] = Query("active", description="Filter by status: active, completed, expired, archived"),
    category: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's claws with optional filtering"""
    query = db.query(Claw).filter(Claw.user_id == current_user.id)
    
    if status:
        query = query.filter(Claw.status == status)
    if category:
        query = query.filter(Claw.category == category)
    
    total = query.count()
    claws = query.order_by(Claw.created_at.desc()).offset(offset).limit(limit).all()
    
    return ClawListResponse(
        items=claws,
        total=total,
        has_more=offset + limit < total
    )


@router.get("/surface", response_model=List[ClawResponse])
async def get_surface_claws(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    active_app: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get claws that should be surfaced based on current context
    
    Call this endpoint when:
    - User opens the app
    - User enters a location
    - User opens a specific app (Amazon, Netflix, etc.)
    """
    context = {
        "location": (lat, lng) if lat and lng else None,
        "active_app": active_app,
        "time": __import__('datetime').datetime.utcnow()
    }
    
    claws = await resurfacing_engine.check_and_resurface(
        str(current_user.id),
        context
    )
    
    return claws


@router.post("/{claw_id}/strike")
async def strike_claw(
    claw_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a claw as completed ("Strike it!")
    
    This is the satisfying action that completes the intention loop.
    """
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    claw.status = "completed"
    claw.completed_at = __import__('datetime').datetime.utcnow()
    
    current_user.total_claws_completed += 1
    db.commit()
    
    return {"message": "Claw struck! 🎯", "claw_id": claw_id}


@router.post("/{claw_id}/release")
async def release_claw(
    claw_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Let a claw expire early (release it back into the void)
    
    Not every intention deserves to live. This declutters without guilt.
    """
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    claw.status = "expired"
    db.commit()
    
    return {"message": "Claw released. 🕊️", "claw_id": claw_id}


@router.post("/{claw_id}/extend")
async def extend_claw(
    claw_id: UUID,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extend a claw's expiration date"""
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    from datetime import timedelta
    claw.expires_at = __import__('datetime').datetime.utcnow() + timedelta(days=days)
    db.commit()
    
    return {"message": f"Claw extended by {days} days", "new_expiry": claw.expires_at}


@router.get("/expiring", response_model=List[ClawResponse])
async def get_expiring_claws(
    hours: int = Query(24, description="Show claws expiring within N hours"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get claws that will expire soon - useful for daily digest"""
    claws = await resurfacing_engine.get_expiring_soon(
        str(current_user.id),
        hours=hours
    )
    return claws
