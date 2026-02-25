"""
CLAW API - Production Ready
Deployed and ready for mobile apps
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.core.database_sqlite import engine, Base
from app.api.v1.router_sqlite import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    Base.metadata.create_all(bind=engine)
    print("[CLAW] Database ready")
    yield


app = FastAPI(
    title="CLAW API",
    description="Your Intention Archive - Capture now, Strike later",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Allow mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": "CLAW API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "api": "/api/v1"
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "claw-api"}
