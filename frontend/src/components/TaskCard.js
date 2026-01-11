"use client";

import { Card, CardContent, Typography, Chip, Box, IconButton, LinearProgress, Tooltip, CircularProgress, Popover, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { format, parseISO, differenceInDays } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PercentIcon from '@mui/icons-material/Percent';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WarningIcon from '@mui/icons-material/Warning';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { tasksAPI, setAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import TaskTimer from './TaskTimer';

export default function TaskCard({ task, onEdit, onDelete, onComplete, onTimerStart, onTimerPause }) {
    const router = useRouter();
    const { getIdToken } = useAuth();
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in-progress';

    const [prediction, setPrediction] = useState(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePredict = async (event) => {
        setAnchorEl(event.currentTarget);
        if (prediction) return; // Already fetched

        setLoadingPrediction(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);
            const response = await tasksAPI.getProcrastinationPrediction(task.id);
            setPrediction(response.data);
        } catch (error) {
            console.error("Prediction failed:", error);
            setPrediction({ error: true });
        } finally {
            setLoadingPrediction(false);
        }
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    const getPriorityColor = (score) => {
        if (score >= 70) return 'error';
        if (score >= 40) return 'warning';
        return 'success';
    };

    const getPriorityLabel = (score) => {
        if (score >= 70) return 'High';
        if (score >= 40) return 'Medium';
        return 'Low';
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
            return format(parseISO(task.deadline), 'MMM d, yyyy');
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <Card
            elevation={0}
            sx={{
                mb: 2,
                position: 'relative',
                bgcolor: isCompleted ? 'grey.50' : 'background.paper',
                border: '1px solid',
                borderColor: isCompleted ? 'grey.200' : 'divider',
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    borderColor: isCompleted ? 'grey.300' : 'primary.main',
                },
            }}
        >
            <CardContent sx={{ p: '24px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isCompleted ? 'text.secondary' : 'text.primary',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                lineHeight: 1.3,
                                mb: 0.5
                            }}
                        >
                            {task.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SchoolIcon sx={{ fontSize: 16 }} />
                            {task.course}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.50' } }}
                        >
                            <MenuBookIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onEdit(task)}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.50' } }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(task.id)}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        {!isCompleted && (
                            <>
                                <Tooltip title="Predict Procrastination Risk">
                                    <IconButton
                                        size="small"
                                        onClick={handlePredict}
                                        sx={{ color: 'secondary.main', '&:hover': { bgcolor: 'secondary.50' } }}
                                    >
                                        <PsychologyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <IconButton
                                    size="small"
                                    onClick={() => onComplete(task.id)}
                                    sx={{ color: 'success.main', '&:hover': { bgcolor: 'success.50' } }}
                                >
                                    <CheckCircleIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Box>

                    <Popover
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handleClosePopover}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                    >
                        <Box sx={{ p: 2, maxWidth: 300 }}>
                            {loadingPrediction ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={20} />
                                    <Typography variant="body2">Analyzing patterns...</Typography>
                                </Box>
                            ) : prediction?.error ? (
                                <Typography color="error" variant="body2">Failed to analyze.</Typography>
                            ) : prediction ? (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Procrastination Risk:
                                        </Typography>
                                        <Chip
                                            label={prediction.level}
                                            size="small"
                                            color={prediction.level === 'High' ? 'error' : prediction.level === 'Medium' ? 'warning' : 'success'}
                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                        />
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                                        Risk Score: {Math.round(prediction.score * 100)}%
                                    </Typography>
                                    {prediction.factors?.length > 0 && (
                                        <List dense sx={{ p: 0, mt: 1 }}>
                                            {prediction.factors.map((factor, idx) => (
                                                <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        <WarningIcon fontSize="small" color="action" sx={{ fontSize: 16 }} />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={factor}
                                                        primaryTypographyProps={{ variant: 'caption', lineHeight: 1.2 }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                    {prediction.factors?.length === 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            No specific risk factors detected. You are safe!
                                        </Typography>
                                    )}
                                </>
                            ) : null}
                        </Box>
                    </Popover>
                </Box>

                {task.description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                        {task.description}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                    <Chip
                        label={`${getPriorityLabel(task.priority_score || 0)} Priority`}
                        size="small"
                        sx={{
                            bgcolor: 'transparent',
                            color: `${getPriorityColor(task.priority_score || 0)}.main`,
                            border: '1px solid',
                            borderColor: `${getPriorityColor(task.priority_score || 0)}.light`,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            height: 24
                        }}
                    />
                    <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: '1rem !important' }} />}
                        label={`${task.estimated_effort || 0}h`}
                        size="small"
                        sx={{
                            bgcolor: 'transparent',
                            border: '1px solid',
                            borderColor: 'grey.300',
                            color: 'text.secondary',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            height: 24,
                            '& .MuiChip-icon': { color: 'text.secondary' }
                        }}
                    />
                    {task.weight > 0 && (
                        <Chip
                            icon={<PercentIcon sx={{ fontSize: '1rem !important' }} />}
                            label={`${task.weight}%`}
                            size="small"
                            sx={{
                                bgcolor: 'transparent',
                                border: '1px solid',
                                borderColor: 'secondary.light',
                                color: 'secondary.main',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                height: 24,
                                '& .MuiChip-icon': { color: 'secondary.main' }
                            }}
                        />
                    )}

                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarTodayIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {formatDeadline()}
                        </Typography>
                        {daysLeft !== null && !isCompleted && (
                            <Typography variant="caption" sx={{
                                color: daysLeft < 0 ? 'error.main' : daysLeft < 3 ? 'warning.main' : 'success.main',
                                fontWeight: 600,
                                bgcolor: daysLeft < 0 ? 'error.50' : daysLeft < 3 ? 'warning.50' : 'success.50',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1
                            }}>
                                {daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
                            </Typography>
                        )}
                    </Box>

                    {isCompleted ? (
                        <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                            label="Done"
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{ height: 24, fontWeight: 600 }}
                        />
                    ) : (isInProgress &&
                        <Typography variant="caption" color="primary" fontWeight={600}>
                            In Progress
                        </Typography>
                    )}
                </Box>

                {isInProgress && (
                    <LinearProgress sx={{ mt: 2, borderRadius: 1, height: 6 }} />
                )}

                {/* Timer Widget */}
                {!isCompleted && (isInProgress || task.status === 'pending') && (
                    <Box sx={{ mt: 2 }}>
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
