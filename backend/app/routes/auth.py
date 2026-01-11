from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from app.services.firebase_service import FirebaseService
from app.config.settings import settings
import asyncio
from concurrent.futures import TimeoutError

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Initialize Firebase service
firebase_service = FirebaseService(settings.firebase_credentials_path)

async def get_current_user(authorization: str = Header(None, alias="Authorization")):
    """Dependency to get current authenticated user"""
    try:
        # Check if authorization header is provided
        if not authorization:
            print("ERROR: No authorization header provided")
            raise HTTPException(status_code=401, detail="Authorization header is required")
        
        print(f"DEBUG: Authorization header received: {authorization[:20]}...")
        
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            print(f"ERROR: Invalid authorization format: {authorization[:50]}")
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.split("Bearer ")[1]
        print(f"DEBUG: Token extracted, length: {len(token)}")
        
        # Verify token with timeout
        try:
            print("DEBUG: Starting token verification...")
            # Wrap synchronous Firebase call in async with timeout
            loop = asyncio.get_event_loop()
            decoded_token = await asyncio.wait_for(
                loop.run_in_executor(None, firebase_service.verify_token, token),
                timeout=10.0  # 10 second timeout
            )
            print(f"DEBUG: Token verified successfully for user: {decoded_token.get('uid')}")
        except asyncio.TimeoutError:
            print("ERROR: Token verification timed out after 10 seconds")
            raise HTTPException(status_code=408, detail="Token verification timed out. Please try again.")
        except Exception as token_error:
            print(f"ERROR: Token verification failed: {str(token_error)}")
            raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(token_error)}")
        
        user_id = decoded_token.get('uid')
        
        # Get or create user in Firestore with timeout
        try:
            print(f"DEBUG: Fetching user from Firestore: {user_id}")
            loop = asyncio.get_event_loop()
            user = await asyncio.wait_for(
                loop.run_in_executor(None, firebase_service.get_user, user_id),
                timeout=5.0  # 5 second timeout
            )
        except asyncio.TimeoutError:
            print("ERROR: Firestore user fetch timed out")
            raise HTTPException(status_code=408, detail="Database query timed out. Please try again.")
        
        if not user:
            # Create user if doesn't exist
            print(f"DEBUG: Creating new user: {user_id}")
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
            try:
                loop = asyncio.get_event_loop()
                user = await asyncio.wait_for(
                    loop.run_in_executor(None, firebase_service.create_user, user_id, user_data),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                print("ERROR: User creation timed out")
                raise HTTPException(status_code=408, detail="User creation timed out. Please try again.")
        
        print(f"DEBUG: User authenticated successfully: {user.get('email')}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Unexpected authentication error: {str(e)}")
        import traceback
        traceback.print_exc()
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
