"use client";

import { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Chip,
} from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import TaskCard from '@/components/TaskCard';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, setAuthToken } from '@/lib/api';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';

export default function TasksPage() {
    const { getIdToken, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        course: '',
        deadline: '',
        estimated_effort: 2,
        weight: 0,
    });

    useEffect(() => {
        if (user) {
            loadTasks();
        }
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [tasks, filterStatus]);

    const loadTasks = async () => {
        try {
            setLoading(true);

            // Get token with validation
            const token = await getIdToken();
            if (!token) {
                console.error('❌ No authentication token - user might not be logged in');
                alert('Please log in to view tasks');
                setTasks([]);
                return;
            }

            console.log('🔑 Token obtained, length:', token.length);
            setAuthToken(token);

            console.log('📡 Fetching tasks...');
            const response = await tasksAPI.getTasks();
            console.log('✅ Tasks response:', response);

            if (response && response.data) {
                setTasks(Array.isArray(response.data) ? response.data : []);
            } else {
                console.warn('⚠️ Unexpected response format:', response);
                setTasks([]);
            }
        } catch (error) {
            console.error('❌ Error loading tasks:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            if (error.response?.status === 401) {
                alert('Authentication failed. Please log out and log in again.');
            } else {
                alert(`Failed to load tasks: ${error.message}`);
            }
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tasks];

        if (filterStatus !== 'all') {
            filtered = filtered.filter(t => t.status === filterStatus);
        }

        // Sort by priority
        filtered.sort((a, b) => b.priority_score - a.priority_score);

        setFilteredTasks(filtered);
    };

    const handleOpenDialog = (task = null) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title,
                description: task.description || '',
                course: task.course,
                deadline: new Date(task.deadline).toISOString().slice(0, 16),
                estimated_effort: task.estimated_effort,
                weight: task.weight,
            });
        } else {
            setEditingTask(null);
            setFormData({
                title: '',
                description: '',
                course: '',
                deadline: '',
                estimated_effort: 2,
                weight: 0,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingTask(null);
    };

    const handleSubmit = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const taskData = {
                ...formData,
                deadline: new Date(formData.deadline).toISOString(),
            };

            if (editingTask) {
                await tasksAPI.updateTask(editingTask.id, taskData);
            } else {
                await tasksAPI.createTask(taskData);
            }

            handleCloseDialog();
            loadTasks();
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const handleDelete = async (taskId) => {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                const token = await getIdToken();
                setAuthToken(token);

                await tasksAPI.deleteTask(taskId);
                loadTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleComplete = async (taskId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await tasksAPI.updateTask(taskId, { status: 'completed' });
            loadTasks();
        } catch (error) {
            console.error('Error completing task:', error);
        }
    };

    return (
        <ProtectedRoute>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight={700}>
                        My Tasks
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add Task
                    </Button>
                </Box>

                {/* Filters */}
                <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FilterListIcon color="action" />
                    <Chip
                        label="All"
                        onClick={() => setFilterStatus('all')}
                        color={filterStatus === 'all' ? 'primary' : 'default'}
                    />
                    <Chip
                        label="Pending"
                        onClick={() => setFilterStatus('pending')}
                        color={filterStatus === 'pending' ? 'primary' : 'default'}
                    />
                    <Chip
                        label="In Progress"
                        onClick={() => setFilterStatus('in-progress')}
                        color={filterStatus === 'in-progress' ? 'primary' : 'default'}
                    />
                    <Chip
                        label="Completed"
                        onClick={() => setFilterStatus('completed')}
                        color={filterStatus === 'completed' ? 'primary' : 'default'}
                    />
                </Box>

                {loading ? (
                    <LoadingSpinner />
                ) : filteredTasks.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                        No tasks found. Add your first task to get started!
                    </Typography>
                ) : (
                    filteredTasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleOpenDialog}
                            onDelete={handleDelete}
                            onComplete={handleComplete}
                        />
                    ))
                )}

                {/* Task Dialog */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="Title"
                                fullWidth
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            <TextField
                                label="Course"
                                fullWidth
                                value={formData.course}
                                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            />
                            <TextField
                                label="Deadline"
                                type="datetime-local"
                                fullWidth
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Estimated Effort (hours)"
                                type="number"
                                fullWidth
                                value={formData.estimated_effort}
                                onChange={(e) => setFormData({ ...formData, estimated_effort: parseFloat(e.target.value) })}
                            />
                            <TextField
                                label="Weight (% of grade)"
                                type="number"
                                fullWidth
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained">
                            {editingTask ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </ProtectedRoute>
    );
}
