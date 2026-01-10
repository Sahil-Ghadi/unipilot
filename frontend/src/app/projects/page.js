"use client";

import { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Avatar,
    AvatarGroup,
    Divider
} from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, setAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';

export default function ProjectsPage() {
    const { getIdToken, user } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        if (user) {
            loadProjects();
        }
    }, [user]);

    const loadProjects = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await projectsAPI.getProjects();
            setProjects(response.data);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = () => setDialogOpen(true);
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setNewProject({ name: '', description: '' });
    };

    const handleCreateProject = async () => {
        if (!newProject.name.trim()) return;

        try {
            const token = await getIdToken();
            setAuthToken(token);

            await projectsAPI.createProject(newProject);
            handleCloseDialog();
            loadProjects();
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    return (
        <ProtectedRoute>
            <Layout>
                <Box maxWidth="lg" sx={{ mx: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" fontWeight={700}>
                            Group Projects
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenDialog}
                        >
                            New Project
                        </Button>
                    </Box>

                    {loading ? (
                        <LoadingSpinner />
                    ) : projects.length === 0 ? (
                        <Box sx={{ textAlign: 'center', mt: 8 }}>
                            <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                No Projects Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Create your first group project to collaborate with classmates
                            </Typography>
                            <Button variant="contained" onClick={handleOpenDialog}>
                                Create Project
                            </Button>
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {projects.map((project) => (
                                <Grid item xs={12} md={6} lg={4} key={project.id}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                                            }
                                        }}
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
                                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                                                    {project.name}
                                                </Typography>
                                                <Chip
                                                    label={project.members?.length || 0}
                                                    size="small"
                                                    icon={<GroupIcon sx={{ fontSize: '1rem' }} />}
                                                    sx={{ ml: 1 }}
                                                />
                                            </Box>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    mb: 3,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    minHeight: '2.5em'
                                                }}
                                            >
                                                {project.description || 'No description'}
                                            </Typography>

                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                                <Chip
                                                    label={`${project.task_ids?.length || 0} tasks`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                                {project.owner_id === user?.uid && (
                                                    <Chip
                                                        label="Owner"
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>

                                            <Divider sx={{ my: 2 }} />

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AvatarGroup max={4} sx={{ justifyContent: 'flex-start' }}>
                                                    {project.members?.slice(0, 4).map((member, idx) => (
                                                        <Avatar
                                                            key={idx}
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                fontSize: '0.75rem',
                                                                bgcolor: 'primary.main'
                                                            }}
                                                        >
                                                            {member.display_name?.[0] || member.email[0].toUpperCase()}
                                                        </Avatar>
                                                    ))}
                                                </AvatarGroup>
                                                {project.members?.length > 4 && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        +{project.members.length - 4} more
                                                    </Typography>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Create Project Dialog */}
                    <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Project Name"
                                fullWidth
                                value={newProject.name}
                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            />
                            <TextField
                                margin="dense"
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDialog}>Cancel</Button>
                            <Button onClick={handleCreateProject} variant="contained">
                                Create
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Layout>
        </ProtectedRoute>
    );
}
