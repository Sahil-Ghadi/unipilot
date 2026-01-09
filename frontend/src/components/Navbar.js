"use client";

import { AppBar, Toolbar, Typography, Button, Avatar, Menu, MenuItem, Box, IconButton } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function Navbar() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleSignOut = async () => {
        await signOut();
        handleMenuClose();
        router.push('/login');
    };

    return (
        <AppBar position="sticky" sx={{ bgcolor: 'primary.main' }}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4, fontWeight: 700 }}>
                    🎓 UniPilot
                </Typography>

                <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
                    <Button
                        color="inherit"
                        component={Link}
                        href="/dashboard"
                        startIcon={<DashboardIcon />}
                    >
                        Dashboard
                    </Button>
                    <Button
                        color="inherit"
                        component={Link}
                        href="/tasks"
                        startIcon={<AssignmentIcon />}
                    >
                        Tasks
                    </Button>
                    <Button
                        color="inherit"
                        component={Link}
                        href="/schedule"
                        startIcon={<CalendarMonthIcon />}
                    >
                        Schedule
                    </Button>
                    <Button
                        color="inherit"
                        component={Link}
                        href="/projects"
                        startIcon={<GroupIcon />}
                    >
                        Projects
                    </Button>
                    <Button
                        color="inherit"
                        component={Link}
                        href="/upload"
                        startIcon={<UploadFileIcon />}
                    >
                        Upload
                    </Button>
                </Box>

                <IconButton onClick={handleMenuOpen}>
                    <Avatar
                        src={user?.photoURL}
                        alt={user?.displayName || 'User'}
                        sx={{ width: 40, height: 40 }}
                    />
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                >
                    <MenuItem disabled>
                        <Typography variant="body2">{user?.email}</Typography>
                    </MenuItem>
                    <MenuItem onClick={handleSignOut}>Logout</MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
}
