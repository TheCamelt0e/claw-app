"""
Debug endpoint to check VIP status
DEVELOPMENT ONLY - Removed in production
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User

router = APIRouter()


@router.get("/check-vip/{claw_id}")
async def check_vip(
    claw_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to check VIP status of user's claw"""
    # Only allow checking own claws
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == current_user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    tags = claw.get_tags()
    
    return {
        "id": claw.id,
        "title": claw.title,
        "tags": tags,
        "has_fire_emoji": "🔥" in (claw.title or ""),
        "has_vip_tag": "vip" in tags,
        "has_priority_tag": "priority" in tags,
        "is_vip": "vip" in tags or "priority" in tags or "🔥" in (claw.title or ""),
    }


@router.get("/my-claws")
async def list_my_claws(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List current user's claws with VIP status"""
    claws = db.query(Claw).filter(Claw.user_id == current_user.id).all()
    
    result = []
    for claw in claws:
        tags = claw.get_tags()
        result.append({
            "id": claw.id,
            "title": claw.title,
            "tags": tags,
            "is_vip": "vip" in tags or "priority" in tags or "🔥" in (claw.title or ""),
        })
    
    return {"claws": result}
