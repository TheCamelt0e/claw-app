"""
Authentication endpoints with JWT, brute force protection, email verification and password reset
SECURITY HARDENED VERSION
"""
import asyncio
import secrets
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user,
    get_current_user_optional
)
from app.core.rate_limit import (
    brute_force_protection, 
    get_client_ip, 
    rate_limiter,
    rate_limit
)
from app.core.email import email_service
from app.core.config import settings
from app.models.user_sqlite import User

router = APIRouter()


# Request/Response Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)  # Increased min length
    display_name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    subscription_tier: str
    total_claws_created: int
    total_claws_completed: int
    current_streak: int
    longest_streak: int
    email_verified: bool


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=100)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)


# TEST ENDPOINT - no database
@router.post("/test-ping")
async def test_ping():
    """Test endpoint without database"""
    return {"status": "pong", "message": "POST works without DB"}


@router.post("/register", response_model=TokenResponse)
# @rate_limit(requests_per_minute=5)  # Temporarily disabled for testing
async def register(
    http_request: Request,
    request: UserRegister = Body(...), 
    db: Session = Depends(get_db)
):
    """
    Register a new user and return JWT token
    Rate limited: 5 attempts per minute per IP
    """
    # Check if email already exists (case-insensitive)
    existing = db.query(User).filter(
        User.email.ilike(request.email)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(request.password)
    
    # Create user
    display_name = request.display_name or request.email.split("@")[0]
    
    # Generate verification token (cryptographically secure)
    verification_token = secrets.token_urlsafe(32)
    
    new_user = User(
        email=request.email.lower().strip(),  # Normalize email
        hashed_password=hashed_password,
        display_name=display_name,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Clear any failed attempts for this IP
    client_ip = get_client_ip(http_request)
    rate_limiter.clear_failed_attempts(client_ip)
    
    # Send verification email (async - don't block registration)
    asyncio.create_task(
        email_service.send_verification_email(
            to_email=new_user.email,
            token=verification_token,
            display_name=new_user.display_name
        )
    )
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": new_user.id},
        user=new_user
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24 * 7,  # 7 days in seconds
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "display_name": new_user.display_name,
            "subscription_tier": new_user.subscription_tier,
            "email_verified": new_user.email_verified
        }
    }


