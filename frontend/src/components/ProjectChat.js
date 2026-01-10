"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Avatar,
    Chip,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CloseIcon from '@mui/icons-material/Close';
import { format, parseISO } from 'date-fns';
import { projectChatAPI, setAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';

export default function ProjectChat({ messages, isConnected, sendMessage, sendTyping, stopTyping, typingUsers, currentUser, projectId }) {
    const [inputMessage, setInputMessage] = useState('');
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { getIdToken } = useAuth();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!inputMessage.trim()) return;

        const success = sendMessage(inputMessage);
        if (success) {
            setInputMessage('');
            stopTyping();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);
        sendTyping();
    };

    const handleGenerateSummary = async () => {
        setLoadingSummary(true);
        setSummaryOpen(true);
        try {
            const token = await getIdToken();
            setAuthToken(token);

            const response = await projectChatAPI.generateSummary(projectId);
            setSummaryData(response.data);
            toast.success('Summary generated successfully!');
        } catch (error) {
            console.error('Error generating summary:', error);
            toast.error(error.response?.data?.detail || 'Failed to generate summary');
            setSummaryOpen(false);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleCloseSummary = () => {
        setSummaryOpen(false);
        setSummaryData(null);
    };

    const formatTime = (timestamp) => {
        try {
            const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
            return format(date, 'h:mm a');
        } catch {
            return '';
        }
    };

    const renderMessage = (message, index) => {
        const isOwnMessage = message.user_id === currentUser?.uid;
        const isSystem = message.type === 'system';

        if (isSystem) {
            return (
                <Box key={message.id || index} sx={{ textAlign: 'center', my: 1 }}>
                    <Chip
                        label={message.message}
                        size="small"
                        sx={{ bgcolor: 'grey.200', fontSize: '0.75rem' }}
                    />
                </Box>
            );
        }

        return (
            <Box
                key={message.id || index}
                sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 2
                }}
            >
                {!isOwnMessage && (
                    <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                        {message.user_name?.[0]?.toUpperCase() || '?'}
                    </Avatar>
                )}
                <Box sx={{ maxWidth: '70%' }}>
                    {!isOwnMessage && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {message.user_name}
                        </Typography>
                    )}
                    <Paper
                        sx={{
                            p: 1.5,
                            bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                            color: isOwnMessage ? 'white' : 'text.primary',
                            borderRadius: 2,
                            borderTopRightRadius: isOwnMessage ? 0 : 2,
                            borderTopLeftRadius: isOwnMessage ? 2 : 0
                        }}
                    >
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {message.message}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                mt: 0.5,
                                opacity: 0.7,
                                fontSize: '0.7rem'
                            }}
                        >
                            {formatTime(message.timestamp)}
                        </Typography>
                    </Paper>
                </Box>
            </Box>
        );
    };

    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" fontWeight={600}>
                            💬 Team Chat
                        </Typography>
                        <Chip
                            label={isConnected ? 'Connected' : 'Disconnected'}
                            size="small"
                            color={isConnected ? 'success' : 'error'}
                            sx={{ fontSize: '0.75rem' }}
                        />
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<SummarizeIcon />}
                        onClick={handleGenerateSummary}
                        disabled={messages.length === 0}
                        sx={{ textTransform: 'none' }}
                    >
                        Generate Summary
                    </Button>
                </Box>
            </Box>

            {/* Messages */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: 'grey.50'
                }}
            >
                {messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            No messages yet. Start the conversation!
                        </Typography>
                    </Box>
                ) : (
                    messages.map((message, index) => renderMessage(message, index))
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </Typography>
                    </Box>
                )}

                <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* Input */}
            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        ref={inputRef}
                        fullWidth
                        size="small"
                        placeholder={isConnected ? "Type a message..." : "Connecting..."}
                        value={inputMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onBlur={stopTyping}
                        disabled={!isConnected}
                        multiline
                        maxRows={3}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={!isConnected || !inputMessage.trim()}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&:disabled': { bgcolor: 'grey.300' }
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Summary Dialog */}
            <Dialog
                open={summaryOpen}
                onClose={handleCloseSummary}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={600}>
                            💡 Chat Summary
                        </Typography>
                        <IconButton onClick={handleCloseSummary} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {loadingSummary ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                            <CircularProgress />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Generating summary...
                            </Typography>
                        </Box>
                    ) : summaryData ? (
                        <Box>
                            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`${summaryData.message_count} messages`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                                <Chip
                                    label={`${summaryData.participants?.length} participants`}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                />
                            </Box>
                            <Box
                                sx={{
                                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                                        fontWeight: 700,
                                        mt: 3,
                                        mb: 1.5,
                                        color: 'primary.main'
                                    },
                                    '& h1': { fontSize: '1.5rem' },
                                    '& h2': { fontSize: '1.25rem' },
                                    '& h3': { fontSize: '1.1rem' },
                                    '& p': {
                                        mb: 1.5,
                                        lineHeight: 1.7,
                                        color: 'text.primary'
                                    },
                                    '& strong': {
                                        fontWeight: 700,
                                        color: 'text.primary'
                                    },
                                    '& ul, & ol': {
                                        pl: 3,
                                        mb: 2
                                    },
                                    '& li': {
                                        mb: 0.75,
                                        lineHeight: 1.6,
                                        '&::marker': {
                                            color: 'primary.main'
                                        }
                                    },
                                    '& code': {
                                        bgcolor: 'grey.100',
                                        px: 0.75,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        fontSize: '0.875rem',
                                        fontFamily: 'monospace'
                                    },
                                    '& pre': {
                                        bgcolor: 'grey.100',
                                        p: 2,
                                        borderRadius: 1,
                                        overflow: 'auto',
                                        mb: 2
                                    },
                                    '& blockquote': {
                                        borderLeft: 4,
                                        borderColor: 'primary.main',
                                        pl: 2,
                                        ml: 0,
                                        fontStyle: 'italic',
                                        color: 'text.secondary'
                                    }
                                }}
                            >
                                <ReactMarkdown>{summaryData.summary}</ReactMarkdown>
                            </Box>
                            {summaryData.participants && summaryData.participants.length > 0 && (
                                <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        👥 Participants
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                                        {summaryData.participants.map((participant, idx) => (
                                            <Chip
                                                key={idx}
                                                label={participant}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'primary.light',
                                                    color: 'primary.contrastText',
                                                    fontWeight: 500
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSummary}>Close</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
