from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    title: str
    description: Optional[str] = ""
    course: str
    deadline: Optional[str] = None  # Accept string, will be converted
    estimated_effort: Optional[float] = 2.0
    weight: Optional[float] = 0.0
    status: Optional[str] = "pending"

class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    title: Optional[str] = None
    description: Optional[str] = None
    course: Optional[str] = None
    deadline: Optional[str] = None
    estimated_effort: Optional[float] = None
    weight: Optional[float] = None
    status: Optional[str] = None
    priority_score: Optional[float] = None

class Task(BaseModel):
    id: Optional[str] = None
    user_id: str
    title: str
    description: Optional[str] = None
    course: Optional[str] = None
    deadline: Optional[str] = None
    estimated_effort: Optional[float] = None  # in hours
    weight: Optional[float] = 0.0  # percentage of final grade
    status: str = "pending"  # pending, in-progress, completed
    priority_score: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    project_id: Optional[str] = None
    
    # Time tracking fields
    time_sessions: List[Dict[str, Any]] = []  # [{id, start_time, end_time, duration_minutes, date}]
    total_time_spent: float = 0.0  # Total minutes
    current_session_id: Optional[str] = None  # Active session ID
    
    # Burnout tracking
    burnout_rating: Optional[int] = None  # 1-5 scale after completion
    
    class Config:
        from_attributes = True
