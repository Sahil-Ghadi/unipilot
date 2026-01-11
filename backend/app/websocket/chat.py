import socketio
from typing import Dict, Set
from app.services.firebase_service import FirebaseService
from app.config.settings import settings
from datetime import datetime

# Initialize Firebase service
firebase_service = FirebaseService(settings.firebase_credentials_path)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[
        "https://unipilottt.vercel.app",
        "http://localhost:3000"
    ],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Track connected users and their projects
connected_users: Dict[str, Dict] = {}  # sid -> {user_id, user_name, project_id}
project_rooms: Dict[str, Set[str]] = {}  # project_id -> set of sids


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    print(f"🔌 Client connecting: {sid}")
    
    # Authenticate user
    if not auth or 'token' not in auth:
        print(f"❌ No auth token provided for {sid}")
        await sio.disconnect(sid)
        return False
    
    try:
        # Verify Firebase token
        decoded_token = firebase_service.verify_token(auth['token'])
        user_id = decoded_token.get('uid')
        user_name = decoded_token.get('name', decoded_token.get('email', 'Unknown'))
        
        # Store user info
        connected_users[sid] = {
            'user_id': user_id,
            'user_name': user_name,
            'project_id': None
        }
        
        print(f"✅ User authenticated: {user_name} ({sid})")
        return True
        
    except Exception as e:
        print(f"❌ Authentication failed for {sid}: {str(e)}")
        await sio.disconnect(sid)
        return False


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    if sid in connected_users:
        user_info = connected_users[sid]
        print(f"👋 User disconnected: {user_info['user_name']} ({sid})")
        
        # Leave project room if in one
        if user_info['project_id']:
            await leave_project(sid, {'project_id': user_info['project_id']})
        
        del connected_users[sid]
    else:
        print(f"👋 Unknown client disconnected: {sid}")


@sio.event
async def join_project(sid, data):
    """Join a project chat room"""
    if sid not in connected_users:
        return {'success': False, 'error': 'Not authenticated'}
    
    project_id = data.get('project_id')
    if not project_id:
        return {'success': False, 'error': 'No project_id provided'}
    
    user_info = connected_users[sid]
    user_id = user_info['user_id']
    
    try:
        # Verify user is a member of the project
        project = firebase_service.get_project(project_id)
        if not project:
            return {'success': False, 'error': 'Project not found'}
        
        # Check if user is owner or member
        is_member = (
            project['owner_id'] == user_id or
            any(m.get('user_id') == user_id for m in project.get('members', []))
        )
        
        if not is_member:
            return {'success': False, 'error': 'Not a project member'}
        
        # Join the room
        await sio.enter_room(sid, project_id)
        user_info['project_id'] = project_id
        
        # Track room membership
        if project_id not in project_rooms:
            project_rooms[project_id] = set()
        project_rooms[project_id].add(sid)
        
        print(f"📥 {user_info['user_name']} joined project {project_id}")
        
        # Notify others in the room
        await sio.emit('user_joined', {
            'user_name': user_info['user_name'],
            'timestamp': datetime.utcnow().isoformat()
        }, room=project_id, skip_sid=sid)
        
        return {'success': True}
        
    except Exception as e:
        print(f"❌ Error joining project: {str(e)}")
        return {'success': False, 'error': str(e)}


@sio.event
async def leave_project(sid, data):
    """Leave a project chat room"""
    if sid not in connected_users:
        return {'success': False, 'error': 'Not authenticated'}
    
    project_id = data.get('project_id')
    user_info = connected_users[sid]
    
    if not project_id:
        project_id = user_info.get('project_id')
    
    if not project_id:
        return {'success': False, 'error': 'No project to leave'}
    
    try:
        # Leave the room
        await sio.leave_room(sid, project_id)
        user_info['project_id'] = None
        
        # Update room tracking
        if project_id in project_rooms:
            project_rooms[project_id].discard(sid)
            if not project_rooms[project_id]:
                del project_rooms[project_id]
        
        print(f"📤 {user_info['user_name']} left project {project_id}")
        
        # Notify others
        await sio.emit('user_left', {
            'user_name': user_info['user_name'],
            'timestamp': datetime.utcnow().isoformat()
        }, room=project_id)
        
        return {'success': True}
        
    except Exception as e:
        print(f"❌ Error leaving project: {str(e)}")
        return {'success': False, 'error': str(e)}


@sio.event
async def send_message(sid, data):
    """Send a message to the project chat"""
    if sid not in connected_users:
        return {'success': False, 'error': 'Not authenticated'}
    
    user_info = connected_users[sid]
    project_id = user_info.get('project_id')
    
    if not project_id:
        return {'success': False, 'error': 'Not in a project room'}
    
    message_text = data.get('message', '').strip()
    if not message_text:
        return {'success': False, 'error': 'Empty message'}
    
    if len(message_text) > 1000:
        return {'success': False, 'error': 'Message too long (max 1000 chars)'}
    
    try:
        # Create message data
        message_data = {
            'project_id': project_id,
            'user_id': user_info['user_id'],
            'user_name': user_info['user_name'],
            'message': message_text,
            'timestamp': datetime.utcnow(),
            'type': 'text'
        }
        
        # Save to Firebase
        saved_message = firebase_service.create_message(project_id, message_data)
        
        # Convert timestamp to ISO string for JSON serialization
        timestamp_str = saved_message['timestamp']
        if isinstance(timestamp_str, datetime):
            timestamp_str = timestamp_str.isoformat() + 'Z'
        
        # Broadcast to all users in the project room
        await sio.emit('new_message', {
            'id': saved_message['id'],
            'user_id': saved_message['user_id'],
            'user_name': saved_message['user_name'],
            'message': saved_message['message'],
            'timestamp': timestamp_str,
            'type': saved_message['type']
        }, room=project_id)
        
        print(f"💬 Message from {user_info['user_name']} in {project_id}: {message_text[:50]}")
        
        return {'success': True, 'message_id': saved_message['id']}
        
    except Exception as e:
        print(f"❌ Error sending message: {str(e)}")
        return {'success': False, 'error': str(e)}



@sio.event
async def typing(sid, data):
    """Broadcast typing indicator"""
    if sid not in connected_users:
        return
    
    user_info = connected_users[sid]
    project_id = user_info.get('project_id')
    
    if not project_id:
        return
    
    # Broadcast to others in the room
    await sio.emit('user_typing', {
        'user_name': user_info['user_name'],
        'user_id': user_info['user_id']
    }, room=project_id, skip_sid=sid)


@sio.event
async def stop_typing(sid, data):
    """Broadcast stop typing indicator"""
    if sid not in connected_users:
        return
    
    user_info = connected_users[sid]
    project_id = user_info.get('project_id')
    
    if not project_id:
        return
    
    # Broadcast to others in the room
    await sio.emit('user_stopped_typing', {
        'user_name': user_info['user_name'],
        'user_id': user_info['user_id']
    }, room=project_id, skip_sid=sid)
