"""Chat API routes for RAG-based assistant"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.config.settings import settings
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    DeleteDocumentRequest,
    IndexDocumentRequest,
    IndexDocumentResponse,
    StudyTipsResponse,
    UserDocument,
    UserDocumentsResponse,
)
from app.routes.auth import get_current_user
from app.services.chat_service import ChatService
from app.services.rag_service import get_rag_service

router = APIRouter(prefix="/chat", tags=["chat"])

rag_service = get_rag_service()
chat_service = ChatService(api_key=settings.google_gemini_api_key, rag_service=rag_service)


def _get_user_id(user: dict) -> str:
    return user.get("id") or user.get("uid") or "unknown"


@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest, user: dict = Depends(get_current_user)):
    user_id = _get_user_id(user)

    history = None
    if request.conversation_history:
        history = [{"role": m.role, "content": m.content} for m in request.conversation_history]

    result = await chat_service.chat(
        query=request.query,
        user_id=user_id,
        conversation_history=history,
        course_filter=request.course_filter,
    )

    sources = [ChatSource(**s) for s in result.get("sources", [])]

    return ChatResponse(
        answer=result.get("answer", ""),
        sources=sources,
        mode=result.get("mode", "rag"),
        timestamp=result.get("timestamp", datetime.utcnow().isoformat()),
    )


@router.post("/index", response_model=IndexDocumentResponse)
async def index_document(request: IndexDocumentRequest, user: dict = Depends(get_current_user)):
    user_id = _get_user_id(user)

    if not request.text_content and not request.pdf_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either text_content or pdf_url",
        )

    try:
        document_name = request.document_name or "Untitled Document"

        if request.pdf_url:
            result = await rag_service.index_pdf_from_url(
                pdf_url=request.pdf_url,
                user_id=user_id,
                course_name=request.course_name,
                document_name=document_name,
            )
        else:
            result = await rag_service.index_document(
                text_content=request.text_content or "",
                user_id=user_id,
                course_name=request.course_name,
                document_name=document_name,
            )

        return IndexDocumentResponse(**result)
    except Exception as e:
        return IndexDocumentResponse(success=False, chunks_indexed=0, error=str(e))


@router.get("/documents", response_model=UserDocumentsResponse)
async def get_user_documents(user: dict = Depends(get_current_user)):
    user_id = _get_user_id(user)

    docs = await rag_service.get_user_documents(user_id)
    return UserDocumentsResponse(
        documents=[UserDocument(**d) for d in docs],
        total_count=len(docs),
    )


@router.delete("/documents")
async def delete_document(request: DeleteDocumentRequest, user: dict = Depends(get_current_user)):
    user_id = _get_user_id(user)

    try:
        success = await rag_service.delete_document(
            user_id=user_id,
            document_name=request.document_name,
            course_name=request.course_name,
        )
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return {"message": f"Document '{request.document_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/study-tips", response_model=StudyTipsResponse)
async def study_tips(course_name: Optional[str] = None, user: dict = Depends(get_current_user)):
    user_id = _get_user_id(user)

    tips = await chat_service.generate_study_tips(user_id=user_id, course_filter=course_name)
    return StudyTipsResponse(tips=tips, generated_at=datetime.utcnow().isoformat())
