import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, List, Dict, Any
from datetime import datetime
import os

class FirebaseService:
    """Service for Firebase operations"""
    
    def __init__(self, credentials_path: str):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)
        
        self.db = firestore.client()
    
    # User operations
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user document from Firestore"""
        doc = self.db.collection('users').document(user_id).get()
        if doc.exists:
            return {'id': doc.id, **doc.to_dict()}
        return None
    
    def create_user(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user document"""
        user_ref = self.db.collection('users').document(user_id)
        user_data['created_at'] = datetime.utcnow()
        user_ref.set(user_data)
        return {'id': user_id, **user_data}
    
    def update_user(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user document"""
        user_ref = self.db.collection('users').document(user_id)
        user_ref.update(user_data)
        return self.get_user(user_id)
    
    # Task operations
    def create_task(self, user_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task"""
        task_data['user_id'] = user_id
        task_data['created_at'] = datetime.utcnow()
        task_data['status'] = task_data.get('status', 'pending')
        task_data['priority_score'] = task_data.get('priority_score', 0.0)
        
        task_ref = self.db.collection('tasks').document()
        task_ref.set(task_data)
        return {'id': task_ref.id, **task_data}
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific task"""
        doc = self.db.collection('tasks').document(task_id).get()
        if doc.exists:
            return {'id': doc.id, **self._convert_timestamps(doc.to_dict())}
        return None
    
    def _convert_timestamps(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Firestore datetime objects to ISO strings"""
        if 'created_at' in data and data['created_at']:
            data['created_at'] = data['created_at'].isoformat()
        if 'updated_at' in data and data['updated_at']:
            data['updated_at'] = data['updated_at'].isoformat()
        if 'deadline' in data and data['deadline'] and hasattr(data['deadline'], 'isoformat'):
            data['deadline'] = data['deadline'].isoformat()
        return data
    
    def get_user_tasks(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all tasks for a user, optionally filtered by status"""
        query = self.db.collection('tasks').where('user_id', '==', user_id)
        
        if status:
            query = query.where('status', '==', status)
        
        try:
            docs = query.order_by('deadline').stream()
            tasks = [{'id': doc.id, **self._convert_timestamps(doc.to_dict())} for doc in docs]
        except:
            # If ordering fails, just return without ordering
            docs = query.stream()
            tasks = [{'id': doc.id, **self._convert_timestamps(doc.to_dict())} for doc in docs]
        
        return tasks
    
    def update_task(self, task_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a task"""
        task_ref = self.db.collection('tasks').document(task_id)
        task_data['updated_at'] = datetime.utcnow()
        task_ref.update(task_data)
        return self.get_task(task_id)
    
    def delete_task(self, task_id: str) -> bool:
        """Delete a task"""
        self.db.collection('tasks').document(task_id).delete()
        return True
    
    # Project operations
    def create_project(self, owner_id: str, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project"""
        project_data['owner_id'] = owner_id
        project_data['created_at'] = datetime.utcnow()
        project_data['members'] = project_data.get('members', [])
        project_data['task_ids'] = []
        
        project_ref = self.db.collection('projects').document()
        project_ref.set(project_data)
        return {'id': project_ref.id, **project_data}
    
    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific project"""
        doc = self.db.collection('projects').document(project_id).get()
        if doc.exists:
            return {'id': doc.id, **doc.to_dict()}
        return None
    
    def get_user_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all projects where user is owner or member"""
        # Get projects where user is owner
        owner_query = self.db.collection('projects').where('owner_id', '==', user_id)
        owner_docs = owner_query.stream()
        projects = [{'id': doc.id, **doc.to_dict()} for doc in owner_docs]
        
        # Get projects where user is a member
        all_projects = self.db.collection('projects').stream()
        for doc in all_projects:
            project_data = doc.to_dict()
            members = project_data.get('members', [])
            if any(m.get('user_id') == user_id for m in members):
                project_dict = {'id': doc.id, **project_data}
                if project_dict not in projects:
                    projects.append(project_dict)
        
        return projects
    
    def update_project(self, project_id: str, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a project"""
        project_ref = self.db.collection('projects').document(project_id)
        project_data['updated_at'] = datetime.utcnow()
        project_ref.update(project_data)
        return self.get_project(project_id)
    
    def delete_project(self, project_id: str) -> bool:
        """Delete a project"""
        self.db.collection('projects').document(project_id).delete()
        return True
    
    def add_project_member(self, project_id: str, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a member to a project"""
        project = self.get_project(project_id)
        if not project:
            raise ValueError("Project not found")
        
        members = project.get('members', [])
        member_data['joined_at'] = datetime.utcnow()
        members.append(member_data)
        
        self.update_project(project_id, {'members': members})
        return self.get_project(project_id)
    
    def remove_project_member(self, project_id: str, user_id: str) -> Dict[str, Any]:
        """Remove a member from a project"""
        project = self.get_project(project_id)
        if not project:
            raise ValueError("Project not found")
        
        members = project.get('members', [])
        members = [m for m in members if m.get('user_id') != user_id]
        
        self.update_project(project_id, {'members': members})
        return self.get_project(project_id)
    
    # Schedule operations
    def create_schedule(self, user_id: str, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new schedule"""
        schedule_data['user_id'] = user_id
        schedule_data['generated_at'] = datetime.utcnow()
        
        schedule_ref = self.db.collection('schedules').document()
        schedule_ref.set(schedule_data)
        return {'id': schedule_ref.id, **schedule_data}
    
    def get_user_schedule(self, user_id: str, date: datetime) -> Optional[Dict[str, Any]]:
        """Get schedule for a specific date"""
        # Query for schedules on the given date
        query = self.db.collection('schedules').where('user_id', '==', user_id)
        docs = query.stream()
        
        for doc in docs:
            schedule_data = doc.to_dict()
            schedule_date = schedule_data.get('date')
            if schedule_date and schedule_date.date() == date.date():
                return {'id': doc.id, **schedule_data}
        
        return None
    
    # Verify Firebase ID token
    def verify_token(self, id_token: str) -> Dict[str, Any]:
        """Verify Firebase ID token and return decoded token"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            raise ValueError(f"Invalid token: {str(e)}")
    
    # Message operations
    def create_message(self, project_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new message in a project"""
        message_data['created_at'] = datetime.utcnow()
        
        message_ref = self.db.collection('projects').document(project_id).collection('messages').document()
        message_ref.set(message_data)
        return {'id': message_ref.id, **message_data}
    
    def get_project_messages(self, project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a project"""
        query = (
            self.db.collection('projects')
            .document(project_id)
            .collection('messages')
            .order_by('created_at', direction=firestore.Query.DESCENDING)
            .limit(limit)
        )
        
        docs = query.stream()
        messages = [{'id': doc.id, **self._convert_timestamps(doc.to_dict())} for doc in docs]
        
        # Return in chronological order (oldest first)
        return list(reversed(messages))
    
    # Notification operations
    def create_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new notification"""
        notification_data['created_at'] = datetime.utcnow()
        notification_data['status'] = 'pending'
        
        notification_ref = self.db.collection('notifications').document()
        notification_ref.set(notification_data)
        return {'id': notification_ref.id, **notification_data}
    
    def get_user_notifications(self, user_email: str) -> List[Dict[str, Any]]:
        """Get notifications for a user by email"""
        try:
            # Try with ordering (requires composite index)
            query = (
                self.db.collection('notifications')
                .where('to_user_email', '==', user_email)
                .order_by('created_at', direction=firestore.Query.DESCENDING)
            )
            
            docs = query.stream()
            notifications = [{'id': doc.id, **self._convert_timestamps(doc.to_dict())} for doc in docs]
            return notifications
        except Exception as e:
            # Fallback: query without ordering if index doesn't exist
            print(f"Warning: Could not query with ordering, using fallback: {str(e)}")
            query = self.db.collection('notifications').where('to_user_email', '==', user_email)
            docs = query.stream()
            notifications = [{'id': doc.id, **self._convert_timestamps(doc.to_dict())} for doc in docs]
            # Sort in Python instead
            notifications.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return notifications
    
    def get_notification(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific notification"""
        doc = self.db.collection('notifications').document(notification_id).get()
        if doc.exists:
            return {'id': doc.id, **self._convert_timestamps(doc.to_dict())}
        return None
    
    def update_notification(self, notification_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a notification"""
        notification_ref = self.db.collection('notifications').document(notification_id)
        update_data['updated_at'] = datetime.utcnow()
        notification_ref.update(update_data)
        return self.get_notification(notification_id)
    
    def delete_notification(self, notification_id: str) -> bool:
        """Delete a notification"""
        self.db.collection('notifications').document(notification_id).delete()
        return True
    
    # Project Task operations
    def create_project_task(self, project_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task in a project"""
        task_data['created_at'] = datetime.utcnow()
        task_data['status'] = 'pending'
        
        task_ref = self.db.collection('projects').document(project_id).collection('tasks').document()
        task_ref.set(task_data)
        return {'id': task_ref.id, **task_data}
    
    def get_project_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all tasks for a project"""
        tasks_ref = self.db.collection('projects').document(project_id).collection('tasks')
        docs = tasks_ref.stream()
        tasks = [{'id': doc.id, **self._convert_timestamps(doc.to_dict())} for doc in docs]
        # Sort by created_at descending
        tasks.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return tasks
    
    def get_project_task(self, project_id: str, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific task"""
        doc = self.db.collection('projects').document(project_id).collection('tasks').document(task_id).get()
        if doc.exists:
            return {'id': doc.id, **self._convert_timestamps(doc.to_dict())}
        return None
    
    def update_project_task(self, project_id: str, task_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a task"""
        update_data['updated_at'] = datetime.utcnow()
        task_ref = self.db.collection('projects').document(project_id).collection('tasks').document(task_id)
        task_ref.update(update_data)
        return self.get_project_task(project_id, task_id)
    
    def delete_project_task(self, project_id: str, task_id: str) -> bool:
        """Delete a task"""
        self.db.collection('projects').document(project_id).collection('tasks').document(task_id).delete()
        return True
    
    def complete_project_task(self, project_id: str, task_id: str) -> Dict[str, Any]:
        """Mark a task as completed"""
        update_data = {
            'status': 'completed',
            'completed_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        task_ref = self.db.collection('projects').document(project_id).collection('tasks').document(task_id)
        task_ref.update(update_data)
        return self.get_project_task(project_id, task_id)
    
    # Google Calendar token operations
    def store_google_calendar_tokens(self, user_id: str, tokens: Dict[str, Any]) -> bool:
        """Store Google Calendar OAuth tokens for a user"""
        try:
            self.db.collection('users').document(user_id).set({
                'google_calendar': {
                    'access_token': tokens['access_token'],
                    'refresh_token': tokens.get('refresh_token'),
                    'token_expiry': tokens.get('token_expiry'),
                    'connected_at': datetime.utcnow()
                }
            }, merge=True)
            return True
        except Exception as e:
            print(f"Error storing tokens: {e}")
            return False
    
    def get_google_calendar_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get Google Calendar OAuth tokens for a user"""
        try:
            doc = self.db.collection('users').document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                return data.get('google_calendar')
            return None
        except Exception as e:
            print(f"Error getting tokens: {e}")
            return None
    
    def delete_google_calendar_tokens(self, user_id: str) -> bool:
        """Delete Google Calendar OAuth tokens for a user"""
        try:
            self.db.collection('users').document(user_id).update({
                'google_calendar': firestore.DELETE_FIELD
            })
            return True
        except Exception as e:
            print(f"Error deleting tokens: {e}")
            return False
    
    def update_task_calendar_id(self, task_id: str, calendar_event_id: str) -> bool:
        """Store Google Calendar event ID with task"""
        try:
            self.db.collection('tasks').document(task_id).update({
                'calendar_event_id': calendar_event_id,
                'synced_to_calendar': True,
                'last_synced': datetime.utcnow()
            })
            return True
        except Exception as e:
            print(f"Error updating task calendar ID: {e}")
            return False
