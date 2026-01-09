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