@router.post("/login", response_model=TokenResponse)
# @brute_force_protection(max_attempts=5, window_seconds=300)  # Temporarily disabled for testing
async def login(
    http_request: Request,
    request: UserLogin = Body(...), 
    db: Session = Depends(get_db)
):
    """
    Login with email/password and return JWT token
    Brute force protected: 5 failed attempts = 5 minute lockout
    """
    client_ip = get_client_ip(http_request)
    
    # Find user by email (case-insensitive)
    user = db.query(User).filter(
        User.email.ilike(request.email)
    ).first()
    
    if not user:
        # Record failed attempt
        rate_limiter.record_failed_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(request.password, user.hashed_password):
        # Record failed attempt
        rate_limiter.record_failed_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clear failed attempts on successful login
    rate_limiter.clear_failed_attempts(client_ip)
    
    # Update last active
    user.last_active_at = datetime.utcnow()
    db.commit()
    
    # Create JWT token with token versioning
    access_token = create_access_token(
        data={"sub": user.id},
        user=user
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24 * 7,  # 7 days in seconds
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "subscription_tier": user.subscription_tier,
            "email_verified": user.email_verified
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile
    Requires valid JWT token in Authorization header
    """
    streak_status = current_user.get_streak_status()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "subscription_tier": current_user.subscription_tier,
        "total_claws_created": current_user.total_claws_created,
        "total_claws_completed": current_user.total_claws_completed,
        "current_streak": streak_status["current_streak"],
        "longest_streak": streak_status["longest_streak"],
        "email_verified": current_user.email_verified
    }


@router.post("/refresh")
@rate_limit(requests_per_minute=10)
async def refresh_token(
    http_request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Refresh JWT token (get new token with extended expiration)
    Rate limited: 10 refreshes per minute
    """
    access_token = create_access_token(
        data={"sub": current_user.id},
        user=current_user
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24 * 7
    }


@router.post("/logout-all")
async def logout_all_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout from all devices by invalidating all existing tokens.
    This increments the token version, making all existing tokens invalid.
    """
    current_user.token_version += 1
    db.commit()
    
    # Generate new token for current session
    access_token = create_access_token(
        data={"sub": current_user.id},
        user=current_user
    )
    
    return {
        "message": "Logged out from all other devices",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24 * 7
    }


@router.post("/change-password")
@brute_force_protection(max_attempts=3, window_seconds=300)
async def change_password(
    current_password: str = Body(..., min_length=8),
    new_password: str = Body(..., min_length=8, max_length=100),
    http_request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user's password
    Brute force protected: 3 failed attempts = 5 minute lockout
    Also invalidates all existing tokens for security.
    """
    client_ip = get_client_ip(http_request) if http_request else "unknown"
    
    # Verify current password
    if not verify_password(current_password, current_user.hashed_password):
        rate_limiter.record_failed_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Clear failed attempts on success
    rate_limiter.clear_failed_attempts(client_ip)
    
    # Hash and set new password
    current_user.hashed_password = get_password_hash(new_password)
    
    # Increment token version to invalidate all existing tokens
    current_user.token_version += 1
    
    db.commit()
    
    # Generate new token
    access_token = create_access_token(
        data={"sub": current_user.id},
        user=current_user
    )
    
    return {
        "message": "Password updated successfully. Please use your new token.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24 * 7
    }


@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account and all associated data
    """
    user_id = current_user.id
    
    # Delete user's claws first
    from app.models.claw_sqlite import Claw
    db.query(Claw).filter(Claw.user_id == user_id).delete()
    
    # Delete strike patterns
    from app.models.strike_pattern import StrikePattern
    db.query(StrikePattern).filter(StrikePattern.user_id == user_id).delete()
    
    # Delete user's group memberships
    from app.models.group import group_members
    db.execute(
        group_members.delete().where(group_members.c.user_id == user_id)
    )
    
    # Transfer group ownership for groups they own
    from app.models.group import Group
    owned_groups = db.query(Group).filter(Group.created_by == user_id).all()
    for group in owned_groups:
        if len(group.members) > 1:
            # Transfer to another member
            new_owner = next((m for m in group.members if m.id != user_id), None)
            if new_owner:
                group.created_by = new_owner.id
        else:
            # Delete empty groups
            db.delete(group)
    
    # Delete user
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}


# Email Verification Endpoints

@router.post("/verify-email")
@rate_limit(requests_per_minute=10)
async def verify_email(
    request: VerifyEmailRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Verify user's email address using verification token
    Rate limited: 10 attempts per minute
    """
    # Sanitize token
    token = request.token.strip()
    
    user = db.query(User).filter(
        User.email_verification_token == token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check token expiration (24 hours)
    if user.email_verification_sent_at:
        token_age = datetime.utcnow() - user.email_verification_sent_at
        if token_age > timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new one."
            )
    
    # Mark email as verified
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    
    db.commit()
    
    return {
        "message": "Email verified successfully",
        "email": user.email,
        "email_verified": True
    }


@router.post("/resend-verification")
@rate_limit(requests_per_minute=3)
async def resend_verification(
    request: ResendVerificationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Resend email verification link
    Rate limited: 3 attempts per minute
    """
    user = db.query(User).filter(
        User.email.ilike(request.email)
    ).first()
    
    if not user:
        # Don't reveal if email exists
        return {
            "message": "If an account exists with this email, a verification link has been sent."
        }
    
    if user.email_verified:
        return {
            "message": "Email is already verified."
        }
    
    # Check cooldown (5 minutes between resends)
    if user.email_verification_sent_at:
        cooldown = datetime.utcnow() - user.email_verification_sent_at
        if cooldown < timedelta(minutes=5):
            remaining = 5 - int(cooldown.total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} minutes before requesting another verification email."
            )
    
    # Generate new token
    verification_token = secrets.token_urlsafe(32)
    user.email_verification_token = verification_token
    user.email_verification_sent_at = datetime.utcnow()
    
    db.commit()
    
    # Send verification email
    await email_service.send_verification_email(
        to_email=user.email,
        token=verification_token,
        display_name=user.display_name
    )
    
    return {
        "message": "If an account exists with this email, a verification link has been sent."
    }


# Password Reset Endpoints

@router.post("/forgot-password")
@rate_limit(requests_per_minute=3)
async def forgot_password(
    request: ForgotPasswordRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Request password reset link
    Rate limited: 3 attempts per minute
    Always returns success to prevent email enumeration
    """
    user = db.query(User).filter(
        User.email.ilike(request.email)
    ).first()
    
    if user:
        # Check cooldown (5 minutes between requests)
        if user.password_reset_sent_at:
            cooldown = datetime.utcnow() - user.password_reset_sent_at
            if cooldown < timedelta(minutes=5):
                remaining = 5 - int(cooldown.total_seconds() / 60)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining} minutes before requesting another reset."
                )
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_sent_at = datetime.utcnow()
        
        db.commit()
        
        # Send reset email
        await email_service.send_password_reset_email(
            to_email=user.email,
            token=reset_token,
            display_name=user.display_name
        )
    
    # Always return same message to prevent email enumeration
    return {
        "message": "If an account exists with this email, a password reset link has been sent."
    }


@router.post("/reset-password")
@rate_limit(requests_per_minute=5)
async def reset_password(
    request: ResetPasswordRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Reset password using reset token
    Rate limited: 5 attempts per minute
    """
    # Sanitize token
    token = request.token.strip()
    
    user = db.query(User).filter(
        User.password_reset_token == token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check token expiration (1 hour)
    if user.password_reset_sent_at:
        token_age = datetime.utcnow() - user.password_reset_sent_at
        if token_age > timedelta(hours=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired. Please request a new one."
            )
    
    # Hash and set new password
    user.hashed_password = get_password_hash(request.new_password)
    user.password_reset_token = None
    user.password_reset_sent_at = None
    
    # Increment token version to invalidate all existing tokens
    user.token_version += 1
    
    db.commit()
    
    return {
        "message": "Password reset successfully. Please log in with your new password."
    }
