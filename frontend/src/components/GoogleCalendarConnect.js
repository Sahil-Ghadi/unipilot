"use client";

import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import SyncIcon from '@mui/icons-material/Sync';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { calendarAPI, setAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function GoogleCalendarConnect() {
    const { getIdToken } = useAuth();
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // Check URL params for status
        const params = new URLSearchParams(window.location.search);
        if (params.get('calendar_connected')) {
            setMessage({ type: 'success', text: 'Calendar connected successfully!' });
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('calendar_error')) {
            setMessage({ type: 'error', text: 'Failed to connect calendar.' });
            window.history.replaceState({}, '', window.location.pathname);
        }

        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const token = await getIdToken();
            if (!token) return;
            setAuthToken(token);
            const response = await calendarAPI.getStatus();
            setConnected(response.data.connected);
        } catch (error) {
            console.error('Error checking calendar status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const token = await getIdToken();
            setAuthToken(token);
            const response = await calendarAPI.getAuthUrl();
            window.location.href = response.data.auth_url;
        } catch (error) {
            console.error('Error getting auth URL:', error);
            setMessage({ type: 'error', text: 'Failed to connect calendar' });
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setMessage(null);
        try {
            const token = await getIdToken();
            setAuthToken(token);
            const response = await calendarAPI.syncAll();
            setMessage({
                type: 'success',
                text: response.data.message
            });
        } catch (error) {
            console.error('Error syncing:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Failed to sync tasks'
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;

        try {
            const token = await getIdToken();
            setAuthToken(token);
            await calendarAPI.disconnect();
            setConnected(false);
            setMessage({ type: 'success', text: 'Calendar disconnected' });
        } catch (error) {
            console.error('Error disconnecting:', error);
            setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Google Calendar
                        </Typography>
                        {connected && (
                            <Chip label="Connected" color="success" size="small" />
                        )}
                    </Box>
                </Box>

                {message && (
                    <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                        {message.text}
                    </Alert>
                )}

                {!connected ? (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Connect your Google Calendar to automatically sync your tasks and schedule.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<EventIcon />}
                            onClick={handleConnect}
                            fullWidth
                        >
                            Connect Google Calendar
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                            onClick={handleSync}
                            disabled={syncing}
                            fullWidth
                        >
                            {syncing ? 'Syncing...' : 'Sync All Tasks'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<LinkOffIcon />}
                            onClick={handleDisconnect}
                            size="small"
                            fullWidth
                        >
                            Disconnect
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
