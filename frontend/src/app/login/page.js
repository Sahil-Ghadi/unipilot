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
                background: 'radial-gradient(circle at 50% 50%, #EFF6FF 0%, #FAFAFA 100%)', // Subtle blue to white
                p: 2
            }}
        >
            <Container maxWidth="xs">
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h1" sx={{ fontSize: '3rem', mb: 1 }}>
                            🎓
                        </Typography>
                        <Typography variant="h4" component="h1" fontWeight={800} color="text.primary">
                            UniPilot
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                            Your AI Academic Companion
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        startIcon={<GoogleIcon />}
                        onClick={handleGoogleSignIn}
                        disabled={signingIn}
                        sx={{
                            py: 1.5,
                            mt: 2,
                            fontWeight: 600,
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
                            '&:hover': {
                                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.6)',
                            }
                        }}
                    >
                        {signingIn ? 'Signing in...' : 'Continue with Google'}
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
}
