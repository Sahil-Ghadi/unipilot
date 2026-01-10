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
            loadProject();
        } catch (error) {
            console.error('Error completing task:', error);
            alert(error.response?.data?.detail || 'Failed to complete task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const authToken = await getIdToken();
            setAuthToken(authToken);
            await projectTasksAPI.deleteTask(projectId, taskId);
            loadProject();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert(error.response?.data?.detail || 'Failed to delete task');
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
                <Box maxWidth="xl" sx={{ mx: 'auto' }}>
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/projects')}
                            sx={{ mb: 2 }}
                        >
                            Back to Projects
                        </Button>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h4" fontWeight={700}>
                                    {project.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {project.description || 'No description'}
                                </Typography>
                            </Box>
                            {isOwner && (
                                <Button
                                    variant="outlined"
                                    startIcon={<PersonAddIcon />}
                                    onClick={() => setAddMemberOpen(true)}
                                >
                                    Add Member
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Left Side - Project Info */}
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Team Members
                                </Typography>
                                <AvatarGroup max={10} sx={{ justifyContent: 'flex-start', mb: 2 }}>
                                    {project.members?.map((member, idx) => (
                                        <Avatar key={idx} sx={{ bgcolor: 'primary.main' }}>
                                            {member.display_name?.[0] || member.email[0].toUpperCase()}
                                        </Avatar>
                                    ))}
                                </AvatarGroup>
                                <List dense>
                                    {project.members?.map((member, idx) => (
                                        <ListItem key={idx}>
                                            <ListItemText
                                                primary={member.display_name || member.email}
                                                secondary={member.role === 'owner' ? 'Owner' : 'Member'}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>

                            <Paper sx={{ p: 3 }}>
                                <ProjectTaskList
                                    tasks={tasks}
                                    projectMembers={project.members || []}
                                    currentUser={user}
                                    onCreateTask={handleCreateTask}
                                    onUpdateTask={handleUpdateTask}
                                    onCompleteTask={handleCompleteTask}
                                    onDeleteTask={handleDeleteTask}
                                />
                            </Paper>
                        </Grid>

                        {/* Right Side - Chat */}
                        <Grid item xs={12} md={8}>
                            <Box sx={{ height: '70vh' }}>
                                <ProjectChat
                                    messages={messages}
                                    isConnected={isConnected}
                                    sendMessage={sendMessage}
                                    sendTyping={sendTyping}
                                    stopTyping={stopTyping}
                                    typingUsers={typingUsers}
                                    currentUser={user}
                                />
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Add Member Dialog */}
                    <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Member Email"
                                type="email"
                                fullWidth
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                helperText="Enter the email address of the person you want to add"
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddMember} variant="contained">
                                Add Member
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Layout>
        </ProtectedRoute>
    );
}
