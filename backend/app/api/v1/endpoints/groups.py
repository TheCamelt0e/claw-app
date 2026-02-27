"""
Groups API - Shared Lists for Families

This is the Pro tier feature ($2.99/mo).
Allows partners/families to share grocery lists.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.group import Group, GroupClaw
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User

router = APIRouter()


# Request/Response Models
class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    group_type: str = Field(default='family')  # 'family', 'couple', 'roommates', 'other'


class AddMemberRequest(BaseModel):
    email: str = Field(..., description="Email of user to invite")


class ClaimItemRequest(BaseModel):
    user_id: str = Field(..., description="User claiming the item")


@router.post("/create")
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
    
    # Create group
    group = Group(
        name=request.name,
        description=request.description,
        group_type=request.group_type,
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


@router.get("/my")
async def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all groups the current user is a member of"""
    groups = db.query(Group).join(Group.members).filter(User.id == current_user.id).all()
    
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
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member
    if current_user not in group.members:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get active items
    active_items = db.query(GroupClaw, Claw).join(Claw).filter(
        GroupClaw.group_id == group_id,
        GroupClaw.status.in_(['active', 'claimed'])
    ).order_by(GroupClaw.created_at.desc()).all()
    
    items = []
    for group_claw, claw in active_items:
        item = {
            **claw.to_dict(),
            'group_claw_id': group_claw.id,
            'status': group_claw.status,
            'claimed_by': group_claw.claimed_by,
            'captured_by': group_claw.captured_by,
        }
        items.append(item)
    
    return {
        "group": group.to_dict(include_members=True),
        "items": items
    }


@router.post("/{group_id}/capture")
async def capture_to_group(
    group_id: str,
    content: str,
    content_type: str = "text",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Capture an item directly to a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user not in group.members:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Create the claw
    from app.services.categorization import categorize_content
    ai_result = categorize_content(content)
    
    claw = Claw(
        user_id=current_user.id,
        content=content,
        content_type=content_type,
        title=ai_result["title"],
        category=ai_result["category"],
        action_type=ai_result["action_type"],
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    claw.set_tags(ai_result["tags"])
    
    db.add(claw)
    db.commit()
    db.refresh(claw)
    
    # Link to group
    group_claw = GroupClaw(
        group_id=group_id,
        claw_id=claw.id,
        captured_by=current_user.id,
        status='active'
    )
    
    db.add(group_claw)
    db.commit()
    
    return {
        "message": "Item captured to group!",
        "claw": claw.to_dict(),
        "group_claw": group_claw.to_dict()
    }


@router.post("/{group_id}/items/{group_claw_id}/claim")
async def claim_group_item(
    group_id: str,
    group_claw_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Claim an item ("I got this") - prevents double-buying"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user not in group.members:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group_claw = db.query(GroupClaw).filter(
        GroupClaw.id == group_claw_id,
        GroupClaw.group_id == group_id
    ).first()
    
    if not group_claw:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if group_claw.status == 'claimed' and group_claw.claimed_by != current_user.id:
        # Someone else claimed it
        claimed_by_user = db.query(User).filter(User.id == group_claw.claimed_by).first()
        raise HTTPException(
            status_code=400, 
            detail=f"Already claimed by {claimed_by_user.display_name or 'someone else'}"
        )
    
    if group_claw.status == 'completed':
        raise HTTPException(status_code=400, detail="Item already completed")
    
    # Claim it
    group_claw.status = 'claimed'
    group_claw.claimed_by = current_user.id
    group_claw.claimed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Item claimed! Others will see you got this.",
        "group_claw": group_claw.to_dict()
    }


@router.post("/{group_id}/items/{group_claw_id}/strike")
async def strike_group_item(
    group_id: str,
    group_claw_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Strike (complete) a group item"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user not in group.members:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group_claw = db.query(GroupClaw).filter(
        GroupClaw.id == group_claw_id,
        GroupClaw.group_id == group_id
    ).first()
    
    if not group_claw:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if group_claw.status == 'completed':
        raise HTTPException(status_code=400, detail="Already completed")
    
    # Mark as completed
    group_claw.status = 'completed'
    group_claw.completed_at = datetime.utcnow()
    
    # Also mark the underlying claw as completed
    claw = db.query(Claw).filter(Claw.id == group_claw.claw_id).first()
    if claw:
        claw.status = 'completed'
        claw.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "STRIKE! Item completed!",
        "group_claw": group_claw.to_dict()
    }


@router.post("/{group_id}/invite")
async def invite_member(
    group_id: str,
    request: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a member to the group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Only owner or admin can invite
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group owner can invite members")
    
    # Check if user exists
    invited_user = db.query(User).filter(User.email == request.email).first()
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found. They need to sign up first!")
    
    # Check if already member
    if invited_user in group.members:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    # Add to group
    group.members.append(invited_user)
    db.commit()
    
    return {
        "message": f"{invited_user.display_name or invited_user.email} added to the group!",
        "group": group.to_dict(include_members=True)
    }


@router.delete("/{group_id}/leave")
async def leave_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user not in group.members:
        raise HTTPException(status_code=400, detail="You're not a member of this group")
    
    # Remove from group
    group.members.remove(current_user)
    
    # If no members left, delete the group
    if len(group.members) == 0:
        db.delete(group)
        db.commit()
        return {"message": "You left the group. It was deleted since no members remained."}
    
    # If owner leaves, transfer ownership to oldest member
    if group.created_by == current_user.id:
        oldest_member = min(group.members, key=lambda m: m.joined_at if hasattr(m, 'joined_at') else datetime.utcnow())
        group.created_by = oldest_member.id
    
    db.commit()
    
    return {"message": "You left the group successfully"}
