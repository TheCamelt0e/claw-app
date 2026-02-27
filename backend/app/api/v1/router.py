"""
CLAW API Router
"""
from fastapi import APIRouter

from app.api.v1.endpoints import claws, auth, users, notifications, debug_vip, ai, groups

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(claws.router, prefix="/claws", tags=["Claws"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(debug_vip.router, prefix="/debug", tags=["Debug"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(groups.router, prefix="/groups", tags=["Groups"])
