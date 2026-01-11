"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    Button,
    Chip,
    Avatar,
    AvatarGroup,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProjectChat from '@/components/ProjectChat';
import ProjectTaskList from '@/components/ProjectTaskList';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, projectTasksAPI, setAuthToken } from '@/lib/api';
import { useProjectChat } from '@/hooks/useProjectChat';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { getIdToken, user } = useAuth();
    const projectId = params.id;

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [memberEmail, setMemberEmail] = useState('');
    const [tasks, setTasks] = useState([]);

    // Initialize chat
    const { messages, setMessages, isConnected, sendMessage, sendTyping, stopTyping, typingUsers } = useProjectChat(projectId, token);

    // Load project and messages
    useEffect(() => {
        if (user) {
            loadProject();
        }
    }, [user, projectId]);

    const loadProject = async () => {
        try {
            const authToken = await getIdToken();
            setToken(authToken);
            setAuthToken(authToken);

            // Load project details
            const projectResponse = await projectsAPI.getProject(projectId);
            setProject(projectResponse.data);

            // Load message history
            const messagesResponse = await axios.get(`${API_BASE_URL}/api/projects/${projectId}/messages`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            setMessages(messagesResponse.data.messages || []);

            // Load tasks
            const tasksResponse = await projectTasksAPI.getTasks(projectId);
            setTasks(tasksResponse.data.tasks || []);
        } catch (error) {
            console.error('Error loading project:', error);
            if (error.response?.status === 403 || error.response?.status === 404) {
                alert('Project not found or access denied');
                router.push('/projects');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!memberEmail.trim()) return;

        try {
            const authToken = await getIdToken();
            setAuthToken(authToken);

            await projectsAPI.addMember(projectId, memberEmail);
            setAddMemberOpen(false);
            setMemberEmail('');
            loadProject();
        } catch (error) {
            console.error('Error adding member:', error);
            alert(error.response?.data?.detail || 'Failed to add member');
        }
    };

    const handleCreateTask = async (taskData) => {
        try {
            const authToken = await getIdToken();
            setAuthToken(authToken);
            await projectTasksAPI.createTask(projectId, taskData);
            loadProject();
        } catch (error) {
            console.error('Error creating task:', error);
            alert(error.response?.data?.detail || 'Failed to create task');
        }
    };

    const handleUpdateTask = async (taskId, taskData) => {
        try {
            const authToken = await getIdToken();
            setAuthToken(authToken);
            await projectTasksAPI.updateTask(projectId, taskId, taskData);
            loadProject();
        } catch (error) {
            console.error('Error updating task:', error);
            alert(error.response?.data?.detail || 'Failed to update task');
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            const authToken = await getIdToken();
            setAuthToken(authToken);
            await projectTasksAPI.completeTask(projectId, taskId);
            toast.success('🎉 Task completed! Great work!');
            loadProject();
        } catch (error) {
            console.error('Error completing task:', error);
            toast.error('Failed to complete task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const authToken = await getIdToken();
            setAuthToken(authToken);
            await projectTasksAPI.deleteTask(projectId, taskId);
            toast.success('Task deleted successfully!');
            loadProject();
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Failed to delete task');
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>

                <LoadingSpinner />
            </ProtectedRoute>
        );
    }

    if (!project) {
        return (
            <ProtectedRoute>

                <Container>
                    <Typography>Project not found</Typography>
                </Container>
            </ProtectedRoute>
        );
    }

    const isOwner = project.owner_id === user?.uid;

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
                <Box
                    sx={{
                        maxWidth: 'xl',
                        mx: 'auto',
                        minHeight: '85vh',
                        background: 'radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
                        borderRadius: 4,
                        p: 1
                    }}
                >
                    {/* Header */}
                    <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/projects')}
                            sx={{
                                alignSelf: 'flex-start',
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                            }}
                        >
                            Back to Projects
                        </Button>

                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: 2
                        }}>
                            <Box>
                                <Typography variant="h3" fontWeight={800} sx={{
                                    background: 'linear-gradient(45deg, #1e40af 30%, #3b82f6 90%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 1
                                }}>
                                    {project.name}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6 }}>
                                    {project.description || 'No description provided for this project.'}
                                </Typography>
                            </Box>
                            {isOwner && (
                                <Button
                                    variant="contained"
                                    startIcon={<PersonAddIcon />}
                                    onClick={() => setAddMemberOpen(true)}
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                        background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)'
                                    }}
                                >
                                    Add Member
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Left Side - Info & Tasks */}
                        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Team Members Card */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" fontWeight={700}>
                                        Team
                                    </Typography>
                                    <Chip
                                        label={`${project.members?.length || 0} Members`}
                                        size="small"
                                        sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 600 }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {project.members?.map((member, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 2, '&:hover': { bgcolor: 'grey.50' } }}>
                                            <Avatar sx={{ bgcolor: member.role === 'owner' ? 'secondary.main' : 'primary.main', width: 40, height: 40, fontSize: '1rem' }}>
                                                {member.display_name?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle2" fontWeight={600}>
                                                    {member.display_name || member.email.split('@')[0]}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {member.email}
                                                </Typography>
                                            </Box>
                                            {member.role === 'owner' && (
                                                <Chip label="Owner" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>

                            {/* Task List Section */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 0,
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    flex: 1,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="h6" fontWeight={700}>Project Tasks</Typography>
                                </Box>
                                <Box sx={{ p: 2, flex: 1 }}>
                                    <ProjectTaskList
                                        tasks={tasks}
                                        projectMembers={project.members || []}
                                        currentUser={user}
                                        onCreateTask={handleCreateTask}
                                        onUpdateTask={handleUpdateTask}
                                        onCompleteTask={handleCompleteTask}
                                        onDeleteTask={handleDeleteTask}
                                    />
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Right Side - Chat */}
                        <Grid item xs={12} md={8}>
                            <Paper
                                elevation={0}
                                sx={{
                                    height: '75vh',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <ProjectChat
                                    messages={messages}
                                    isConnected={isConnected}
                                    sendMessage={sendMessage}
                                    sendTyping={sendTyping}
                                    stopTyping={stopTyping}
                                    typingUsers={typingUsers}
                                    currentUser={user}
                                    projectId={projectId}
                                />
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Add Member Dialog */}
                    <Dialog
                        open={addMemberOpen}
                        onClose={() => setAddMemberOpen(false)}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{
                            sx: { borderRadius: 3 }
                        }}
                    >
                        <DialogTitle sx={{ fontWeight: 700 }}>Add Team Member</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Invite a colleague to collaborate on this project. They will be notified via email.
                            </Typography>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Email Address"
                                type="email"
                                fullWidth
                                variant="outlined"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': { borderRadius: 2 }
                                }}
                            />
                        </DialogContent>
                        <DialogActions sx={{ p: 3 }}>
                            <Button onClick={() => setAddMemberOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
                            <Button
                                onClick={handleAddMember}
                                variant="contained"
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                Send Invite
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Layout>
        </ProtectedRoute>
    );
}
