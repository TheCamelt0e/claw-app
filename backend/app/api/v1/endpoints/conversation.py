"""
Conversational Capture API for CLAW
Multi-turn AI conversation to enrich captures with context
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user_sqlite import User
from app.services.gemini_service import gemini_service

router = APIRouter()


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class StartConversationRequest(BaseModel):
    initial_content: str = Field(..., min_length=1, max_length=500)


class ContinueConversationRequest(BaseModel):
    session_id: str
    message: str = Field(..., min_length=1, max_length=500)


class FinalizeCaptureRequest(BaseModel):
    session_id: str


class ConversationResponse(BaseModel):
    session_id: str
    messages: List[ConversationMessage]
    current_summary: str
    suggested_next_question: Optional[str] = None
    enriched_data: dict
    is_complete: bool


class ConversationSession:
    """In-memory session storage (use Redis in production)"""
    _sessions = {}
    
    @classmethod
    def create(cls, user_id: str, initial_content: str) -> str:
        import uuid
        session_id = str(uuid.uuid4())
        cls._sessions[session_id] = {
            "user_id": user_id,
            "messages": [
                {"role": "user", "content": initial_content, "timestamp": datetime.utcnow()}
            ],
            "created_at": datetime.utcnow(),
            "enriched_data": {
                "original_content": initial_content,
                "refined_title": initial_content[:60],
                "category": None,
                "context": {},
                "urgency": "medium",
                "tags": [],
            }
        }
        return session_id
    
    @classmethod
    def get(cls, session_id: str) -> Optional[dict]:
        return cls._sessions.get(session_id)
    
    @classmethod
    def add_message(cls, session_id: str, role: str, content: str):
        session = cls._sessions.get(session_id)
        if session:
            session["messages"].append({
                "role": role,
                "content": content,
                "timestamp": datetime.utcnow()
            })
    
    @classmethod
    def update_enriched_data(cls, session_id: str, data: dict):
        session = cls._sessions.get(session_id)
        if session:
            session["enriched_data"].update(data)
    
    @classmethod
    def delete(cls, session_id: str):
        cls._sessions.pop(session_id, None)


@router.post("/start", response_model=ConversationResponse)
async def start_conversation(
    request: StartConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a conversational capture session
    AI will ask clarifying questions based on initial content
    """
    # Create session
    session_id = ConversationSession.create(current_user.id, request.initial_content)
    session = ConversationSession.get(session_id)
    
    # Get AI to ask first clarifying question
    if gemini_service.is_available():
        prompt = f"""You are CLAW, an AI assistant helping users capture their intentions clearly.

User just said: "{request.initial_content}"

This is vague or could use more context. Ask ONE short, friendly follow-up question to help clarify:
- If it's a task: "When do you need this done?"
- If it's a book: "Who recommended this?"  
- If it's a restaurant: "Who are you going with?"
- If it's a product: "Where do you plan to buy this?"
- Generic: "Why is this important to you?" or "Any specific details?"

Keep it conversational and short (max 15 words). Just the question, no preamble."""
        
        try:
            response = await gemini_service._client.generate_content_async(prompt)
            question = response.text.strip()
            
            ConversationSession.add_message(session_id, "assistant", question)
            
            return ConversationResponse(
                session_id=session_id,
                messages=[ConversationMessage(**m) for m in session["messages"]],
                current_summary=request.initial_content,
                suggested_next_question=question,
                enriched_data=session["enriched_data"],
                is_complete=False
            )
        except Exception as e:
            print(f"[Conversation] AI error: {e}")
    
    # Fallback question
    fallback_question = "Can you tell me more about this?"
    ConversationSession.add_message(session_id, "assistant", fallback_question)
    
    return ConversationResponse(
        session_id=session_id,
        messages=[ConversationMessage(**m) for m in session["messages"]],
        current_summary=request.initial_content,
        suggested_next_question=fallback_question,
        enriched_data=session["enriched_data"],
        is_complete=False
    )


