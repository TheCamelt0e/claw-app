"""
SAFE Rate limiting - Simplified version that won't crash
"""
import time
from functools import wraps
from fastapi import Request, HTTPException, status


# Simple in-memory storage
_failed_attempts = {}  # {ip: [(timestamp,), ...]}
_request_counts = {}   # {ip: [(timestamp,), ...]}


def _clean_old(entries, window_seconds):
    """Remove old entries"""
    now = time.time()
    return [ts for ts in entries if now - ts < window_seconds]


def safe_brute_force_protection(max_attempts=5, window_seconds=300):
    """
    Decorator to protect against brute force attacks
    SAFE VERSION - won't crash if request not found
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to find request
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
            
            # If we have a request, check rate limit
            if request:
                try:
                    # Get IP safely
                    ip = request.client.host if request.client else "unknown"
                    if ip == "unknown":
                        forwarded = request.headers.get("X-Forwarded-For")
                        if forwarded:
                            ip = forwarded.split(",")[0].strip()
                    
                    # Check attempts
                    now = time.time()
                    if ip in _failed_attempts:
                        _failed_attempts[ip] = _clean_old(_failed_attempts[ip], window_seconds)
                    else:
                        _failed_attempts[ip] = []
                    
                    if len(_failed_attempts[ip]) >= max_attempts:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"Too many failed attempts. Try again in {window_seconds // 60} minutes."
                        )
                except HTTPException:
                    raise
                except Exception:
                    # If rate limiting fails, allow request (fail open)
                    pass
            
            # Call the actual function
            try:
                result = await func(*args, **kwargs)
                # Success - clear failed attempts
                if request:
                    try:
                        ip = request.client.host if request.client else "unknown"
                        if ip in _failed_attempts:
                            del _failed_attempts[ip]
                    except:
                        pass
                return result
            except HTTPException as e:
                # Record failed attempt for 401 errors
                if e.status_code == 401 and request:
                    try:
                        ip = request.client.host if request.client else "unknown"
                        if ip == "unknown":
                            forwarded = request.headers.get("X-Forwarded-For")
                            if forwarded:
                                ip = forwarded.split(",")[0].strip()
                        if ip not in _failed_attempts:
                            _failed_attempts[ip] = []
                        _failed_attempts[ip].append(time.time())
                    except:
                        pass
                raise
        return wrapper
    return decorator


def safe_rate_limit(requests_per_minute=60):
    """
    Simple rate limiter per IP
    SAFE VERSION
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to find request
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
                try:
                    ip = request.client.host if request.client else "unknown"
                    if ip == "unknown":
                        forwarded = request.headers.get("X-Forwarded-For")
                        if forwarded:
                            ip = forwarded.split(",")[0].strip()
                    
                    now = time.time()
                    if ip in _request_counts:
                        _request_counts[ip] = _clean_old(_request_counts[ip], 60)
                    else:
                        _request_counts[ip] = []
                    
                    if len(_request_counts[ip]) >= requests_per_minute:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Rate limit exceeded. Please try again later."
                        )
                    
                    _request_counts[ip].append(now)
                except HTTPException:
                    raise
                except Exception:
                    # Fail open
                    pass
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
