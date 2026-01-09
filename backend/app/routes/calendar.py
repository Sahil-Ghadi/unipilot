from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.services.calendar_service import CalendarService
from app.services.firebase_service import FirebaseService
from app.routes.auth import get_current_user
from app.config.settings import settings

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# Initialize services
calendar_service = CalendarService(
    settings.google_calendar_client_id,
    settings.google_calendar_client_secret,
    settings.google_calendar_redirect_uri
)
firebase_service = FirebaseService(settings.firebase_credentials_path)

class CalendarAuthRequest(BaseModel):
    """Request model for calendar authorization"""
    state: Optional[str] = None

class CalendarTokenRequest(BaseModel):
    """Request model for exchanging auth code for tokens"""
    code: str

class CalendarSyncRequest(BaseModel):
    """Request model for syncing tasks to calendar"""
    task_ids: Optional[List[str]] = None
    schedule_date: Optional[datetime] = None

@router.get("/auth-url")
async def get_calendar_auth_url(
    state: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get Google Calendar OAuth2 authorization URL"""
    try:
        # Use user ID as state if not provided
        if not state:
            state = current_user['id']
        
        auth_url = calendar_service.get_authorization_url(state)
        
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/callback")
async def calendar_oauth_callback(
    request: CalendarTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """Handle OAuth2 callback and exchange code for tokens"""
    try:
        # Exchange code for tokens
        tokens = calendar_service.exchange_code_for_tokens(request.code)
        
        # Save tokens to user document
        await firebase_service.update_user(
            current_user['id'],
            {'calendar_credentials': tokens}
        )
        
        return {
            "message": "Calendar connected successfully",
            "tokens": tokens
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect calendar: {str(e)}")

@router.post("/sync")
async def sync_to_calendar(
    request: CalendarSyncRequest,
    current_user: dict = Depends(get_current_user)
):
    """Sync tasks to Google Calendar"""
    try:
        # Get user's calendar credentials
        user = await firebase_service.get_user(current_user['id'])
        credentials = user.get('calendar_credentials')
        
        if not credentials:
            raise HTTPException(
                status_code=400,
                detail="Calendar not connected. Please authorize first."
            )
        
        # Get tasks
        if request.task_ids:
            tasks = []
            for task_id in request.task_ids:
                task = await firebase_service.get_task(task_id)
                if task and task['user_id'] == current_user['id']:
                    tasks.append(task)
        else:
            tasks = await firebase_service.get_user_tasks(current_user['id'], 'pending')
        
        # Get schedule blocks if date provided
        schedule_blocks = None
        if request.schedule_date:
            schedule = await firebase_service.get_user_schedule(
                current_user['id'],
                request.schedule_date
            )
            if schedule:
                schedule_blocks = schedule.get('blocks', [])
        
        # Sync to calendar
        created_events = calendar_service.sync_tasks_to_calendar(
            credentials,
            tasks,
            schedule_blocks
        )
        
        return {
            "message": f"Successfully synced {len(created_events)} events to calendar",
            "events": created_events
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync to calendar: {str(e)}")

@router.get("/events")
async def get_calendar_events(
    time_min: Optional[datetime] = Query(None),
    time_max: Optional[datetime] = Query(None),
    max_results: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get events from Google Calendar"""
    try:
        # Get user's calendar credentials
        user = await firebase_service.get_user(current_user['id'])
        credentials = user.get('calendar_credentials')
        
        if not credentials:
            raise HTTPException(
                status_code=400,
                detail="Calendar not connected. Please authorize first."
            )
        
        # Get events
        events = calendar_service.list_events(
            credentials,
            time_min,
            time_max,
            max_results
        )
        
        return {"events": events}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
