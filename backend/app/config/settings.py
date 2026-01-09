from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Google Gemini API
    google_gemini_api_key: Optional[str] = None
    
    # Firebase
    firebase_credentials_path: str = "./app/serviceAccountKey.json"
    
    # Google Calendar API
    google_calendar_client_id: Optional[str] = None
    google_calendar_client_secret: Optional[str] = None
    google_calendar_redirect_uri: str = "http://localhost:8000/api/calendar/callback"
    
    # Cloudinary
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    
    # CORS Settings
    frontend_url: str = "http://localhost:3000"
    
    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance with error handling
try:
    settings = Settings()
except Exception as e:
    print(f"Error loading settings: {e}")
    print("Make sure your .env file exists and contains all required variables")
    raise

