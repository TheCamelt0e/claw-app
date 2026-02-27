"""
Groups API - Shared Lists for Families - SECURITY HARDENED

This is the Pro tier feature ($2.99/mo).
Allows partners/families to share grocery lists.
"""
from typing import List, Optional
from enum import Enum
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limit import rate_limit
from app.models.group import Group, GroupClaw, group_members
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User

router = APIRouter()
logger = logging.getLogger(__name__)


# Enums
class GroupType(str, Enum):
    FAMILY = "family"
    COUPLE = "couple"
    ROOMMATES = "roommates"
    OTHER = "other"


class GroupStatus(str, Enum):
    ACTIVE = "active"
    CLAIMED = "claimed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Request/Response Models
class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    group_type: GroupType = Field(default=GroupType.FAMILY)


class AddMemberRequest(BaseModel):
    email: str = Field(..., description="Email of user to invite")


class CaptureToGroupRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    content_type: str = Field(default="text")


@router.post("/create")
@rate_limit(requests_per_minute=10)
async def create_group(
    request: CreateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new group (Pro feature)"""
    # Check if user is Pro (free users limited to 1 group)
    user_groups = db.query(Group).join(Group.members).filter(User.id == current_user.id).count()
    if user_groups >= 1 and not current_user.is_pro():
        raise HTTPException(
            status_code=403,
            detail="Free users can only create 1 group. Upgrade to Pro for unlimited groups!"
        )
    
    try:
        # Create group
        group = Group(
            name=request.name,
            description=request.description,
            group_type=request.group_type.value,
            created_by=current_user.id
        )
        group.members.append(current_user)
        
        db.add(group)
        db.commit()
        db.refresh(group)
        
        return {
            "message": "Group created successfully!",
            "group": group.to_dict(include_members=True)
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create group: {e}")
        raise HTTPException(status_code=500, detail="Failed to create group")


@router.get("/my")
async def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all groups the current user is a member of"""
    # Use eager loading to avoid N+1 query problem
    groups = db.query(Group).options(
        joinedload(Group.members)
    ).join(Group.members).filter(User.id == current_user.id).all()
    
    return {
        "groups": [g.to_dict(include_members=True) for g in groups]
    }


@router.get("/{group_id}")
async def get_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group details with items"""
    # Use eager loading for members
    group = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member
    if current_user.id not in [m.id for m in group.members]:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get active items with eager loading
    active_items = db.query(GroupClaw, Claw).join(Claw).filter(
        GroupClaw.group_id == group_id,
        GroupClaw.status.in_([GroupStatus.ACTIVE.value, GroupStatus.CLAIMED.value])
    ).order_by(GroupClaw.created_at.desc()).all()
    
    # Build items using list comprehension
    items = [
        {
            **claw.to_dict(),
            'group_claw_id': group_claw.id,
            'status': group_claw.status,
            'claimed_by': group_claw.claimed_by,
            'captured_by': group_claw.captured_by,
        }
        for group_claw, claw in active_items
    ]
    
    return {
        "group": group.to_dict(include_members=True),
        "items": items
    }


@router.post("/{group_id}/capture")
@rate_limit(requests_per_minute=20)
async def capture_to_group(
    group_id: str,
    request: CaptureToGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Capture an item directly to a group"""
    # Use eager loading
    group = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check membership
    if current_user.id not in [m.id for m in group.members]:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    try:
        # Create the claw
        from app.services.categorization import categorize_content
        ai_result = categorize_content(request.content)
        
        claw = Claw(
            user_id=current_user.id,
            content=request.content,
            content_type=request.content_type,
            title=ai_result["title"],
            category=ai_result["category"],
            action_type=ai_result["action_type"],
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        claw.set_tags(ai_result["tags"])
        
        db.add(claw)
        db.flush()  # Get claw ID
        
        # Link to group
        group_claw = GroupClaw(
            group_id=group_id,
            claw_id=claw.id,
            captured_by=current_user.id,
            status=GroupStatus.ACTIVE.value
        )
        
        db.add(group_claw)
        db.commit()
        db.refresh(claw)
        db.refresh(group_claw)
        
        return {
            "message": "Item captured to group!",
            "claw": claw.to_dict(),
            "group_claw": group_claw.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to capture to group: {e}")
        raise HTTPException(status_code=500, detail="Failed to capture item")


@router.post("/{group_id}/items/{group_claw_id}/claim")
@rate_limit(requests_per_minute=30)
async def claim_group_item(
    group_id: str,
    group_claw_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Claim an item (\"I got this\") - prevents double-buying"""
    group = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user.id not in [m.id for m in group.members]:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group_claw = db.query(GroupClaw).filter(
        GroupClaw.id == group_claw_id,
        GroupClaw.group_id == group_id
    ).first()
    
    if not group_claw:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if already claimed by someone else
    if group_claw.status == GroupStatus.CLAIMED.value and group_claw.claimed_by != current_user.id:
        claimed_by_user = db.query(User).filter(User.id == group_claw.claimed_by).first()
        raise HTTPException(
            status_code=400, 
            detail=f"Already claimed by {claimed_by_user.display_name if claimed_by_user else 'someone else'}"
        )
    
    # Check if already completed
    if group_claw.status == GroupStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Item already completed")
    
    try:
        # Claim it
        group_claw.status = GroupStatus.CLAIMED.value
        group_claw.claimed_by = current_user.id
        group_claw.claimed_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "message": "Item claimed! Others will see you got this.",
            "group_claw": group_claw.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to claim item: {e}")
        raise HTTPException(status_code=500, detail="Failed to claim item")


@router.post("/{group_id}/items/{group_claw_id}/strike")
@rate_limit(requests_per_minute=30)
async def strike_group_item(
    group_id: str,
    group_claw_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Strike (complete) a group item"""
    group = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user.id not in [m.id for m in group.members]:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group_claw = db.query(GroupClaw).filter(
        GroupClaw.id == group_claw_id,
        GroupClaw.group_id == group_id
    ).first()
    
    if not group_claw:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if group_claw.status == GroupStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Already completed")
    
    try:
        # Mark as completed
        group_claw.status = GroupStatus.COMPLETED.value
        group_claw.completed_at = datetime.utcnow()
        
        # Also mark the underlying claw as completed
        claw = db.query(Claw).filter(Claw.id == group_claw.claw_id).first()
        if claw:
            claw.status = "completed"
            claw.completed_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "message": "STRIKE! Item completed!",
            "group_claw": group_claw.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to strike group item: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete item")


@router.post("/{group_id}/invite")
@rate_limit(requests_per_minute=5)
async def invite_member(
    group_id: str,
    request: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a member to the group"""
    group = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Only owner can invite
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group owner can invite members")
    
    # Check if user exists (case-insensitive)
    invited_user = db.query(User).filter(
        User.email.ilike(request.email)
    ).first()
    
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found. They need to sign up first!")
    
    # Check if already member
    if invited_user.id in [m.id for m in group.members]:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    try:
        # Add to group
        group.members.append(invited_user)
        db.commit()
        
        return {
            "message": f"{invited_user.display_name or invited_user.email} added to the group!",
            "group": group.to_dict(include_members=True)
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to invite member: {e}")
        raise HTTPException(status_code=500, detail="Failed to invite member")


@router.delete("/{group_id}/leave")
async def leave_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a group"""
    group = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check membership
    if current_user.id not in [m.id for m in group.members]:
        raise HTTPException(status_code=400, detail="You're not a member of this group")
    
    try:
        # Get all members for ownership transfer logic
        members = list(group.members)
        member_count = len(members)
        is_owner = group.created_by == current_user.id
        
        # Remove from group
        group.members.remove(current_user)
        
        # If no members left, delete the group
        if member_count <= 1:
            db.delete(group)
            db.commit()
            return {"message": "You left the group. It was deleted since no members remained."}
        
        # If owner leaves, transfer ownership to oldest member by join date
        if is_owner:
            # Query the group_members table to get join dates
            from sqlalchemy import select
            stmt = select(group_members).where(
                group_members.c.group_id == group_id
            ).order_by(group_members.c.joined_at.asc())
            
            result = db.execute(stmt)
            memberships = result.fetchall()
            
            # Find the oldest remaining member
            new_owner_id = None
            for membership in memberships:
                if membership.user_id != current_user.id:
                    new_owner_id = membership.user_id
                    break
            
            if new_owner_id:
                group.created_by = new_owner_id
                logger.info(f"Transferred ownership of group {group_id} to user {new_owner_id}")
        
        db.commit()
        
        return {"message": "You left the group successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to leave group: {e}")
        raise HTTPException(status_code=500, detail="Failed to leave group")
