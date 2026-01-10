from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import os

class GoogleCalendarService:
    """Service for interacting with Google Calendar API"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(self, state: str) -> str:
        """Generate OAuth authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.SCOPES,
            redirect_uri=self.redirect_uri
        )
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'
        )
        
        return authorization_url
    
    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.SCOPES,
            redirect_uri=self.redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        return {
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_expiry': credentials.expiry.isoformat() if credentials.expiry else None,
            'scopes': credentials.scopes
        }
    
    def get_calendar_service(self, access_token: str, refresh_token: str):
        """Create authenticated Calendar service"""
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES
        )
        
        return build('calendar', 'v3', credentials=credentials)
    
    def create_event(self, service, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a calendar event"""
        try:
            event = service.events().insert(
                calendarId='primary',
                body=event_data
            ).execute()
            
            return {
                'id': event['id'],
                'htmlLink': event.get('htmlLink'),
                'status': event.get('status')
            }
        except HttpError as error:
            raise Exception(f"Failed to create event: {error}")
    
    def update_event(self, service, event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a calendar event"""
        try:
            event = service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event_data
            ).execute()
            
            return {
                'id': event['id'],
                'htmlLink': event.get('htmlLink'),
                'status': event.get('status')
            }
        except HttpError as error:
            raise Exception(f"Failed to update event: {error}")
    
    def delete_event(self, service, event_id: str) -> bool:
        """Delete a calendar event"""
        try:
            service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            return True
        except HttpError as error:
            raise Exception(f"Failed to delete event: {error}")
    
    def task_to_event(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Convert UniPilot task to Google Calendar event format"""
        # Parse due date
        due_date = datetime.fromisoformat(task['due_date'].replace('Z', '+00:00'))
        
        # Set event duration based on priority
        duration_hours = {
            'high': 2,
            'medium': 1,
            'low': 0.5
        }.get(task.get('priority', 'medium'), 1)
        
        end_time = due_date + timedelta(hours=duration_hours)
        
        # Color mapping for priority
        color_id = {
            'high': '11',  # Red
            'medium': '5',  # Yellow
            'low': '2'     # Green
        }.get(task.get('priority', 'medium'), '5')
        
        event = {
            'summary': task['title'],
            'description': task.get('description', ''),
            'start': {
                'dateTime': due_date.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            },
            'colorId': color_id,
            'extendedProperties': {
                'private': {
                    'unipilot_task_id': task['id'],
                    'unipilot_priority': task.get('priority', 'medium'),
                    'unipilot_status': task.get('status', 'pending')
                }
            }
        }
        
        return event
