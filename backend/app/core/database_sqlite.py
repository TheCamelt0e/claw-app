"""
SQLite database configuration for easy testing
Using in-memory database for testing to avoid file locks
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os

# Use environment variable if set (Render), otherwise use local file
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./claw_app.db')

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
