from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime

class Member(BaseModel):
    """Project member schema"""
    user_id: str
    email: EmailStr
    display_name: Optional[str] = None
    role: Literal['owner', 'member'] = 'member'
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectBase(BaseModel):
    """Base project model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""
    pass

class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class Project(ProjectBase):
    """Complete project model"""
    id: str
    owner_id: str
    members: List[Member] = []
    task_ids: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class MemberAdd(BaseModel):
    """Schema for adding a member to a project"""
    email: EmailStr

class TaskAssignment(BaseModel):
    """Schema for assigning a task to a member"""
    user_id: str
