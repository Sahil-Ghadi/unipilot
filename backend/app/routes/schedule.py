from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from pydantic import BaseModel
from app.models.schedule import Schedule, ScheduleCreate, TimeBlock
from app.services.firebase_service import FirebaseService
from app.services.schedule_service import ScheduleService
from app.routes.auth import get_current_user
from app.config.settings import settings

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

# Initialize services
firebase_service = FirebaseService(settings.firebase_credentials_path)
schedule_service = ScheduleService()

class WeeklyScheduleRequest(BaseModel):
    """Request model for weekly schedule generation"""
    start_date: datetime
    work_hours_start: int = 9
    work_hours_end: int = 17
    study_technique: str = 'pomodoro'

@router.post("/generate", response_model=Schedule)
async def generate_schedule(
    schedule_request: ScheduleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Generate a personalized schedule for a specific date"""
    try:
        # Get tasks
        if schedule_request.task_ids:
            # Get specific tasks
            tasks = []
            for task_id in schedule_request.task_ids:
                task = firebase_service.get_task(task_id)
                if task and task['user_id'] == current_user['id']:
                    tasks.append(task)
        else:
            # Get all pending tasks
            tasks = firebase_service.get_user_tasks(current_user['id'], 'pending')
        
        # Generate schedule blocks
        blocks = schedule_service.generate_schedule(
            tasks,
            schedule_request.date,
            schedule_request.work_hours_start,
            schedule_request.work_hours_end,
            schedule_request.study_technique
        )
        
        # Save schedule to database
        schedule_data = {
            'date': schedule_request.date,
            'blocks': [block.model_dump() for block in blocks],
            'work_hours_start': schedule_request.work_hours_start,
            'work_hours_end': schedule_request.work_hours_end
        }
        
        created_schedule = firebase_service.create_schedule(
            current_user['id'],
            schedule_data
        )
        
        return created_schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=Schedule)
async def get_schedule(
    date: datetime,
    current_user: dict = Depends(get_current_user)
):
    """Get schedule for a specific date"""
    try:
        schedule = firebase_service.get_user_schedule(current_user['id'], date)
        
        if not schedule:
            raise HTTPException(status_code=404, detail="No schedule found for this date")
        
        return schedule
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/weekly")
async def generate_weekly_schedule(
    request: WeeklyScheduleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a weekly schedule"""
    try:
        # Get only pending tasks (not completed)
        tasks = firebase_service.get_user_tasks(current_user['id'], 'pending')
        print(f"\n[Weekly] ===== DEBUG =====\nPending tasks: {len(tasks)}")
        for i, t in enumerate(tasks[:3]):
            print(f"Task {i+1}: {t.get('title')} | Deadline: {t.get('deadline')}")
        print(f"[Weekly] Generating schedule...")
        
        # Generate weekly schedule
        weekly_schedule = schedule_service.generate_weekly_schedule(
            tasks,
            request.start_date,
            request.work_hours_start,
            request.work_hours_end,
            request.study_technique
        )
        
        # Save each day's schedule
        saved_schedules = {}
        for date_str, blocks in weekly_schedule.items():
            schedule_data = {
                'date': datetime.fromisoformat(date_str),
                'blocks': [block.model_dump() for block in blocks],
                'work_hours_start': request.work_hours_start,
                'work_hours_end': request.work_hours_end
            }
            
            created_schedule = firebase_service.create_schedule(
                current_user['id'],
                schedule_data
            )
            
            saved_schedules[date_str] = created_schedule
        
        return {
            "message": "Weekly schedule generated successfully",
            "schedules": saved_schedules
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
