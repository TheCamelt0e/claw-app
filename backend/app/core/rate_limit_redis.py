"""
Distributed rate limiting using Redis
Falls back to in-memory storage if Redis is not available
"""
import time
import logging
from typing import Tuple, Optional
from functools import wraps
from fastapi import Request, HTTPException, status

from app.core.redis import redis_client

logger = logging.getLogger(__name__)


class DistributedRateLimiter:
    """
    Distributed rate limiter using Redis for multi-instance deployments
    Falls back to in-memory storage when Redis is not available
    """
    
    def __init__(self):
        self._local_fallback = {}
    
    def _get_key(self, prefix: str, identifier: str) -> str:
        """Generate Redis key for rate limit tracking"""
        return f"ratelimit:{prefix}:{identifier}"
    
    async def is_allowed(
        self,
        identifier: str,
        max_requests: int = 100,
        window_seconds: int = 60,
        prefix: str = "ip"
    ) -> Tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit
        
        Args:
            identifier: IP address or user ID
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            prefix: Key prefix (ip, user, endpoint)
        
        Returns:
            Tuple of (allowed: bool, remaining: int, reset_after: int)
        """
        key = self._get_key(prefix, identifier)
        now = int(time.time())
        window_start = now - window_seconds
        
        try:
            if redis_client.is_enabled():
                # Use Redis sliding window
                pipe = redis_client._redis.pipeline()
                
                # Remove old entries outside window
                pipe.zremrangebyscore(key, 0, window_start)
                
                # Count current requests in window
                pipe.zcard(key)
                
                # Add current request
                pipe.zadd(key, {str(now): now})
                
                # Set expiration on the key
                pipe.expire(key, window_seconds)
                
                results = await pipe.execute()
                current_count = results[1]
                
                if current_count >= max_requests:
                    # Remove the request we just added since it's over limit
                    await redis_client._redis.zrem(key, str(now))
                    
                    # Get oldest timestamp for reset time calculation
                    oldest = await redis_client._redis.zrange(key, 0, 0, withscores=True)
                    reset_after = int(oldest[0][1] + window_seconds - now) if oldest else window_seconds
                    
                    return False, 0, max(1, reset_after)
                
                remaining = max_requests - current_count - 1
                return True, remaining, 0
            
            else:
                # Fallback to in-memory using simple counter
                key_local = f"{prefix}:{identifier}"
                now_local = time.time()
                
                if key_local not in self._local_fallback:
                    self._local_fallback[key_local] = []
                
                # Clean old entries
                self._local_fallback[key_local] = [
                    ts for ts in self._local_fallback[key_local]
                    if now_local - ts < window_seconds
                ]
                
                current_count = len(self._local_fallback[key_local])
                
                if current_count >= max_requests:
                    oldest = self._local_fallback[key_local][0] if self._local_fallback[key_local] else now_local
                    reset_after = int(oldest + window_seconds - now_local)
                    return False, 0, max(1, reset_after)
                
                self._local_fallback[key_local].append(now_local)
                remaining = max_requests - current_count - 1
                return True, remaining, 0
                
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request on error
            return True, max_requests - 1, 0
    
    async def check_brute_force(
        self,
        identifier: str,
        max_attempts: int = 5,
        window_seconds: int = 300,
        prefix: str = "brute"
    ) -> Tuple[bool, int, int]:
        """
        Check for brute force attempts
        
        Returns:
            Tuple of (allowed: bool, remaining: int, lockout_seconds: int)
        """
        key = self._get_key(prefix, identifier)
        
        try:
            if redis_client.is_enabled():
                count = await redis_client._redis.get(key)
                count = int(count) if count else 0
                
                if count >= max_attempts:
                    # Check TTL to know how long to lock out
                    ttl = await redis_client._redis.ttl(key)
                    return False, 0, max(1, ttl)
                
                return True, max_attempts - count, 0
            else:
                # Fallback
                key_local = f"{prefix}:{identifier}"
                count = self._local_fallback.get(key_local, 0)
                
                if count >= max_attempts:
                    return False, 0, window_seconds
                
                return True, max_attempts - count, 0
                
        except Exception as e:
            logger.error(f"Brute force check failed: {e}")
            return True, max_attempts, 0
    
    async def record_failed_attempt(
        self,
        identifier: str,
        window_seconds: int = 300,
        prefix: str = "brute"
    ):
        """Record a failed attempt"""
        key = self._get_key(prefix, identifier)
        
        try:
            if redis_client.is_enabled():
                pipe = redis_client._redis.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds)
                await pipe.execute()
            else:
                key_local = f"{prefix}:{identifier}"
                self._local_fallback[key_local] = self._local_fallback.get(key_local, 0) + 1
                
        except Exception as e:
            logger.error(f"Failed to record attempt: {e}")
    
    async def clear_failed_attempts(self, identifier: str, prefix: str = "brute"):
        """Clear failed attempts after successful login"""
        key = self._get_key(prefix, identifier)
        
        try:
            if redis_client.is_enabled():
                await redis_client._redis.delete(key)
            else:
                key_local = f"{prefix}:{identifier}"
                self._local_fallback.pop(key_local, None)
                
        except Exception as e:
            logger.error(f"Failed to clear attempts: {e}")
    
    async def get_current_count(self, identifier: str, window_seconds: int = 60, prefix: str = "ip") -> int:
        """Get current request count for identifier"""
        key = self._get_key(prefix, identifier)
        now = int(time.time())
        window_start = now - window_seconds
        
        try:
            if redis_client.is_enabled():
                await redis_client._redis.zremrangebyscore(key, 0, window_start)
                return await redis_client._redis.zcard(key)
            else:
                key_local = f"{prefix}:{identifier}"
                if key_local not in self._local_fallback:
                    return 0
                now_local = time.time()
                return len([
                    ts for ts in self._local_fallback[key_local]
                    if now_local - ts < window_seconds
                ])
        except Exception as e:
            logger.error(f"Failed to get count: {e}")
            return 0


# Global distributed rate limiter
distributed_rate_limiter = DistributedRateLimiter()


# Compatibility wrappers for existing code
def rate_limit_distributed(
    requests_per_minute: int = 60,
    key_func = None
):
    """
    Decorator for distributed rate limiting
    
    Usage:
        @router.get("/endpoint")
        @rate_limit_distributed(requests_per_minute=30)
        async def my_endpoint(request: Request):
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
                from app.core.rate_limit import get_client_ip
                
                identifier = key_func(request) if key_func else get_client_ip(request)
                allowed, remaining, reset_after = await distributed_rate_limiter.is_allowed(
                    identifier,
                    max_requests=requests_per_minute,
                    window_seconds=60
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Try again in {reset_after} seconds.",
                        headers={
                            "Retry-After": str(reset_after),
                            "X-RateLimit-Limit": str(requests_per_minute),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(int(time.time()) + reset_after)
                        }
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def check_rate_limit(
    identifier: str,
    max_requests: int = 100,
    window_seconds: int = 60
) -> Tuple[bool, dict]:
    """
    Check rate limit and return detailed info
    
    Returns:
        Tuple of (allowed: bool, headers: dict)
    """
    allowed, remaining, reset_after = await distributed_rate_limiter.is_allowed(
        identifier,
        max_requests=max_requests,
        window_seconds=window_seconds
    )
    
    headers = {
        "X-RateLimit-Limit": str(max_requests),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(int(time.time()) + reset_after) if reset_after else str(int(time.time()))
    }
    
    return allowed, headers
