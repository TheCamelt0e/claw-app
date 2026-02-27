"""
Debug endpoint to check VIP status
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.claw_sqlite import Claw

router = APIRouter()


@router.get("/check-vip/{claw_id}")
async def check_vip(claw_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to check VIP status of a claw"""
    claw = db.query(Claw).filter(Claw.id == claw_id).first()
    
    if not claw:
        return {"error": "Claw not found"}
    
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


@router.get("/list-all")
async def list_all_claws(db: Session = Depends(get_db)):
    """List all claws with VIP status"""
    claws = db.query(Claw).all()
    
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
