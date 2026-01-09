"use client";

import { useEffect, useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, Card, CardContent } from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, setAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function DashboardPage() {
    const { user, getIdToken } = useAuth();
    const router = useRouter();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await tasksAPI.getTasks();
            const allTasks = response.data;

            setTasks(allTasks);
            setStats({
                total: allTasks.length,
                pending: allTasks.filter(t => t.status === 'pending').length,
                inProgress: allTasks.filter(t => t.status === 'in-progress').length,
                completed: allTasks.filter(t => t.status === 'completed').length,
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
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
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Welcome back, {user?.displayName?.split(' ')[0]}! 👋
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    Here's your academic overview
                </Typography>

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {/* Stats Cards */}
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                            Total Tasks
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700}>
                                            {stats.total}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ bgcolor: 'warning.light' }}>
                                    <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                            Pending
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700}>
                                            {stats.pending}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ bgcolor: 'info.light' }}>
                                    <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                            In Progress
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700}>
                                            {stats.inProgress}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ bgcolor: 'success.light' }}>
                                    <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                            Completed
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700}>
                                            {stats.completed}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
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
                    </>
                )}
            </Container>
        </ProtectedRoute>
    );
}
