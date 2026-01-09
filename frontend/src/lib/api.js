import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Auth endpoints
export const authAPI = {
    getCurrentUser: () => api.get('/api/auth/me'),
    updatePreferences: (preferences) => api.put('/api/auth/me/preferences', preferences),
};

// Task endpoints
export const tasksAPI = {
    getTasks: (status) => api.get('/api/tasks', { params: { status } }),
    getTask: (id) => api.get(`/api/tasks/${id}`),
    createTask: (taskData) => api.post('/api/tasks', taskData),
    updateTask: (id, taskData) => api.put(`/api/tasks/${id}`, taskData),
    deleteTask: (id) => api.delete(`/api/tasks/${id}`),
    prioritizeTasks: () => api.post('/api/tasks/prioritize'),
};

// Syllabus API
export const syllabusAPI = {
    extract: (pdfUrl) => api.post('/api/syllabus/extract', { pdf_url: pdfUrl }),
    extractAndSave: (pdfUrl) => api.post('/api/syllabus/extract-and-save', { pdf_url: pdfUrl }),
    uploadAndExtract: (formData) => api.post('/api/syllabus/upload-and-extract', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
};

// Schedule endpoints
export const scheduleAPI = {
    generateSchedule: (scheduleData) => api.post('/api/schedule/generate', scheduleData),
    generateWeeklySchedule: (data) => api.post('/api/schedule/weekly', data),
    getSchedule: (date) => api.get('/api/schedule', { params: { date } }),
};

// Calendar endpoints
export const calendarAPI = {
    getAuthUrl: (state) => api.get('/api/calendar/auth-url', { params: { state } }),
    handleCallback: (code) => api.post('/api/calendar/callback', { code }),
    syncToCalendar: (data) => api.post('/api/calendar/sync', data),
    getEvents: (timeMin, timeMax, maxResults) =>
        api.get('/api/calendar/events', { params: { time_min: timeMin, time_max: timeMax, max_results: maxResults } }),
};

// Project endpoints
export const projectsAPI = {
    getProjects: () => api.get('/api/projects'),
    getProject: (id) => api.get(`/api/projects/${id}`),
    createProject: (projectData) => api.post('/api/projects', projectData),
    updateProject: (id, projectData) => api.put(`/api/projects/${id}`, projectData),
    deleteProject: (id) => api.delete(`/api/projects/${id}`),
    addMember: (projectId, email) => api.post(`/api/projects/${projectId}/members`, { email }),
    removeMember: (projectId, userId) => api.delete(`/api/projects/${projectId}/members/${userId}`),
    assignTask: (projectId, taskId, userId) =>
        api.post(`/api/projects/${projectId}/tasks/${taskId}/assign`, { user_id: userId }),
};

export default api;
