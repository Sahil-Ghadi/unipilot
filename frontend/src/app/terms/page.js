"use client";

import { Box, Container, Typography, Paper, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

export default function TermsAndConditions() {
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
                        Terms & Conditions
                    </Typography>

                    <Typography variant="body1" color="text.secondary" paragraph>
                        Last updated: January 12, 2026
                    </Typography>

                    <Typography variant="body1" paragraph>
                        Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the UniPilot website and application (the "Service") operated by UniPilot ("us", "we", or "our").
                    </Typography>

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            1. Terms
                        </Typography>
                        <Typography variant="body1" paragraph>
                            By accessing this mobile app, you are agreeing to be bound by these Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            2. Use License
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Permission is granted to temporarily download one copy of the materials (information or software) on UniPilot's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                        </Typography>
                        <ul>
                            <li><Typography variant="body1">modify or copy the materials;</Typography></li>
                            <li><Typography variant="body1">use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</Typography></li>
                            <li><Typography variant="body1">attempt to decompile or reverse engineer any software contained on UniPilot's website;</Typography></li>
                            <li><Typography variant="body1">remove any copyright or other proprietary notations from the materials; or</Typography></li>
                            <li><Typography variant="body1">transfer the materials to another person or "mirror" the materials on any other server.</Typography></li>
                        </ul>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            3. Disclaimer
                        </Typography>
                        <Typography variant="body1" paragraph>
                            The materials on UniPilot's website are provided on an 'as is' basis. UniPilot makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ my: 4 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            4. Limitations
                        </Typography>
                        <Typography variant="body1" paragraph>
                            In no event shall UniPilot or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on UniPilot's website.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 6, p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom color="primary.main">
                            Contact Us
                        </Typography>
                        <Typography variant="body1">
                            If you have any questions about these Terms, please contact us at support@unipilot.com.
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