@router.post("/continue", response_model=ConversationResponse)
async def continue_conversation(
    request: ContinueConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Continue the conversation with user's response
    """
    session = ConversationSession.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    
    # Add user message
    ConversationSession.add_message(request.session_id, "user", request.message)
    
    # Build conversation context
    conversation_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in session["messages"]
    ])
    
    # Check if we have enough context (max 3 turns)
    user_messages = [m for m in session["messages"] if m["role"] == "user"]
    is_complete = len(user_messages) >= 3
    
    if is_complete or not gemini_service.is_available():
        # Finalize - generate enriched capture
        return await _finalize_conversation(request.session_id, session)
    
    # Continue conversation - ask another question
    prompt = f"""You are CLAW, an AI assistant helping users capture intentions.

Conversation so far:
{conversation_text}

Based on this, either:
1. Ask ONE more clarifying question (if context is still unclear)
2. Say "READY_TO_CAPTURE" (if you have enough context)

If asking a question, keep it short (max 15 words) and conversational.
Be friendly and encouraging."""
    
    try:
        response = await gemini_service._client.generate_content_async(prompt)
        ai_response = response.text.strip()
        
        if "READY_TO_CAPTURE" in ai_response.upper():
            return await _finalize_conversation(request.session_id, session)
        
        ConversationSession.add_message(request.session_id, "assistant", ai_response)
        
        # Update enriched data based on conversation
        await _extract_context_from_conversation(request.session_id, session)
        
        return ConversationResponse(
            session_id=request.session_id,
            messages=[ConversationMessage(**m) for m in session["messages"]],
            current_summary=_build_summary(session),
            suggested_next_question=ai_response,
            enriched_data=session["enriched_data"],
            is_complete=False
        )
        
    except Exception as e:
        print(f"[Conversation] AI error: {e}")
        # Complete anyway
        return await _finalize_conversation(request.session_id, session)


async def _extract_context_from_conversation(session_id: str, session: dict):
    """Extract enriched data from conversation using AI"""
    if not gemini_service.is_available():
        return
    
    conversation_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in session["messages"]
    ])
    
    prompt = f"""Extract structured information from this conversation:

{conversation_text}

Return a JSON object with:
{{
    "refined_title": "A clear, specific title based on the conversation",
    "category": "book|movie|restaurant|product|task|idea|event|gift|other",
    "who_mentioned": "person who mentioned this, if any",
    "where": "location mentioned, if any", 
    "when": "timeframe mentioned, if any",
    "why_important": "why this matters to the user",
    "urgency": "low|medium|high",
    "tags": ["tag1", "tag2", "tag3"]
}}

Return ONLY the JSON."""
    
    try:
        response = await gemini_service._client.generate_content_async(prompt)
        import json
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        data = json.loads(text)
        
        ConversationSession.update_enriched_data(session_id, {
            "refined_title": data.get("refined_title", session["enriched_data"]["original_content"]),
            "category": data.get("category", "other"),
            "context": {
                "who_mentioned": data.get("who_mentioned"),
                "where": data.get("where"),
                "when": data.get("when"),
                "why_important": data.get("why_important"),
            },
            "urgency": data.get("urgency", "medium"),
            "tags": data.get("tags", []),
        })
    except Exception as e:
        print(f"[Conversation] Extraction error: {e}")


async def _finalize_conversation(session_id: str, session: dict) -> ConversationResponse:
    """Finalize the conversation and prepare enriched capture data"""
    # Extract final context
    await _extract_context_from_conversation(session_id, session)
    
    session = ConversationSession.get(session_id)
    
    # Mark complete
    session["enriched_data"]["is_complete"] = True
    
    return ConversationResponse(
        session_id=session_id,
        messages=[ConversationMessage(**m) for m in session["messages"]],
        current_summary=_build_summary(session),
        suggested_next_question=None,
        enriched_data=session["enriched_data"],
        is_complete=True
    )


def _build_summary(session: dict) -> str:
    """Build a summary of the conversation"""
    data = session["enriched_data"]
    original = data.get("original_content", "")
    refined = data.get("refined_title", original)
    
    if refined != original:
        return f"{refined} (refined from: {original[:50]}...)"
    return original


@router.post("/finalize")
async def finalize_capture(
    request: FinalizeCaptureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finalize and get enriched capture data
    Call this when conversation is complete
    """
    session = ConversationSession.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    
    # Extract final context if not already done
    if not session["enriched_data"].get("is_complete"):
        await _finalize_conversation(request.session_id, session)
        session = ConversationSession.get(request.session_id)
    
    enriched = session["enriched_data"]
    
    # Build capture-ready response
    result = {
        "session_id": request.session_id,
        "final_content": enriched.get("refined_title", enriched["original_content"]),
        "original_content": enriched["original_content"],
        "category": enriched.get("category", "other"),
        "tags": enriched.get("tags", []),
        "context": enriched.get("context", {}),
        "urgency": enriched.get("urgency", "medium"),
        "conversation_summary": _build_summary(session),
        "full_conversation": [
            {"role": m["role"], "content": m["content"]}
            for m in session["messages"]
        ]
    }
    
    # Clean up session
    ConversationSession.delete(request.session_id)
    
    return result


@router.delete("/session/{session_id}")
async def cancel_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel and delete a conversation session
    """
    session = ConversationSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    
    ConversationSession.delete(session_id)
    return {"message": "Conversation cancelled"}
