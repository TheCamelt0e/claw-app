"""
User endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User

router = APIRouter()


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get global stats"""
    total_users = db.query(User).count()
    total_claws = db.query(Claw).count()
    completed_claws = db.query(Claw).filter(Claw.status == "completed").count()
    
    return {
        "total_users": total_users,
        "total_claws": total_claws,
        "completed_claws": completed_claws,
        "completion_rate": round(completed_claws / total_claws * 100, 1) if total_claws > 0 else 0
    }
