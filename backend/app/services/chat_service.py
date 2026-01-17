from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI

from app.services.rag_service import RAGService


class ChatService:
    def __init__(self, api_key: Optional[str], rag_service: RAGService):
        self.api_key = api_key
        self.rag_service = rag_service
        self.llm = None
        if api_key:
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                google_api_key=api_key,
                temperature=0.2,
            )

    async def chat(
        self,
        query: str,
        user_id: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        course_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        retrieved = await self.rag_service.retrieve(
            user_id=user_id,
            query=query,
            top_k=5,
            course_filter=course_filter,
        )

        sources = [
            {
                "document_name": c.document_name,
                "course_name": c.course_name,
                "chunk_index": c.chunk_index,
                "snippet": c.text[:300],
            }
            for c in retrieved
        ]

        context = "\n\n".join(
            [
                f"[Source: {c.document_name} | {c.course_name} | chunk {c.chunk_index}]\n{c.text}"
                for c in retrieved
            ]
        )

        history_text = ""
        if conversation_history:
            history_lines = []
            for msg in conversation_history[-10:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_lines.append(f"{role}: {content}")
            history_text = "\n".join(history_lines)

        if retrieved:
            mode = "rag"
            prompt = (
                "You are a study assistant. Answer the user question using ONLY the provided context. "
                "If the context does not contain the answer, say you do not have enough information and ask a clarifying question.\n\n"
                f"Conversation history (if any):\n{history_text}\n\n"
                f"Context:\n{context}\n\n"
                f"Question: {query}"
            )
        else:
            mode = "general"
            prompt = (
                "You are a study assistant. The user has not provided any relevant course materials yet. "
                "Answer generally, and suggest uploading/indexing course materials for more accurate answers.\n\n"
                f"Conversation history (if any):\n{history_text}\n\n"
                f"Question: {query}"
            )

        if self.llm:
            resp = await self.llm.ainvoke(prompt)
            answer = resp.content if hasattr(resp, "content") else str(resp)
        else:
            if retrieved:
                answer = "I can’t access an AI model right now (missing Gemini API key). Here are the most relevant excerpts I found in your documents:\n\n" + "\n\n".join(
                    [f"- {s['document_name']} ({s['course_name']}): {s['snippet']}" for s in sources]
                )
            else:
                answer = "I can’t access an AI model right now (missing Gemini API key). Upload/index a PDF and I can retrieve relevant sections for you."

        return {
            "answer": answer,
            "sources": sources,
            "mode": mode,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def generate_study_tips(self, user_id: str, course_filter: Optional[str] = None) -> str:
        docs = await self.rag_service.get_user_documents(user_id)
        if course_filter:
            docs = [d for d in docs if d.get("course_name", "").lower() == course_filter.lower()]

        if not docs:
            return "Upload or index course materials first, then ask for study tips again."

        summary = "\n".join([f"- {d['course_name']}: {d['document_name']} ({d['chunk_count']} sections)" for d in docs])

        prompt = (
            "You are a study coach. Give concise actionable study tips based on the available materials list. "
            "Include a short plan for the next 7 days, and suggested active recall techniques.\n\n"
            f"Materials:\n{summary}"
        )

        if self.llm:
            resp = await self.llm.ainvoke(prompt)
            return resp.content if hasattr(resp, "content") else str(resp)

        return "Study tips are unavailable without an AI model key. Your indexed materials:\n" + summary
