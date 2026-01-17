"use client";

import { useState } from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    IconButton,
    Badge,
    Divider,
    Avatar,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import EventIcon from '@mui/icons-material/Event';
import SyncIcon from '@mui/icons-material/Sync';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useEffect } from 'react';
import { notificationsAPI, calendarAPI, setAuthToken } from '@/lib/api';
import { CircularProgress } from '@mui/material';
import NotificationBell from './NotificationBell';

const DRAWER_WIDTH = 240;

const menuItems = [
    { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
    { text: 'Tasks', icon: AssignmentIcon, path: '/tasks' },
    { text: 'Schedule', icon: CalendarMonthIcon, path: '/schedule' },
    { text: 'Projects', icon: GroupIcon, path: '/projects' },
    { text: 'Upload', icon: UploadFileIcon, path: '/upload' },
    { text: 'Chat', icon: SmartToyIcon, path: '/chat' },
];

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, signOut, getIdToken } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    // Calendar State
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [calendarSyncing, setCalendarSyncing] = useState(false);

    useEffect(() => {
        if (user) {
            loadNotificationCount();
            checkCalendarStatus();

            // Check URL params for calendar callback
            const params = new URLSearchParams(window.location.search);
            if (params.get('calendar_connected')) {
                // Refresh status
                checkCalendarStatus();
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [user]);

    const loadNotificationCount = async () => {
        // ... existing logic ...
        try {
            const token = await getIdToken();
            if (!token) return;

            setAuthToken(token);
            const response = await notificationsAPI.getNotifications();
            const pending = response.data.filter(n => n.status === 'pending').length;
            setNotificationCount(pending);
        } catch (error) {
            setNotificationCount(0);
        }
    };

    const checkCalendarStatus = async () => {
        try {
            const token = await getIdToken();
            if (!token) return;
            setAuthToken(token);
            const response = await calendarAPI.getStatus();
            setCalendarConnected(response.data.connected);
        } catch (error) {
            console.error('Error checking calendar status:', error);
        }
    };

    const handleConnectCalendar = async () => {
        setCalendarLoading(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);
            const response = await calendarAPI.getAuthUrl();
            window.location.href = response.data.auth_url;
        } catch (error) {
            console.error('Error connecting calendar:', error);
            alert('Failed to connect to Google Calendar');
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleSyncCalendar = async () => {
        if (calendarSyncing) return;
        setCalendarSyncing(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);
            const response = await calendarAPI.syncAll();
            alert(response.data.message || 'Sync complete!');
        } catch (error) {
            console.error('Error syncing calendar:', error);
            alert('Failed to sync. Please try disconnecting and reconnecting.');
        } finally {
            setCalendarSyncing(false);
        }
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleNavigation = (path) => {
        router.push(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const drawer = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1F2937' }}>
            {/* Logo */}
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>
                    UniPilot
                </Typography>
                <NotificationBell />
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Navigation */}
            <List sx={{ flex: 1, px: 2, py: 2 }}>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    const showBadge = item.path === '/notifications' && notificationCount > 0;

                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => handleNavigation(item.path)}
                                sx={{
                                    borderRadius: 1.5,
                                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                                    bgcolor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    '&:hover': {
                                        bgcolor: isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                    },
                                    py: 1.5,
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                                    {showBadge ? (
                                        <Badge badgeContent={notificationCount} color="error">
                                            <Icon />
                                        </Badge>
                                    ) : (
                                        <Icon />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '0.875rem',
                                        fontWeight: isActive ? 600 : 500,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Calendar Integration */}
            <Box sx={{ px: 2, py: 1 }}>
                <ListItemButton
                    onClick={calendarConnected ? handleSyncCalendar : handleConnectCalendar}
                    disabled={calendarLoading || calendarSyncing}
                    sx={{
                        borderRadius: 1.5,
                        color: 'rgba(255,255,255,0.7)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        mb: 1,
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                        },
                        py: 1.5,
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                        {calendarSyncing ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : calendarConnected ? (
                            <SyncIcon />
                        ) : (
                            <EventIcon />
                        )}
                    </ListItemIcon>
                    <Box>
                        <ListItemText
                            primary={calendarConnected ? "Sync Calendar" : "Connect Calendar"}
                            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                        />
                        {calendarConnected && (
                            <Typography variant="caption" sx={{ color: 'rgba(74, 222, 128, 0.8)', display: 'block', lineHeight: 1 }}>
                                Connected
                            </Typography>
                        )}
                    </Box>
                </ListItemButton>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* User Profile & Logout */}
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: 1 }}>
                    <Avatar
                        src={user?.photoURL}
                        sx={{ width: 36, height: 36, bgcolor: '#3B82F6' }}
                    >
                        {user?.email?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'white',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {user?.displayName || user?.email}
                        </Typography>
                    </Box>
                </Box>

                <ListItemButton
                    onClick={handleLogout}
                    sx={{
                        borderRadius: 1.5,
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': {
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                        },
                        py: 1.5,
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary="Logout"
                        primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                        }}
                    />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Mobile menu button */}
            {isMobile && (
                <IconButton
                    onClick={handleDrawerToggle}
                    sx={{
                        position: 'fixed',
                        top: 16,
                        left: 16,
                        zIndex: 1300,
                        bgcolor: 'white',
                        boxShadow: 2,
                        '&:hover': { bgcolor: 'grey.100' }
                    }}
                >
                    <MenuIcon />
                </IconButton>
            )}

            {/* Desktop drawer */}
            {!isMobile && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: DRAWER_WIDTH,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box',
                            border: 'none',
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            )}

            {/* Mobile drawer */}
            {isMobile && (
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box',
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            )}
        </>
    );
}
