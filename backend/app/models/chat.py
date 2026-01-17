from pydantic import BaseModel
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    conversation_history: Optional[List[ChatMessage]] = None
    course_filter: Optional[str] = None


class ChatSource(BaseModel):
    document_name: str
    course_name: str
    chunk_index: int
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource] = []
    mode: str
    timestamp: str


class IndexDocumentRequest(BaseModel):
    text_content: Optional[str] = None
    pdf_url: Optional[str] = None
    course_name: str
    document_name: Optional[str] = None


class IndexDocumentResponse(BaseModel):
    success: bool
    chunks_indexed: int = 0
    error: Optional[str] = None


class UserDocument(BaseModel):
    document_name: str
    course_name: str
    chunk_count: int


class UserDocumentsResponse(BaseModel):
    documents: List[UserDocument]
    total_count: int


class DeleteDocumentRequest(BaseModel):
    document_name: str
    course_name: Optional[str] = None


class StudyTipsResponse(BaseModel):
    tips: str
    generated_at: str
