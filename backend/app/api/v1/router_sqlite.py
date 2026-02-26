"""
SQLite-compatible API router
"""
from fastapi import APIRouter

from app.api.v1.endpoints_sqlite import claws, auth, users, notifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(claws.router, prefix="/claws", tags=["Claws"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
