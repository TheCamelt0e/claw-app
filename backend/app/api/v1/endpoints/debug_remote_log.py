"""
Remote logging endpoint - Receives logs from mobile app for debugging
This helps diagnose issues by seeing mobile app logs in Render dashboard
"""
from fastapi import APIRouter, Request
from typing import List
from pydantic import BaseModel

router = APIRouter()


class LogPayload(BaseModel):
    logs: List[str]
    source: str = "mobile_app"


@router.post("/log")
async def receive_logs(payload: LogPayload, request: Request):
    """
    Receive logs from mobile app
    These will show up in Render logs for debugging
    """
    client_ip = request.client.host if request.client else "unknown"
    
    print(f"\n[MOBILE_LOGS] From: {client_ip}, Source: {payload.source}")
    print("=" * 60)
    
    for log_entry in payload.logs:
        # Print each log line - these will appear in Render logs
        print(f"[MOBILE] {log_entry}")
    
    print("=" * 60)
    
    return {"status": "ok", "received": len(payload.logs)}


@router.get("/ping")
async def ping():
    """Simple ping endpoint for testing connectivity"""
    return {"status": "pong", "service": "claw-api"}
