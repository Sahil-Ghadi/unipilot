from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.project import Project, ProjectCreate, ProjectUpdate, MemberAdd, TaskAssignment
from app.services.firebase_service import FirebaseService
from app.routes.auth import get_current_user
from app.config.settings import settings
from datetime import datetime

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Initialize services
firebase_service = FirebaseService(settings.firebase_credentials_path)

@router.post("", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new project"""
    try:
        # Add creator as owner member
        project_dict = project_data.model_dump()
        project_dict['members'] = [{
            'user_id': current_user['id'],
            'email': current_user['email'],
            'display_name': current_user.get('display_name'),
            'role': 'owner',
            'joined_at': datetime.utcnow()
        }]
        
        created_project = firebase_service.create_project(
            current_user['id'],
            project_dict
        )
        
        return created_project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[Project])
async def get_projects(
    current_user: dict = Depends(get_current_user)
):
    """Get all projects for the current user"""
    try:
        projects = firebase_service.get_user_projects(current_user['id'])
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific project"""
    try:
        project = firebase_service.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Verify user is member or owner
        members = project.get('members', [])
        is_member = any(m.get('user_id') == current_user['id'] for m in members)
        is_owner = project.get('owner_id') == current_user['id']
        
        if not (is_member or is_owner):
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a project"""
    try:
        # Verify ownership
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project['owner_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Only project owner can update project")
        
        # Update project
        update_dict = project_data.model_dump(exclude_none=True)
        updated_project = firebase_service.update_project(project_id, update_dict)
        
        return updated_project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a project"""
    try:
        # Verify ownership
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project['owner_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Only project owner can delete project")
        
        firebase_service.delete_project(project_id)
        
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{project_id}/members", response_model=dict)
async def add_project_member(
    project_id: str,
    member_data: MemberAdd,
    current_user: dict = Depends(get_current_user)
):
    """Send project invitation to a user"""
    try:
        # Verify ownership
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project['owner_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Only project owner can invite members")
        
        # Check if member already exists
        members = project.get('members', [])
        if any(m.get('email') == member_data.email for m in members):
            raise HTTPException(status_code=400, detail="User already in project")
        
        # Check if invitation already sent
        existing_notifications = firebase_service.get_user_notifications(member_data.email)
        pending_invite = any(
            n.get('project_id') == project_id and 
            n.get('status') == 'pending' and 
            n.get('type') == 'project_invite'
            for n in existing_notifications
        )
        
        if pending_invite:
            raise HTTPException(status_code=400, detail="Invitation already sent to this user")
        
        # Create invitation notification
        notification_data = {
            'type': 'project_invite',
            'title': f'Project Invitation: {project["name"]}',
            'message': f'{current_user.get("display_name", current_user["email"])} invited you to join "{project["name"]}"',
            'from_user_id': current_user['id'],
            'from_user_name': current_user.get('display_name', current_user['email']),
            'to_user_email': member_data.email,
            'project_id': project_id,
            'metadata': {
                'project_name': project['name'],
                'project_description': project.get('description', '')
            }
        }
        
        notification = firebase_service.create_notification(notification_data)
        
        return {
            "message": f"Invitation sent to {member_data.email}",
            "notification_id": notification['id']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a member from a project"""
    try:
        # Verify ownership
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project['owner_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Only project owner can remove members")
        
        # Cannot remove owner
        if user_id == project['owner_id']:
            raise HTTPException(status_code=400, detail="Cannot remove project owner")
        
        firebase_service.remove_project_member(project_id, user_id)
        
        return {"message": "Member removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{project_id}/tasks/{task_id}/assign")
async def assign_task_to_member(
    project_id: str,
    task_id: str,
    assignment: TaskAssignment,
    current_user: dict = Depends(get_current_user)
):
    """Assign a task to a project member"""
    try:
        # Verify project access
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        members = project.get('members', [])
        is_member = any(m.get('user_id') == current_user['id'] for m in members)
        is_owner = project.get('owner_id') == current_user['id']
        
        if not (is_member or is_owner):
            raise HTTPException(status_code=403, detail="Not authorized to assign tasks")
        
        # Verify task belongs to project
        task = firebase_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.get('project_id') != project_id:
            raise HTTPException(status_code=400, detail="Task does not belong to this project")
        
        # Verify assignee is a member
        if not any(m.get('user_id') == assignment.user_id for m in members):
            raise HTTPException(status_code=400, detail="User is not a project member")
        
        # Update task with assignment
        firebase_service.update_task(task_id, {
            'assigned_to': assignment.user_id
        })
        
        return {
            "message": "Task assigned successfully",
            "project": project
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}/messages")
async def get_project_messages(
    project_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get message history for a project"""
    try:
        # Verify user is a member
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        is_member = (
            project['owner_id'] == current_user['id'] or
            any(m.get('user_id') == current_user['id'] for m in project.get('members', []))
        )
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Get messages
        messages = firebase_service.get_project_messages(project_id, limit)
        
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Project Task endpoints
@router.post("/{project_id}/tasks")
async def create_project_task(
    project_id: str,
    task_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a task in a project"""
    try:
        # Verify user is a project member
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        is_member = any(m['user_id'] == current_user['id'] for m in project.get('members', []))
        if not is_member:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        # Add creator info
        task_data['created_by'] = current_user['id']
        task_data['created_by_name'] = current_user.get('display_name') or current_user['email']
        
        task = firebase_service.create_project_task(project_id, task_data)
        return task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}/tasks")
async def get_project_tasks(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks for a project"""
    try:
        # Verify user is a project member
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        is_member = any(m['user_id'] == current_user['id'] for m in project.get('members', []))
        if not is_member:
            raise HTTPException(status_code=403, detail="Not a project member")
        
        tasks = firebase_service.get_project_tasks(project_id)
        return {"tasks": tasks}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{project_id}/tasks/{task_id}")
async def update_project_task(
    project_id: str,
    task_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a task"""
    try:
        # Get task and project
        task = firebase_service.get_project_task(project_id, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check permissions: task creator or project owner
        is_creator = task['created_by'] == current_user['id']
        is_owner = any(m['user_id'] == current_user['id'] and m['role'] == 'owner' 
                      for m in project.get('members', []))
        
        if not (is_creator or is_owner):
            raise HTTPException(status_code=403, detail="Not authorized to edit this task")
        
        updated_task = firebase_service.update_project_task(project_id, task_id, update_data)
        return updated_task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{project_id}/tasks/{task_id}/complete")
async def complete_project_task(
    project_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a task as completed (only assigned user)"""
    try:
        # Get task
        task = firebase_service.get_project_task(project_id, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if user is assigned to this task
        if task['assigned_to'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Only assigned user can complete this task")
        
        completed_task = firebase_service.complete_project_task(project_id, task_id)
        return completed_task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{project_id}/tasks/{task_id}")
async def delete_project_task(
    project_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a task"""
    try:
        # Get task and project
        task = firebase_service.get_project_task(project_id, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        project = firebase_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check permissions: task creator or project owner
        is_creator = task['created_by'] == current_user['id']
        is_owner = any(m['user_id'] == current_user['id'] and m['role'] == 'owner' 
                      for m in project.get('members', []))
        
        if not (is_creator or is_owner):
            raise HTTPException(status_code=403, detail="Not authorized to delete this task")
        
        firebase_service.delete_project_task(project_id, task_id)
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
