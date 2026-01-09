from pydantic import BaseModel
from typing import Optional

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
    """Schema for task response"""
    id: str
    user_id: str
    title: str
    description: Optional[str] = ""
    course: str
    deadline: Optional[str] = None  # Keep as string for flexibility
    estimated_effort: Optional[float] = 2.0
    weight: Optional[float] = 0.0
    status: str = "pending"
    priority_score: Optional[float] = 0.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
