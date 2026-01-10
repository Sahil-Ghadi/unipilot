from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    """Schema for creating a notification"""
    type: str  # 'project_invite', 'task_assigned', etc.
    title: str
    message: str
    from_user_id: Optional[str] = None
    from_user_name: Optional[str] = None
    to_user_email: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    metadata: Optional[dict] = {}

class Notification(BaseModel):
    """Schema for notification response"""
    id: str
    type: str
    title: str
    message: str
    from_user_id: Optional[str] = None
    from_user_name: Optional[str] = None
    to_user_id: Optional[str] = None
    to_user_email: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    metadata: Optional[dict] = {}
    status: str  # 'pending', 'accepted', 'rejected'
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
