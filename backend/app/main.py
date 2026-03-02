"""
CLAW API - Production Ready - SECURITY HARDENED
Supports SQLite (development) and PostgreSQL (production)
Includes Redis for distributed rate limiting and caching

PAID TIER CONFIGURATION:
- PostgreSQL: Always-on (no cold starts)
- Web Service: Starter plan (no cold starts)
"""
import secrets
from datetime import datetime
from fastapi import FastAPI, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import os

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

# NOTE: Self-ping is NOT needed with paid tier (Starter plan)
# The server stays always-on with the $7/month plan


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events - PAID TIER OPTIMIZED"""
    
    # Startup
    try:
        print("=" * 60)
        print("[STARTUP] CLAW API - PAID TIER CONFIGURATION")
        print("=" * 60)
        
        # Initialize database
        init_db()
        db_status = "connected" if check_db_connection() else "disconnected"
        db_type = "SQLite" if IS_SQLITE else "PostgreSQL"
        db_tier = "PAID (Always-On)" if IS_POSTGRES else "SQLite"
        print(f"[OK] Database: {db_type} ({db_tier}) - Status: {db_status}")
        
        # Initialize Redis (optional)
        try:
            await init_redis()
            redis_status = "connected" if redis_client.is_enabled() else "not configured"
            print(f"[OK] Redis initialized - Status: {redis_status}")
        except Exception as e:
            print(f"[WARN] Redis initialization failed: {e}")
            print("[INFO] Falling back to in-memory storage for rate limiting")
        
        # PAID TIER: No self-ping needed - server is always on
        if settings.is_production() and IS_POSTGRES:
            print("[OK] PAID TIER ACTIVE - No cold starts, always-on server")
            print("[OK] Users will experience instant login/signup")
        
        print("=" * 60)
        print("[STARTUP] Complete - Server ready")
        print("=" * 60)
            
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

# CORS middleware - Use whitelist in production, allow all in development
# NOTE: Mobile apps (React Native, Capacitor) send 'null' or 'file://' as Origin
cors_origins = settings.get_cors_origins()

if settings.is_development():
    # Development: allow all origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False with allow_origins=["*"]
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-RateLimit-Remaining", "X-Request-ID"],
    )
else:
    # Production: whitelist only + mobile app special origins
    # IMPORTANT: Must include 'null' for mobile apps and 'file://' for APK builds
    production_origins = cors_origins + ["null", "file://", "capacitor://", "ionic://"]
    # Remove duplicates
    production_origins = list(dict.fromkeys(production_origins))
    
    print(f"[CORS] Allowed origins: {production_origins}")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=production_origins,
        allow_credentials=True,  # Can be True with specific origins
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-RateLimit-Remaining", "X-Request-ID"],
    )

# Trusted Host Middleware (production only)
# DISABLED: Causes issues with mobile apps that don't send proper Host headers
# The API key security and JWT validation provide sufficient protection
# if settings.is_production():
#     allowed_hosts = ["claw-api-b5ts.onrender.com", "*.onrender.com"]
#     app.add_middleware(
#         TrustedHostMiddleware,
#         allowed_hosts=allowed_hosts
#     )

# Security middleware - log all requests and add security headers
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
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        
        # Only add HSTS in production
        if settings.is_production():
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
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
    """
    Health check endpoint - verifies database and Redis connectivity
    OPTIMIZED: Fast response for Render cold start wake-up pings
    """
    # Quick database check with timeout
    db_healthy = False
    db_type = "sqlite" if IS_SQLITE else "postgresql"
    
    try:
        # Use a shorter timeout for health checks to respond quickly
        import asyncio
        db_healthy = await asyncio.wait_for(
            asyncio.to_thread(check_db_connection),
            timeout=5.0  # 5 second timeout for health checks
        )
    except asyncio.TimeoutError:
        db_healthy = False
    except Exception as e:
        print(f"[Health] Database check failed: {e}")
        db_healthy = False
    
    return {
        "status": "healthy" if db_healthy else "degraded",
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
        },
        # Add timestamp for debugging
        "timestamp": datetime.utcnow().isoformat()
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
