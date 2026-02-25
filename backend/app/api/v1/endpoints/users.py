"""
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/stats")
async def get_user_stats(
    db: Session = Depends(get_db)
):
    """Get global user stats (for leaderboard/analytics)"""
    # TODO: Add auth check for admin
    total_users = db.query(User).count()
    total_claws = sum(u.total_claws_created for u in db.query(User).all())
    
    return {
        "total_users": total_users,
        "total_claws_captured": total_claws,
        "average_claws_per_user": total_claws / total_users if total_users > 0 else 0
    }
