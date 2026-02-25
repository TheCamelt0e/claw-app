"""
Pydantic schemas for Claw API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class ClawBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    content_type: str = "text"  # text, voice, photo
    
    # Optional context overrides (AI will auto-detect if not provided)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    time_context: Optional[str] = None  # morning, evening, weekend
    app_trigger: Optional[str] = None  # amazon, netflix, etc.


class ClawCreate(ClawBase):
    pass


class ClawUpdate(BaseModel):
    status: Optional[str] = None  # completed, archived
    expires_at: Optional[datetime] = None


class ClawResponse(ClawBase):
    id: UUID
    user_id: UUID
    
    # AI-generated fields
    title: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    action_type: Optional[str] = None
    
    # Status
    status: str
    created_at: datetime
    expires_at: datetime
    completed_at: Optional[datetime] = None
    surface_count: int
    
    class Config:
        from_attributes = True


class ClawListResponse(BaseModel):
    items: List[ClawResponse]
    total: int
    has_more: bool
