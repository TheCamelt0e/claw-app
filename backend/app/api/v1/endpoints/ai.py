"""
AI endpoints for CLAW
Provides intelligent content analysis and enrichment via Gemini
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.gemini_service import gemini_service
from app.services.categorization import categorize_content as fallback_categorize
from app.core.security import get_current_user, get_current_user_optional
from app.models.claw_sqlite import Claw
from app.models.user_sqlite import User

router = APIRouter()


class SmartAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, description="Content to analyze")
    check_related: bool = Field(default=False, description="Check for related existing claws")


class SmartAnalyzeResponse(BaseModel):
    success: bool
    title: str
    category: str
    tags: List[str]
    action_type: str
    urgency: str  # low, medium, high
    expiry_days: int
    app_suggestion: Optional[str]
    context: dict  # who_mentioned, where, when_context, specific_item
    sentiment: str
    why_capture: str
    related_ids: List[str] = []
    source: str  # "gemini" or "fallback"
    message: Optional[str] = None


class ReminderTextRequest(BaseModel):
    claw_id: str


class RelatedClawsRequest(BaseModel):
    content: str


@router.post("/analyze", response_model=SmartAnalyzeResponse)
async def smart_analyze_endpoint(
    request: SmartAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive AI analysis of content with context extraction
    Requires authentication
    """
    user = current_user
    
    # Validate content
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    
    # Get existing claws for context if needed
    existing_claws = None
    if request.check_related:
        existing_claws = db.query(Claw).filter(
            Claw.user_id == user.id,
            Claw.status == "active"
        ).all()
        existing_claws = [{"id": c.id, "content": c.content, "category": c.category} for c in existing_claws]
    
    # Try AI analysis
    if gemini_service.is_available():
        try:
            result = await gemini_service.smart_analyze(request.content, existing_claws)
            
            if result["success"]:
                data = result["data"]
                
                # Validate required fields
                if not data.get("title"):
                    data["title"] = request.content[:60]
                if not data.get("category"):
                    data["category"] = "other"
                if not isinstance(data.get("tags"), list):
                    data["tags"] = []
                if data.get("urgency") not in ["low", "medium", "high"]:
                    data["urgency"] = "medium"
                if not isinstance(data.get("expiry_days"), int):
                    data["expiry_days"] = 7
                
                # Find related claws if requested
                related_ids = []
                if request.check_related and existing_claws:
                    try:
                        related_ids = await gemini_service.find_related_claws(request.content, existing_claws)
                    except Exception as e:
                        print(f"[AI] Error finding related: {e}")
                
                return SmartAnalyzeResponse(
                    success=True,
                    title=data.get("title"),
                    category=data.get("category"),
                    tags=data.get("tags"),
                    action_type=data.get("action_type", "remember"),
                    urgency=data.get("urgency"),
                    expiry_days=data.get("expiry_days"),
                    app_suggestion=data.get("app_suggestion"),
                    context=data.get("context", {}),
                    sentiment=data.get("sentiment", "neutral"),
                    why_capture=data.get("why_capture", ""),
                    related_ids=related_ids,
                    source="gemini"
                )
            
            # Rate limit error
            if result.get("error") == "RATE_LIMIT_EXCEEDED":
                raise HTTPException(
                    status_code=429,
                    detail={
                        "message": result["message"],
                        "retry_after": result.get("retry_after", 60)
                    }
                )
                
            # Parse error - log and fall through to fallback
            if result.get("error") == "PARSE_ERROR":
                print(f"[AI] Parse error for content: {request.content[:50]}...")
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"[AI] Unexpected error: {e}")
            # Fall through to fallback
    
    # Fallback to keyword matching
    fallback = fallback_categorize(request.content)
    
    # Smart expiry fallback
    expiry_days = _suggest_expiry_fallback(fallback["category"])
    
    return SmartAnalyzeResponse(
        success=True,
        title=fallback["title"],
        category=fallback["category"],
        tags=fallback["tags"],
        action_type=fallback["action_type"],
        urgency="medium",
        expiry_days=expiry_days,
        app_suggestion=fallback.get("app_trigger"),
        context={},
        sentiment="neutral",
        why_capture="",
        related_ids=[],
        source="fallback",
        message="AI busy, using smart keyword matching"
    )


def _suggest_expiry_fallback(category: str) -> int:
    """Smart expiry based on category"""
    expiry_map = {
        "product": 14,
        "book": 30,
        "movie": 14,
        "restaurant": 7,
        "task": 7,
        "idea": 30,
    }
    return expiry_map.get(category, 7)


