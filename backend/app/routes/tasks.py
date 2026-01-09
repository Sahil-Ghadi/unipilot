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
