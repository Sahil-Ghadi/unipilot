import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useProjectChat(projectId, token) {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);

    // Initialize socket connection
    useEffect(() => {
        if (!projectId || !token) return;

        console.log('🔌 Connecting to WebSocket...', SOCKET_URL);

        const socketInstance = io(SOCKET_URL, {
            auth: { token },
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        socketInstance.on('connect', () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);

            // Join the project room
            socketInstance.emit('join_project', { project_id: projectId }, (response) => {
                if (response.success) {
                    console.log('📥 Joined project room:', projectId);
                } else {
                    console.error('❌ Failed to join project:', response.error);
                }
            });
        });

        socketInstance.on('disconnect', () => {
            console.log('👋 WebSocket disconnected');
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            setIsConnected(false);
        });

        // Handle incoming messages
        socketInstance.on('new_message', (message) => {
            console.log('💬 New message received:', message);
            setMessages(prev => [...prev, message]);
        });

        // Handle user joined
        socketInstance.on('user_joined', (data) => {
            console.log('👋 User joined:', data.user_name);
            const systemMessage = {
                id: `system-${Date.now()}`,
                type: 'system',
                message: `${data.user_name} joined the chat`,
                timestamp: data.timestamp
            };
            setMessages(prev => [...prev, systemMessage]);
        });

        // Handle user left
        socketInstance.on('user_left', (data) => {
            console.log('👋 User left:', data.user_name);
            const systemMessage = {
                id: `system-${Date.now()}`,
                type: 'system',
                message: `${data.user_name} left the chat`,
                timestamp: data.timestamp
            };
            setMessages(prev => [...prev, systemMessage]);
        });

        // Handle typing indicators
        socketInstance.on('user_typing', (data) => {
            setTypingUsers(prev => new Set([...prev, data.user_name]));
        });

        socketInstance.on('user_stopped_typing', (data) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.user_name);
                return newSet;
            });
        });

        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
            console.log('🧹 Cleaning up WebSocket connection');
            if (socketInstance) {
                socketInstance.emit('leave_project', { project_id: projectId });
                socketInstance.disconnect();
            }
        };
    }, [projectId, token]);

    // Send message
    const sendMessage = useCallback((messageText) => {
        if (!socket || !isConnected) {
            console.error('❌ Cannot send message: not connected');
            return false;
        }

        if (!messageText.trim()) {
            return false;
        }

        socket.emit('send_message', { message: messageText }, (response) => {
            if (response.success) {
                console.log('✅ Message sent:', response.message_id);
            } else {
                console.error('❌ Failed to send message:', response.error);
            }
        });

        return true;
    }, [socket, isConnected]);

    // Send typing indicator
    const sendTyping = useCallback(() => {
        if (!socket || !isConnected) return;

        socket.emit('typing', {});

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Auto-stop typing after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && isConnected) {
                socket.emit('stop_typing', {});
            }
        }, 3000);
    }, [socket, isConnected]);

    // Stop typing indicator
    const stopTyping = useCallback(() => {
        if (!socket || !isConnected) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        socket.emit('stop_typing', {});
    }, [socket, isConnected]);

    return {
        messages,
        setMessages,
        isConnected,
        sendMessage,
        sendTyping,
        stopTyping,
        typingUsers: Array.from(typingUsers)
    };
}
