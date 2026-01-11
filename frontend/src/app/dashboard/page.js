"use client";

import { useEffect, useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, Card, CardContent } from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, setAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { alpha } from '@mui/material/styles';

export default function DashboardPage() {
    const { user, getIdToken } = useAuth();
    const router = useRouter();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    useEffect(() => {
        if (user) {
            loadTasks();
        }
    }, [user]);

    const loadTasks = async () => {
        try {
            setError(null);
            console.log('🔄 Loading tasks for user:', user?.email);

            const token = await getIdToken();
            console.log('🔑 Got auth token, length:', token?.length);

            setAuthToken(token);

            console.log('📡 Making API request to /api/tasks');
            const response = await tasksAPI.getTasks();
            console.log('✅ API response received:', response.data);

            const allTasks = response.data;

            setTasks(allTasks);
            setStats({
                total: allTasks.length,
                pending: allTasks.filter(t => t.status === 'pending').length,
                inProgress: allTasks.filter(t => t.status === 'in-progress').length,
                completed: allTasks.filter(t => t.status === 'completed').length,
            });
        } catch (error) {
            console.error('❌ Error loading tasks:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack
            });
            setError(error.response?.data?.detail || error.message || 'Failed to load tasks. Please check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const upcomingTasks = tasks
        .filter(t => t.status === 'pending')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

    return (
        <ProtectedRoute>
            <Layout>
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Typography variant="h4" gutterBottom fontWeight={700}>
                        Welcome back, {user?.displayName?.split(' ')[0]}! 👋
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Here's your academic overview
                    </Typography>

                    {error && (
                        <Paper sx={{ p: 3, mt: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                            <Typography variant="h6" gutterBottom>
                                ⚠️ Error Loading Dashboard
                            </Typography>
                            <Typography variant="body2">
                                {error}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Please check the browser console (F12) for more details.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={loadTasks}
                                sx={{ mt: 2 }}
                            >
                                Retry
                            </Button>
                        </Paper>
                    )}

                    {/* Stats Cards */}
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        {[
                            {
                                label: 'Total Tasks',
                                value: stats.total,
                                icon: <AssignmentIcon />,
                                color: 'primary'
                            },
                            {
                                label: 'Pending',
                                value: stats.pending,
                                icon: <HourglassEmptyIcon />,
                                color: 'warning'
                            },
                            {
                                label: 'In Progress',
                                value: stats.inProgress,
                                icon: <TrendingUpIcon />,
                                color: 'info'
                            },
                            {
                                label: 'Completed',
                                value: stats.completed,
                                icon: <CheckCircleIcon />,
                                color: 'success'
                            }
                        ].map((stat, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            borderColor: `${stat.color}.main`
                                        }
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography color="text.secondary" variant="body2" fontWeight={500} gutterBottom>
                                                    {stat.label}
                                                </Typography>
                                                <Typography variant="h4" fontWeight={700} color="text.primary">
                                                    {stat.value}
                                                </Typography>
                                            </Box>
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: (theme) => alpha(theme.palette[stat.color].main, 0.1),
                                                    color: `${stat.color}.main`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {stat.icon}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Quick Actions */}
                    <Paper sx={{ p: 3, mt: 4 }}>
                        <Typography variant="h6" gutterBottom fontWeight={600}>
                            Quick Actions
                        </Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={4}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<UploadFileIcon />}
                                    onClick={() => router.push('/upload')}
                                    sx={{ py: 1.5 }}
                                >
                                    Upload Syllabus
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<AssignmentIcon />}
                                    onClick={() => router.push('/tasks')}
                                    sx={{ py: 1.5 }}
                                >
                                    View All Tasks
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<CalendarMonthIcon />}
                                    onClick={() => router.push('/schedule')}
                                    sx={{ py: 1.5 }}
                                >
                                    Generate Schedule
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Upcoming Tasks */}
                    <Paper sx={{ p: 3, mt: 4 }}>
                        <Typography variant="h6" gutterBottom fontWeight={600}>
                            Upcoming Deadlines
                        </Typography>
                        {upcomingTasks.length === 0 ? (
                            <Typography color="text.secondary" sx={{ mt: 2 }}>
                                No upcoming tasks. You're all caught up! 🎉
                            </Typography>
                        ) : (
                            <Box sx={{ mt: 2 }}>
                                {upcomingTasks.map((task) => (
                                    <Box
                                        key={task.id}
                                        sx={{
                                            p: 2,
                                            mb: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {task.title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {task.course}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="error">
                                            {new Date(task.deadline).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Container>
            </Layout>
        </ProtectedRoute>
    );
}
