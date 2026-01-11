"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Stack,
  useTheme
} from '@mui/material';
import {
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Group as GroupIcon,
  AutoAwesome as AutoAwesomeIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (user) {
    return <LoadingSpinner message="Redirecting to dashboard..." />;
  }

  const features = [
    {
      icon: <AutoAwesomeIcon fontSize="large" color="primary" />,
      title: "AI Syllabus Extraction",
      description: "Upload your course syllabus (PDF) and let our AI automatically extract assignments, exams, and due dates instantly."
    },
    {
      icon: <CalendarIcon fontSize="large" color="primary" />,
      title: "Smart Scheduling",
      description: "UniPilot automatically organizes your tasks into your Google Calendar, optimizing for your productivity peaks."
    },
    {
      icon: <GroupIcon fontSize="large" color="primary" />,
      title: "Team Collaboration",
      description: "Manage group projects effortlessly. Assign tasks, share files, and chat with your team in real-time."
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.8)' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h5" component="div" fontWeight="800" color="primary">
                🎓 UniPilot
              </Typography>
            </Stack>
            <Button variant="outlined" color="primary" onClick={() => router.push('/login')} sx={{ borderRadius: 2 }}>
              Log In
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{
        flexGrow: 1,
        pt: 10,
        pb: 8,
        background: 'radial-gradient(ellipse at 50% -20%, #EFF6FF 0%, #FAFAFA 100%)'
      }}>
        <Container maxWidth="md">
          <Stack spacing={4} alignItems="center" textAlign="center">
            <Box sx={{
              px: 2,
              py: 0.5,
              borderRadius: 10,
              bgcolor: 'primary.50',
              color: 'primary.main',
              typography: 'subtitle2',
              fontWeight: 600,
              display: 'inline-block'
            }}>
              ✨ AI-Powered Academic Assistant
            </Box>
            <Typography variant="h2" component="h1" fontWeight="800" sx={{ background: '-webkit-linear-gradient(45deg, #111827 30%, #3B82F6 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
              Master Your Academic<br />Journey with Auto-Pilot
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', fontWeight: 400 }}>
              Stop juggling generic to-do lists. UniPilot parses your syllabus, manages your deadlines, and syncs with your life—so you can focus on learning.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} pt={2}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push('/login')}
                sx={{ px: 4, py: 1.5, fontSize: '1.1rem', borderRadius: 50 }}
              >
                Get Started Free
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight="700" textAlign="center" mb={2}>
            Everything you need to excel
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" mb={8} sx={{ fontWeight: 400 }}>
            Powerful features designed specifically for modern students.
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card elevation={0} sx={{
                  height: '100%',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 4,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 2,
                      bgcolor: 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" fontWeight="600" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} UniPilot. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                Privacy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                Terms
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
