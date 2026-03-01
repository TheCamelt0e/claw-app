"""
Database configuration - Optimized for Paid PostgreSQL
Supports SQLite (dev) and PostgreSQL (production)
PAID TIER OPTIMIZATIONS:
- Larger connection pool
- Better timeout handling
- Connection recycling for long-running server
"""
from sqlalchemy import create_engine, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, QueuePool
from typing import Generator
import os

# Get database URL from environment
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./claw_app.db')

# Detect database type
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith('sqlite')
IS_POSTGRES = SQLALCHEMY_DATABASE_URL.startswith('postgresql') or SQLALCHEMY_DATABASE_URL.startswith('postgres')

# Detect if running on Render (paid tier has different characteristics)
IS_RENDER = os.getenv('RENDER', 'false').lower() == 'true'
IS_RENDER_PRODUCTION = os.getenv('ENVIRONMENT', 'development').lower() == 'production'

def create_db_engine():
    """Create database engine with appropriate configuration"""
    
    if IS_SQLITE:
        # SQLite configuration (development)
        return create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            echo=False
        )
    else:
        # PostgreSQL configuration (production)
        # Render's PostgreSQL URL might start with 'postgres://', SQLAlchemy needs 'postgresql://'
        db_url = SQLALCHEMY_DATABASE_URL
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        
        # PAID TIER OPTIMIZATIONS
        # With paid PostgreSQL, we can maintain more persistent connections
        # because the database is always on
        if IS_RENDER_PRODUCTION:
            print("[Database] Using PAID TIER optimized settings")
            return create_engine(
                db_url,
                poolclass=QueuePool,
                pool_size=10,           # More connections for paid tier (was 5)
                max_overflow=20,        # More overflow (was 10)
                pool_timeout=30,        # Wait up to 30s for connection
                pool_recycle=3600,      # Recycle connections after 1 hour (was 30 min)
                pool_pre_ping=True,     # Verify connections before using
                echo=False,
                # Additional paid tier optimizations
                connect_args={
                    'connect_timeout': 10,  # Connection timeout
                    'options': '-c statement_timeout=30000'  # 30s query timeout
                } if IS_POSTGRES else {}
            )
        else:
            # Development/Free tier settings
            return create_engine(
                db_url,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
                pool_pre_ping=True,
                echo=False
            )

# Create engine
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Add event listeners for connection debugging (paid tier)
if IS_POSTGRES and IS_RENDER_PRODUCTION:
    @event.listens_for(engine, "connect")
    def on_connect(dbapi_conn, connection_record):
        """Log new connections (helpful for debugging pool usage)"""
        print(f"[Database] New connection established (pool size: {engine.pool.size()})")
    
    @event.listens_for(engine, "checkout")
    def on_checkout(dbapi_conn, connection_record, connection_proxy):
        """Log connection checkout"""
        print(f"[Database] Connection checked out from pool")


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    from app.models.claw_sqlite import Claw
    from app.models.user_sqlite import User
    from app.models.strike_pattern import StrikePattern
    from app.models.group import Group, group_members, GroupClaw
    
    Base.metadata.create_all(bind=engine)
    db_type = "SQLite" if IS_SQLITE else "PostgreSQL"
    tier = "PAID" if IS_RENDER_PRODUCTION and IS_POSTGRES else "FREE"
    print(f"[Database] {tier} tier - {db_type} initialized")


def check_db_connection() -> bool:
    """Check if database connection is working"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[Database] Connection failed: {e}")
        return False


def get_db_stats() -> dict:
    """Get database pool statistics (useful for monitoring)"""
    if hasattr(engine, 'pool'):
        return {
            'size': engine.pool.size(),
            'checked_in': engine.pool.checkedin(),
            'checked_out': engine.pool.checkedout(),
            'overflow': engine.pool.overflow()
        }
    return {}
