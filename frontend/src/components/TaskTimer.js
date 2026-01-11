"use client";

import { Box, Typography, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { useState, useEffect } from 'react';

export default function TaskTimer({ task, onTimerStart, onTimerPause, isActive }) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [sessionStart, setSessionStart] = useState(null);

    useEffect(() => {
        if (isActive && task.current_session_id) {
            // Find active session
            const activeSession = task.time_sessions?.find(s => s.id === task.current_session_id);
            if (activeSession && activeSession.start_time) {
                // Parse as UTC to avoid timezone offset
                const startTimeStr = activeSession.start_time.replace('Z', '');
                setSessionStart(new Date(startTimeStr + 'Z'));
            }
        } else {
            setSessionStart(null);
        }
    }, [isActive, task]);

    useEffect(() => {
        let interval;
        if (isActive && sessionStart) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now - sessionStart) / 1000); // seconds
                setElapsedTime(diff);
            }, 1000);
        } else {
            setElapsedTime(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, sessionStart]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTotalTime = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getTotalSeconds = () => {
        const storedSeconds = (task.total_time_spent || 0) * 60;
        return storedSeconds + elapsedTime;
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
                onClick={isActive ? onTimerPause : onTimerStart}
                sx={{
                    width: 48,
                    height: 48,
                    bgcolor: isActive ? 'warning.light' : 'success.light',
                    color: isActive ? 'warning.dark' : 'success.dark',
                    '&:hover': {
                        bgcolor: isActive ? 'warning.main' : 'success.main',
                        color: 'white',
                        transform: 'scale(1.05)'
                    },
                    transition: 'all 0.2s'
                }}
            >
                {isActive ? <PauseIcon sx={{ fontSize: 28 }} /> : <PlayArrowIcon sx={{ fontSize: 28 }} />}
            </IconButton>

            <Box>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'monospace', lineHeight: 1, letterSpacing: 1 }}>
                    {formatTime(getTotalSeconds())}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {isActive ? 'Session Active' : 'Total Time'}
                </Typography>
            </Box>
        </Box>
    );
}
