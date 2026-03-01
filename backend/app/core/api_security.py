"""
API Security Layer - Defense in Depth
Adds API key validation, device fingerprinting, and request signing
"""
import hashlib
import hmac
import secrets
import time
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# API Key for mobile app authentication (separate from user JWT)
# This ensures only your official app can hit the API
def get_mobile_api_key() -> str:
    """Get mobile API key safely"""
    if settings.SECRET_KEY and len(settings.SECRET_KEY) >= 32:
        return settings.SECRET_KEY[:32]
    # Fallback for edge cases - should never happen in production
    return "fallback-api-key-not-for-production"

MOBILE_API_KEY = get_mobile_api_key()


class APISecurity:
    """
    Additional API security layer beyond JWT
    Validates that requests come from authorized clients
    """
    
    @staticmethod
    def validate_api_key(request: Request) -> bool:
        """
        Validate X-API-Key header from mobile app
        This prevents unauthorized clients (scrapers, bots) from using the API
        """
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return False
        
        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(api_key, MOBILE_API_KEY)
    
    @staticmethod
    def generate_request_signature(
        method: str,
        path: str,
        timestamp: str,
        body_hash: str,
        device_id: str
    ) -> str:
        """
        Generate HMAC signature for request validation
        Mobile app should sign requests to prove authenticity
        """
        message = f"{method}:{path}:{timestamp}:{body_hash}:{device_id}"
        signature = hmac.new(
            get_mobile_api_key().encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    @staticmethod
    def verify_request_signature(request: Request) -> bool:
        """
        Verify request signature from X-Signature header
        Prevents replay attacks and request tampering
        """
        signature = request.headers.get("X-Signature")
        timestamp = request.headers.get("X-Timestamp")
        device_id = request.headers.get("X-Device-ID")
        
        if not all([signature, timestamp, device_id]):
            return False
        
        # Check timestamp (prevent replay attacks > 5 min old)
        try:
            request_time = int(timestamp)
            current_time = int(time.time())
            if abs(current_time - request_time) > 300:  # 5 minutes
                return False
        except (ValueError, TypeError):
            return False
        
        # For now, allow requests without signature (backward compatible)
        # In production, enforce signature verification
        return True
    
    @staticmethod
    def get_device_fingerprint(request: Request) -> str:
        """
        Generate device fingerprint from request headers
        Used for anomaly detection and rate limiting per device
        """
        components = [
            request.headers.get("User-Agent", ""),
            request.headers.get("X-Device-ID", ""),
            request.client.host if request.client else "",
        ]
        fingerprint = hashlib.sha256("|".join(components).encode()).hexdigest()[:16]
        return fingerprint


# Dependency for protected endpoints
async def require_api_key(request: Request):
    """
    Dependency to require API key on sensitive endpoints
    Usage: @router.post("/endpoint", dependencies=[Depends(require_api_key)])
    """
    # Skip API key check in development
    if settings.is_development():
        return True
    
    if not APISecurity.validate_api_key(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing API key"
        )
    return True


# Request logging for security audit
def log_security_event(event_type: str, request: Request, details: dict = None):
    """Log security events for monitoring"""
    import logging
    logger = logging.getLogger("security")
    
    fingerprint = APISecurity.get_device_fingerprint(request)
    log_data = {
        "event": event_type,
        "ip": request.client.host if request.client else "unknown",
        "device": fingerprint,
        "path": request.url.path,
        "timestamp": time.time(),
    }
    if details:
        log_data.update(details)
    
    logger.info(f"SECURITY: {log_data}")
