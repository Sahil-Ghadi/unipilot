"use client";

import { Card, CardContent, Typography, Chip, Box, IconButton, LinearProgress } from '@mui/material';
import { format, parseISO, differenceInDays } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PercentIcon from '@mui/icons-material/Percent';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useRouter } from 'next/navigation';
import TaskTimer from './TaskTimer';

export default function TaskCard({ task, onEdit, onDelete, onComplete, onTimerStart, onTimerPause }) {
    const router = useRouter();
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in-progress';

    const getPriorityColor = (score) => {
        if (score >= 70) return 'error';
        if (score >= 40) return 'warning';
        return 'success';
    };

    const getPriorityLabel = (score) => {
        if (score >= 70) return 'High Priority';
        if (score >= 40) return 'Medium Priority';
        return 'Low Priority';
    };

    const getDaysUntilDeadline = () => {
        if (!task.deadline) return null;
        try {
            const deadline = parseISO(task.deadline);
            const now = new Date();
            const diff = differenceInDays(deadline, now);
            return diff;
        } catch {
            return null;
        }
    };

    const daysLeft = getDaysUntilDeadline();

    const formatDeadline = () => {
        if (!task.deadline) return 'No deadline';
        try {
            return format(parseISO(task.deadline), 'PPP');
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <Card
            sx={{
                mb: 2,
                position: 'relative',
                bgcolor: isCompleted ? '#f0fdf4' : 'background.paper',
                border: isCompleted ? '2px solid #86efac' : 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                },
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isCompleted ? 'text.secondary' : 'text.primary',
                            fontWeight: 600
                        }}
                    >
                        {task.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            sx={{
                                '&:hover': {
                                    bgcolor: 'primary.light',
                                    transform: 'scale(1.1)'
                                }
                            }}
                        >
                            <MenuBookIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onEdit(task)}
                            sx={{
                                '&:hover': {
                                    bgcolor: 'primary.light',
                                    transform: 'scale(1.1)'
                                }
                            }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(task.id)}
                            sx={{
                                '&:hover': {
                                    bgcolor: 'error.light',
                                    transform: 'scale(1.1)'
                                }
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        {!isCompleted && (
                            <IconButton
                                size="small"
                                onClick={() => onComplete(task.id)}
                                sx={{
                                    '&:hover': {
                                        bgcolor: 'success.light',
                                        transform: 'scale(1.1)'
                                    }
                                }}
                            >
                                <CheckCircleIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                </Box>

                {task.description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2, lineHeight: 1.6 }}
                    >
                        {task.description}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                        icon={<SchoolIcon />}
                        label={task.course}
                        size="small"
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontWeight: 500,
                            '& .MuiChip-icon': { color: 'white' }
                        }}
                    />
                    <Chip
                        label={getPriorityLabel(task.priority_score || 0)}
                        size="small"
                        color={getPriorityColor(task.priority_score || 0)}
                        sx={{
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            fontSize: '0.7rem'
                        }}
                    />
                    <Chip
                        icon={<AccessTimeIcon />}
                        label={`${task.estimated_effort || 0}h`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                    />
                    {task.weight > 0 && (
                        <Chip
                            icon={<PercentIcon />}
                            label={`${task.weight}% of grade`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                        />
                    )}
                    {isCompleted && (
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="Completed"
                            size="small"
                            sx={{
                                bgcolor: '#10b981',
                                color: 'white',
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: 'white' }
                            }}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Due: {formatDeadline()}
                        {daysLeft !== null && (
                            <span style={{
                                color: daysLeft < 0 ? '#ef4444' : daysLeft < 3 ? '#f59e0b' : '#10b981',
                                fontWeight: 600,
                                marginLeft: '4px'
                            }}>
                                {daysLeft >= 0
                                    ? `(${daysLeft} days left)`
                                    : `(${Math.abs(daysLeft)} days overdue)`}
                            </span>
                        )}
                    </Typography>
                </Box>

                {task.status === 'in-progress' && (
                    <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
                )}

                {/* Timer Widget */}
                {!isCompleted && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <TaskTimer
                            task={task}
                            isActive={isInProgress}
                            onTimerStart={() => onTimerStart?.(task.id)}
                            onTimerPause={() => onTimerPause?.(task.id)}
                        />
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
