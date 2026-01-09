"use client";

import { Box, Container, Paper, Typography, Button } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
    const { signInWithGoogle, user, loading } = useAuth();
    const router = useRouter();
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleGoogleSignIn = async () => {
        try {
            setSigningIn(true);
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in error:', error);
            setSigningIn(false);
        }
    };

    if (loading || user) {
        return null;
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={10}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 4,
                    }}
                >
                    <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                        🎓 UniPilot
                    </Typography>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        AI-Powered Assignment Planner
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
                        Automate your academic planning, reduce overwhelm, and optimize your time with intelligent AI assistance.
                    </Typography>

                    <Box sx={{ mt: 4 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<GoogleIcon />}
                            onClick={handleGoogleSignIn}
                            disabled={signingIn}
                            sx={{
                                py: 1.5,
                                px: 4,
                                fontSize: '1.1rem',
                                textTransform: 'none',
                                borderRadius: 2,
                            }}
                        >
                            {signingIn ? 'Signing in...' : 'Sign in with Google'}
                        </Button>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            ✨ Automated task extraction from syllabi
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            🎯 ML-based prioritization
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            📅 Smart schedule generation
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            🤝 Collaborative project management
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
