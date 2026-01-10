"use client";

import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Avatar,
    Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';

const priorityColors = {
    low: 'success',
    medium: 'warning',
    high: 'error'
};

const statusColors = {
    pending: 'default',
    'in-progress': 'info',
    completed: 'success'
};

export default function ProjectTaskList({
    tasks,
    projectMembers,
    currentUser,
    onCreateTask,
    onUpdateTask,
    onCompleteTask,
    onDeleteTask
}) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        assigned_to_email: '',
        assigned_to_name: '',
        priority: 'medium',
        due_date: ''
    });

    const handleOpenCreate = () => {
        setFormData({
            title: '',
            description: '',
            assigned_to: '',
            assigned_to_email: '',
            assigned_to_name: '',
            priority: 'medium',
            due_date: ''
        });
        setCreateDialogOpen(true);
    };

    const handleOpenEdit = (task) => {
        setSelectedTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            assigned_to: task.assigned_to,
            assigned_to_email: task.assigned_to_email,
            assigned_to_name: task.assigned_to_name || '',
            priority: task.priority,
            due_date: task.due_date || ''
        });
        setEditDialogOpen(true);
    };

    const handleMemberSelect = (memberId) => {
        const member = projectMembers.find(m => m.user_id === memberId);
        if (member) {
            setFormData({
                ...formData,
                assigned_to: member.user_id,
                assigned_to_email: member.email,
                assigned_to_name: member.display_name || member.email
            });
        }
    };

    const handleCreate = () => {
        if (!formData.title || !formData.assigned_to) return;
        onCreateTask(formData);
        setCreateDialogOpen(false);
    };

    const handleUpdate = () => {
        if (!formData.title) return;
        onUpdateTask(selectedTask.id, formData);
        setEditDialogOpen(false);
    };

    const canComplete = (task) => task.assigned_to === currentUser?.uid && task.status !== 'completed';
    const canEdit = (task) => task.created_by === currentUser?.uid;
    const canDelete = (task) => task.created_by === currentUser?.uid;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                    Project Tasks
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    size="small"
                >
                    Add Task
                </Button>
            </Box>

            {tasks.length === 0 ? (
                <Card sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                        No tasks yet. Create your first task!
                    </Typography>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {tasks.map((task) => (
                        <Card key={task.id} sx={{ position: 'relative' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {task.title}
                                            </Typography>
                                            <Chip
                                                label={task.priority}
                                                size="small"
                                                color={priorityColors[task.priority]}
                                            />
                                            <Chip
                                                label={task.status}
                                                size="small"
                                                color={statusColors[task.status]}
                                                variant="outlined"
                                            />
                                        </Box>
                                        {task.description && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {task.description}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                                {task.assigned_to_name?.[0] || task.assigned_to_email[0].toUpperCase()}
                                            </Avatar>
                                            <Typography variant="caption" color="text.secondary">
                                                {task.assigned_to_name || task.assigned_to_email}
                                            </Typography>
                                        </Box>
                                        {task.due_date && (
                                            <Typography variant="caption" color="text.secondary">
                                                📅 {format(new Date(task.due_date), 'MMM dd, yyyy')}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {canComplete(task) && (
                                            <IconButton
                                                size="small"
                                                color="success"
                                                onClick={() => onCompleteTask(task.id)}
                                            >
                                                <CheckCircleIcon />
                                            </IconButton>
                                        )}
                                        {canEdit(task) && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenEdit(task)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete(task) && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => onDeleteTask(task.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Create Task Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Task Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Assign To</InputLabel>
                        <Select
                            value={formData.assigned_to}
                            onChange={(e) => handleMemberSelect(e.target.value)}
                            label="Assign To"
                        >
                            {projectMembers.map((member) => (
                                <MenuItem key={member.user_id} value={member.user_id}>
                                    {member.display_name || member.email}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            label="Priority"
                        >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="Due Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Task Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Assign To</InputLabel>
                        <Select
                            value={formData.assigned_to}
                            onChange={(e) => handleMemberSelect(e.target.value)}
                            label="Assign To"
                        >
                            {projectMembers.map((member) => (
                                <MenuItem key={member.user_id} value={member.user_id}>
                                    {member.display_name || member.email}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            label="Priority"
                        >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="Due Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} variant="contained">Update</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
