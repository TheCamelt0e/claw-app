"""
CLAW API - Production Ready
Supports SQLite (development) and PostgreSQL (production)
Includes Redis for distributed rate limiting and caching
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import (
    engine, 
    Base, 
    init_db, 
    check_db_connection,
    IS_SQLITE,
    IS_POSTGRES
)
from app.core.redis import init_redis, close_redis, redis_client
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    try:
        # Initialize database
        init_db()
        db_status = "connected" if check_db_connection() else "disconnected"
        db_type = "SQLite" if IS_SQLITE else "PostgreSQL"
        print(f"[OK] Database initialized ({db_type}) - Status: {db_status}")
        
        # Initialize Redis (optional)
        try:
            await init_redis()
            redis_status = "connected" if redis_client.is_enabled() else "not configured"
            print(f"[OK] Redis initialized - Status: {redis_status}")
        except Exception as e:
            print(f"[WARN] Redis initialization failed: {e}")
            print("[INFO] Falling back to in-memory storage for rate limiting")
            
    except Exception as e:
        print(f"[ERROR] Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    try:
        await close_redis()
        engine.dispose()
        print("[OK] All connections closed")
    except Exception as e:
        print(f"[WARN] Error during shutdown: {e}")


app = FastAPI(
    title="CLAW API",
    description="Your Intention Archive - Capture now, Strike later",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - allow all origins for mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint - verifies database and Redis connectivity"""
    db_healthy = check_db_connection()
    db_type = "sqlite" if IS_SQLITE else "postgresql"
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "service": "claw-api",
        "version": "1.0.0",
        "database": {
            "type": db_type,
            "connected": db_healthy
        },
        "redis": {
            "enabled": redis_client.is_enabled(),
            "connected": redis_client.is_enabled()
        }
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to CLAW API",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": {
                "register": "POST /api/v1/auth/register",
                "login": "POST /api/v1/auth/login",
                "me": "GET /api/v1/auth/me",
                "refresh": "POST /api/v1/auth/refresh",
                "verify_email": "POST /api/v1/auth/verify-email",
                "forgot_password": "POST /api/v1/auth/forgot-password",
                "reset_password": "POST /api/v1/auth/reset-password"
            },
            "claws": {
                "capture": "POST /api/v1/claws/capture",
                "list": "GET /api/v1/claws/me",
                "surface": "GET /api/v1/claws/surface",
                "strike": "POST /api/v1/claws/{id}/strike"
            }
        }
    }
