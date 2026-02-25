"""
SQLite Models - Direct imports bypassing __init__.py
"""
import sys
import os

# Add models directory to path to avoid __init__.py
models_dir = os.path.join(os.path.dirname(__file__), 'models')
if models_dir not in sys.path:
    sys.path.insert(0, models_dir)

# Import directly from files
from user_sqlite import User
from claw_sqlite import Claw

__all__ = ["User", "Claw"]
