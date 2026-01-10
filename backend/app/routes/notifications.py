from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.notification import Notification, NotificationCreate
from app.services.firebase_service import FirebaseService
from app.routes.auth import get_current_user
from app.config.settings import settings

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Initialize Firebase service
firebase_service = FirebaseService(settings.firebase_credentials_path)

@router.get("", response_model=List[Notification])
async def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Get all notifications for the current user"""
    try:
        notifications = firebase_service.get_user_notifications(current_user['email'])
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{notification_id}/accept")
async def accept_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept a notification (e.g., project invite)"""
    try:
        # Get notification
        notification = firebase_service.get_notification(notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Verify notification is for current user
        if notification['to_user_email'] != current_user['email']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Handle based on notification type
        if notification['type'] == 'project_invite':
            project_id = notification.get('project_id')
            if not project_id:
                raise HTTPException(status_code=400, detail="Invalid notification data")
            
            # Add user to project
            member_data = {
                'user_id': current_user['id'],
                'email': current_user['email'],
                'display_name': current_user.get('display_name'),
                'role': 'member'
            }
            firebase_service.add_project_member(project_id, member_data)
            
            # Update notification status
            firebase_service.update_notification(notification_id, {'status': 'accepted'})
            
            return {
                "message": "Project invite accepted",
                "project_id": project_id
            }
        
        raise HTTPException(status_code=400, detail="Unknown notification type")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{notification_id}/reject")
async def reject_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reject a notification"""
    try:
        # Get notification
        notification = firebase_service.get_notification(notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Verify notification is for current user
        if notification['to_user_email'] != current_user['email']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update notification status
        firebase_service.update_notification(notification_id, {'status': 'rejected'})
        
        return {"message": "Notification rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    try:
        # Get notification
        notification = firebase_service.get_notification(notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Verify notification is for current user
        if notification['to_user_email'] != current_user['email']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Delete notification
        firebase_service.delete_notification(notification_id)
        
        return {"message": "Notification deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
