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
  promoteMe: () => api.post('/auth/promote-me').then(res => res.data),
};

export const userService = {
  getUserProfile: (id) => api.get(`/users/${id}`).then(res => res.data),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`).then(res => res.data),
  requestTeacherRole: (proof) => api.post('/users/request-teacher', { proof }).then(res => res.data)
};

export const projectService = {
  getProjects: () => api.get('/projects').then(res => res.data?.projects || res.data || []),
  getProject: (id) => api.get(`/projects/${id}`).then(res => res.data.data),
  // Upload without AI analysis (new default)
  submit: (formData) => api.post('/projects/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  // Legacy alias — kept for backward compat
  analyze: (formData) => api.post('/projects/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  // On-demand AI analysis for an existing project
  analyzeById: (id) => api.post(`/projects/${id}/analyze`).then(res => res.data),
  updateProject: (id, data) => api.patch(`/projects/${id}`, data).then(res => res.data),
  deleteProject: (id) => api.delete(`/projects/${id}`).then(res => res.data),
  rateProject: (id, score) => api.post(`/projects/${id}/rate`, { score }).then(res => res.data),
  addComment: (id, content, parentId = null) => api.post(`/projects/${id}/comments`, { content, parentId }).then(res => res.data),
  getComments: (id, params = {}) => api.get(`/projects/${id}/comments`, { params }).then(res => res.data),
  updateComment: (commentId, content) => api.patch(`/comments/${commentId}`, { content }).then(res => res.data),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`).then(res => res.data),
  markCommentHelpful: (commentId) => api.post(`/comments/${commentId}/helpful`).then(res => res.data),
  unmarkCommentHelpful: (commentId) => api.delete(`/comments/${commentId}/helpful`).then(res => res.data),
  reportComment: (commentId, reason) => api.post(`/comments/${commentId}/report`, { reason }).then(res => res.data),
  getSource: (id) => api.get(`/projects/${id}/source`).then(res => res.data),
  uploadScreenshot: (id, formData) => api.post(`/projects/${id}/screenshot`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
};

export const classService = {
  getClasses: () => api.get('/classes').then(res => res.data),
  getClass: (id) => api.get(`/classes/${id}`).then(res => res.data),
  createClass: (data) => api.post('/classes', data).then(res => res.data),
  joinClass: (inviteCode) => api.post('/classes/join', { inviteCode }).then(res => res.data),
  createAssignment: (classId, data) => api.post(`/classes/${classId}/assignments`, data, data instanceof FormData ? {
    headers: { 'Content-Type': 'multipart/form-data' }
  } : undefined).then(res => res.data),
  updateAssignment: (assignmentId, data) => api.patch(`/assignments/${assignmentId}`, data, data instanceof FormData ? {
    headers: { 'Content-Type': 'multipart/form-data' }
  } : undefined).then(res => res.data),
  deleteAssignment: (assignmentId) => api.delete(`/assignments/${assignmentId}`).then(res => res.data),
  getAssignmentDetails: (assignmentId) => api.get(`/assignments/${assignmentId}`).then(res => res.data),
  downloadAssignmentAttachment: (assignmentId) => api.get(`/assignments/${assignmentId}/attachment`, {
    responseType: 'blob'
  }).then(res => res.data),
  submitAssignment: (assignmentId, formData) => api.post(`/assignments/${assignmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  getSubmissionsForAssignment: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`).then(res => res.data),
  getSubmissionDetails: (submissionId) => api.get(`/submissions/${submissionId}`).then(res => res.data),
  gradeSubmission: (submissionId, data) => api.patch(`/submissions/${submissionId}/grade`, data).then(res => res.data),
  // On-demand AI analysis for a submission
  analyzeSubmission: (submissionId) => api.post(`/submissions/${submissionId}/analyze`).then(res => res.data),
};

export const arenaService = {
  getChallenges: () => api.get('/arena/challenges').then(res => res.data),
  createChallenge: (data) => api.post('/arena/challenges', data).then(res => res.data),
  getBattles: () => api.get('/arena/battles').then(res => res.data),
  getBattle: (id) => api.get(`/arena/battles/${id}`).then(res => res.data),
  initiateBattle: (data) => api.post('/arena/battles', data).then(res => res.data),
  acceptBattle: (id) => api.post(`/arena/battles/${id}/accept`).then(res => res.data),
  submitBattle: (id, formData) => api.post(`/arena/battles/${id}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data)
};

export const codeService = {
  executeCode: (data) => api.post('/execute', data).then(res => res.data)
};

export const notificationService = {
  list: (params = {}) => api.get('/notifications', { params }).then(res => res.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(res => res.data),
  markAllRead: () => api.patch('/notifications/read-all').then(res => res.data),
  dismiss: (id) => api.delete(`/notifications/${id}`).then(res => res.data),
  clearAll: () => api.delete('/notifications').then(res => res.data),
};

export const adminService = {
  getMetrics: () => api.get('/admin/metrics').then(res => res.data),
  getUsers: () => api.get('/admin/users').then(res => res.data),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then(res => res.data),
  getRoleRequests: () => api.get('/admin/role-requests').then(res => res.data),
  updateRoleRequest: (id, status) => api.patch(`/admin/role-requests/${id}`, { status }).then(res => res.data),
  deleteProject: (id) => api.delete(`/admin/projects/${id}`).then(res => res.data),
  deleteComment: (id) => api.delete(`/admin/comments/${id}`).then(res => res.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then(res => res.data),

  // Comments moderation
  getAllComments: (params) => api.get('/admin/comments', { params }).then(res => res.data),
  getReportedComments: () => api.get('/admin/reports').then(res => res.data),
  dismissReport: (commentId) => api.post(`/admin/reports/${commentId}/dismiss`).then(res => res.data),

  // Classes management
  getAllClasses: (params) => api.get('/admin/classes', { params }).then(res => res.data),
  deleteClass: (id) => api.delete(`/admin/classes/${id}`).then(res => res.data),

  // Arena management
  getAllChallenges: () => api.get('/admin/challenges').then(res => res.data),
  deleteChallenge: (id) => api.delete(`/admin/challenges/${id}`).then(res => res.data),
  getAllBattles: () => api.get('/admin/battles').then(res => res.data),
  deleteBattle: (id) => api.delete(`/admin/battles/${id}`).then(res => res.data),
};

export default api;
