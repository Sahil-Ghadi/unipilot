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
    
    def predict_procrastination_risk(self, task: Dict[str, Any], user_history: List[Dict[str, Any]] = None) -> float:
        """
        Predict procrastination risk for a task (0-1, higher = more risk).
        Uses simple heuristics for now, can be enhanced with user history.
        """
        deadline = task.get('deadline')
        estimated_effort = task.get('estimated_effort', 2.0)
        
        # Handle None values
        if estimated_effort is None:
            estimated_effort = 2.0
        
        if deadline:
            try:
                if isinstance(deadline, str):
                    deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                
                days_until_deadline = (deadline - datetime.utcnow()).total_seconds() / 86400
            except:
                days_until_deadline = 30  # Default
        else:
            days_until_deadline = 30  # Default
        
        # Risk factors
        risk_score = 0.0
        
        # Factor 1: Long deadline = higher procrastination risk
        if days_until_deadline > 30:
            risk_score += 0.4
        elif days_until_deadline > 14:
            risk_score += 0.2
        
        # Factor 2: High effort tasks are often procrastinated
        if estimated_effort > 10:
            risk_score += 0.3
        elif estimated_effort > 5:
            risk_score += 0.15
        
        # Factor 3: Low weight tasks are often delayed
        weight = task.get('weight', 0.0)
        if weight is None:
            weight = 0.0
        if weight < 10:
            risk_score += 0.3
        elif weight < 20:
            risk_score += 0.15
        
        # Cap at 1.0
        risk_score = min(1.0, risk_score)
        
        return round(risk_score, 2)
    
    def get_priority_label(self, priority_score: float) -> str:
        """Convert priority score to label"""
        if priority_score >= 70:
            return "High"
        elif priority_score >= 40:
            return "Medium"
        else:
            return "Low"
