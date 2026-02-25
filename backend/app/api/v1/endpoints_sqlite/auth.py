"""
Simple authentication endpoints (SQLite version)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import sys
import os

# Import directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from core.database_sqlite import get_db

models_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'models')
sys.path.insert(0, models_dir)
from claw_sqlite import Claw
from user_sqlite import User

router = APIRouter()

# Simple token for testing
TEST_TOKEN = "test-token-12345"


@router.post("/register")
async def register(
    email: str,
    password: str,
    display_name: str = None,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=email,
        hashed_password=password,  # Plain text for testing only!
        display_name=display_name or email.split("@")[0]
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "email": new_user.email
    }


@router.post("/login")
async def login(email: str, password: str, db: Session = Depends(get_db)):
    """Simple login (for testing only)"""
    user = db.query(User).filter(User.email == email).first()
    
    if not user or user.hashed_password != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.last_active_at = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": TEST_TOKEN,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email
    }


@router.get("/me")
async def get_me(email: str = "demo@claw.app", db: Session = Depends(get_db)):
    """Get current user"""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        user = User(email=email, display_name="Test User")
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "subscription_tier": user.subscription_tier,
        "total_claws_created": user.total_claws_created,
        "total_claws_completed": user.total_claws_completed,
    }
