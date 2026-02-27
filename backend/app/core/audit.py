"""
Audit logging system for tracking user actions
Logs to database for persistence, optionally to Redis for real-time monitoring
"""
import json
import uuid
import logging
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from functools import wraps

from sqlalchemy import Column, String, DateTime, Text, Integer, Index
from sqlalchemy.orm import Session

from app.core.database import Base, get_db
from app.core.redis import redis_client

try:
    from fastapi import Request, Depends
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Audit action types"""
    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    EMAIL_VERIFICATION_SENT = "email_verification_sent"
    EMAIL_VERIFIED = "email_verified"
    TOKEN_REFRESH = "token_refresh"
    
    # Claw Operations
    CLAW_CAPTURE = "claw_capture"
    CLAW_STRIKE = "claw_strike"
    CLAW_RELEASE = "claw_release"
    CLAW_EXTEND = "claw_extend"
    CLAW_VIEW = "claw_view"
    CLAW_UPDATE = "claw_update"
    
    # User Operations
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    SETTINGS_UPDATE = "settings_update"
    
    # Group Operations
    GROUP_CREATE = "group_create"
    GROUP_JOIN = "group_join"
    GROUP_LEAVE = "group_leave"
    GROUP_INVITE = "group_invite"
    
    # Admin Operations
    ADMIN_USER_DELETE = "admin_user_delete"
    ADMIN_USER_SUSPEND = "admin_user_suspend"
    ADMIN_CONFIG_UPDATE = "admin_config_update"
    
    # Security
    RATE_LIMIT_HIT = "rate_limit_hit"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


class AuditLog(Base):
    """Database model for audit logs"""
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Who
    user_id = Column(String(36), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    
    # What
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)  # claw, user, group, etc.
    resource_id = Column(String(36), nullable=True)
    
    # Where
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    
    # Context
    details = Column(Text, nullable=True)  # JSON string
    status = Column(String(20), default="success")  # success, failure, error
    error_message = Column(Text, nullable=True)
    
    # When
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Performance
    duration_ms = Column(Integer, nullable=True)
    
    __table_args__ = (
        Index('idx_audit_user_action', 'user_id', 'action'),
        Index('idx_audit_action_time', 'action', 'created_at'),
        Index('idx_audit_resource', 'resource_type', 'resource_id'),
    )


class AuditLogger:
    """
    Audit logger for tracking user actions
    Logs to database and optionally publishes to Redis for real-time monitoring
    """
    
    def __init__(self):
        self._batch_size = 100
        self._batch_queue: List[Dict] = []
    
    async def log(
        self,
        action: AuditAction,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Optional[str]:
        """
        Log an audit event
        
        Args:
            action: Type of action performed
            user_id: User who performed the action
            user_email: User's email for easier querying
            resource_type: Type of resource affected (claw, user, etc.)
            resource_id: ID of affected resource
            ip_address: Client IP address
            user_agent: Client user agent
            details: Additional context (will be JSON serialized)
            status: success, failure, or error
            error_message: Error details if status is failure/error
            duration_ms: Request duration in milliseconds
            db: Database session (if None, uses Redis pub/sub)
        
        Returns:
            Log entry ID or None if logging failed
        """
        log_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Sanitize details (remove sensitive fields)
        safe_details = self._sanitize_details(details or {})
        
        log_entry = {
            "id": log_id,
            "user_id": user_id,
            "user_email": user_email,
            "action": action.value if isinstance(action, AuditAction) else action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent[:500] if user_agent else None,  # Limit length
            "details": json.dumps(safe_details) if safe_details else None,
            "status": status,
            "error_message": error_message,
            "created_at": now.isoformat(),
            "duration_ms": duration_ms
        }
        
        try:
            # Publish to Redis for real-time monitoring (if available)
            if redis_client.is_enabled():
                await redis_client._redis.publish(
                    "audit:logs",
                    json.dumps(log_entry, default=str)
                )
                
                # Also add to recent logs list (keep last 1000)
                await redis_client._redis.lpush("audit:recent", json.dumps(log_entry, default=str))
                await redis_client._redis.ltrim("audit:recent", 0, 999)
            
            # If database session provided, persist to DB
            if db is not None:
                self._persist_to_db(db, log_entry)
            else:
                # Queue for batch insert
                self._batch_queue.append(log_entry)
                if len(self._batch_queue) >= self._batch_size:
                    await self._flush_batch()
            
            return log_id
            
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
            return None
    
    def _sanitize_details(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive fields from details"""
        sensitive_fields = {
            'password', 'token', 'secret', 'api_key', 'credit_card',
            'ssn', 'access_token', 'refresh_token', 'hashed_password'
        }
        
        sanitized = {}
        for key, value in details.items():
            if key.lower() in sensitive_fields:
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _persist_to_db(self, db: Session, log_entry: Dict):
        """Persist log entry to database"""
        audit_log = AuditLog(
            id=log_entry["id"],
            user_id=log_entry["user_id"],
            user_email=log_entry["user_email"],
            action=log_entry["action"],
            resource_type=log_entry["resource_type"],
            resource_id=log_entry["resource_id"],
            ip_address=log_entry["ip_address"],
            user_agent=log_entry["user_agent"],
            details=log_entry["details"],
            status=log_entry["status"],
            error_message=log_entry["error_message"],
            duration_ms=log_entry["duration_ms"]
        )
        db.add(audit_log)
        db.commit()
    
    async def _flush_batch(self):
        """Flush batched logs to database"""
        if not self._batch_queue:
            return
        
        # This would need a database session - for now just log
        logger.debug(f"Flushing {len(self._batch_queue)} audit log entries")
        self._batch_queue.clear()
    
    async def get_user_activity(
        self,
        user_id: str,
        limit: int = 50,
        db: Optional[Session] = None
    ) -> List[Dict]:
        """Get recent activity for a user"""
        if db is None:
            return []
        
        logs = db.query(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(
            AuditLog.created_at.desc()
        ).limit(limit).all()
        
        return [self._to_dict(log) for log in logs]
    
    async def get_resource_history(
        self,
        resource_type: str,
        resource_id: str,
        db: Optional[Session] = None
    ) -> List[Dict]:
        """Get audit history for a specific resource"""
        if db is None:
            return []
        
        logs = db.query(AuditLog).filter(
            AuditLog.resource_type == resource_type,
            AuditLog.resource_id == resource_id
        ).order_by(
            AuditLog.created_at.desc()
        ).all()
        
        return [self._to_dict(log) for log in logs]
    
    async def get_security_events(
        self,
        hours: int = 24,
        db: Optional[Session] = None
    ) -> List[Dict]:
        """Get security-related events"""
        if db is None:
            return []
        
        from datetime import timedelta
        
        security_actions = [
            AuditAction.BRUTE_FORCE_ATTEMPT,
            AuditAction.RATE_LIMIT_HIT,
            AuditAction.SUSPICIOUS_ACTIVITY,
            AuditAction.PASSWORD_RESET_REQUEST,
            AuditAction.PASSWORD_RESET_COMPLETE
        ]
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        logs = db.query(AuditLog).filter(
            AuditLog.action.in_([a.value for a in security_actions]),
            AuditLog.created_at >= since
        ).order_by(
            AuditLog.created_at.desc()
        ).all()
        
        return [self._to_dict(log) for log in logs]
    
    def _to_dict(self, log: AuditLog) -> Dict:
        """Convert AuditLog to dictionary"""
        return {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "details": json.loads(log.details) if log.details else None,
            "duration_ms": log.duration_ms
        }


# Global audit logger instance
audit_logger = AuditLogger()


# Decorator for automatic audit logging
def audit_log(
    action: AuditAction,
    resource_type: Optional[str] = None,
    get_resource_id = None,
    include_request_body: bool = False
):
    """
    Decorator to automatically log endpoint access
    
    Usage:
        @router.post("/claws")
        @audit_log(AuditAction.CLAW_CAPTURE, resource_type="claw")
        async def capture_claw(request: Request, current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not FASTAPI_AVAILABLE:
                return await func(*args, **kwargs)
            
            # Extract request and user from kwargs
            request = kwargs.get('request') or kwargs.get('http_request')
            current_user = kwargs.get('current_user')
            
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            start_time = datetime.utcnow()
            error_message = None
            status = "success"
            result = None
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "error"
                error_message = str(e)
                raise
            finally:
                duration = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                # Get resource ID if function provided
                resource_id = None
                if get_resource_id and result:
                    try:
                        resource_id = get_resource_id(result)
                    except Exception:
                        pass
                
                # Build details
                details = {}
                if include_request_body and request:
                    try:
                        body = await request.body()
                        details["request_body"] = body.decode()[:1000]  # Limit size
                    except Exception:
                        pass
                
                # Get IP and user agent
                ip_address = None
                user_agent = None
                if request:
                    from app.core.rate_limit import get_client_ip
                    ip_address = get_client_ip(request)
                    user_agent = request.headers.get("user-agent")
                
                # Get DB session if available
                db = kwargs.get('db')
                
                # Fire and forget audit log
                import asyncio
                asyncio.create_task(audit_logger.log(
                    action=action,
                    user_id=getattr(current_user, 'id', None) if current_user else None,
                    user_email=getattr(current_user, 'email', None) if current_user else None,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details=details,
                    status=status,
                    error_message=error_message,
                    duration_ms=duration,
                    db=db
                ))
        
        return wrapper
    return decorator


# Convenience functions for common audit events
async def log_login(
    user_id: str,
    user_email: str,
    ip_address: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    db: Optional[Session] = None
):
    """Log a login attempt"""
    await audit_logger.log(
        action=AuditAction.LOGIN,
        user_id=user_id,
        user_email=user_email,
        ip_address=ip_address,
        status="success" if success else "failure",
        error_message=error_message,
        db=db
    )


async def log_claw_action(
    action: AuditAction,
    user_id: str,
    claw_id: str,
    ip_address: Optional[str] = None,
    db: Optional[Session] = None
):
    """Log a claw operation"""
    await audit_logger.log(
        action=action,
        user_id=user_id,
        resource_type="claw",
        resource_id=claw_id,
        ip_address=ip_address,
        db=db
    )


async def log_security_event(
    action: AuditAction,
    ip_address: str,
    details: Optional[Dict] = None,
    user_id: Optional[str] = None
):
    """Log a security event"""
    await audit_logger.log(
        action=action,
        user_id=user_id,
        ip_address=ip_address,
        details=details,
        status="warning"
    )
