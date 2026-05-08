import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('evalify_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  register: (data) => api.post('/auth/register', data).then(res => res.data),
  login: (data) => api.post('/auth/login', data).then(res => res.data),
  getMe: () => api.get('/auth/me').then(res => res.data),
};

export const projectService = {
  getProjects: () => api.get('/projects').then(res => res.data),
  getProject: (id) => api.get(`/projects/${id}`).then(res => res.data),
  getUserProfile: (id) => api.get(`/users/${id}`).then(res => res.data),
  analyze: (formData) => api.post('/projects/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
};

export const classService = {
  getClasses: () => api.get('/classes').then(res => res.data),
  getClass: (id) => api.get(`/classes/${id}`).then(res => res.data),
  createClass: (data) => api.post('/classes', data).then(res => res.data),
  joinClass: (inviteCode) => api.post('/classes/join', { inviteCode }).then(res => res.data),
  createAssignment: (classId, data) => api.post(`/classes/${classId}/assignments`, data).then(res => res.data),
  submitAssignment: (assignmentId, formData) => api.post(`/assignments/${assignmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  gradeSubmission: (submissionId, data) => api.patch(`/submissions/${submissionId}/grade`, data).then(res => res.data)
};

export const arenaService = {
  getChallenges: () => api.get('/arena/challenges').then(res => res.data),
  createChallenge: (data) => api.post('/arena/challenges', data).then(res => res.data),
  getBattles: () => api.get('/arena/battles').then(res => res.data),
  getBattle: (id) => api.get(`/arena/battles/${id}`).then(res => res.data),
  initiateBattle: (data) => api.post('/arena/battles', data).then(res => res.data),
  submitBattle: (id, formData) => api.post(`/arena/battles/${id}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data)
};

export default api;
