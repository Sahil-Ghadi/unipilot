"use client";

import { Card, CardContent, Typography, Chip, Box, IconButton, LinearProgress } from '@mui/material';
import { format } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function TaskCard({ task, onEdit, onDelete, onComplete }) {
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
            const deadline = new Date(task.deadline);
            const now = new Date();
            const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            return diff;
        } catch {
            return null;
        }
    };

    const daysLeft = getDaysUntilDeadline();

    const formatDeadline = () => {
        if (!task.deadline) return 'No deadline';
        try {
            return format(new Date(task.deadline), 'PPP');
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <Card sx={{ mb: 2, position: 'relative' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div">
                        {task.title}
                    </Typography>
                    <Box>
                        {task.status !== 'completed' && (
                            <IconButton size="small" onClick={() => onComplete(task.id)} color="success">
                                <CheckCircleIcon />
                            </IconButton>
                        )}
                        <IconButton size="small" onClick={() => onEdit(task)}>
                            <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => onDelete(task.id)} color="error">
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                </Box>

                {task.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {task.description}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={task.course} size="small" color="primary" variant="outlined" />
                    <Chip
                        label={getPriorityLabel(task.priority_score || 0)}
                        size="small"
                        color={getPriorityColor(task.priority_score || 0)}
                    />
                    <Chip
                        label={`${task.estimated_effort || 0}h`}
                        size="small"
                        variant="outlined"
                    />
                    {task.weight > 0 && (
                        <Chip
                            label={`${task.weight}% of grade`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                        />
                    )}
                </Box>

                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Due: {formatDeadline()}
                        {daysLeft !== null && (
                            daysLeft >= 0
                                ? ` (${daysLeft} days left)`
                                : ` (${Math.abs(daysLeft)} days overdue)`
                        )}
                    </Typography>
                </Box>

                {task.status === 'in-progress' && (
                    <LinearProgress sx={{ mt: 1 }} />
                )}
            </CardContent>
        </Card>
    );
}
