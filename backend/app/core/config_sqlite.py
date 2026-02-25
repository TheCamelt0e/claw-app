"""
SQLite-compatible configuration for easy testing
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "CLAW"
    DEBUG: bool = True
    
    # Database (SQLite for easy testing)
    DATABASE_URL: str = "sqlite:///./claw.db"
    
    # Redis (disabled for testing)
    REDIS_URL: str = ""
    
    # OpenAI (add your key to test AI features)
    OPENAI_API_KEY: str = ""
    
    # Auth
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["*"]  # Allow all for testing
    
    # Resurfacing
    DEFAULT_CLAW_EXPIRY_DAYS: int = 7
    MAX_FREE_CLAWS: int = 50
    
    class Config:
        env_file = ".env"


settings = Settings()
