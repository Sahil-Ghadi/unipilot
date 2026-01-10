"use client";

import { useState, useEffect } from 'react';
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    Button
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useRouter } from 'next/navigation';
import { notificationsAPI, setAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationBell() {
    const router = useRouter();
    const { getIdToken, user } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            loadNotifications();
            // Poll for new notifications every 30 seconds
            const interval = setInterval(loadNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadNotifications = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await notificationsAPI.getNotifications();
            const allNotifications = response.data;

            setNotifications(allNotifications);

            // Count pending notifications
            const pending = allNotifications.filter(n => n.status === 'pending').length;
            setUnreadCount(pending);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleViewAll = () => {
        handleClose();
        router.push('/notifications');
    };

    const handleAccept = async (notificationId) => {
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await notificationsAPI.acceptInvite(notificationId);
            loadNotifications();
            handleClose();
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

    const open = Boolean(anchorEl);
    const pendingNotifications = notifications.filter(n => n.status === 'pending').slice(0, 3);

    return (
        <>
            <IconButton
                onClick={() => router.push('/notifications')}
                sx={{
                    color: 'white',
                    '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }
                }}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: { width: 360, maxHeight: 400 }
                }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Notifications
                    </Typography>
                </Box>
                <Divider />

                {pendingNotifications.length === 0 ? (
                    <MenuItem disabled>
                        <Typography variant="body2" color="text.secondary">
                            No new notifications
                        </Typography>
                    </MenuItem>
                ) : (
                    pendingNotifications.map((notification) => (
                        <Box key={notification.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    {notification.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {notification.message}
                                </Typography>
                                {notification.type === 'project_invite' && (
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => handleAccept(notification.id)}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleReject(notification.id)}
                                        >
                                            Reject
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ))
                )}

                <Divider />
                <MenuItem onClick={handleViewAll}>
                    <Typography variant="body2" color="primary" sx={{ width: '100%', textAlign: 'center' }}>
                        View All Notifications
                    </Typography>
                </MenuItem>
            </Menu>
        </>
    );
}
