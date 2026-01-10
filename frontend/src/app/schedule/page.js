"use client";

import { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Paper,
    Grid,
    Card,
    CardContent,
    ToggleButton,
    ToggleButtonGroup,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Divider,
} from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useAuth } from '@/contexts/AuthContext';
import { scheduleAPI, calendarAPI, setAuthToken } from '@/lib/api';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import { format, addDays, parseISO } from 'date-fns';

export default function SchedulePage() {
    const { getIdToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [weeklySchedule, setWeeklySchedule] = useState(null);
    const [view, setView] = useState('daily');
    const [syncing, setSyncing] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Settings
    const [workHoursStart, setWorkHoursStart] = useState(9);
    const [workHoursEnd, setWorkHoursEnd] = useState(17);
    const [studyTechnique, setStudyTechnique] = useState('pomodoro');

    // Load view preference from localStorage after mount
    useEffect(() => {
        const savedView = localStorage.getItem('scheduleView');
        if (savedView) {
            setView(savedView);
        }
    }, []);

    // Load saved schedule on page load
    useEffect(() => {
        const loadSavedSchedules = async () => {
            try {
                const token = await getIdToken();
                if (!token) {
                    console.log('Skipping schedule load - no token');
                    return;
                }
                setAuthToken(token);

                // Load today's daily schedule
                try {
                    const response = await scheduleAPI.getSchedule(new Date().toISOString());
                    console.log('Loaded saved daily schedule:', response.data);
                    setSchedule(response.data);
                } catch (error) {
                    console.log('No saved daily schedule found');
                }

                // Load weekly schedules (next 7 days)
                const weeklyData = {};
                const today = new Date();
                let foundSchedules = 0;

                for (let i = 0; i < 7; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    const dateStr = date.toISOString().split('T')[0];

                    try {
                        const response = await scheduleAPI.getSchedule(date.toISOString());
                        weeklyData[dateStr] = response.data;
                        foundSchedules++;
                    } catch (error) {
                        // No schedule for this day
                    }
                }

                if (foundSchedules > 0) {
                    console.log(`Loaded ${foundSchedules} weekly schedules:`, weeklyData);
                    setWeeklySchedule(weeklyData);
                }
            } catch (error) {
                console.log('Error loading schedules:', error);
            }
        };

        loadSavedSchedules();
    }, [getIdToken]);

    const handleGenerateSchedule = async () => {
        setLoading(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);

            if (view === 'daily') {
                const scheduleData = {
                    date: new Date().toISOString(),
                    work_hours_start: workHoursStart,
                    work_hours_end: workHoursEnd,
                    study_technique: studyTechnique,
                };

                const response = await scheduleAPI.generateSchedule(scheduleData);
                setSchedule(response.data);
            } else {
                const response = await scheduleAPI.generateWeeklySchedule({
                    start_date: new Date().toISOString(),
                    work_hours_start: workHoursStart,
                    work_hours_end: workHoursEnd,
                    study_technique: studyTechnique,
                });
                setWeeklySchedule(response.data.schedules);
            }
        } catch (error) {
            console.error('Error generating schedule:', error);
            alert(error.response?.data?.detail || 'Failed to generate schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncToCalendar = async () => {
        if (!schedule && !weeklySchedule) return;

        setSyncing(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);

            await calendarAPI.syncToCalendar({
                schedule_date: new Date().toISOString(),
            });

            alert('Successfully synced to Google Calendar!');
        } catch (error) {
            console.error('Error syncing to calendar:', error);
            alert('Failed to sync to calendar. Please connect your Google Calendar first.');
        } finally {
            setSyncing(false);
        }
    };

    const formatTime = (isoString) => {
        try {
            return format(parseISO(isoString), 'h:mm a');
        } catch {
            return isoString;
        }
    };

    const renderTimeBlock = (block, index) => (
        <Box
            key={index}
            sx={{
                display: 'flex',
                alignItems: 'stretch',
                mb: 1,
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: 1,
            }}
        >
            <Box
                sx={{
                    width: 100,
                    bgcolor: block.type === 'break' ? 'success.main' : 'primary.main',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 1,
                }}
            >
                <Typography variant="caption" fontWeight={600}>
                    {formatTime(block.start_time)}
                </Typography>
                <Typography variant="caption">to</Typography>
                <Typography variant="caption" fontWeight={600}>
                    {formatTime(block.end_time)}
                </Typography>
            </Box>
            <Box
                sx={{
                    flex: 1,
                    bgcolor: block.type === 'break' ? 'success.light' : 'background.paper',
                    p: 2,
                    borderLeft: 3,
                    borderColor: block.type === 'break' ? 'success.main' : 'primary.main',
                }}
            >
                <Typography variant="subtitle1" fontWeight={600}>
                    {block.type === 'break' ? '☕ ' : '📚 '}
                    {block.title}
                </Typography>
                {block.description && (
                    <Typography variant="body2" color="text.secondary">
                        {block.description}
                    </Typography>
                )}
            </Box>
        </Box>
    );

    const renderDailySchedule = () => (
        <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {workHoursStart}:00 AM - {workHoursEnd > 12 ? workHoursEnd - 12 : workHoursEnd}:00 {workHoursEnd >= 12 ? 'PM' : 'AM'}
                            {studyTechnique !== 'none' && ` • ${studyTechnique === 'pomodoro' ? 'Pomodoro' : studyTechnique === 'timeblocking' ? 'Time Blocking' : '52-17 Method'}`}
                        </Typography>
                    </Box>
                    <Chip
                        label={`${schedule.blocks.length} blocks`}
                        color="primary"
                        variant="outlined"
                    />
                </Box>
                <Divider sx={{ mb: 3 }} />
                {schedule.blocks.map((block, index) => renderTimeBlock(block, index))}
            </Paper>
        </Box>
    );

    const renderWeeklySchedule = () => (
        <Grid container spacing={2}>
            {Object.entries(weeklySchedule).map(([date, scheduleData]) => {
                const blocks = scheduleData?.blocks || [];
                return (
                    <Grid item xs={12} md={6} lg={6} key={date}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                {format(parseISO(date), 'EEEE')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                {format(parseISO(date), 'MMM d, yyyy')}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            {blocks.length > 0 ? (
                                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {blocks.map((block, index) => renderTimeBlock(block, `${date}-${index}`))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    No tasks scheduled
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                );
            })}
        </Grid>
    );

    return (
        <ProtectedRoute>
            <Layout>
                <Box maxWidth="xl" sx={{ mx: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" fontWeight={700}>
                            📅 My Schedule
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<SettingsIcon />}
                                onClick={() => setSettingsOpen(true)}
                            >
                                Settings
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<CalendarMonthIcon />}
                                onClick={handleGenerateSchedule}
                                disabled={loading}
                            >
                                Generate {view === 'daily' ? 'Daily' : 'Weekly'} Schedule
                            </Button>
                            {(schedule || weeklySchedule) && (
                                <Button
                                    variant="outlined"
                                    startIcon={<SyncIcon />}
                                    onClick={handleSyncToCalendar}
                                    disabled={syncing}
                                >
                                    Sync to Calendar
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Main Content */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 3 }}>
                                <ToggleButtonGroup
                                    value={view}
                                    exclusive
                                    onChange={(e, newView) => {
                                        if (newView) {
                                            setView(newView);
                                            localStorage.setItem('scheduleView', newView);
                                        }
                                    }}
                                    size="large"
                                >
                                    <ToggleButton value="daily">📆 Daily View</ToggleButton>
                                    <ToggleButton value="weekly">📅 Weekly View</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {loading ? (
                                <LoadingSpinner message={`Generating your ${view} schedule...`} />
                            ) : !schedule && !weeklySchedule ? (
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <CalendarMonthIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" gutterBottom>
                                        No Schedule Generated
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        Click "Generate {view === 'daily' ? 'Daily' : 'Weekly'} Schedule" to create a personalized study schedule
                                    </Typography>
                                </Paper>
                            ) : view === 'daily' && schedule ? (
                                renderDailySchedule()
                            ) : view === 'weekly' && weeklySchedule ? (
                                renderWeeklySchedule()
                            ) : null}

                            {studyTechnique !== 'none' && (schedule || weeklySchedule) && (
                                <Paper sx={{ p: 3, mt: 4, bgcolor: 'info.light' }}>
                                    <Typography variant="h6" gutterBottom fontWeight={600}>
                                        {studyTechnique === 'pomodoro' && '🍅 Pomodoro Technique Active'}
                                        {studyTechnique === 'timeblocking' && '⏰ Time Blocking Active'}
                                        {studyTechnique === '52-17' && '🔬 52-17 Method Active'}
                                    </Typography>

                                    <Typography variant="body2">
                                        {studyTechnique === 'pomodoro' && 'Your schedule uses 25-minute focused work sessions followed by 5-minute breaks.'}
                                        {studyTechnique === 'timeblocking' && 'Your schedule uses 2-hour deep work blocks followed by 15-minute breaks.'}
                                        {studyTechnique === '52-17' && 'Your schedule uses the scientifically optimal 52-minute work sessions followed by 17-minute breaks.'}
                                        {' '}This proven technique helps maintain productivity and prevents burnout!
                                    </Typography>
                                </Paper>
                            )}
                        </Grid>
                    </Grid>
                </Box>

                {/* Settings Dialog */}
                <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Schedule Settings</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                            <TextField
                                label="Work Hours Start"
                                type="number"
                                value={workHoursStart}
                                onChange={(e) => setWorkHoursStart(parseInt(e.target.value))}
                                InputProps={{ inputProps: { min: 0, max: 23 } }}
                                helperText="Hour in 24-hour format (0-23)"
                                fullWidth
                            />
                            <TextField
                                label="Work Hours End"
                                type="number"
                                value={workHoursEnd}
                                onChange={(e) => setWorkHoursEnd(parseInt(e.target.value))}
                                InputProps={{ inputProps: { min: 0, max: 23 } }}
                                helperText="Hour in 24-hour format (0-23)"
                                fullWidth
                            />
                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                    Study Technique
                                </Typography>
                                <ToggleButtonGroup
                                    value={studyTechnique}
                                    exclusive
                                    onChange={(e, value) => value && setStudyTechnique(value)}
                                    orientation="vertical"
                                    fullWidth
                                >
                                    <ToggleButton value="pomodoro">
                                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                                            <Typography variant="body2" fontWeight={600}>🍅 Pomodoro</Typography>
                                            <Typography variant="caption" color="text.secondary">25min work / 5min break</Typography>
                                        </Box>
                                    </ToggleButton>
                                    <ToggleButton value="timeblocking">
                                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                                            <Typography variant="body2" fontWeight={600}>⏰ Time Blocking</Typography>
                                            <Typography variant="caption" color="text.secondary">2hr deep work / 15min break</Typography>
                                        </Box>
                                    </ToggleButton>
                                    <ToggleButton value="52-17">
                                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                                            <Typography variant="body2" fontWeight={600}>🔬 52-17 Method</Typography>
                                            <Typography variant="caption" color="text.secondary">52min work / 17min break</Typography>
                                        </Box>
                                    </ToggleButton>
                                    <ToggleButton value="none">
                                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                                            <Typography variant="body2" fontWeight={600}>📝 Continuous</Typography>
                                            <Typography variant="caption" color="text.secondary">No breaks</Typography>
                                        </Box>
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
                        <Button onClick={() => setSettingsOpen(false)} variant="contained">
                            Save Settings
                        </Button>
                    </DialogActions>
                </Dialog>
            </Layout>
        </ProtectedRoute>
    );
}

