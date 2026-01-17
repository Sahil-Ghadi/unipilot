'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Upload as UploadIcon,
  Description as DocIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { classroomAPI, setAuthToken } from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const messagesEndRef = useRef(null);

  const API_BASE_URL = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }, []);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your AI Assistant. Upload course materials or connect your Google Classroom to get started. I can help you understand your study materials, answer questions, and assist with your coursework!",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [classroomConnected, setClassroomConnected] = useState(false);
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [classroomSyncing, setClassroomSyncing] = useState(false);

  const [indexDialogOpen, setIndexDialogOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDocuments = async () => {
    if (!user) return;
    setDocsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/chat/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;
      const data = await res.json();
      setDocuments(data.documents || []);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDocuments();
      checkClassroomStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkClassroomStatus = async () => {
    try {
      setClassroomLoading(true);
      const token = await getIdToken();
      if (!token) return;
      setAuthToken(token);
      const resp = await classroomAPI.getStatus();
      setClassroomConnected(!!resp.data.connected);
    } catch (e) {
      setClassroomConnected(false);
    } finally {
      setClassroomLoading(false);
    }
  };

  const connectClassroom = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      setAuthToken(token);
      const resp = await classroomAPI.getAuthUrl();
      window.location.href = resp.data.auth_url;
    } catch (e) {
      alert('Failed to connect Google Classroom');
    }
  };

  const syncClassroomMaterials = async () => {
    try {
      setClassroomSyncing(true);
      const token = await getIdToken();
      if (!token) return;
      setAuthToken(token);
      const resp = await classroomAPI.syncMaterials(null);
      alert(resp.data.message || 'Sync complete');
      await loadDocuments();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to sync classroom materials');
    } finally {
      setClassroomSyncing(false);
      await checkClassroomStatus();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMsg = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`${API_BASE_URL}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: userMsg.content,
          conversation_history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || 'No answer returned.',
          sources: data.sources || [],
          mode: data.mode,
          timestamp: data.timestamp || new Date().toISOString()
        }
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Failed to get an answer. Make sure backend is running and you are logged in.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const indexPdf = async () => {
    if (!courseName.trim() || !pdfUrl.trim()) {
      alert('Course name and PDF URL are required');
      return;
    }

    setIndexing(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE_URL}/chat/index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pdf_url: pdfUrl.trim(),
          course_name: courseName.trim(),
          document_name: documentName.trim() || undefined
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(`Index failed: ${data.error || 'Unknown error'}`);
        return;
      }

      alert(`Indexed ${data.chunks_indexed} sections`);
      setIndexDialogOpen(false);
      setPdfUrl('');
      setCourseName('');
      setDocumentName('');
      await loadDocuments();
    } catch (e) {
      alert('Index failed. Check backend logs.');
    } finally {
      setIndexing(false);
    }
  };

  const deleteDocument = async (docName, courseNameToDelete) => {
    if (!confirm(`Delete "${docName}"?`)) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/chat/documents`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ document_name: docName, course_name: courseNameToDelete })
      });

      await loadDocuments();
    } catch (e) {
      // ignore
    }
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" gap={3}>
        <Paper sx={{
          width: 320,
          p: 3,
          height: 'calc(100vh - 100px)',
          overflow: 'auto',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1} fontWeight="600">
              <DocIcon color="primary" />
              Documents
            </Typography>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setIndexDialogOpen(true)}
              sx={{
                bgcolor: 'primary.light',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                },
              }}
            >
              <UploadIcon />
            </IconButton>
          </Box>

          {docsLoading ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={22} />
            </Box>
          ) : documents.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight="500">No documents yet</Typography>
              <Typography variant="caption">Upload a PDF or sync Google Classroom to get started</Typography>
            </Alert>
          ) : (
            <Box>
              {documents.map((doc, idx) => (
                <Card
                  key={idx}
                  variant="outlined"
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" gap={1}>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight="600" noWrap>
                          {doc.document_name}
                        </Typography>
                        <Chip
                          label={doc.course_name}
                          size="small"
                          sx={{
                            mt: 1,
                            bgcolor: 'primary.light',
                            color: 'primary.dark',
                            fontWeight: 500,
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          📑 {doc.chunk_count} sections
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => deleteDocument(doc.document_name, doc.course_name)}
                        sx={{
                          '&:hover': {
                            bgcolor: 'error.light',
                            color: 'error.main',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1} fontWeight="600" mb={2}>
              <SchoolIcon fontSize="small" color="primary" />
              Google Classroom
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Button
                variant={classroomConnected ? 'outlined' : 'contained'}
                size="medium"
                onClick={connectClassroom}
                disabled={classroomLoading}
                fullWidth
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {classroomConnected ? '✓ Connected' : 'Connect'}
              </Button>
              <Button
                variant="contained"
                size="medium"
                onClick={syncClassroomMaterials}
                disabled={!classroomConnected || classroomSyncing}
                startIcon={classroomSyncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                fullWidth
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  bgcolor: classroomConnected ? 'primary.main' : 'grey.300',
                  '&:hover': {
                    bgcolor: classroomConnected ? 'primary.dark' : 'grey.300',
                  },
                }}
              >
                {classroomSyncing ? 'Syncing...' : 'Sync Materials'}
              </Button>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Backend: {API_BASE_URL}
          </Typography>
        </Paper>

        <Box flex={1}>
          <Paper sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
              p: 3,
              borderBottom: 1,
              borderColor: 'divider',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <Typography variant="h5" color="white" display="flex" alignItems="center" gap={1} fontWeight="600">
                <BotIcon sx={{ fontSize: 32 }} />
                AI Assistant
              </Typography>
              <Typography variant="body2" color="white" sx={{ opacity: 0.95, mt: 0.5 }}>
                Your intelligent study companion - Ask anything about your course materials
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.map((msg, idx) => (
                <Box
                  key={idx}
                  display="flex"
                  gap={2}
                  mb={3}
                  flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}
                >
                  <Avatar sx={{ bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                    {msg.role === 'user' ? <PersonIcon /> : <BotIcon />}
                  </Avatar>

                  <Box flex={1}>
                    <Paper
                      elevation={msg.role === 'user' ? 2 : 1}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                        color: msg.role === 'user' ? 'white' : 'text.primary',
                        border: msg.role === 'user' ? 'none' : '1px solid',
                        borderColor: 'grey.200',
                        boxShadow: msg.role === 'user'
                          ? '0 4px 12px rgba(102, 126, 234, 0.25)'
                          : '0 2px 8px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Typography variant="body1" whiteSpace="pre-wrap" sx={{ lineHeight: 1.7 }}>
                        {msg.content}
                      </Typography>

                      {msg.sources && msg.sources.length > 0 && (
                        <Box mt={2}>
                          <Typography variant="caption" display="block" mb={1} fontWeight="bold">
                            Sources
                          </Typography>
                          {msg.sources.map((s, sidx) => (
                            <Chip
                              key={sidx}
                              label={`${s.document_name} (${s.course_name}) #${s.chunk_index}`}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}

                      {msg.mode && (
                        <Typography variant="caption" display="block" mt={1} sx={{ opacity: 0.75 }}>
                          Mode: {msg.mode}
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                </Box>
              ))}

              {sending && (
                <Box display="flex" gap={2} mb={3}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <BotIcon />
                  </Avatar>
                  <Paper sx={{
                    p: 2.5,
                    bgcolor: 'white',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    <CircularProgress size={18} sx={{ color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ ml: 1.5 }} component="span" color="text.secondary">
                      AI is thinking...
                    </Typography>
                  </Paper>
                </Box>
              )}

              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 2.5, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Box display="flex" gap={1.5}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  placeholder="✨ Ask me anything about your course materials..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: 'white',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                        },
                      },
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  sx={{
                    alignSelf: 'flex-end',
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: 3,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '&:disabled': {
                      bgcolor: 'grey.300',
                      color: 'grey.500',
                    },
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Dialog open={indexDialogOpen} onClose={() => setIndexDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="600">📄 Add Document</Typography>
          <Typography variant="caption" color="text.secondary">Index a PDF from URL to make it searchable</Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Course Name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Document Name (optional)"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="PDF URL"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            margin="normal"
            placeholder="https://.../file.pdf"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIndexDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={indexPdf} disabled={indexing || !courseName.trim() || !pdfUrl.trim()}>
            {indexing ? 'Indexing...' : 'Index'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
