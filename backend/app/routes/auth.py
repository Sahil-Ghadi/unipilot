from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from app.services.firebase_service import FirebaseService
from app.config.settings import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Initialize Firebase service
firebase_service = FirebaseService(settings.firebase_credentials_path)

async def get_current_user(authorization: str = Header(...)):
    """Dependency to get current authenticated user"""
    try:
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.split("Bearer ")[1]
        
        # Verify token
        decoded_token = firebase_service.verify_token(token)
        user_id = decoded_token.get('uid')
        
        # Get or create user in Firestore
        user = firebase_service.get_user(user_id)
        
        if not user:
            # Create user if doesn't exist
            user_data = {
                'email': decoded_token.get('email'),
                'display_name': decoded_token.get('name'),
                'photo_url': decoded_token.get('picture'),
                'preferences': {
                    'work_hours_start': 9,
                    'work_hours_end': 17,
                    'pomodoro_enabled': True
                }
            }
            user = firebase_service.create_user(user_id, user_data)
        
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

@router.put("/me/preferences")
async def update_user_preferences(
    preferences: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences"""
    try:
        updated_user = firebase_service.update_user(
            current_user['id'],
            {'preferences': preferences}
        )
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
