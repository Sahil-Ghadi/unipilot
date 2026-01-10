from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from app.services.google_calendar_service import GoogleCalendarService
from app.services.firebase_service import FirebaseService
from app.routes.auth import get_current_user
from app.config.settings import settings
import secrets

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# Initialize services
firebase_service = FirebaseService(settings.firebase_credentials_path)
calendar_service = GoogleCalendarService(
    client_id=settings.google_calendar_client_id,
    client_secret=settings.google_calendar_client_secret,
    redirect_uri=settings.google_calendar_redirect_uri
)

@router.get("/auth-url")
async def get_auth_url(current_user: dict = Depends(get_current_user)):
    """Get Google OAuth authorization URL"""
    try:
        state = f"{current_user['id']}:{secrets.token_urlsafe(16)}"
        auth_url = calendar_service.get_authorization_url(state)
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/callback")
async def calendar_callback(code: str, state: str):
    """Handle OAuth callback from Google"""
    try:
        # Extract user_id from state
        user_id = state.split(':')[0]
        print(f"DEBUG: Processing callback for user_id: {user_id}")
        
        # Exchange code for tokens
        tokens = calendar_service.exchange_code_for_tokens(code)
        print(f"DEBUG: Obtained tokens for user_id: {user_id}")
        
        # Store tokens in Firebase
        result = firebase_service.store_google_calendar_tokens(user_id, tokens)
        print(f"DEBUG: Tokens stored result: {result}")
        
        # Redirect to frontend
        return RedirectResponse(url=f"{settings.frontend_url}/schedule?calendar_connected=true")
    except Exception as e:
        print(f"Calendar callback error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/schedule?calendar_error=true")

@router.get("/status")
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """Check if user has connected Google Calendar"""
    try:
        user_id = current_user['id']
        print(f"DEBUG: Checking status for user_id: {user_id}")
        tokens = firebase_service.get_google_calendar_tokens(user_id)
        print(f"DEBUG: Tokens found: {bool(tokens)}")
        
        return {
            "connected": bool(tokens),
            "connected_at": tokens.get('connected_at') if tokens else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disconnect")
async def disconnect_calendar(current_user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar"""
    try:
        firebase_service.delete_google_calendar_tokens(current_user['id'])
        return {"message": "Calendar disconnected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-task/{task_id}")
async def sync_task_to_calendar(task_id: str, current_user: dict = Depends(get_current_user)):
    """Push a single task to Google Calendar"""
    try:
        tokens = firebase_service.get_google_calendar_tokens(current_user['id'])
        if not tokens:
            raise HTTPException(status_code=400, detail="Google Calendar not connected")
        
        task = firebase_service.get_task(task_id)
        if not task or task['user_id'] != current_user['id']:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if not task.get('due_date'):
            raise HTTPException(status_code=400, detail="Task must have a due date")
        
        service = calendar_service.get_calendar_service(tokens['access_token'], tokens['refresh_token'])
        event_data = calendar_service.task_to_event(task)
        
        if task.get('calendar_event_id'):
            result = calendar_service.update_event(service, task['calendar_event_id'], event_data)
        else:
            result = calendar_service.create_event(service, event_data)
            firebase_service.update_task_calendar_id(task_id, result['id'])
        
        return {"message": "Task synced to calendar", "event_id": result['id'], "event_link": result.get('htmlLink')}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-all")
async def sync_all_tasks(current_user: dict = Depends(get_current_user)):
    """Push all tasks with due dates to Google Calendar"""
    try:
        tokens = firebase_service.get_google_calendar_tokens(current_user['id'])
        if not tokens:
            raise HTTPException(status_code=400, detail="Google Calendar not connected")
        
        tasks = firebase_service.get_user_tasks(current_user['id'])
        tasks_with_dates = [t for t in tasks if t.get('due_date')]
        
        service = calendar_service.get_calendar_service(tokens['access_token'], tokens['refresh_token'])
        
        synced_count = 0
        errors = []
        
        for task in tasks_with_dates:
            try:
                event_data = calendar_service.task_to_event(task)
                
                if task.get('calendar_event_id'):
                    calendar_service.update_event(service, task['calendar_event_id'], event_data)
                else:
                    result = calendar_service.create_event(service, event_data)
                    firebase_service.update_task_calendar_id(task['id'], result['id'])
                
                synced_count += 1
            except Exception as e:
                errors.append(f"Task {task['id']}: {str(e)}")
        
        return {
            "message": f"Synced {synced_count} tasks to calendar",
            "synced_count": synced_count,
            "total_tasks": len(tasks_with_dates),
            "errors": errors if errors else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
