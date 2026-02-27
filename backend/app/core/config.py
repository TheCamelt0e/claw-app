"""
Application configuration
"""
from pydantic_settings import BaseSettings
from typing import List, Dict, Any


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str = "sqlite:///./claw_app.db"
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
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
    REQUIRE_EMAIL_VERIFICATION: bool = False  # Set to True in production
    
    # Redis Configuration (for distributed rate limiting and caching)
    REDIS_URL: str = ""  # e.g., redis://localhost:6379/0 or rediss:// for TLS
    
    # Audit Logging
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 90
    
    class Config:
        env_file = ".env"


# Singleton instance
settings = Settings()

# Validate critical settings on import
def validate_settings():
    """Validate that required settings are configured for production"""
    import warnings
    
    if not settings.GEMINI_API_KEY:
        warnings.warn(
            "GEMINI_API_KEY not set. AI features will use fallback categorization.",
            RuntimeWarning
        )
    
    if settings.SECRET_KEY == "dev-secret-key-change-in-production":
        warnings.warn(
            "Using default SECRET_KEY. Set a secure SECRET_KEY environment variable for production!",
            RuntimeWarning
        )

validate_settings()


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
