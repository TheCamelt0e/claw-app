"""
Rate limiting for API endpoints
Simple in-memory implementation suitable for single-instance deployments
For multi-instance, upgrade to Redis-based rate limiting
"""
import time
from typing import Dict, Optional, Tuple
from functools import wraps
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


class RateLimiter:
    """
    Simple in-memory rate limiter
    Tracks requests per IP and per user
    """
    
    def __init__(self):
        # IP-based tracking: {ip: [(timestamp, count), ...]}
        self._ip_requests: Dict[str, list] = {}
        # User-based tracking: {user_id: [(timestamp, count), ...]}
        self._user_requests: Dict[str, list] = {}
        # Failed login attempts: {ip: [(timestamp, count)]}
        self._failed_attempts: Dict[str, list] = {}
        
    def _clean_old_entries(self, entries: list, window_seconds: int) -> list:
        """Remove entries outside the time window"""
        now = time.time()
        return [(ts, count) for ts, count in entries if now - ts < window_seconds]
    
    def is_allowed_ip(
        self, 
        ip: str, 
        max_requests: int = 100, 
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Check if IP is within rate limit
        Returns: (allowed, remaining_requests)
        """
        now = time.time()
        
        # Clean old entries
        if ip in self._ip_requests:
            self._ip_requests[ip] = self._clean_old_entries(
                self._ip_requests[ip], window_seconds
            )
        else:
            self._ip_requests[ip] = []
        
        # Count recent requests
        total_requests = sum(count for ts, count in self._ip_requests[ip])
        
        if total_requests >= max_requests:
            return False, 0
        
        # Add current request
        self._ip_requests[ip].append((now, 1))
        
        remaining = max_requests - total_requests - 1
        return True, remaining
    
    def is_allowed_user(
        self, 
        user_id: str, 
        max_requests: int = 1000, 
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """Check if user is within rate limit"""
        now = time.time()
        
        if user_id in self._user_requests:
            self._user_requests[user_id] = self._clean_old_entries(
                self._user_requests[user_id], window_seconds
            )
        else:
            self._user_requests[user_id] = []
        
        total_requests = sum(count for ts, count in self._user_requests[user_id])
        
        if total_requests >= max_requests:
            return False, 0
        
        self._user_requests[user_id].append((now, 1))
        remaining = max_requests - total_requests - 1
        return True, remaining
    
    def check_brute_force(
        self, 
        ip: str, 
        max_attempts: int = 5, 
        window_seconds: int = 300  # 5 minutes
    ) -> Tuple[bool, int]:
        """
        Check for brute force login attempts
        Returns: (allowed, remaining_attempts)
        """
        now = time.time()
        
        if ip in self._failed_attempts:
            self._failed_attempts[ip] = self._clean_old_entries(
                self._failed_attempts[ip], window_seconds
            )
        else:
            self._failed_attempts[ip] = []
        
        total_failed = sum(count for ts, count in self._failed_attempts[ip])
        
        if total_failed >= max_attempts:
            return False, 0
        
        remaining = max_attempts - total_failed
        return True, remaining
    
    def record_failed_attempt(self, ip: str):
        """Record a failed login attempt"""
        now = time.time()
        if ip not in self._failed_attempts:
            self._failed_attempts[ip] = []
        self._failed_attempts[ip].append((now, 1))
    
    def clear_failed_attempts(self, ip: str):
        """Clear failed attempts after successful login"""
        if ip in self._failed_attempts:
            del self._failed_attempts[ip]


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    # Check for forwarded IP (behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


def rate_limit(
    requests_per_minute: int = 60,
    requests_per_hour: int = 1000
):
    """
    Decorator to apply rate limiting to endpoints
    
    Usage:
        @router.get("/endpoint")
        @rate_limit(requests_per_minute=30)
        async def my_endpoint(request: Request):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request in args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for kwarg in kwargs.values():
                    if isinstance(kwarg, Request):
                        request = kwarg
                        break
            
            if request:
                ip = get_client_ip(request)
                allowed, remaining = rate_limiter.is_allowed_ip(
                    ip, 
                    max_requests=requests_per_minute,
                    window_seconds=60
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again later.",
                        headers={"Retry-After": "60"}
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def brute_force_protection(max_attempts: int = 5, window_seconds: int = 300):
    """
    Decorator to protect against brute force attacks
    
    Usage:
        @router.post("/login")
        @brute_force_protection(max_attempts=5)
        async def login(request: Request, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for kwarg in kwargs.values():
                    if isinstance(kwarg, Request):
                        request = kwarg
                        break
            
            if request:
                ip = get_client_ip(request)
                allowed, remaining = rate_limiter.check_brute_force(
                    ip, 
                    max_attempts=max_attempts,
                    window_seconds=window_seconds
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many failed attempts. Please try again in {window_seconds // 60} minutes.",
                        headers={"Retry-After": str(window_seconds)}
                    )
            
            try:
                result = await func(*args, **kwargs)
                # Clear failed attempts on success
                if request:
                    rate_limiter.clear_failed_attempts(get_client_ip(request))
                return result
            except HTTPException as e:
                # Record failed attempt for 401 errors
                if e.status_code == 401 and request:
                    rate_limiter.record_failed_attempt(get_client_ip(request))
                raise
        return wrapper
    return decorator
