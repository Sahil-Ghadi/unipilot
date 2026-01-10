"use client";

import { useState } from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { syllabusAPI, setAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function UploadPage() {
    const { getIdToken } = useAuth();
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        setSelectedFile(file);
    };

    const handleExtract = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);

            // Create form data
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Upload and extract
            const response = await syllabusAPI.uploadAndExtract(formData);

            alert(`Successfully extracted ${response.data.tasks.length} tasks from ${response.data.course_name}!`);
            router.push('/tasks');
        } catch (error) {
            console.error('Error extracting tasks:', error);
            alert(error.response?.data?.detail || 'Failed to extract tasks. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <ProtectedRoute>
            <Layout>
                <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                    <Typography variant="h4" gutterBottom fontWeight={700}>
                        Upload Syllabus
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Upload your course syllabus PDF and let AI extract all assignments and deadlines
                    </Typography>

                    <Paper sx={{ p: 4, mt: 4, textAlign: 'center' }}>
                        <Box
                            sx={{
                                border: '2px dashed',
                                borderColor: 'primary.main',
                                borderRadius: 2,
                                p: 6,
                                bgcolor: 'background.default',
                            }}
                        >
                            <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                {uploading ? 'Uploading...' : 'Upload PDF Syllabus'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Drag and drop or click to select a PDF file
                            </Typography>
                            <Button
                                variant="contained"
                                component="label"
                                disabled={uploading}
                            >
                                Select PDF
                                <input
                                    type="file"
                                    hidden
                                    accept="application/pdf"
                                    onChange={handleFileUpload}
                                />
                            </Button>
                        </Box>

                        {selectedFile && !uploading && (
                            <Box sx={{ mt: 4 }}>
                                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    {selectedFile.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Ready to extract tasks
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleExtract}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Extracting...' : 'Extract Tasks with AI'}
                                </Button>
                            </Box>
                        )}
                    </Paper>

                    <Paper sx={{ p: 3, mt: 4, bgcolor: 'info.light' }}>
                        <Typography variant="h6" gutterBottom>
                            💡 Tips for best results
                        </Typography>
                        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                            <li>Ensure your PDF is text-based (not scanned images)</li>
                            <li>The syllabus should clearly list assignments and deadlines</li>
                            <li>Include course name and grading weights if available</li>
                            <li>You can edit extracted tasks before saving</li>
                        </Typography>
                    </Paper>
                </Container>
            </Layout>
        </ProtectedRoute>
    );
}
