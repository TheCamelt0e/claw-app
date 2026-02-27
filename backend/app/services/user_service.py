"""
User service - centralized user management
"""
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user_sqlite import User


def get_or_create_test_user(db: Session, email: str = "demo@claw.app") -> User:
    """Get or create a test/demo user"""
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                display_name="Demo User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


def get_user_by_email(db: Session, email: str) -> User | None:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def update_user_activity(db: Session, user: User) -> None:
    """Update user's last active timestamp"""
    try:
        user.last_active_at = datetime.utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise


def increment_claws_created(db: Session, user: User, count: int = 1) -> None:
    """Increment user's claw creation counter"""
    try:
        user.total_claws_created += count
        db.commit()
    except Exception:
        db.rollback()
        raise


def increment_claws_completed(db: Session, user: User, count: int = 1) -> None:
    """Increment user's claw completion counter"""
    try:
        user.total_claws_completed += count
        db.commit()
    except Exception:
        db.rollback()
        raise
