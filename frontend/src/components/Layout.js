"use client";

import { Box } from '@mui/material';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, md: 4 },
                    ml: { xs: 0, md: '0px' },
                    width: { xs: '100%', md: 'calc(100% - 240px)' },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
