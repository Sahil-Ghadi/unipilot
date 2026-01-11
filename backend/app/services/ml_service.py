from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import numpy as np
from typing import List, Dict, Any

class MLService:
    """Service for ML-based task prioritization"""
    
    def __init__(self):
        """Initialize ML service"""
        self.scaler = StandardScaler()
    
    def calculate_priority_score(self, task: Dict[str, Any]) -> float:
        """
        Calculate priority score for a task (0-100 scale)
        Based on urgency, importance, and effort
        """
        # Extract task properties with defaults for None values
        deadline = task.get('deadline')
        estimated_effort = task.get('estimated_effort', 2.0)
        weight = task.get('weight', 0.0)
        
        # Handle None values
        if estimated_effort is None:
            estimated_effort = 2.0
        if weight is None:
            weight = 0.0
        
        # Calculate urgency (0-100) based on deadline
        if deadline:
            try:
                if isinstance(deadline, str):
                    deadline_date = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                else:
                    deadline_date = deadline
                
                days_until_deadline = (deadline_date - datetime.utcnow()).days
                
                # Urgency decreases as deadline is further away
                if days_until_deadline < 0:
                    urgency = 100  # Overdue
                elif days_until_deadline == 0:
                    urgency = 95  # Due today
                elif days_until_deadline <= 3:
                    urgency = 90
                elif days_until_deadline <= 7:
                    urgency = 70
                elif days_until_deadline <= 14:
                    urgency = 50
                elif days_until_deadline <= 30:
                    urgency = 30
                else:
                    urgency = 10
            except:
                urgency = 50  # Default if date parsing fails
        else:
            urgency = 50  # Default urgency if no deadline
        
        # Calculate importance (0-100) based on weight
        importance = min(weight * 2, 100)  # Scale weight to 0-100
        
        # Calculate effort factor (inverse - lower effort = higher priority for quick wins)
        # Normalize to 0-100 scale (assuming max effort is 20 hours)
        effort_factor = max(0, 100 - (estimated_effort / 20 * 100))
        
        # Weighted combination
        # Urgency: 50%, Importance: 30%, Effort: 20%
        priority_score = (urgency * 0.5) + (importance * 0.3) + (effort_factor * 0.2)
        
        return round(priority_score, 2)
    
    def prioritize_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculate priority scores for all tasks and sort by priority.
        Returns tasks sorted by priority (highest first)
        """
        # Calculate priority for each task
        for task in tasks:
            task['priority_score'] = self.calculate_priority_score(task)
        
        # Sort by priority score (descending)
        sorted_tasks = sorted(tasks, key=lambda x: x['priority_score'], reverse=True)
        
        return sorted_tasks
    
    def predict_procrastination_risk(self, task: Dict[str, Any], user_history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Predict procrastination risk for a task.
        Returns risk score (0-1), level, and contributing factors.
        """
        deadline = task.get('deadline')
        estimated_effort = task.get('estimated_effort', 2.0)
        user_history = user_history or []
        
        # Handle None values
        if estimated_effort is None:
            estimated_effort = 2.0
            
        days_until_deadline = 30
        if deadline:
            try:
                if isinstance(deadline, str):
                    deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                else:
                    deadline_dt = deadline
                
                days_until_deadline = (deadline_dt - datetime.utcnow().replace(tzinfo=deadline_dt.tzinfo)).total_seconds() / 86400
            except:
                pass # Use default
        
        # Initialize risk
        risk_score = 0.0
        factors = []
        
        # --- Factor 1: Deadline Distance (Parkinson's Law) ---
        if days_until_deadline > 14:
            risk_score += 0.3
            factors.append("Deadline is far away (Parkinson's Law)")
        elif days_until_deadline > 7:
            risk_score += 0.1
        
        # --- Factor 2: Task Complexity ---
        if estimated_effort > 5:
            risk_score += 0.25
            factors.append("High estimated effort requires high activation energy")
        
        # --- Factor 3: Task Importance (Value) ---
        weight = task.get('weight', 0.0) or 0.0
        if weight < 10:
            risk_score += 0.15
            factors.append("Low impact on grade reduces motivation")
            
        # --- Factor 4: User Burnout History (The User Context) ---
        if user_history:
            # Filter tasks with burnout rating (1=Exhausted, 5=Fresh)
            rated_tasks = [t for t in user_history if t.get('burnout_rating')]
            if rated_tasks:
                # Get last 5 ratings
                recent_ratings = [t['burnout_rating'] for t in rated_tasks[:5]]
                avg_burnout = sum(recent_ratings) / len(recent_ratings)
                
                if avg_burnout <= 2.5: # Low score = High Burnout
                    risk_score += 0.35
                    factors.append("Recent high burnout detected")
                elif avg_burnout <= 3.5:
                    risk_score += 0.1
        
        # --- Factor 5: Workload (if available in history) ---
        # estimating from total_time_spent of recent tasks could be a proxy
        
        # Cap risk score
        risk_score = min(0.95, rounded_score := round(risk_score, 2))
        
        # Determine level
        if risk_score > 0.7:
            level = "High"
        elif risk_score > 0.4:
            level = "Medium"
        else:
            level = "Low"
            
        return {
            "score": risk_score,
            "level": level,
            "factors": factors
        }
    
    def get_priority_label(self, priority_score: float) -> str:
        """Convert priority score to label"""
        if priority_score >= 70:
            return "High"
        elif priority_score >= 40:
            return "Medium"
        else:
            return "Low"
