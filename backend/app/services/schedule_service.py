from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.schedule import TimeBlock

class ScheduleService:
    """Service for generating personalized schedules"""
    
    def __init__(self):
        """Initialize schedule service"""
        # Import here to avoid circular dependency
        from app.services.ai_service import AIService
        from app.config.settings import settings
        
        self.ai_service = AIService(settings.google_gemini_api_key) if settings.google_gemini_api_key else None
    
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
        # Use date() to strip timezone, then create new datetime with local time
        base_date = target_date.date() if hasattr(target_date, 'date') else target_date
        current_time = datetime.combine(base_date, datetime.min.time()).replace(hour=work_hours_start, minute=0)
        end_time = datetime.combine(base_date, datetime.min.time()).replace(hour=work_hours_end, minute=0)
        
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
    
    async def generate_weekly_schedule(
        self,
        tasks: List[Dict[str, Any]],
        start_date: datetime,
        work_hours_start: int = 9,
        work_hours_end: int = 17,
        study_technique: str = 'pomodoro',
        custom_preferences: str = ''
    ) -> Dict[str, List[TimeBlock]]:
        """
        Generate a weekly schedule with intelligent task distribution
        Tasks are distributed across days based on deadlines
        """
        weekly_schedule = {}
        
        # Parse custom preferences with AI if provided
        unavailable_windows = []
        if custom_preferences and custom_preferences.strip() and self.ai_service:
            try:
                print(f"[Schedule Service] Parsing custom preferences with AI...")
                preferences_data = await self.ai_service.parse_schedule_preferences(
                    custom_preferences,
                    start_date.strftime('%Y-%m-%d')
                )
                unavailable_windows = preferences_data.get('unavailable_windows', [])
                print(f"[Schedule Service] Found {len(unavailable_windows)} unavailable windows")
            except Exception as e:
                print(f"[Schedule Service] Error parsing preferences: {str(e)}")
        
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
        
        # Generate daily schedules with unavailable windows applied
        for day_offset in range(7):
            current_date = start_date + timedelta(days=day_offset)
            day_key = current_date.strftime('%Y-%m-%d')
            day_tasks = task_assignments[day_offset]
            
            # Check for unavailable windows on this day
            day_unavailable_windows = [
                w for w in unavailable_windows 
                if w.get('date') == day_key
            ]
            
            if day_unavailable_windows:
                print(f"[Schedule Service] {day_key}: Found {len(day_unavailable_windows)} unavailable windows")
                for w in day_unavailable_windows:
                    print(f"  - {w.get('start_hour')}:00 to {w.get('end_hour')}:00: {w.get('reason', 'N/A')}")
            
            # Generate schedule with unavailable windows
            if day_tasks or day_unavailable_windows:
                # Create available time segments by excluding unavailable windows
                available_segments = []
                
                if not day_unavailable_windows:
                    # No constraints, use full work hours
                    available_segments.append((work_hours_start, work_hours_end))
                else:
                    # Sort unavailable windows by start time
                    sorted_windows = sorted(day_unavailable_windows, key=lambda w: w.get('start_hour', 0))
                    
                    current_hour = work_hours_start
                    for window in sorted_windows:
                        window_start = window.get('start_hour', 0)
                        window_end = window.get('end_hour', 0)
                        
                        # Add segment before this unavailable window
                        if current_hour < window_start and window_start <= work_hours_end:
                            available_segments.append((current_hour, min(window_start, work_hours_end)))
                        
                        # Move current hour past this unavailable window
                        current_hour = max(current_hour, window_end)
                    
                    # Add remaining segment after all unavailable windows
                    if current_hour < work_hours_end:
                        available_segments.append((current_hour, work_hours_end))
                
                print(f"[Schedule Service] {day_key}: Available segments: {available_segments}")
                
                # Generate blocks for each available segment
                daily_blocks = []
                
                # First, add unavailable blocks to the schedule
                for window in day_unavailable_windows:
                    window_start = window.get('start_hour', 0)
                    window_end = window.get('end_hour', 0)
                    
                    # Only add if within work hours
                    if window_start < work_hours_end and window_end > work_hours_start:
                        # Use date() to strip timezone, then create new datetime
                        base_date = current_date.date() if hasattr(current_date, 'date') else current_date
                        start_dt = datetime.combine(base_date, datetime.min.time()).replace(hour=window_start, minute=0)
                        end_dt = datetime.combine(base_date, datetime.min.time()).replace(hour=window_end, minute=0)
                        
                        unavailable_block = TimeBlock(
                            start_time=start_dt.isoformat(),
                            end_time=end_dt.isoformat(),
                            type='unavailable',
                            title='Unavailable',
                            description=window.get('reason', 'Not available during this time')
                        )
                        daily_blocks.append(unavailable_block)
                
                # Then add work blocks for available segments
                if day_tasks:
                    for segment_start, segment_end in available_segments:
                        if segment_start < segment_end:
                            segment_blocks = self.generate_schedule(
                                day_tasks,
                                current_date,
                                segment_start,
                                segment_end,
                                study_technique
                            )
                            daily_blocks.extend(segment_blocks)
                
                # Sort all blocks by start time
                daily_blocks.sort(key=lambda b: b.start_time)
                
                weekly_schedule[day_key] = daily_blocks
                print(f"[Schedule Service] {day_key}: Generated {len(daily_blocks)} total blocks")
            else:
                weekly_schedule[day_key] = []
        
        print(f"[Weekly] Distributed tasks across {sum(1 for tasks in task_assignments.values() if tasks)} days")
        return weekly_schedule



