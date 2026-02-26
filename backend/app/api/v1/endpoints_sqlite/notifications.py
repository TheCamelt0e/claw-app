"""
Notifications endpoints for SQLite backend
Uses same implementation as PostgreSQL version
"""
from app.api.v1.endpoints.notifications import router

__all__ = ["router"]
