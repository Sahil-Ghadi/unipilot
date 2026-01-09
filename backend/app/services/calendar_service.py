from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os

class CalendarService:
    """Service for Google Calendar integration"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        """Initialize Google Calendar service"""
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.scopes = ['https://www.googleapis.com/auth/calendar']
    
    def get_authorization_url(self, state: str = None) -> str:
        """Get OAuth2 authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uris": [self.redirect_uri],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state
        )
        
        return authorization_url
    
    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uris": [self.redirect_uri],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
    
    def create_event(
        self,
        credentials_dict: Dict[str, Any],
        summary: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a calendar event"""
        try:
            credentials = Credentials(**credentials_dict)
            service = build('calendar', 'v3', credentials=credentials)
            
            event = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'UTC',
                },
            }
            
            if location:
                event['location'] = location
            
            created_event = service.events().insert(
                calendarId='primary',
                body=event
            ).execute()
            
            return created_event
        except HttpError as error:
            raise Exception(f"Failed to create calendar event: {error}")
    
    def sync_tasks_to_calendar(
        self,
        credentials_dict: Dict[str, Any],
        tasks: List[Dict[str, Any]],
        schedule_blocks: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Sync tasks to Google Calendar"""
        created_events = []
        
        try:
            credentials = Credentials(**credentials_dict)
            service = build('calendar', 'v3', credentials=credentials)
            
            # If schedule blocks provided, use them
            if schedule_blocks:
                for block in schedule_blocks:
                    if block.get('type') == 'work' and block.get('task_id'):
                        # Find corresponding task
                        task = next((t for t in tasks if t.get('id') == block.get('task_id')), None)
                        
                        if task:
                            # Parse times
                            start_time_str = block.get('start_time')
                            end_time_str = block.get('end_time')
                            
                            # Create datetime objects (use today's date)
                            today = datetime.utcnow().date()
                            start_time = datetime.combine(
                                today,
                                datetime.strptime(start_time_str, '%H:%M').time()
                            )
                            end_time = datetime.combine(
                                today,
                                datetime.strptime(end_time_str, '%H:%M').time()
                            )
                            
                            event = self.create_event(
                                credentials_dict,
                                summary=f"📚 {task.get('title')}",
                                description=f"{task.get('course')}\n\n{task.get('description', '')}",
                                start_time=start_time,
                                end_time=end_time
                            )
                            
                            created_events.append(event)
            else:
                # Just create events for task deadlines
                for task in tasks:
                    if task.get('status') == 'pending':
                        deadline = task.get('deadline')
                        
                        if isinstance(deadline, str):
                            deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                        
                        # Create all-day event for deadline
                        event = {
                            'summary': f"⏰ DUE: {task.get('title')}",
                            'description': f"{task.get('course')}\n\n{task.get('description', '')}",
                            'start': {
                                'date': deadline.date().isoformat(),
                            },
                            'end': {
                                'date': deadline.date().isoformat(),
                            },
                        }
                        
                        created_event = service.events().insert(
                            calendarId='primary',
                            body=event
                        ).execute()
                        
                        created_events.append(created_event)
            
            return created_events
        except HttpError as error:
            raise Exception(f"Failed to sync tasks to calendar: {error}")
    
    def list_events(
        self,
        credentials_dict: Dict[str, Any],
        time_min: datetime = None,
        time_max: datetime = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """List calendar events"""
        try:
            credentials = Credentials(**credentials_dict)
            service = build('calendar', 'v3', credentials=credentials)
            
            if not time_min:
                time_min = datetime.utcnow()
            if not time_max:
                time_max = time_min + timedelta(days=7)
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=time_min.isoformat() + 'Z',
                timeMax=time_max.isoformat() + 'Z',
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
        except HttpError as error:
            raise Exception(f"Failed to list calendar events: {error}")
