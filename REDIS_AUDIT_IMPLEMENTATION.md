# 🔴 Redis & Audit Logging Implementation

## Overview

Added distributed rate limiting with Redis and comprehensive audit logging for security monitoring.

## What Was Implemented

### 1. Redis Client (`backend/app/core/redis.py`)

**Features:**
- Async Redis client with connection pooling
- Automatic fallback to in-memory storage
- Support for Redis URL configuration
- Common operations: get, set, delete, increment, expire, sets, lists

**Usage:**
```python
from app.core.redis import redis_client

# Connect (happens automatically on startup)
await redis_client.connect()

# Use Redis
await redis_client.set("key", "value", expire=3600)
value = await redis_client.get("key")

# Check if enabled
if redis_client.is_enabled():
    # Use Redis features
```

### 2. Distributed Rate Limiting (`backend/app/core/rate_limit_redis.py`)

**Features:**
- Sliding window rate limiting using Redis sorted sets
- Brute force protection across multiple instances
- Automatic fallback to in-memory if Redis unavailable
- Rate limit headers in responses

**Decorator Usage:**
```python
from app.core.rate_limit_redis import rate_limit_distributed

@router.get("/endpoint")
@rate_limit_distributed(requests_per_minute=30)
async def my_endpoint(request: Request):
    ...
```

**Manual Usage:**
```python
from app.core.rate_limit_redis import distributed_rate_limiter

allowed, remaining, reset_after = await distributed_rate_limiter.is_allowed(
    identifier=user_id,
    max_requests=100,
    window_seconds=60
)
```

### 3. Audit Logging (`backend/app/core/audit.py`)

**Features:**
- Comprehensive audit trail of all user actions
- Database persistence + Redis pub/sub for real-time monitoring
- Automatic PII/sensitive data redaction
- Query APIs for user activity and security events

**Action Types:**
```python
class AuditAction(str, Enum):
    # Authentication
    LOGIN, LOGOUT, REGISTER, PASSWORD_CHANGE
    PASSWORD_RESET_REQUEST, PASSWORD_RESET_COMPLETE
    EMAIL_VERIFIED, TOKEN_REFRESH
    
    # Claw Operations
    CLAW_CAPTURE, CLAW_STRIKE, CLAW_RELEASE
    
    # Security
    RATE_LIMIT_HIT, BRUTE_FORCE_ATTEMPT, SUSPICIOUS_ACTIVITY
```

**Decorator Usage:**
```python
from app.core.audit import audit_log, AuditAction

@router.post("/claws")
@audit_log(AuditAction.CLAW_CAPTURE, resource_type="claw")
async def capture_claw(request: Request, current_user: User = Depends(get_current_user)):
    ...
```

**Manual Logging:**
```python
from app.core.audit import audit_logger, AuditAction

await audit_logger.log(
    action=AuditAction.CLAW_CAPTURE,
    user_id=user.id,
    user_email=user.email,
    resource_type="claw",
    resource_id=claw_id,
    ip_address=client_ip,
    details={"content_type": "text"}
)
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0
# or for TLS: rediss://user:pass@host:6380/0

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=90
```

### Render Configuration

The `render.yaml` includes optional Redis configuration:

```yaml
# Add to envVars:
- key: REDIS_URL
  fromService:
    name: claw-redis
    type: redis
    property: connectionString
```

To add Redis on Render:
1. Go to Dashboard → New → Redis
2. Name it `claw-redis`
3. Connect it to your web service

## Database Schema

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,  -- JSON
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX idx_audit_action_time ON audit_logs(action, created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
```

## Querying Audit Logs

### Get User Activity

```python
logs = await audit_logger.get_user_activity(
    user_id="user-uuid",
    limit=50,
    db=db_session
)
```

### Get Resource History

```python
logs = await audit_logger.get_resource_history(
    resource_type="claw",
    resource_id="claw-uuid",
    db=db_session
)
```

### Get Security Events

```python
logs = await audit_logger.get_security_events(
    hours=24,
    db=db_session
)
```

## Real-Time Monitoring

With Redis enabled, audit logs are published to the `audit:logs` channel:

```python
import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379/0")
pubsub = r.pubsub()
await pubsub.subscribe("audit:logs")

async for message in pubsub.listen():
    if message["type"] == "message":
        log_entry = json.loads(message["data"])
        print(f"New audit log: {log_entry}")
```

## Fallback Behavior

When Redis is not configured or unavailable:

| Feature | Fallback |
|---------|----------|
| Rate Limiting | In-memory dictionary |
| Brute Force Protection | In-memory counter |
| Audit Log Pub/Sub | Skipped (still logs to DB) |
| Recent Logs List | Not available |

## Performance Considerations

### With Redis
- Rate limiting: O(log N) for sorted set operations
- Audit logging: Async fire-and-forget (no latency impact)
- 1000 recent logs kept in Redis list for fast access

### Without Redis (In-Memory)
- Rate limiting: O(N) for list filtering
- Memory usage grows with unique IPs/users
- Lost on application restart

## Security Best Practices

1. **Enable Redis in production** for consistent rate limiting across instances
2. **Set AUDIT_LOG_RETENTION_DAYS** to comply with data retention policies
3. **Monitor audit logs** for suspicious activity patterns
4. **Use TLS for Redis** (rediss:// URL) in production
5. **Regular backups** of audit_logs table for compliance

## Files Created/Modified

| File | Description |
|------|-------------|
| `backend/app/core/redis.py` | NEW: Redis client with fallback |
| `backend/app/core/rate_limit_redis.py` | NEW: Distributed rate limiting |
| `backend/app/core/audit.py` | NEW: Audit logging system |
| `backend/app/core/config.py` | ADDED: Redis and audit config |
| `backend/app/models/__init__.py` | ADDED: AuditLog import |
| `backend/app/main.py` | UPDATED: Redis initialization |
| `backend/requirements-prod.txt` | ADDED: redis, prometheus-client |
| `render.yaml` | ADDED: Redis config options |

## Migration Notes

The audit_logs table is created automatically when the application starts (via SQLAlchemy). No manual migration needed.
