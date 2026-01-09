from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from typing import List, Dict, Any
import PyPDF2
import httpx
from datetime import datetime
import re

class AIService:
    """Service for AI-powered task extraction from syllabi"""
    
    def __init__(self, api_key: str):
        """Initialize LangChain with Google Gemini"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=api_key,
            temperature=0.3
        )
        
        # Prompt template for syllabus parsing
        self.extraction_prompt = PromptTemplate(
            input_variables=["syllabus_text"],
            template="""You are an expert academic assistant. Analyze the following course syllabus and extract ALL assignments, projects, exams, and deadlines.

For each task, provide:
1. Title (clear, concise name)
2. Description (what needs to be done)
3. Course name
4. Deadline (exact date if available, otherwise estimate based on week numbers)
5. Estimated effort in hours (realistic estimate)
6. Weight/percentage of final grade (if mentioned)

Syllabus text:
{syllabus_text}

Return the information in the following JSON format:
{{
  "course_name": "Course Name",
  "tasks": [
    {{
      "title": "Assignment 1",
      "description": "Description of the assignment",
      "deadline": "2026-02-15",
      "estimated_effort": 5.0,
      "weight": 15.0
    }}
  ]
}}

Be thorough and extract ALL tasks mentioned. If a deadline is not explicit, make a reasonable estimate based on the course timeline.
"""
        )
    
    async def extract_text_from_pdf_url(self, pdf_url: str) -> str:
        """Download and extract text from PDF URL"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(pdf_url, timeout=30.0)
                response.raise_for_status()
                
                # Save temporarily
                temp_path = "temp_syllabus.pdf"
                with open(temp_path, "wb") as f:
                    f.write(response.content)
                
                # Extract text
                text = self._extract_text_from_pdf(temp_path)
                
                # Clean up
                import os
                os.remove(temp_path)
                
                return text
        except Exception as e:
            raise Exception(f"Failed to download or parse PDF: {str(e)}")
    
    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from a PDF file"""
        text = ""
        try:
            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
        
        return text
    
    async def extract_tasks_from_syllabus(self, syllabus_text: str) -> Dict[str, Any]:
        """Use LangChain + Gemini to extract tasks from syllabus text"""
        try:
            # Create chain
            chain = self.extraction_prompt | self.llm
            
            # Run extraction
            response = await chain.ainvoke({"syllabus_text": syllabus_text})
            
            # Parse response
            result = self._parse_llm_response(response.content)
            
            return result
        except Exception as e:
            raise Exception(f"Failed to extract tasks: {str(e)}")
    
    def _parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response and extract JSON"""
        import json
        
        # Try to find JSON in the response
        try:
            # Remove markdown code blocks if present
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            cleaned = cleaned.strip()
            
            # Parse JSON
            result = json.loads(cleaned)
            
            # Validate structure
            if "tasks" not in result:
                result["tasks"] = []
            
            # Ensure all tasks have required fields
            for task in result["tasks"]:
                if "title" not in task:
                    task["title"] = "Untitled Task"
                if "description" not in task:
                    task["description"] = ""
                if "deadline" not in task or not task["deadline"]:
                    task["deadline"] = None
                else:
                    # Try to normalize deadline to ISO format
                    task["deadline"] = self._normalize_deadline(task["deadline"])
                if "estimated_effort" not in task or task["estimated_effort"] is None:
                    task["estimated_effort"] = 2.0
                if "weight" not in task or task["weight"] is None:
                    task["weight"] = 0.0
            
            return result
        except json.JSONDecodeError as e:
            # If JSON parsing fails, return empty result
            return {
                "course_name": "Unknown Course",
                "tasks": [],
                "error": f"Failed to parse AI response: {str(e)}"
            }
    
    def _normalize_deadline(self, deadline_str: str) -> str:
        """Try to convert various deadline formats to ISO format"""
        import re
        from dateutil import parser
        
        try:
            # Try direct parsing first
            dt = parser.parse(deadline_str, fuzzy=True)
            return dt.isoformat()
        except:
            # If parsing fails, try to extract year and month
            try:
                # Look for patterns like "April 2026", "End of Semester (April 2026)"
                month_match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', deadline_str, re.IGNORECASE)
                if month_match:
                    month_name = month_match.group(1)
                    year = month_match.group(2)
                    # Create a date at the end of that month
                    dt = parser.parse(f"{month_name} 30, {year}")
                    return dt.isoformat()
            except:
                pass
            
            # If all else fails, return None
            return None
    
    async def generate_task_summary(self, task_title: str, task_description: str) -> str:
        """Generate a concise summary for a task"""
        prompt = f"Summarize this task in one sentence:\nTitle: {task_title}\nDescription: {task_description}"
        
        try:
            response = await self.llm.ainvoke(prompt)
            return response.content.strip()
        except:
            return task_description[:100] + "..." if len(task_description) > 100 else task_description
