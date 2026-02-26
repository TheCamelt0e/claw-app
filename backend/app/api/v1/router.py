"""
Main API router combining all v1 endpoints
"""
from fastapi import APIRouter

from app.api.v1.endpoints import claws, auth, users, locations, calendar

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(claws.router, prefix="/claws", tags=["Claws"])
api_router.include_router(locations.router, prefix="/locations", tags=["Locations"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
