"use client";

import { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Avatar,
    AvatarGroup,
} from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
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
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        loadProjects();
    }, []);

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

    const handleOpenDialog = () => {
        setFormData({ name: '', description: '' });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSubmit = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await projectsAPI.createProject(formData);
            handleCloseDialog();
            loadProjects();
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    const handleViewProject = (projectId) => {
        router.push(`/projects/${projectId}`);
    };

    return (
        <ProtectedRoute>
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
                            <Grid item xs={12} md={6} key={project.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom fontWeight={600}>
                                            {project.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {project.description || 'No description'}
                                        </Typography>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Members
                                                </Typography>
                                                <AvatarGroup max={4} sx={{ mt: 1 }}>
                                                    {project.members?.map((member, idx) => (
                                                        <Avatar key={idx} sx={{ width: 32, height: 32 }}>
                                                            {member.display_name?.[0] || member.email[0].toUpperCase()}
                                                        </Avatar>
                                                    ))}
                                                </AvatarGroup>
                                            </Box>

                                            <Box>
                                                {project.owner_id === user?.uid && (
                                                    <Chip label="Owner" size="small" color="primary" />
                                                )}
                                            </Box>
                                        </Box>

                                        <Box sx={{ mt: 2 }}>
                                            <Chip
                                                label={`${project.task_ids?.length || 0} tasks`}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Box>
                                    </CardContent>
                                    <CardActions>
                                        <Button size="small" onClick={() => handleViewProject(project.id)}>
                                            View Details
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Create Project Dialog */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="Project Name"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained">
                            Create
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </ProtectedRoute>
    );
}
