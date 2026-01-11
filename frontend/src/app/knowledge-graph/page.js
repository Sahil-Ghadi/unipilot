"use client";

import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Fade, Chip, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { setAuthToken, graphAPI } from '@/lib/api';
import KnowledgeGraph3D from '@/components/KnowledgeGraph3D';

export default function KnowledgeGraphPage() {
    const router = useRouter();
    const { user, getIdToken } = useAuth();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const token = await getIdToken();
                setAuthToken(token);
                const response = await graphAPI.getData();
                setGraphData(response.data);
            } catch (error) {
                console.error("Failed to load graph data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    if (loading) {
        return (
            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a' }}>
                <LoadingSpinner message="Constructing your Universe..." />
            </Box>
        );
    }

    return (
        <ProtectedRoute>
            <Box sx={{
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                bgcolor: '#0f172a', // Dark theme for space effect
                overflow: 'hidden'
            }}>
                {/* 3D Graph Layer */}
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <KnowledgeGraph3D
                        data={graphData}
                        onNodeClick={setSelectedNode}
                    />
                </Box>

                {/* UI Overlay Layer */}
                <Box sx={{ position: 'relative', zIndex: 10, p: 3, pointerEvents: 'none' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'auto' }}>
                        <IconButton onClick={() => router.back()} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h5" fontWeight={700} sx={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            Academic Universe
                        </Typography>
                    </Box>

                    {/* Selected Node Details Card */}
                    <Fade in={!!selectedNode}>
                        <Paper sx={{
                            position: 'absolute',
                            top: 100,
                            left: 24,
                            width: 320,
                            p: 3,
                            bgcolor: 'rgba(30, 41, 59, 0.7)', // Darker slate, more transparent
                            backdropFilter: 'blur(20px)', // Stronger blur
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '24px', // Softer curves
                            color: 'white',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'auto',
                            overflow: 'hidden'
                        }}>
                            {selectedNode && (
                                <>
                                    {/* Decorative gradient header */}
                                    <Box sx={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                        background: selectedNode.group === 'user' ? 'linear-gradient(90deg, #6366f1, #a855f7)' :
                                            selectedNode.group === 'course' ? 'linear-gradient(90deg, #ec4899, #f43f5e)' :
                                                'linear-gradient(90deg, #3b82f6, #10b981)'
                                    }} />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
                                            {selectedNode.name}
                                        </Typography>
                                        <Chip
                                            label={selectedNode.group.toUpperCase()}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(255,255,255,0.15)',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                height: 24
                                            }}
                                        />
                                    </Box>

                                    {selectedNode.group === 'task' && (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Status
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: selectedNode.status === 'completed' ? '#4ade80' : '#fbbf24' }}>
                                                    {selectedNode.status.replace('-', ' ')}
                                                </Typography>
                                            </Box>

                                            {selectedNode.priority !== undefined && (
                                                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Priority Score
                                                    </Typography>
                                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                                                        {selectedNode.priority}
                                                        <Typography component="span" variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', ml: 0.5 }}>/ 100</Typography>
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    {selectedNode.group === 'course' && (
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                            "All paths lead here."
                                        </Typography>
                                    )}

                                    <Typography variant="caption" sx={{ display: 'block', mt: 3, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                                        Click empty space to close
                                    </Typography>
                                </>
                            )}
                        </Paper>
                    </Fade>
                </Box>
            </Box>
        </ProtectedRoute>
    );
}
