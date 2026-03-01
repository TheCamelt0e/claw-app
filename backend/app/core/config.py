"""
Application configuration - SECURITY HARDENED
"""
from pydantic_settings import BaseSettings
from typing import List, Dict, Any
import secrets
import sys


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str = "sqlite:///./claw_app.db"
    
    # Security - NO DEFAULT! Must be set via environment
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenAI (optional, legacy)
    OPENAI_API_KEY: str = ""
    
    # Gemini API (primary AI provider)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # Rate Limiting
    GEMINI_RPM_LIMIT: int = 15  # Requests per minute (free tier)
    GEMINI_RPD_LIMIT: int = 1500  # Requests per day (free tier)
    
    # App settings
    APP_NAME: str = "CLAW"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # Email Configuration
    EMAIL_PROVIDER: str = "smtp"  # Options: smtp, sendgrid, ses
    EMAIL_FROM: str = "noreply@claw.app"
    EMAIL_FROM_NAME: str = "CLAW"
    FRONTEND_URL: str = "https://claw.app"
    
    # SMTP Settings (for development or self-hosted)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    
    # SendGrid Settings
    SENDGRID_API_KEY: str = ""
    
    # AWS SES Settings
    AWS_REGION: str = "us-east-1"
    
    # Security Settings
    REQUIRE_EMAIL_VERIFICATION: bool = True  # Enabled by default for security
    
    # Redis Configuration (for distributed rate limiting and caching)
    REDIS_URL: str = ""  # e.g., redis://localhost:6379/0 or rediss:// for TLS
    
    # Audit Logging
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 90
    
    # CORS Settings
    ADDITIONAL_CORS_ORIGINS: str = ""  # Comma-separated list
    
    class Config:
        env_file = ".env"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_security()
    
    def _validate_security(self):
        """Validate critical security settings on startup"""
        # Validate SECRET_KEY
        if not self.SECRET_KEY:
            print("[FATAL] SECRET_KEY environment variable is not set!")
            print("[FATAL] Generate a secure key with: python -c 'import secrets; print(secrets.token_hex(32))'")
            sys.exit(1)
        
        if len(self.SECRET_KEY) < 32:
            print(f"[FATAL] SECRET_KEY must be at least 32 characters (current: {len(self.SECRET_KEY)})")
            sys.exit(1)
        
        if self.SECRET_KEY == "dev-secret-key-change-in-production":
            print("[FATAL] You are using the default SECRET_KEY!")
            print("[FATAL] Set a secure SECRET_KEY environment variable immediately.")
            sys.exit(1)
        
        # Validate production settings
        if self.is_production():
            if not self.GEMINI_API_KEY:
                print("[WARN] GEMINI_API_KEY not set. AI features will use fallback categorization.")
            
            if self.EMAIL_PROVIDER == "smtp" and (not self.SMTP_USER or not self.SMTP_PASS):
                print("[WARN] SMTP credentials not configured for production!")
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT.lower() == "development"
    
    def get_cors_origins(self) -> List[str]:
        """Get allowed CORS origins based on environment"""
        if self.is_development():
            return ["*"]  # Allow all in development
        
        # Production: whitelist only
        origins = [
            "https://claw.app",
            "https://www.claw.app",
            "capacitor://localhost",  # iOS mobile app
            "ionic://localhost",      # Android mobile app
            "http://localhost:3000",  # Local development
            "http://localhost:8100",
            "null",                   # React Native fetch origin (APK builds)
            "file://",                # File protocol
        ]
        
        # Add any additional origins from environment
        if self.ADDITIONAL_CORS_ORIGINS:
            origins.extend([o.strip() for o in self.ADDITIONAL_CORS_ORIGINS.split(",")])
        
        return origins


# Singleton instance
settings = Settings()


# Icelandic store locations for geofencing
ICELANDIC_STORES: List[Dict[str, Any]] = [
    {"name": "Bónus Laugavegur", "chain": "bonus", "lat": 64.1466, "lng": -21.9426},
    {"name": "Bónus Hallveigarstígur", "chain": "bonus", "lat": 64.1455, "lng": -21.9390},
    {"name": "Bónus Fiskislóð", "chain": "bonus", "lat": 64.1567, "lng": -21.9434},
    {"name": "Bónus Kópavogur", "chain": "bonus", "lat": 64.1123, "lng": -21.8901},
    {"name": "Krónan Borgartún", "chain": "kronan", "lat": 64.1442, "lng": -21.8853},
    {"name": "Krónan Grandi", "chain": "kronan", "lat": 64.1567, "lng": -21.9434},
    {"name": "Krónan Garðabær", "chain": "kronan", "lat": 64.0889, "lng": -21.9256},
    {"name": "Hagkaup Miklabær", "chain": "hagkaup", "lat": 64.1284, "lng": -21.8845},
    {"name": "Hagkaup Kringlan", "chain": "hagkaup", "lat": 64.1342, "lng": -21.8943},
    {"name": "Nettó Laugavegur", "chain": "netto", "lat": 64.1466, "lng": -21.9426},
    {"name": "Nettó Hamraborg", "chain": "netto", "lat": 64.0889, "lng": -21.9256},
    {"name": "Krambúðin Skeifan", "chain": "krambudin", "lat": 64.1442, "lng": -21.8853},
    {"name": "Samkaup Ströndin", "chain": "samkaup", "lat": 64.1567, "lng": -21.9434},
    {"name": "Víðir Borgartún", "chain": "vidir", "lat": 64.1442, "lng": -21.8853},
    {"name": "Aðalbjörn Hafnarfjörður", "chain": "adalbjorn", "lat": 64.0678, "lng": -21.9489},
    {"name": "Costco Garðabær", "chain": "costco", "lat": 64.0889, "lng": -21.9256},
]

# Geofencing settings
GEOFENCE_RADIUS_METERS: int = 200  # Distance to trigger notification
NOTIFICATION_COOLDOWN_MINUTES: int = 5  # Minimum time between notifications

# VIP settings
VIP_EXPIRY_DAYS: int = 3
HIGH_PRIORITY_EXPIRY_DAYS: int = 1
DEFAULT_EXPIRY_DAYS: int = 7
FREE_TIER_CLAW_LIMIT: int = 50
