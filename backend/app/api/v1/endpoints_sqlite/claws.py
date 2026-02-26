"""
Claw endpoints - SQLite version
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import sys
import os

# Import directly to avoid __init__.py conflicts
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from core.database_sqlite import get_db

# Import models directly (Claw first to avoid circular import)
models_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'models')
sys.path.insert(0, models_dir)
from claw_sqlite import Claw
from user_sqlite import User

router = APIRouter()

# Fallback AI categorization
def categorize_content(content: str) -> dict:
    """Simple keyword-based categorization"""
    content_lower = content.lower()
    
    # Detect category
    category = "other"
    if any(w in content_lower for w in ["book", "read", "author", "novel"]):
        category = "book"
    elif any(w in content_lower for w in ["movie", "watch", "film", "netflix"]):
        category = "movie"
    elif any(w in content_lower for w in ["restaurant", "eat", "food", "cafe", "pizza", "burger"]):
        category = "restaurant"
    elif any(w in content_lower for w in ["buy", "amazon", "purchase", "order", "shop"]):
        category = "product"
    elif any(w in content_lower for w in ["call", "text", "email", "remind", "schedule"]):
        category = "task"
    elif any(w in content_lower for w in ["idea", "thought", "concept"]):
        category = "idea"
    
    # Detect action
    action_type = "remember"
    if any(w in content_lower for w in ["buy", "purchase", "order", "shop"]):
        action_type = "buy"
    elif any(w in content_lower for w in ["read", "book"]):
        action_type = "read"
    elif any(w in content_lower for w in ["watch", "movie", "show", "series"]):
        action_type = "watch"
    elif any(w in content_lower for w in ["try", "visit", "go", "check out"]):
        action_type = "try"
    elif any(w in content_lower for w in ["call", "phone", "text"]):
        action_type = "call"
    
    # Generate title
    title = content[:60] + "..." if len(content) > 60 else content
    
    # Detect app trigger
    app_trigger = None
    if category == "book" or category == "product":
        app_trigger = "amazon"
    elif category == "movie":
        app_trigger = "netflix"
    elif category == "restaurant":
        app_trigger = "maps"
    
    return {
        "title": title,
        "category": category,
        "tags": [category, action_type],
        "action_type": action_type,
        "app_trigger": app_trigger
    }


def get_or_create_test_user(db: Session) -> User:
    """Get or create a test user"""
    user = db.query(User).first()
    if not user:
        user = User(email="demo@claw.app", display_name="Demo User")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/capture")
async def capture_claw(
    content: str,
    content_type: str = "text",
    priority: bool = False,
    priority_level: str = None,
    deadline: str = None,
    extra_reminders: bool = False,
    db: Session = Depends(get_db)
):
    """
    Capture a new intention (claw)
    """
    # DEBUG: Log received parameters
    print(f"[DEBUG] Capture called: content='{content[:30]}...', priority={priority}, priority_level={priority_level}")
    
    user = get_or_create_test_user(db)
    
    # Check limit
    active_count = db.query(Claw).filter(
        Claw.user_id == user.id,
        Claw.status == "active"
    ).count()
    
    if active_count >= 50 and user.subscription_tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Free tier limited to 50 active claws. Upgrade to Pro!"
        )
    
    # AI categorization (simplified)
    ai_result = categorize_content(content)
    
    # Handle VIP/Priority items - shorter expiry, extra reminders
    expires_days = 7  # Default 7 days
    if priority:
        expires_days = 3  # VIP items expire faster to create urgency
        if priority_level == "high":
            expires_days = 1  # High priority = 1 day
    
    expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    # Create claw
    new_claw = Claw(
        user_id=user.id,
        content=content,
        content_type=content_type,
        title=ai_result["title"],
        category=ai_result["category"],
        action_type=ai_result["action_type"],
        app_trigger=ai_result["app_trigger"],
        expires_at=expires_at
    )
    new_claw.set_tags(ai_result["tags"])
    
    # Store priority metadata in the claw (we'll add this to the model)
    # For now, add a [VIP] or [PRIORITY] prefix to the title
    if priority:
        new_claw.title = f"🔥 {new_claw.title}"
        # Add priority tag
        tags = new_claw.get_tags()
        tags.append("vip" if priority_level == "high" else "priority")
        new_claw.set_tags(tags)
    
    db.add(new_claw)
    
    # Update user stats
    user.total_claws_created += 1
    user.last_active_at = datetime.utcnow()
    
    db.commit()
    db.refresh(new_claw)
    
    # Ensure VIP indicators are set
    tags = new_claw.get_tags()
    print(f"[DEBUG] Before fix - tags: {tags}, priority: {priority}")
    
    if priority and "vip" not in tags and "priority" not in tags:
        tags.append("vip" if priority_level == "high" else "priority")
        new_claw.set_tags(tags)
        db.commit()
        print(f"[DEBUG] Added VIP tag: {tags}")
    
    # Refresh to get latest data
    db.refresh(new_claw)
    final_tags = new_claw.get_tags()
    is_vip = "vip" in final_tags or "priority" in final_tags or "🔥" in (new_claw.title or "")
    
    print(f"[DEBUG] Final - title: {new_claw.title}, tags: {final_tags}, is_vip: {is_vip}")
    
    return {
        "message": "Claw captured successfully!",
        "priority": priority,
        "priority_level": priority_level,
        "expires_in_days": expires_days,
        "claw": {
            "id": new_claw.id,
            "content": new_claw.content,
            "title": new_claw.title,
            "category": new_claw.category,
            "action_type": new_claw.action_type,
            "app_trigger": new_claw.app_trigger,
            "tags": final_tags,
            "status": new_claw.status,
            "expires_at": new_claw.expires_at.isoformat(),
            "is_vip": is_vip  # Calculate based on actual data
        }
    }


@router.get("/me")
async def get_my_claws(
    status: Optional[str] = Query("active"),
    db: Session = Depends(get_db)
):
    """Get current user's claws"""
    user = get_or_create_test_user(db)
    
    query = db.query(Claw).filter(Claw.user_id == user.id)
    
    if status:
        query = query.filter(Claw.status == status)
    
    claws = query.order_by(Claw.created_at.desc()).all()
    
    return {
        "items": [c.to_dict() for c in claws],
        "total": len(claws)
    }


