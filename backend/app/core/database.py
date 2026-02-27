"""
Database configuration - Supports SQLite (dev) and PostgreSQL (production)
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import Generator
import os

# Get database URL from environment
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./claw_app.db')

# Detect database type
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith('sqlite')
IS_POSTGRES = SQLALCHEMY_DATABASE_URL.startswith('postgresql') or SQLALCHEMY_DATABASE_URL.startswith('postgres')

def create_db_engine():
    """Create database engine with appropriate configuration"""
    
    if IS_SQLITE:
        # SQLite configuration (development)
        return create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,  # Verify connections before using
            echo=False  # Set to True for SQL debugging
        )
    else:
        # PostgreSQL configuration (production)
        # Render's PostgreSQL URL might start with 'postgres://', SQLAlchemy needs 'postgresql://'
        db_url = SQLALCHEMY_DATABASE_URL
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        
        return create_engine(
            db_url,
            pool_size=5,  # Number of connections to keep open
            max_overflow=10,  # Extra connections if pool is full
            pool_timeout=30,  # Seconds to wait for available connection
            pool_recycle=1800,  # Recycle connections after 30 minutes
            pool_pre_ping=True,  # Verify connections before using
            echo=False
        )

# Create engine
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    from app.models.claw_sqlite import Claw
    from app.models.user_sqlite import User
    from app.models.strike_pattern import StrikePattern
    from app.models.group import Group, GroupMember, GroupClaw
    
    Base.metadata.create_all(bind=engine)
    print(f"[Database] Tables created successfully ({'SQLite' if IS_SQLITE else 'PostgreSQL'})")


def check_db_connection() -> bool:
    """Check if database connection is working"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"[Database] Connection failed: {e}")
        return False
