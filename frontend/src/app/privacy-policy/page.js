"use client";

import { Box, Container, Typography, Paper, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 8 }}>
            <Container maxWidth="md">
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.back()}
                    sx={{ mb: 4 }}
                >
                    Back
                </Button>

                <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 4 }}>
                    <Typography variant="h3" fontWeight={800} gutterBottom sx={{
                        background: 'linear-gradient(45deg, #1e40af 30%, #3b82f6 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 4
                    }}>
                        Privacy Policy
                    </Typography>

                    <Typography variant="body1" color="text.secondary" paragraph>
                        Last updated: January 12, 2026
                    </Typography>

                    <Typography variant="body1" paragraph>
                        At UniPilot, accessible from our application, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by UniPilot and how we use it.
                    </Typography>

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Information We Collect
                        </Typography>
                        <Typography variant="body1" paragraph>
                            We collect several different types of information for various purposes to provide and improve our Service to you:
                        </Typography>
                        <ul>
                            <li>
                                <Typography variant="body1" paragraph>
                                    <strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to: Email address, First name and last name.
                                </Typography>
                            </li>
                            <li>
                                <Typography variant="body1" paragraph>
                                    <strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                                </Typography>
                            </li>
                        </ul>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            How We Use Your Information
                        </Typography>
                        <Typography variant="body1" paragraph>
                            UniPilot uses the collected data for various purposes:
                        </Typography>
                        <ul>
                            <li><Typography variant="body1">To provide and maintain the Service</Typography></li>
                            <li><Typography variant="body1">To notify you about changes to our Service</Typography></li>
                            <li><Typography variant="body1">To allow you to participate in interactive features of our Service when you choose to do so</Typography></li>
                            <li><Typography variant="body1">To provide customer care and support</Typography></li>
                            <li><Typography variant="body1">To provide analysis or valuable information so that we can improve the Service</Typography></li>
                        </ul>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Data Security
                        </Typography>
                        <Typography variant="body1" paragraph>
                            The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 6, p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom color="primary.main">
                            Contact Us
                        </Typography>
                        <Typography variant="body1">
                            If you have any questions about this Privacy Policy, please contact us at support@unipilot.com.
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
