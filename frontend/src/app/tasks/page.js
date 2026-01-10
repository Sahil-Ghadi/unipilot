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
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import TaskCard from '@/components/TaskCard';
import BurnoutDialog from '@/components/BurnoutDialog';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, setAuthToken } from '@/lib/api';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function TasksPage() {
    const { getIdToken, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [burnoutDialogOpen, setBurnoutDialogOpen] = useState(false);
    const [completedTaskForRating, setCompletedTaskForRating] = useState(null);
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
                toast.error('Please log in to view tasks');
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
                toast.error('Authentication failed. Please log out and log in again.');
            } else {
                toast.error(`Failed to load tasks: ${error.message}`);
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

        // Sort: completed tasks at bottom, others by priority
        filtered.sort((a, b) => {
            // Completed tasks go to bottom
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            // Within same completion status, sort by priority
            return b.priority_score - a.priority_score;
        });

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
                toast.success('Task deleted successfully!');
                loadTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
                toast.error('Failed to delete task');
            }
        }
    };

    const handleComplete = async (taskId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await tasksAPI.updateTask(taskId, { status: 'completed' });

            // Find completed task for burnout rating
            const completedTask = tasks.find(t => t.id === taskId);
            if (completedTask) {
                setCompletedTaskForRating(completedTask);
                setBurnoutDialogOpen(true);
            }

            await loadTasks();
            toast.success('Task marked as completed!');
        } catch (error) {
            console.error('Error completing task:', error);
            toast.error('Failed to complete task');
        }
    };

    const handleTimerStart = async (taskId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await tasksAPI.startTimer(taskId);
            await loadTasks();
            toast.success('Timer started!');
        } catch (error) {
            console.error('Error starting timer:', error);
            toast.error(error.response?.data?.detail || 'Failed to start timer');
        }
    };

    const handleTimerPause = async (taskId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await tasksAPI.pauseTimer(taskId);
            await loadTasks();

            const duration = response.data?.duration_minutes || 0;
            toast.success(`Timer paused! Session: ${Math.round(duration)} minutes`);
        } catch (error) {
            console.error('Error pausing timer:', error);
            toast.error('Failed to pause timer');
        }
    };

    const handleBurnoutSubmit = async (rating) => {
        if (!completedTaskForRating) return;

        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await tasksAPI.submitBurnoutRating(completedTaskForRating.id, rating);

            // Show recommendations
            const recommendations = response.data?.recommendations || [];
            if (recommendations.length > 0) {
                toast.info(recommendations[0], { autoClose: 5000 });
            }

            setCompletedTaskForRating(null);
        } catch (error) {
            console.error('Error submitting burnout rating:', error);
            toast.error('Failed to submit rating');
        }
    };

    return (
        <ProtectedRoute>
            <Layout>
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
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
                    <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FilterListIcon color="action" />
                        <Chip
                            label="All"
                            onClick={() => setFilterStatus('all')}
                            color={filterStatus === 'all' ? 'primary' : 'default'}
                            sx={{
                                fontWeight: filterStatus === 'all' ? 600 : 400,
                                '&:hover': { transform: 'scale(1.05)' }
                            }}
                        />
                        <Chip
                            label="Pending"
                            onClick={() => setFilterStatus('pending')}
                            color={filterStatus === 'pending' ? 'primary' : 'default'}
                            sx={{
                                fontWeight: filterStatus === 'pending' ? 600 : 400,
                                '&:hover': { transform: 'scale(1.05)' }
                            }}
                        />
                        <Chip
                            label="In Progress"
                            onClick={() => setFilterStatus('in-progress')}
                            color={filterStatus === 'in-progress' ? 'primary' : 'default'}
                            sx={{
                                fontWeight: filterStatus === 'in-progress' ? 600 : 400,
                                '&:hover': { transform: 'scale(1.05)' }
                            }}
                        />
                        <Chip
                            label="Completed"
                            onClick={() => setFilterStatus('completed')}
                            color={filterStatus === 'completed' ? 'primary' : 'default'}
                            sx={{
                                fontWeight: filterStatus === 'completed' ? 600 : 400,
                                '&:hover': { transform: 'scale(1.05)' }
                            }}
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
                                onTimerStart={handleTimerStart}
                                onTimerPause={handleTimerPause}
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

                <ToastContainer position="bottom-right" />

                {/* Burnout Dialog */}
                <BurnoutDialog
                    open={burnoutDialogOpen}
                    onClose={() => {
                        setBurnoutDialogOpen(false);
                        setCompletedTaskForRating(null);
                    }}
                    onSubmit={handleBurnoutSubmit}
                    taskTitle={completedTaskForRating?.title || ''}
                />
            </Layout>
        </ProtectedRoute>
    );
}
