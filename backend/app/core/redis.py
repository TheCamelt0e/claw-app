"""
Redis client configuration for distributed rate limiting and caching
Falls back to in-memory if Redis is not configured
"""
import json
import logging
from typing import Optional, Any, Union
from datetime import timedelta

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Redis client wrapper with fallback to in-memory storage
    """
    
    def __init__(self):
        self._redis: Optional[Any] = None
        self._memory_store: dict = {}
        self._enabled = False
        
    async def connect(self):
        """Connect to Redis if configured"""
        redis_url = getattr(settings, 'REDIS_URL', None)
        
        if not REDIS_AVAILABLE:
            logger.info("Redis package not installed, using in-memory storage")
            return
        
        if not redis_url:
            logger.info("REDIS_URL not configured, using in-memory storage")
            return
        
        try:
            self._redis = redis.from_url(
                redis_url,
                encoding='utf-8',
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30
            )
            await self._redis.ping()
            self._enabled = True
            logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Falling back to in-memory storage")
            self._redis = None
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self._redis:
            await self._redis.close()
            self._enabled = False
            logger.info("Redis disconnected")
    
    async def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        if self._enabled and self._redis:
            return await self._redis.get(key)
        return self._memory_store.get(key)
    
    async def set(
        self, 
        key: str, 
        value: Union[str, int, float], 
        expire: Optional[int] = None
    ) -> bool:
        """Set value with optional expiration (seconds)"""
        if self._enabled and self._redis:
            if expire:
                return await self._redis.setex(key, expire, str(value))
            return await self._redis.set(key, str(value))
        
        self._memory_store[key] = str(value)
        return True
    
    async def delete(self, key: str) -> int:
        """Delete key(s)"""
        if self._enabled and self._redis:
            return await self._redis.delete(key)
        
        count = 0
        if key in self._memory_store:
            del self._memory_store[key]
            count = 1
        return count
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if self._enabled and self._redis:
            return await self._redis.exists(key) > 0
        return key in self._memory_store
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment value by amount"""
        if self._enabled and self._redis:
            return await self._redis.incrby(key, amount)
        
        current = int(self._memory_store.get(key, 0))
        new_value = current + amount
        self._memory_store[key] = str(new_value)
        return new_value
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key"""
        if self._enabled and self._redis:
            return await self._redis.expire(key, seconds)
        # In-memory: we don't really expire, just return True
        return key in self._memory_store
    
    async def ttl(self, key: str) -> int:
        """Get time to live for key"""
        if self._enabled and self._redis:
            return await self._redis.ttl(key)
        # In-memory: pretend keys live forever
        return -1 if key in self._memory_store else -2
    
    async def sadd(self, key: str, *members) -> int:
        """Add members to set"""
        if self._enabled and self._redis:
            return await self._redis.sadd(key, *members)
        
        if key not in self._memory_store:
            self._memory_store[key] = set()
        
        added = 0
        for member in members:
            if member not in self._memory_store[key]:
                self._memory_store[key].add(member)
                added += 1
        return added
    
    async def smembers(self, key: str) -> set:
        """Get all members of set"""
        if self._enabled and self._redis:
            return await self._redis.smembers(key)
        return self._memory_store.get(key, set())
    
    async def srem(self, key: str, *members) -> int:
        """Remove members from set"""
        if self._enabled and self._redis:
            return await self._redis.srem(key, *members)
        
        if key not in self._memory_store:
            return 0
        
        removed = 0
        for member in members:
            if member in self._memory_store[key]:
                self._memory_store[key].discard(member)
                removed += 1
        return removed
    
    async def lpush(self, key: str, *values) -> int:
        """Push values to list (left)"""
        if self._enabled and self._redis:
            return await self._redis.lpush(key, *values)
        
        if key not in self._memory_store:
            self._memory_store[key] = []
        
        for value in reversed(values):
            self._memory_store[key].insert(0, value)
        return len(self._memory_store[key])
    
    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """Trim list to range"""
        if self._enabled and self._redis:
            return await self._redis.ltrim(key, start, end)
        
        if key in self._memory_store:
            self._memory_store[key] = self._memory_store[key][start:end+1]
        return True
    
    async def lrange(self, key: str, start: int, end: int) -> list:
        """Get range from list"""
        if self._enabled and self._redis:
            return await self._redis.lrange(key, start, end)
        
        if key not in self._memory_store:
            return []
        return self._memory_store[key][start:end+1]
    
    def is_enabled(self) -> bool:
        """Check if Redis is enabled"""
        return self._enabled


# Global Redis client instance
redis_client = RedisClient()


async def init_redis():
    """Initialize Redis connection"""
    await redis_client.connect()


async def close_redis():
    """Close Redis connection"""
    await redis_client.disconnect()
