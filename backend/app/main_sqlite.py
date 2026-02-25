"""
CLAW API - SQLite Version (Easy Testing)
Run this instead of main.py if you don't have PostgreSQL/Docker
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database_sqlite import engine, Base
from app.api.v1.router_sqlite import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup - create tables
    Base.metadata.create_all(bind=engine)
    print("[OK] Database initialized (SQLite)")
    yield
    # Shutdown


app = FastAPI(
    title="CLAW API (SQLite)",
    description="Capture now. Strike later. (SQLite test version)",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware - allow all for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "claw-api",
        "database": "sqlite",
        "version": "0.1.0"
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to CLAW API",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "capture": "POST /api/v1/claws/capture",
            "list": "GET /api/v1/claws/me",
            "surface": "GET /api/v1/claws/surface",
        }
    }
