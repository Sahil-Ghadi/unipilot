from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, time

class TimeBlock(BaseModel):
    """Individual time block in a schedule"""
    start_time: str = Field(..., description="Time in HH:MM format")
    end_time: str = Field(..., description="Time in HH:MM format")
    task_id: Optional[str] = None
    type: Literal['work', 'break', 'unavailable'] = 'work'
    title: str
    description: Optional[str] = None

class ScheduleCreate(BaseModel):
    """Schema for generating a schedule"""
    date: datetime
    work_hours_start: int = Field(default=9, ge=0, le=23)
    work_hours_end: int = Field(default=17, ge=1, le=24)
    study_technique: str = 'pomodoro'
    task_ids: Optional[List[str]] = None  # If None, use all pending tasks
    custom_preferences: Optional[str] = None  # Natural language preferences

class Schedule(BaseModel):
    """Complete schedule model"""
    id: str
    user_id: str
    date: datetime
    blocks: List[TimeBlock]
    generated_at: datetime
    work_hours_start: int
    work_hours_end: int
    
    class Config:
        from_attributes = True
