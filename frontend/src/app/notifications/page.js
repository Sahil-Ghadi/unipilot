"use client";

import { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    List,
    ListItem,
    ListItemText,
    Button,
    Chip,
    Divider
} from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI, setAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';

export default function NotificationsPage() {
    const { getIdToken, user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await notificationsAPI.getNotifications();
            setNotifications(response.data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (notificationId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await notificationsAPI.acceptInvite(notificationId);
            alert('Invite accepted! Redirecting to project...');
            router.push(`/projects/${response.data.project_id}`);
        } catch (error) {
            console.error('Error accepting invite:', error);
            alert(error.response?.data?.detail || 'Failed to accept invite');
        }
    };

    const handleReject = async (notificationId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await notificationsAPI.rejectInvite(notificationId);
            loadNotifications();
        } catch (error) {
            console.error('Error rejecting invite:', error);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await notificationsAPI.deleteNotification(notificationId);
            loadNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'accepted': return 'success';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    return (
        <ProtectedRoute>
            <Layout>
                <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Notifications
                    </Typography>

                    {loading ? (
                        <LoadingSpinner />
                    ) : notifications.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                                No notifications yet
                            </Typography>
                        </Paper>
                    ) : (
                        <List>
                            {notifications.map((notification) => (
                                <Paper key={notification.id} sx={{ mb: 2 }}>
                                    <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {notification.title}
                                            </Typography>
                                            <Chip
                                                label={notification.status}
                                                color={getStatusColor(notification.status)}
                                                size="small"
                                            />
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {notification.message}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary">
                                            {formatDate(notification.created_at)}
                                        </Typography>

                                        {notification.status === 'pending' && notification.type === 'project_invite' && (
                                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => handleAccept(notification.id)}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => handleReject(notification.id)}
                                                >
                                                    Reject
                                                </Button>
                                            </Box>
                                        )}

                                        {notification.status !== 'pending' && (
                                            <Button
                                                variant="text"
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(notification.id)}
                                                sx={{ mt: 1 }}
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </ListItem>
                                </Paper>
                            ))}
                        </List>
                    )}
                </Container>
            </Layout>
        </ProtectedRoute>
    );
}
