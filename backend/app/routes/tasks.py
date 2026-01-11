from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.task import Task, TaskCreate, TaskUpdate
from app.services.firebase_service import FirebaseService
from app.services.ml_service import MLService
from app.routes.auth import get_current_user
from app.config.settings import settings

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# Initialize services
firebase_service = FirebaseService(settings.firebase_credentials_path)
ml_service = MLService()

@router.post("", response_model=Task)
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new task"""
    try:
        # Convert to dict
        task_dict = task_data.model_dump()
        
        # Calculate priority score
        task_dict['priority_score'] = ml_service.calculate_priority_score(task_dict)
        
        # Create task
        created_task = firebase_service.create_task(
            current_user['id'],
            task_dict
        )
        
        return created_task
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Task])
async def get_tasks(
    status: Optional[str] = Query(None, regex="^(pending|in-progress|completed)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks for the current user"""
    try:
        tasks = firebase_service.get_user_tasks(current_user['id'], status)
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific task"""
    try:
        task = firebase_service.get_task(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to access this task")
        
        return task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a task"""
    try:
        # Verify ownership
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to update this task")
        
        # Convert to dict, excluding None values
        update_dict = task_data.model_dump(exclude_none=True)
        
        # Recalculate priority if relevant fields changed
        if any(k in update_dict for k in ['deadline', 'estimated_effort', 'weight']):
            merged_task = {**task, **update_dict}
            update_dict['priority_score'] = ml_service.calculate_priority_score(merged_task)
        
        # Update task
        updated_task = firebase_service.update_task(task_id, update_dict)
        
        return updated_task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a task"""
    try:
        # Verify ownership
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this task")
        
        firebase_service.delete_task(task_id)
        
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prioritize", response_model=List[Task])
async def prioritize_tasks(
    current_user: dict = Depends(get_current_user)
):
    """Recalculate priority scores for all pending tasks"""
    try:
        # Get all pending tasks
        tasks = firebase_service.get_user_tasks(current_user['id'], 'pending')
        
        # Prioritize
        prioritized_tasks = ml_service.prioritize_tasks(tasks)
        
        # Update tasks in database
        for task in prioritized_tasks:
            firebase_service.update_task(
                task['id'],
                {'priority_score': task['priority_score']}
            )
        
        return prioritized_tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}/resources")
async def get_task_resources(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get relevant YouTube videos and articles for a task using semantic search"""
    try:
        # Get task
        task = firebase_service.get_task(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to access this task")
        
        # Check if AI service is configured
        if not settings.google_gemini_api_key:
            raise HTTPException(
                status_code=503,
                detail="AI service not configured"
            )
        
        # Initialize services
        from app.services.ai_service import AIService
        from app.services.search_service import SearchService
        
        ai_service = AIService(settings.google_gemini_api_key)
        search_service = SearchService(ai_service)
        
        # Search for resources
        resources = await search_service.search_task_resources(
            task_title=task.get('title', ''),
            task_description=task.get('description', '')
        )
        
        return resources
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Timer endpoints
@router.post("/{task_id}/timer/start")
async def start_timer(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start timer for a task"""
    try:
        from datetime import datetime
        import uuid
        
        # Get task
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if already has active session
        if task.get('current_session_id'):
            raise HTTPException(status_code=400, detail="Timer already running")
        
        # Create new session
        session_id = str(uuid.uuid4())
        session = {
            "id": session_id,
            "start_time": datetime.utcnow().isoformat(),
            "end_time": None,
            "duration_minutes": 0,
            "date": datetime.utcnow().date().isoformat()
        }
        
        # Update task
        time_sessions = task.get('time_sessions', [])
        time_sessions.append(session)
        
        updated_task = firebase_service.update_task(task_id, {
            'status': 'in-progress',
            'current_session_id': session_id,
            'time_sessions': time_sessions
        })
        
        return {
            "message": "Timer started",
            "session_id": session_id,
            "task": updated_task
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/timer/pause")
async def pause_timer(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Pause timer for a task"""
    try:
        from datetime import datetime
        
        # Get task
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if has active session
        session_id = task.get('current_session_id')
        if not session_id:
            raise HTTPException(status_code=400, detail="No active timer")
        
        # Find and update session
        time_sessions = task.get('time_sessions', [])
        duration = 0
        
        for session in time_sessions:
            if session['id'] == session_id:
                end_time = datetime.utcnow()
                
                # Parse start_time - handle both string and datetime
                start_time_str = session['start_time']
                if isinstance(start_time_str, str):
                    # Remove 'Z' and parse
                    start_time_str = start_time_str.replace('Z', '+00:00')
                    start_time = datetime.fromisoformat(start_time_str)
                else:
                    start_time = start_time_str
                
                duration = (end_time - start_time).total_seconds() / 60  # minutes
                
                session['end_time'] = end_time.isoformat()
                session['duration_minutes'] = round(duration, 2)
                break
        
        # Calculate total time
        total_time = sum(s.get('duration_minutes', 0) for s in time_sessions)
        
        # Update task
        updated_task = firebase_service.update_task(task_id, {
            'status': 'pending',
            'current_session_id': None,
            'time_sessions': time_sessions,
            'total_time_spent': round(total_time, 2)
        })
        
        return {
            "message": "Timer paused",
            "duration_minutes": round(duration, 2),
            "total_time_spent": round(total_time, 2),
            "task": updated_task
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error pausing timer: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/burnout-rating")
async def submit_burnout_rating(
    task_id: str,
    rating: int,
    current_user: dict = Depends(get_current_user)
):
    """Submit burnout rating for a completed task"""
    try:
        # Validate rating
        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Get task
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update task with burnout rating
        updated_task = firebase_service.update_task(task_id, {
            'burnout_rating': rating
        })
        
        # Analyze burnout and provide recommendations
        recommendations = []
        if rating <= 2:  # High burnout
            recommendations = [
                "Consider taking a longer break before your next task",
                "You might want to reschedule some tasks to reduce workload",
                "Try breaking down large tasks into smaller chunks"
            ]
        elif rating == 3:  # Moderate burnout
            recommendations = [
                "Take a 15-minute break before continuing",
                "Consider adding more breaks to your schedule"
            ]
        else:  # Low burnout
            recommendations = [
                "Great job! You're managing your workload well",
                "Keep up the good work!"
            ]
        
        return {
            "message": "Burnout rating submitted",
            "rating": rating,
            "recommendations": recommendations,
            "task": updated_task
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}/prediction/procrastination")
async def predict_procrastination(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Predict procrastination risk for a task based on history and context"""
    try:
        # Get task
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify ownership
        if task['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Get user history (completed tasks for burnout context)
        # We fetch completed tasks to see recent burnout ratings
        history = firebase_service.get_user_tasks(current_user['id'], status='completed')
        
        # Calculate risk
        prediction = ml_service.predict_procrastination_risk(task, history)
        
        return prediction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
