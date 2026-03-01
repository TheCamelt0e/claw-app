"""
CLAW API Router
"""
from fastapi import APIRouter

from app.api.v1.endpoints import claws, auth, users, notifications, ai, groups, conversation
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(claws.router, prefix="/claws", tags=["Claws"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(groups.router, prefix="/groups", tags=["Groups"])
api_router.include_router(conversation.router, prefix="/conversation", tags=["Conversation"])

# Debug endpoints only in development
if settings.is_development():
    from app.api.v1.endpoints import debug_vip
    api_router.include_router(debug_vip.router, prefix="/debug", tags=["Debug"])
