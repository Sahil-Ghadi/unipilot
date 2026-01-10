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
    Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { format, parseISO } from 'date-fns';

export default function ProjectChat({ messages, isConnected, sendMessage, sendTyping, stopTyping, typingUsers, currentUser }) {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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
        </Paper>
    );
}
