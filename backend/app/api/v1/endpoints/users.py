"""
User endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
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


# ============ STREAK SYSTEM 2.0 ============

class PlaceBetRequest(BaseModel):
    target_strikes: int = Field(..., ge=3, le=50, description="Number of strikes to achieve")
    days: int = Field(..., ge=3, le=14, description="Days to complete the challenge")


@router.get("/streak-status")
async def get_streak_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full streak status including freezes, recovery, and active bet
    """
    return current_user.get_streak_status()


@router.post("/use-freeze")
async def use_streak_freeze(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Use a streak freeze to maintain current streak
    Resets monthly (1 free freeze per month)
    """
    success = current_user.use_streak_freeze()
    
    if not success:
        raise HTTPException(status_code=400, detail="No streak freezes available")
    
    try:
        db.commit()
        return {
            "success": True,
            "message": "Streak freeze activated! Your streak is safe for today.",
            "freezes_remaining": current_user._get_available_freezes()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to use streak freeze")


@router.post("/use-recovery")
async def use_streak_recovery(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Use the one-time streak recovery (restore broken streak)
    Only available once per user, restores up to 7 days
    """
    success = current_user.use_streak_recovery()
    
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="Streak recovery not available (already used or no streak history)"
        )
    
    try:
        db.commit()
        return {
            "success": True,
            "message": f"Streak recovered! Current streak: {current_user.current_streak_days} days",
            "current_streak": current_user.current_streak_days,
            "recovery_used": True
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to use streak recovery")


@router.post("/place-bet")
async def place_streak_bet(
    request: PlaceBetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Place a bet on achieving X strikes in Y days
    Rewards based on difficulty
    """
    # Check if user already has an active bet
    if current_user.active_streak_bet:
        raise HTTPException(status_code=400, detail="You already have an active bet")
    
    # Validate target is achievable
    if request.target_strikes > request.days * 3:  # Max 3 strikes per day
        raise HTTPException(status_code=400, detail="Target too high for timeframe")
    
    bet = current_user.place_streak_bet(request.target_strikes, request.days)
    
    try:
        db.commit()
        return {
            "success": True,
            "message": f"Bet placed! Strike {request.target_strikes} items in {request.days} days",
            "bet": bet
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to place bet")


@router.post("/cancel-bet")
async def cancel_streak_bet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel active streak bet (forfeits any progress)
    """
    if not current_user.active_streak_bet:
        raise HTTPException(status_code=400, detail="No active bet to cancel")
    
    current_user.active_streak_bet = None
    
    try:
        db.commit()
        return {
            "success": True,
            "message": "Bet cancelled"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to cancel bet")
