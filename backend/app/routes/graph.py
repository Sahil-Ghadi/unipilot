from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from app.services.firebase_service import FirebaseService
from app.routes.auth import get_current_user
from app.config.settings import settings
import random

router = APIRouter(prefix="/api/graph", tags=["graph"])

firebase_service = FirebaseService(settings.firebase_credentials_path)

@router.get("/data")
async def get_graph_data(current_user: dict = Depends(get_current_user)):
    """
    Get data for the 3D knowledge graph.
    Returns nodes and links representing the user's academic universe.
    Nodes: User (Center), Courses, Tasks
    """
    try:
        user_id = current_user['id']
        tasks = firebase_service.get_user_tasks(user_id)
        
        nodes = []
        links = []
        
        # 1. Central Node: The User
        nodes.append({
            "id": "user",
            "name": current_user.get('display_name', 'Me'),
            "group": "user",
            "val": 20  # Size
        })
        
        # 2. Extract unique courses
        courses = set()
        for task in tasks:
            if task.get('course'):
                courses.add(task['course'])
        
        # 3. Create Course Nodes and Links from User
        for course in courses:
            nodes.append({
                "id": f"course_{course}",
                "name": course,
                "group": "course",
                "val": 10
            })
            links.append({
                "source": "user",
                "target": f"course_{course}",
                "type": "enrollment"
            })
            
        # 4. Create Task Nodes
        seen_tasks = set()
        
        for task in tasks:
            # Skip tasks with no meaningful title or deleted status
            if not task.get('title') or task.get('status') == 'deleted':
                continue
            
            # Deduplicate by Title and Course
            # This handles re-uploads where multiple identical tasks might exist in DB
            task_key = (task.get('title'), task.get('course'))
            if task_key in seen_tasks:
                continue
            seen_tasks.add(task_key)
                
            task_node_id = f"task_{task['id']}"
            course_name = task.get('course')
            
            # If no course is assigned, maybe group under "General" or "Personal"
            # Avoiding "Unknown" unless necessary
            if not course_name:
                 course_id = "user" # Direct link to user
            else:
                 course_id = f"course_{course_name}"
            
            # Smart Sizing: High priority/urgent tasks are larger
            node_val = 5
            if task.get('priority_score', 0) > 80:
                node_val = 15
            elif task.get('priority_score', 0) > 50:
                node_val = 10

            # Basic task node
            nodes.append({
                "id": task_node_id,
                "name": task.get('title', 'Untitled Task'),
                "group": "task",
                "status": task.get('status', 'pending'),
                "priority": task.get('priority_score', 0),
                "val": node_val
            })
            
            # Link Task to Course or User
            if course_name:
                links.append({
                    "source": course_id,
                    "target": task_node_id,
                    "type": "assignment"
                })
            else:
                links.append({
                    "source": "user",
                    "target": task_node_id,
                    "type": "personal"
                })
        
        # 5. (Optional) Infer Topic Nodes? 
        # For V1, let's stick to clear Course->Task hierarchy to avoid clutter.
        
        return {
            "nodes": nodes,
            "links": links
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
