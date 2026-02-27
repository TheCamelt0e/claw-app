"""
CLAW API - Production Entry Point
This is an alias for main.py (kept for backward compatibility with deployment configs)
"""
from app.main import app

__all__ = ["app"]
