from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.schedule import TimeBlock

class ScheduleService:
    """Service for generating personalized schedules"""
    
    def __init__(self):
        """Initialize schedule service"""
        pass
    
    def generate_schedule(
        self,
        tasks: List[Dict[str, Any]],
        target_date: datetime,
        work_hours_start: int = 9,
        work_hours_end: int = 17,
        study_technique: str = 'pomodoro'
    ) -> List[TimeBlock]:
        """
        Generate a daily schedule for given tasks
        Supports multiple study techniques: Pomodoro, Time Blocking, 52-17, or None
        """
        # Filter tasks: must have deadline AND not be completed
        valid_tasks = [
            t for t in tasks 
            if t.get('deadline') is not None and t.get('status') != 'completed'
        ]
        
        print(f"[Schedule Service] Total: {len(tasks)}, Valid (not completed): {len(valid_tasks)}, Technique: {study_technique}")
        
        if not valid_tasks:
            print("[Schedule Service] No valid tasks found!")
            return []
        
        # Sort by priority
        sorted_tasks = sorted(valid_tasks, key=lambda x: x.get('priority_score', 0), reverse=True)
        
        # Generate time blocks
        blocks = []
        current_time = target_date.replace(hour=work_hours_start, minute=0, second=0, microsecond=0)
        end_time = target_date.replace(hour=work_hours_end, minute=0, second=0, microsecond=0)
        
        for task in sorted_tasks:
            if current_time >= end_time:
                break
            
            # Get task effort in minutes
            effort_hours = task.get('estimated_effort', 2.0)
            if effort_hours is None:
                effort_hours = 2.0
            effort_minutes = int(effort_hours * 60)
            
            # Determine work/break durations based on technique
            if study_technique == 'pomodoro':
                work_duration = 25
                break_duration = 5
            elif study_technique == 'timeblocking':
                work_duration = 120  # 2 hours
                break_duration = 15
            elif study_technique == '52-17':
                work_duration = 52
                break_duration = 17
            else:  # 'none'
                work_duration = effort_minutes
                break_duration = 0
            
            # Break into sessions if using a technique
            if study_technique != 'none':
                sessions = effort_minutes // work_duration
                remaining = effort_minutes % work_duration
                
                for i in range(sessions):
                    if current_time >= end_time:
                        break
                    
                    # Work block
                    work_block = TimeBlock(
                        start_time=current_time.isoformat(),
                        end_time=(current_time + timedelta(minutes=work_duration)).isoformat(),
                        task_id=task.get('id'),
                        type='work',
                        title=task.get('title', 'Untitled'),
                        description=task.get('description', '')[:100]
                    )
                    blocks.append(work_block)
                    current_time += timedelta(minutes=work_duration)
                    
                    # Break block (if not end of day)
                    if current_time < end_time and break_duration > 0:
                        break_block = TimeBlock(
                            start_time=current_time.isoformat(),
                            end_time=(current_time + timedelta(minutes=break_duration)).isoformat(),
                            type='break',
                            title='Break',
                            description='Take a break'
                        )
                        blocks.append(break_block)
                        current_time += timedelta(minutes=break_duration)
                
                # Remaining work
                if remaining > 0 and current_time < end_time:
                    work_block = TimeBlock(
                        start_time=current_time.isoformat(),
                        end_time=(current_time + timedelta(minutes=remaining)).isoformat(),
                        task_id=task.get('id'),
                        type='work',
                        title=task.get('title', 'Untitled'),
                        description=task.get('description', '')[:100]
                    )
                    blocks.append(work_block)
                    current_time += timedelta(minutes=remaining)
            else:
                # No technique: schedule the full task continuously
                task_end = current_time + timedelta(minutes=effort_minutes)
                if task_end > end_time:
                    task_end = end_time
                
                work_block = TimeBlock(
                    start_time=current_time.isoformat(),
                    end_time=task_end.isoformat(),
                    task_id=task.get('id'),
                    type='work',
                    title=task.get('title', 'Untitled'),
                    description=task.get('description', '')[:100]
                )
                blocks.append(work_block)
                current_time = task_end
        
        print(f"[Schedule Service] Generated {len(blocks)} time blocks")
        return blocks
    
    def generate_weekly_schedule(
        self,
        tasks: List[Dict[str, Any]],
        start_date: datetime,
        work_hours_start: int = 9,
        work_hours_end: int = 17,
        study_technique: str = 'pomodoro'
    ) -> Dict[str, List[TimeBlock]]:
        """
        Generate a weekly schedule with intelligent task distribution
        Tasks are distributed across days based on deadlines
        """
        weekly_schedule = {}
        
        # Filter valid tasks
        valid_tasks = [
            t for t in tasks 
            if t.get('deadline') is not None and t.get('status') != 'completed'
        ]
        
        if not valid_tasks:
            for day_offset in range(7):
                current_date = start_date + timedelta(days=day_offset)
                day_key = current_date.strftime('%Y-%m-%d')
                weekly_schedule[day_key] = []
            return weekly_schedule
        
        # Sort by deadline, then priority
        def parse_deadline(task):
            deadline = task.get('deadline')
            if isinstance(deadline, str):
                return datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            return deadline
        
        sorted_tasks = sorted(
            valid_tasks,
            key=lambda x: (parse_deadline(x), -x.get('priority_score', 0))
        )
        
        # Distribute tasks across days
        task_assignments = {i: [] for i in range(7)}
        
        for task in sorted_tasks:
            deadline_date = parse_deadline(task)
            days_until_deadline = (deadline_date.date() - start_date.date()).days
            
            # Determine which day to schedule
            if days_until_deadline < 0:
                target_day = 0  # Overdue - do today
            elif days_until_deadline >= 7:
                # Far future - find day with least work
                target_day = min(
                    range(7),
                    key=lambda d: sum(t.get('estimated_effort', 2.0) for t in task_assignments[d])
                )
            else:
                # Schedule 1 day before deadline
                target_day = max(0, min(6, days_until_deadline - 1))
            
            task_assignments[target_day].append(task)
        
        # Generate daily schedules
        for day_offset in range(7):
            current_date = start_date + timedelta(days=day_offset)
            day_key = current_date.strftime('%Y-%m-%d')
            day_tasks = task_assignments[day_offset]
            
            if day_tasks:
                daily_blocks = self.generate_schedule(
                    day_tasks,
                    current_date,
                    work_hours_start,
                    work_hours_end,
                    study_technique
                )
                weekly_schedule[day_key] = daily_blocks
            else:
                weekly_schedule[day_key] = []
        
        print(f"[Weekly] Distributed tasks across {sum(1 for tasks in task_assignments.values() if tasks)} days")
        return weekly_schedule
