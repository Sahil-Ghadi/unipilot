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
    
    async def parse_schedule_preferences(self, preferences_text: str, start_date: str) -> Dict[str, Any]:
        """
        Parse natural language schedule preferences using Gemini AI
        Returns structured data about unavailable time windows and other constraints
        """
        if not preferences_text or not preferences_text.strip():
            return {"unavailable_windows": []}
        
        prompt = f"""You are a scheduling assistant. Parse the following user preferences for their weekly schedule.

Current date context: The schedule starts on {start_date}

User preferences:
{preferences_text}

Extract any time constraints, unavailability windows, or preferences. Return ONLY a JSON object in this exact format:
{{
  "unavailable_windows": [
    {{
      "date": "2026-01-12",
      "start_hour": 15,
      "end_hour": 17,
      "reason": "User unavailable"
    }}
  ]
}}

CRITICAL RULES for time parsing:
- Use 24-hour format for hours (0-23)
- 12pm = 12 (noon), 1pm = 13, 2pm = 14, 3pm = 15, 4pm = 16, 5pm = 17, etc.
- 12am = 0 (midnight), 1am = 1, 2am = 2, etc.
- Convert relative dates like "coming Sunday", "next Monday" to actual dates based on the start date
- If no constraints are mentioned, return empty unavailable_windows array
- Only include unavailable_windows, no other fields

Examples:
- "12pm to 5pm" → start_hour: 12, end_hour: 17
- "3pm to 5pm" → start_hour: 15, end_hour: 17
- "9am to 11am" → start_hour: 9, end_hour: 11
"""
        
        try:
            response = await self.llm.ainvoke(prompt)
            print(f"[AI Service] Raw AI response: {response.content[:200]}")
            result = self._parse_llm_response(response.content)
            
            # Validate structure
            if "unavailable_windows" not in result:
                result["unavailable_windows"] = []
            
            # Validate and fix each window
            valid_windows = []
            for window in result.get("unavailable_windows", []):
                if all(k in window for k in ["date", "start_hour", "end_hour"]):
                    # Ensure hours are in valid range
                    start_hour = int(window["start_hour"])
                    end_hour = int(window["end_hour"])
                    
                    if 0 <= start_hour <= 23 and 0 <= end_hour <= 23 and start_hour < end_hour:
                        window["start_hour"] = start_hour
                        window["end_hour"] = end_hour
                        valid_windows.append(window)
                        print(f"[AI Service] Validated window: {window['date']} {start_hour}:00-{end_hour}:00")
                    else:
                        print(f"[AI Service] Invalid hours: {start_hour}-{end_hour}, skipping")
            
            return {
                "unavailable_windows": valid_windows
            }
        except Exception as e:
            print(f"Error parsing schedule preferences: {e}")
            # Return empty list on error
            return {
                "unavailable_windows": []
            }
    
    async def summarize_chat_messages(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a concise summary of chat messages using Gemini
        
        Args:
            messages: List of message dicts with keys: message, user_name, timestamp
            
        Returns:
            Dict with summary text and metadata
        """
        from typing import List, Dict, Any
        from datetime import datetime

        try:
            if not messages:
                return {
                    "summary": "No messages to summarize.",
                    "message_count": 0,
                    "participants": []
                }
            
            # Format messages for the prompt
            formatted_messages = []
            participants = set()
            
            for msg in messages:
                user_name = msg.get('user_name', 'Unknown')
                message_text = msg.get('message', '')
                timestamp = msg.get('timestamp', '')
                
                # Skip system messages
                if msg.get('type') == 'system':
                    continue
                    
                participants.add(user_name)
                formatted_messages.append(f"{user_name}: {message_text}")
            
            if not formatted_messages:
                return {
                    "summary": "No user messages to summarize.",
                    "message_count": 0,
                    "participants": []
                }
            
            # Create the conversation text
            conversation_text = "\n".join(formatted_messages)
            
            # Create prompt for summarization
            prompt = f"""You are an expert at summarizing group chat conversations. Analyze the following chat messages and provide a concise, structured summary.

Chat Messages:
{conversation_text}

Please provide a summary in the following format:

**Key Discussion Topics:**
- [List main topics discussed]

**Important Decisions:**
- [List any decisions made or agreed upon]

**Action Items:**
- [List any tasks or action items mentioned]

**Main Points:**
- [List other important points or highlights]

Keep the summary concise and focus on the most important information. If there are no items for a section, write "None identified"."""

            # Get summary from Gemini
            response = await self.llm.ainvoke(prompt)
            summary_text = response.content if hasattr(response, 'content') else str(response)
            
            return {
                "summary": summary_text,
                "message_count": len(messages),
                "participants": list(participants),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Failed to generate chat summary: {str(e)}")
