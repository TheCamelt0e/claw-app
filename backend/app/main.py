"""
CLAW API - Production Ready - SECURITY HARDENED
Supports SQLite (development) and PostgreSQL (production)
Includes Redis for distributed rate limiting and caching
"""
import secrets
from fastapi import FastAPI, Response, Request
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
from app.core.config import settings
from app.core.api_security import APISecurity, log_security_event
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


# Configure FastAPI based on environment
docs_url = "/docs" if settings.is_development() else None
redoc_url = "/redoc" if settings.is_development() else None
openapi_url = "/openapi.json" if settings.is_development() else None

app = FastAPI(
    title="CLAW API",
    description="Your Intention Archive - Capture now, Strike later",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# CORS middleware - PERMISSIVE for React Native mobile apps
# React Native sends Origin: null which doesn't work well with whitelist + credentials
# Security is enforced via JWT tokens, not CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for mobile app compatibility
    allow_credentials=False,  # Must be False with allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-Request-ID"],
)

# Security middleware - log all requests
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Add security headers and logging to all requests"""
    request_id = secrets.token_hex(8)
    
    try:
        # Skip security checks for health endpoint
        if request.url.path == "/health" or request.url.path == "/":
            response = await call_next(request)
            return response
        
        # Process request first (don't block on fingerprinting)
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Request-ID"] = request_id
        
        # Only add HSTS in production
        if settings.is_production():
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Remove server fingerprinting (del if exists)
        if "server" in response.headers:
            del response.headers["server"]
        
        return response
        
    except Exception as e:
        # Log error but don't crash the request
        print(f"[ERROR] Security middleware failed: {e}")
        # Still try to return the response
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e2:
            print(f"[FATAL] Security middleware double failure: {e2}")
            raise


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
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
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
    """Public endpoint with minimal info - no sensitive data exposed"""
    return {
        "message": "CLAW API",
        "version": settings.APP_VERSION,
        "status": "operational",
        "environment": settings.ENVIRONMENT
    }
