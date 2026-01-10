from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: str  # user_id
    assigned_to_email: str
    assigned_to_name: Optional[str] = None
    priority: Optional[str] = 'medium'  # low, medium, high
    due_date: Optional[str] = None

class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_name: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None

class ProjectTask(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    assigned_to: str
    assigned_to_email: str
    assigned_to_name: Optional[str] = None
    status: str = 'pending'  # pending, in-progress, completed
    priority: str = 'medium'
    due_date: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
