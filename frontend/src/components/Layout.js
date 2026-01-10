"use client";

import { Box } from '@mui/material';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    bgcolor: '#F3F4F6',
                    minHeight: '100vh',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
