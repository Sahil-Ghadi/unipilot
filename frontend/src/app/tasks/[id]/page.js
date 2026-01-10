"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Container,
    Typography,
    Box,
    Paper,
    Chip,
    Button,
    Tabs,
    Tab,
    Grid,
    CircularProgress,
    Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PercentIcon from '@mui/icons-material/Percent';
import SchoolIcon from '@mui/icons-material/School';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ArticleIcon from '@mui/icons-material/Article';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ResourceCard from '@/components/ResourceCard';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, setAuthToken } from '@/lib/api';
import { format, parseISO } from 'date-fns';

export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { getIdToken } = useAuth();
    const taskId = params.id;

    const [task, setTask] = useState(null);
    const [resources, setResources] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingResources, setLoadingResources] = useState(false);
    const [error, setError] = useState(null);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        // Wait for auth to be ready before loading data
        const loadData = async () => {
            try {
                // Ensure we have auth before proceeding
                const token = await getIdToken();
                if (!token) {
                    setError('Authentication required');
                    setLoading(false);
                    return;
                }

                await loadTask();
                await loadResources();
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load task');
                setLoading(false);
            }
        };

        if (taskId) {
            loadData();
        }
    }, [taskId]);

    const loadTask = async () => {
        try {
            const token = await getIdToken();
            if (!token) {
                throw new Error('No auth token available');
            }
            setAuthToken(token);
            const response = await tasksAPI.getTask(taskId);
            setTask(response.data);
        } catch (error) {
            console.error('Error loading task:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                setError('Unauthorized access');
            } else {
                setError('Failed to load task');
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const loadResources = async () => {
        setLoadingResources(true);
        try {
            const token = await getIdToken();
            if (!token) {
                console.warn('No auth token for resources');
                return;
            }
            setAuthToken(token);
            const response = await tasksAPI.getResources(taskId);
            setResources(response.data);
        } catch (error) {
            console.error('Error loading resources:', error);
            // Don't set error state for resources, just log it
        } finally {
            setLoadingResources(false);
        }
    };

    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'MMM d, yyyy');
        } catch {
            return dateString;
        }
    };

    const getPriorityColor = (score) => {
        if (score >= 7) return 'error';
        if (score >= 4) return 'warning';
        return 'success';
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <Layout>
                    <LoadingSpinner />
                </Layout>
            </ProtectedRoute>
        );
    }

    if (error || !task) {
        return (
            <ProtectedRoute>
                <Layout>
                    <Container maxWidth="lg" sx={{ mt: 4 }}>
                        <Alert severity="error">{error || 'Task not found'}</Alert>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/tasks')}
                            sx={{ mt: 2 }}
                        >
                            Back to Tasks
                        </Button>
                    </Container>
                </Layout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <Layout>
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    {/* Back Button */}
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => router.push('/tasks')}
                        sx={{ mb: 3 }}
                    >
                        Back to Tasks
                    </Button>

                    {/* Task Details Card */}
                    <Paper sx={{ p: 4, mb: 4 }}>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            {task.title}
                        </Typography>

                        {/* Chips */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                            {task.course && (
                                <Chip
                                    icon={<SchoolIcon />}
                                    label={task.course}
                                    color="primary"
                                    sx={{ fontWeight: 500 }}
                                />
                            )}
                            <Chip
                                label={`Priority: ${task.priority_score || 0}`}
                                color={getPriorityColor(task.priority_score || 0)}
                                sx={{ fontWeight: 600 }}
                            />
                            {task.estimated_effort && (
                                <Chip
                                    icon={<AccessTimeIcon />}
                                    label={`${task.estimated_effort}h`}
                                    variant="outlined"
                                />
                            )}
                            {task.weight > 0 && (
                                <Chip
                                    icon={<PercentIcon />}
                                    label={`${task.weight}% of grade`}
                                    color="secondary"
                                    variant="outlined"
                                />
                            )}
                            {task.deadline && (
                                <Chip
                                    icon={<CalendarTodayIcon />}
                                    label={`Due: ${formatDate(task.deadline)}`}
                                    variant="outlined"
                                />
                            )}
                        </Box>

                        {/* Description */}
                        {task.description && (
                            <Box>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Description
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {task.description}
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Resources Section */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            📚 Learning Resources
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            AI-powered resources to help you complete this task
                        </Typography>

                        {loadingResources ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress />
                            </Box>
                        ) : resources ? (
                            <>
                                <Tabs
                                    value={tabValue}
                                    onChange={(e, newValue) => setTabValue(newValue)}
                                    sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                                >
                                    <Tab
                                        icon={<YouTubeIcon />}
                                        label={`Videos (${resources.videos?.length || 0})`}
                                        iconPosition="start"
                                    />
                                    <Tab
                                        icon={<ArticleIcon />}
                                        label={`Articles (${resources.articles?.length || 0})`}
                                        iconPosition="start"
                                    />
                                </Tabs>

                                {/* Videos Tab */}
                                {tabValue === 0 && (
                                    <Grid container spacing={3}>
                                        {resources.videos && resources.videos.length > 0 ? (
                                            resources.videos.map((video, index) => (
                                                <Grid item xs={12} md={4} key={index}>
                                                    <ResourceCard resource={video} />
                                                </Grid>
                                            ))
                                        ) : (
                                            <Grid item xs={12}>
                                                <Alert severity="info">No videos found for this task</Alert>
                                            </Grid>
                                        )}
                                    </Grid>
                                )}

                                {/* Articles Tab */}
                                {tabValue === 1 && (
                                    <Grid container spacing={3}>
                                        {resources.articles && resources.articles.length > 0 ? (
                                            resources.articles.map((article, index) => (
                                                <Grid item xs={12} md={4} key={index}>
                                                    <ResourceCard resource={article} />
                                                </Grid>
                                            ))
                                        ) : (
                                            <Grid item xs={12}>
                                                <Alert severity="info">No articles found for this task</Alert>
                                            </Grid>
                                        )}
                                    </Grid>
                                )}
                            </>
                        ) : (
                            <Alert severity="warning">
                                Unable to load resources. Please make sure API keys are configured.
                            </Alert>
                        )}
                    </Paper>
                </Container>
            </Layout>
        </ProtectedRoute>
    );
}
