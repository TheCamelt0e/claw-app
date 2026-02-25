"""
User endpoints - SQLite version
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from core.database_sqlite import get_db

models_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'models')
sys.path.insert(0, models_dir)
from claw_sqlite import Claw
from user_sqlite import User

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
