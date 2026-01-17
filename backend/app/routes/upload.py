"""File upload endpoint for direct PDF uploads"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.routes.auth import get_current_user
from app.services.rag_service import get_rag_service

router = APIRouter(prefix="/chat", tags=["chat"])

rag_service = get_rag_service()


def _get_user_id(user: dict) -> str:
    return user.get("id") or user.get("uid") or "unknown"


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    course_name: str = Form(...),
    document_name: str = Form(None),
    user: dict = Depends(get_current_user),
):
    """
    Upload a PDF file directly and index it for RAG.
    
    Args:
        file: PDF file to upload
        course_name: Name of the course this document belongs to
        document_name: Optional custom name for the document (defaults to filename)
        user: Current authenticated user
        
    Returns:
        Success status, chunks indexed, and document details
    """
    user_id = _get_user_id(user)
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Validate file size (50MB limit)
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > 50:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size_mb:.1f}MB) exceeds 50MB limit"
        )
    
    try:
        # Use provided document name or fall back to filename
        doc_name = document_name or file.filename
        
        # Index the PDF bytes
        result = await rag_service.index_pdf_bytes(
            pdf_bytes=content,
            user_id=user_id,
            course_name=course_name,
            document_name=doc_name,
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to index PDF')
            )
        
        return {
            "success": True,
            "chunks_indexed": result.get('chunks_indexed', 0),
            "document_name": doc_name,
            "course_name": course_name,
            "file_size_mb": round(file_size_mb, 2),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process PDF: {str(e)}"
        )
