"""
API Security Layer - Defense in Depth
Adds API key validation, device fingerprinting, and request signing
"""
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# API Key for mobile app authentication (separate from user JWT)
# This ensures only your official app can hit the API

# Known hardcoded key used by mobile app (for backward compatibility)
MOBILE_APP_HARDCODED_KEY = "claw-mobile-app-v1-secure-key"


def get_mobile_api_key() -> str:
    """Get mobile API key safely - derived from SECRET_KEY using HMAC"""
    # First, try to get dedicated MOBILE_API_KEY from environment
    env_api_key = os.getenv('MOBILE_API_KEY')
    if env_api_key and len(env_api_key) >= 32:
        return env_api_key
    
    # Fallback: derive from SECRET_KEY using HMAC (NOT direct slice)
    if settings.SECRET_KEY and len(settings.SECRET_KEY) >= 32:
        # Use HMAC-SHA256 to derive API key from SECRET_KEY
        # This prevents exposing any portion of the raw SECRET_KEY
        derived_key = hmac.new(
            b"claw-mobile-api-key-v1",  # Fixed salt
            settings.SECRET_KEY.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()[:32]
        return derived_key
    
    # Emergency fallback - should never happen in production
    return "fallback-api-key-not-for-production"


# Accept BOTH derived key AND hardcoded key (for mobile app compatibility)
VALID_API_KEYS = [get_mobile_api_key(), MOBILE_APP_HARDCODED_KEY]
# Remove duplicates while preserving order
VALID_API_KEYS = list(dict.fromkeys(VALID_API_KEYS))

# Keep MOBILE_API_KEY for backward compatibility with existing code
MOBILE_API_KEY = VALID_API_KEYS[0]


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
        
        # Check against all valid API keys (derived + hardcoded for mobile compatibility)
        for valid_key in VALID_API_KEYS:
            if hmac.compare_digest(api_key, valid_key):
                return True
        return False
    
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
        
        # Calculate body hash (if body exists)
        body_hash = ""
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = request.body()
                if body:
                    body_hash = hashlib.sha256(body).hexdigest()
            except:
                pass  # Body may not be readable
        
        # Verify signature matches expected value
        expected_signature = APISecurity.generate_request_signature(
            request.method,
            request.url.path,
            timestamp,
            body_hash,
            device_id
        )
        
        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(signature, expected_signature)
    
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


# Dependency for signature verification on sensitive endpoints
async def require_signature(request: Request):
    """
    Dependency to require request signature on critical endpoints
    Usage: @router.post("/critical", dependencies=[Depends(require_signature)])
    """
    # Skip signature check in development
    if settings.is_development():
        return True
    
    if not APISecurity.verify_request_signature(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing request signature"
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