@router.get("/surface")
async def get_surface_claws(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    active_app: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get claws that should be surfaced based on current context
    """
    user = get_or_create_test_user(db)
    
    # Get active claws
    claws = db.query(Claw).filter(
        Claw.user_id == user.id,
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
async def strike_claw(claw_id: str, db: Session = Depends(get_db)):
    """Mark a claw as completed"""
    user = get_or_create_test_user(db)
    
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    claw.status = "completed"
    claw.completed_at = datetime.utcnow()
    
    user.total_claws_completed += 1
    db.commit()
    
    return {"message": "STRIKE! Great job!", "claw_id": claw_id}


@router.post("/{claw_id}/release")
async def release_claw(claw_id: str, db: Session = Depends(get_db)):
    """Let a claw expire early"""
    user = get_or_create_test_user(db)
    
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    claw.status = "expired"
    db.commit()
    
    return {"message": "Claw released.", "claw_id": claw_id}


@router.get("/demo-data")
async def create_demo_data(db: Session = Depends(get_db)):
    """Create sample claws for testing"""
    user = get_or_create_test_user(db)
    
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
            user_id=user.id,
            content=content,
            title=ai_result["title"],
            category=ai_result["category"],
            action_type=ai_result["action_type"],
            app_trigger=ai_result["app_trigger"]
        )
        claw.set_tags(ai_result["tags"])
        db.add(claw)
        created.append(content)
    
    user.total_claws_created += len(demo_claws)
    db.commit()
    
    return {
        "message": f"Created {len(created)} demo claws",
        "claws": created
    }
