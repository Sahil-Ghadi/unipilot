from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, HttpUrl
from app.services.ai_service import AIService
from app.services.firebase_service import FirebaseService
from app.services.ml_service import MLService
from app.routes.auth import get_current_user
from app.config.settings import settings
from typing import List, Dict, Any
import tempfile
import os

router = APIRouter(prefix="/api/syllabus", tags=["syllabus"])

# Initialize services
ai_service = AIService(settings.google_gemini_api_key) if settings.google_gemini_api_key else None
firebase_service = FirebaseService(settings.firebase_credentials_path)
ml_service = MLService()

class SyllabusExtractRequest(BaseModel):
    """Request model for syllabus extraction"""
    pdf_url: HttpUrl

class ExtractedTaskResponse(BaseModel):
    """Response model for extracted tasks"""
    course_name: str
    tasks: List[Dict[str, Any]]
    error: str = None

@router.post("/upload-and-extract")
async def upload_and_extract_tasks(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload PDF file directly and extract tasks"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not configured. Please add GOOGLE_GEMINI_API_KEY to .env")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    temp_path = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        print(f"PDF saved to: {temp_path}")
        
        # Extract text from PDF
        try:
            text = ai_service._extract_text_from_pdf(temp_path)
            print(f"Extracted text length: {len(text)}")
        except Exception as e:
            print(f"PDF extraction error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")
        
        if not text or len(text.strip()) < 100:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from PDF. Please ensure it's a valid syllabus."
            )
        
        # Use AI to extract tasks
        try:
            print("Calling AI service to extract tasks...")
            result = await ai_service.extract_tasks_from_syllabus(text)
            print(f"AI extraction result: {result}")
        except Exception as e:
            print(f"AI extraction error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")
        
        if 'error' in result and result['error']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Save tasks to database
        saved_tasks = []
        course_name = result.get('course_name', 'Unknown Course')
        
        for task_data in result.get('tasks', []):
            # Add course name
            task_data['course'] = course_name
            
            # Calculate priority
            task_data['priority_score'] = ml_service.calculate_priority_score(task_data)
            
            # Create task
            created_task = firebase_service.create_task(
                current_user['id'],
                task_data
            )
            
            saved_tasks.append(created_task)
        
        return {
            "message": f"Successfully extracted and saved {len(saved_tasks)} tasks",
            "course_name": course_name,
            "tasks": saved_tasks
        }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/extract", response_model=ExtractedTaskResponse)
async def extract_tasks_from_syllabus(
    request: SyllabusExtractRequest,
    current_user: dict = Depends(get_current_user)
):
    """Extract tasks from a syllabus PDF"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not configured. Please add GOOGLE_GEMINI_API_KEY to .env")
    
    try:
        # Download and extract text from PDF
        syllabus_text = await ai_service.extract_text_from_pdf_url(str(request.pdf_url))
        
        if not syllabus_text or len(syllabus_text.strip()) < 100:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from PDF. Please ensure it's a valid syllabus."
            )
        
        # Use AI to extract tasks
        result = await ai_service.extract_tasks_from_syllabus(syllabus_text)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract tasks: {str(e)}")

@router.post("/extract-and-save")
async def extract_and_save_tasks(
    request: SyllabusExtractRequest,
    current_user: dict = Depends(get_current_user)
):
    """Extract tasks from syllabus and save them to the database"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not configured. Please add GOOGLE_GEMINI_API_KEY to .env")
    
    try:
        # Extract tasks
        syllabus_text = await ai_service.extract_text_from_pdf_url(str(request.pdf_url))
        result = await ai_service.extract_tasks_from_syllabus(syllabus_text)
        
        if 'error' in result and result['error']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Save tasks to database
        saved_tasks = []
        course_name = result.get('course_name', 'Unknown Course')
        
        for task_data in result.get('tasks', []):
            # Add course name
            task_data['course'] = course_name
            
            # Calculate priority
            task_data['priority_score'] = ml_service.calculate_priority_score(task_data)
            
            # Create task
            created_task = firebase_service.create_task(
                current_user['id'],
                task_data
            )
            
            saved_tasks.append(created_task)
        
        return {
            "message": f"Successfully extracted and saved {len(saved_tasks)} tasks",
            "course_name": course_name,
            "tasks": saved_tasks
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract and save tasks: {str(e)}")