@router.post("/generate-reminder")
async def generate_reminder(
    request: ReminderTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a contextual reminder text for a specific claw
    Requires authentication
    """
    user = current_user
    
    # Get claw
    claw = db.query(Claw).filter(
        Claw.id == request.claw_id,
        Claw.user_id == user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    claw_data = {
        "title": claw.title or claw.content,
        "category": claw.category,
        "content": claw.content,
        "context": {
            "who_mentioned": None,
            "where": claw.location_name
        },
        "action_type": claw.action_type
    }
    
    reminder_text = await gemini_service.generate_smart_reminder_text(claw_data)
    
    return {
        "claw_id": request.claw_id,
        "reminder_text": reminder_text,
        "source": "gemini" if gemini_service.is_available() else "fallback"
    }


@router.post("/find-related")
async def find_related(
    request: RelatedClawsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find existing claws that might be related to new content
    Requires authentication
    """
    user = current_user
    
    # Get existing active claws
    existing = db.query(Claw).filter(
        Claw.user_id == user.id,
        Claw.status == "active"
    ).all()
    
    existing_list = [{"id": c.id, "content": c.content, "category": c.category} for c in existing]
    
    related_ids = await gemini_service.find_related_claws(request.content, existing_list)
    
    # Fetch full details of related claws
    related_claws = []
    if related_ids:
        related = db.query(Claw).filter(
            Claw.id.in_(related_ids),
            Claw.user_id == user.id
        ).all()
        related_claws = [c.to_dict() for c in related]
    
    return {
        "related_ids": related_ids,
        "related_claws": related_claws,
        "count": len(related_claws)
    }


@router.get("/suggest-expiry")
async def suggest_expiry(
    content: str,
    category: Optional[str] = None
):
    """
    Get AI-suggested expiry days for content
    """
    if not gemini_service.is_available():
        # Use category-based fallback
        cat = category or "other"
        days = _suggest_expiry_fallback(cat)
        return {"expiry_days": days, "source": "fallback", "reason": "category-based"}
    
    # Quick AI prompt for expiry
    try:
        prompt = f'''How many days until this expires? Return just a number.
        
Content: "{content}"
Category: {category or "unknown"}

Consider:
- Perishables (food, milk): 2-3 days
- Appointments/events: 7 days
- Shopping items: 7-14 days
- Books/media: 30 days
- Ideas/someday: 30 days

Days:'''
        
        response = await gemini_service._client.generate_content_async(prompt)
        text = response.text.strip()
        
        # Extract number
        numbers = [int(n) for n in text.split() if n.isdigit()]
        days = numbers[0] if numbers else 7
        
        # Clamp reasonable range
        days = max(1, min(365, days))
        
        return {"expiry_days": days, "source": "gemini", "reason": "ai-analyzed"}
        
    except Exception:
        days = _suggest_expiry_fallback(category or "other")
        return {"expiry_days": days, "source": "fallback", "reason": "error-fallback"}


@router.get("/status")
async def ai_status():
    """Get AI service status and rate limit info"""
    stats = gemini_service.get_usage_stats()
    
    return {
        "available": gemini_service.is_available(),
        "model": gemini_service.model_name if gemini_service.is_available() else None,
        "rate_limits": {
            "rpm": {
                "used": stats["rpm_used"],
                "limit": stats["rpm_limit"],
                "remaining": max(0, stats["rpm_limit"] - stats["rpm_used"])
            },
            "rpd": {
                "used": stats["rpd_used"],
                "limit": stats["rpd_limit"],
                "remaining": stats["remaining_today"]
            }
        }
    }


# ============ SMART RESURFACING (CLAW 3.0) ============

@router.get("/smart-surface")
async def get_smart_surface(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get claws sorted by likelihood of completion RIGHT NOW.
    Uses learned patterns from user's strike history.
    Requires authentication
    """
    from app.services.pattern_analyzer import PatternAnalyzer
    
    user = current_user
    
    claws = PatternAnalyzer.get_smart_surface_list(
        db=db,
        user_id=user.id,
        lat=lat,
        lng=lng,
        limit=limit
    )
    
    return {
        "items": claws,
        "total": len(claws),
        "location_used": lat is not None and lng is not None
    }


@router.get("/patterns")
async def get_user_patterns(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's learned patterns (for insights).
    Shows when user typically completes different categories.
    Requires authentication
    """
    from app.services.pattern_analyzer import PatternAnalyzer
    
    user = current_user
    patterns = PatternAnalyzer.get_user_patterns(db, user.id, category)
    
    return {
        "user_id": user.id,
        "category_filter": category,
        "patterns": patterns
    }


@router.post("/score-claw/{claw_id}")
async def score_single_claw(
    claw_id: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate resurface score for a specific claw RIGHT NOW.
    Requires authentication
    """
    from app.services.pattern_analyzer import PatternAnalyzer
    
    user = current_user
    
    claw = db.query(Claw).filter(
        Claw.id == claw_id,
        Claw.user_id == user.id
    ).first()
    
    if not claw:
        raise HTTPException(status_code=404, detail="Claw not found")
    
    score, reason = PatternAnalyzer.calculate_resurface_score(
        db, claw, lat, lng
    )
    
    return {
        "claw_id": claw_id,
        "score": score,
        "reason": reason,
        "confidence": "high" if score > 0.7 else "medium" if score > 0.4 else "low"
    }


# Legacy endpoint for backward compatibility
@router.post("/categorize")
async def categorize_endpoint(
    request: SmartAnalyzeRequest,
    db: Session = Depends(get_db)
):
    """Legacy endpoint - redirects to /analyze"""
    result = await smart_analyze_endpoint(request, db)
    return {
        "success": result.success,
        "title": result.title,
        "category": result.category,
        "tags": result.tags,
        "action_type": result.action_type,
        "app_suggestion": result.app_suggestion,
        "urgency": result.urgency,
        "source": result.source,
        "message": result.message
    }
