from typing import List, Dict, Any
import httpx
import numpy as np
from app.config.settings import settings

class SearchService:
    """Service for searching YouTube videos and web articles with semantic relevance scoring"""
    
    def __init__(self, ai_service):
        """Initialize with AI service for embeddings"""
        self.ai_service = ai_service
        self.youtube_api_key = settings.youtube_api_key
        self.google_search_api_key = settings.google_search_api_key
        self.google_search_engine_id = settings.google_search_engine_id
    
    async def search_youtube_videos(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Search YouTube for relevant videos
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            List of video dictionaries with metadata
        """
        if not self.youtube_api_key:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                # YouTube Data API v3 search endpoint
                url = "https://www.googleapis.com/youtube/v3/search"
                params = {
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "maxResults": max_results,
                    "key": self.youtube_api_key,
                    "relevanceLanguage": "en",
                    "safeSearch": "moderate"
                }
                
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                videos = []
                for item in data.get("items", []):
                    video = {
                        "id": item["id"]["videoId"],
                        "title": item["snippet"]["title"],
                        "description": item["snippet"]["description"],
                        "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
                        "channel": item["snippet"]["channelTitle"],
                        "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                        "type": "video"
                    }
                    videos.append(video)
                
                return videos
        except Exception as e:
            print(f"Error searching YouTube: {e}")
            return []
    
    async def search_web_articles(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Search web for relevant articles
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            List of article dictionaries with metadata
        """
        if not self.google_search_api_key or not self.google_search_engine_id:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                # Google Custom Search API
                url = "https://www.googleapis.com/customsearch/v1"
                params = {
                    "key": self.google_search_api_key,
                    "cx": self.google_search_engine_id,
                    "q": query + " tutorial guide how to",
                    "num": max_results
                }
                
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                articles = []
                for item in data.get("items", []):
                    article = {
                        "title": item.get("title", ""),
                        "description": item.get("snippet", ""),
                        "url": item.get("link", ""),
                        "source": item.get("displayLink", ""),
                        "type": "article"
                    }
                    articles.append(article)
                
                return articles
        except Exception as e:
            print(f"Error searching web: {e}")
            return []
    
    def calculate_cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Similarity score between 0 and 1
        """
        try:
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            dot_product = np.dot(vec1_np, vec2_np)
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Clamp between -1 and 1, then normalize to 0-1
            similarity = max(-1.0, min(1.0, similarity))
            # Convert from [-1, 1] to [0, 1]
            normalized_similarity = (similarity + 1) / 2
            
            return float(normalized_similarity)
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0
    
    async def calculate_relevance_scores(
        self, 
        query_text: str, 
        resources: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Calculate relevance scores for resources using semantic similarity
        
        Args:
            query_text: The task title and description
            resources: List of videos/articles to score
            
        Returns:
            Resources with relevance_score added (0-100)
        """
        try:
            # Generate embedding for query
            print(f"[SearchService] Generating embedding for query: {query_text[:100]}...")
            query_embedding = await self.ai_service.generate_embedding(query_text)
            print(f"[SearchService] Query embedding length: {len(query_embedding)}")
            
            scored_resources = []
            for i, resource in enumerate(resources):
                # Combine title and description for resource
                resource_text = f"{resource['title']} {resource['description']}"
                
                # Generate embedding for resource
                resource_embedding = await self.ai_service.generate_embedding(resource_text)
                
                # Calculate similarity
                similarity = self.calculate_cosine_similarity(query_embedding, resource_embedding)
                
                # Convert to percentage (0-100)
                relevance_score = int(similarity * 100)
                
                print(f"[SearchService] Resource {i}: similarity={similarity:.4f}, score={relevance_score}")
                
                # Add score to resource
                resource['relevance_score'] = max(0, min(100, relevance_score))
                scored_resources.append(resource)
            
            # Sort by relevance score (highest first)
            scored_resources.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return scored_resources
        except Exception as e:
            print(f"Error calculating relevance scores: {e}")
            import traceback
            traceback.print_exc()
            # Return resources without scores
            for resource in resources:
                resource['relevance_score'] = 0
            return resources
    
    async def search_task_resources(
        self, 
        task_title: str, 
        task_description: str
    ) -> Dict[str, Any]:
        """Search for relevant resources for a task
        
        Args:
            task_title: Title of the task
            task_description: Description of the task
            
        Returns:
            Dictionary with videos and articles lists
        """
        # Create search query
        query = f"{task_title} {task_description}"
        
        # Search YouTube and web (9 videos, 6 articles)
        videos = await self.search_youtube_videos(query, max_results=9)
        articles = await self.search_web_articles(query, max_results=6)
        
        return {
            "videos": videos,
            "articles": articles,
            "total_results": len(videos) + len(articles)
        }

