import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { getUserProfile, searchUsers, requestTeacherRole } from '../controllers/userController.js';
import { submitProject, getProjects, getProject, updateProject, deleteProject, downloadProject, uploadScreenshot, getProjectSource, analyzeProjectById } from '../controllers/projectController.js';
import { createClass, joinClass, getClasses, getClassDetails } from '../controllers/classController.js';
import { createAssignment, getAssignments, getAssignmentDetails, updateAssignment, deleteAssignment, downloadAssignmentAttachment } from '../controllers/assignmentController.js';
import { submitAssignment, getSubmissionsForAssignment, gradeSubmission, getSubmissionDetails, analyzeSubmissionById } from '../controllers/submissionController.js';
import { createChallenge, getChallenges, initiateBattle, acceptBattle, getBattles, getBattleDetails, submitBattleProject, compareBattle } from '../controllers/arenaController.js';
import { quickAnalyze, getAnalysisStatus } from '../controllers/analyzeController.js';
import { rateProject, getRatings } from '../controllers/ratingController.js';
import { getComments, addComment, updateComment, deleteComment, markCommentHelpful, unmarkCommentHelpful, reportComment } from '../controllers/commentController.js';
import { getLeaderboard, getArenaLeaderboard } from '../controllers/leaderboardController.js';
import { listUsers, updateUserRole, deleteUser, deleteProjectAdmin, deleteCommentAdmin, getReports, getReportedComments, dismissReport, getAllComments, getAllClasses, deleteClass, getAllChallenges, deleteChallenge, getAllBattles, deleteBattle, getMetrics, getRoleRequests, updateRoleRequest } from '../controllers/adminController.js';
import { isAuthenticated, isTeacher, isAdmin, isNotAdmin } from '../middleware/auth.js';
import { upload, assignmentUpload } from '../middleware/upload.js';
import { executeCode } from '../controllers/executeController.js';
import { getNotifications, markAsRead, markAllAsRead, dismissNotification, clearAllNotifications } from '../controllers/notificationController.js';

const router = Router();

// Code Execution
router.post('/execute', isAuthenticated, executeCode);

// Notifications
router.get('/notifications', isAuthenticated, getNotifications);
router.patch('/notifications/:id/read', isAuthenticated, markAsRead);
router.patch('/notifications/read-all', isAuthenticated, markAllAsRead);
router.delete('/notifications/:id', isAuthenticated, dismissNotification);
router.delete('/notifications', isAuthenticated, clearAllNotifications);

// Health Check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Evalify API is running' });
});

// AI Test - Diagnostic endpoint
router.get('/health/ai-test', async (req, res) => {
  try {
    const { callAI } = await import('../services/providers/' + (process.env.AI_PROVIDER || 'groq') + '.js');
    const testPrompt = 'Return exactly this JSON: {"test": "success"}';
    const response = await callAI(testPrompt);
    res.json({ 
      success: true, 
      provider: process.env.AI_PROVIDER || 'groq',
      response 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      provider: process.env.AI_PROVIDER || 'groq',
      error: error.message 
    });
  }
});

// Auth Routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', isAuthenticated, logout);
router.get('/auth/me', isAuthenticated, getMe);

// User Routes
router.get('/users/search', isAuthenticated, searchUsers);
router.post('/users/request-teacher', isAuthenticated, requestTeacherRole);
router.get('/users/:id', isAuthenticated, getUserProfile);

// Project Routes
router.post('/projects/submit', isAuthenticated, isNotAdmin, upload.single('projectFile'), submitProject);
router.post('/projects/analyze', isAuthenticated, isNotAdmin, upload.single('projectFile'), submitProject); // legacy alias
router.post('/projects/:id/analyze', isAuthenticated, isNotAdmin, analyzeProjectById);
router.post('/projects/:id/screenshot', isAuthenticated, isNotAdmin, upload.single('screenshot'), uploadScreenshot);
router.get('/projects/:id/source', isAuthenticated, getProjectSource);
router.get('/projects', isAuthenticated, getProjects);
router.get('/projects/:id', isAuthenticated, getProject);
router.get('/projects/:id/download', isAuthenticated, downloadProject);
router.patch('/projects/:id', isAuthenticated, updateProject);
router.delete('/projects/:id', isAuthenticated, deleteProject);
router.post('/projects/:id/rate', isAuthenticated, isNotAdmin, rateProject);
router.get('/projects/:id/ratings', isAuthenticated, getRatings);
router.post('/projects/:id/comments', isAuthenticated, isNotAdmin, addComment);
router.get('/projects/:id/comments', isAuthenticated, getComments);
router.patch('/comments/:id', isAuthenticated, updateComment);
router.delete('/comments/:id', isAuthenticated, deleteComment);
router.post('/comments/:id/helpful', isAuthenticated, isNotAdmin, markCommentHelpful);
router.delete('/comments/:id/helpful', isAuthenticated, isNotAdmin, unmarkCommentHelpful);
router.post('/comments/:id/report', isAuthenticated, isNotAdmin, reportComment);

// Removed duplicate User Routes

// Class Routes
router.post('/classes', isAuthenticated, isTeacher, createClass);
router.post('/classes/join', isAuthenticated, isNotAdmin, joinClass);
router.get('/classes', isAuthenticated, getClasses);
router.get('/classes/:id', isAuthenticated, getClassDetails);

// Assignment Routes
router.post('/classes/:classId/assignments', isAuthenticated, isTeacher, assignmentUpload.single('attachment'), createAssignment);
router.get('/classes/:classId/assignments', isAuthenticated, getAssignments);
router.get('/assignments/:id', isAuthenticated, getAssignmentDetails);
router.get('/assignments/:id/attachment', isAuthenticated, downloadAssignmentAttachment);
router.patch('/assignments/:id', isAuthenticated, isTeacher, assignmentUpload.single('attachment'), updateAssignment);
router.delete('/assignments/:id', isAuthenticated, isTeacher, deleteAssignment);

// Submission Routes
router.post('/assignments/:id/submit', isAuthenticated, isNotAdmin, upload.single('projectFile'), submitAssignment);
router.get('/assignments/:id/submissions', isAuthenticated, isTeacher, getSubmissionsForAssignment);
router.get('/submissions/:id', isAuthenticated, getSubmissionDetails);
router.patch('/submissions/:id/grade', isAuthenticated, isTeacher, gradeSubmission);
router.post('/submissions/:id/analyze', isAuthenticated, isTeacher, analyzeSubmissionById);


// Arena Routes
router.post('/arena/challenges', isAuthenticated, isNotAdmin, createChallenge);
router.get('/arena/challenges', isAuthenticated, getChallenges);
router.post('/arena/battles', isAuthenticated, isNotAdmin, initiateBattle);
router.post('/arena/battles/:id/accept', isAuthenticated, isNotAdmin, acceptBattle);
router.get('/arena/battles', isAuthenticated, getBattles);
router.get('/arena/battles/:id', isAuthenticated, getBattleDetails);
router.get('/arena/battles/:id/comparison', isAuthenticated, compareBattle);
router.post('/arena/battles/:id/submit', isAuthenticated, isNotAdmin, upload.single('projectFile'), submitBattleProject);

// Analysis Routes
router.post('/analyze/quick', isAuthenticated, quickAnalyze);
router.get('/analyze/status/:id', isAuthenticated, getAnalysisStatus);

// Leaderboard
router.get('/leaderboard', isAuthenticated, getLeaderboard);
router.get('/leaderboard/arena', isAuthenticated, getArenaLeaderboard);

// Admin Routes
router.get('/admin/users', isAuthenticated, isAdmin, listUsers);
router.patch('/admin/users/:id/role', isAuthenticated, isAdmin, updateUserRole);
router.delete('/admin/users/:id', isAuthenticated, isAdmin, deleteUser);
router.delete('/admin/projects/:id', isAuthenticated, isAdmin, deleteProjectAdmin);
router.delete('/admin/comments/:id', isAuthenticated, isAdmin, deleteCommentAdmin);

// Admin — Comments Moderation
router.get('/admin/comments', isAuthenticated, isAdmin, getAllComments);
router.get('/admin/reports', isAuthenticated, isAdmin, getReportedComments);
router.post('/admin/reports/:id/dismiss', isAuthenticated, isAdmin, dismissReport);

// Admin — Classes Management
router.get('/admin/classes', isAuthenticated, isAdmin, getAllClasses);
router.delete('/admin/classes/:id', isAuthenticated, isAdmin, deleteClass);

// Admin — Arena Management
router.get('/admin/challenges', isAuthenticated, isAdmin, getAllChallenges);
router.delete('/admin/challenges/:id', isAuthenticated, isAdmin, deleteChallenge);
router.get('/admin/battles', isAuthenticated, isAdmin, getAllBattles);
router.delete('/admin/battles/:id', isAuthenticated, isAdmin, deleteBattle);

// Admin — Metrics & Role Requests
router.get('/admin/metrics', isAuthenticated, isAdmin, getMetrics);
router.get('/admin/role-requests', isAuthenticated, isAdmin, getRoleRequests);
router.patch('/admin/role-requests/:id', isAuthenticated, isAdmin, updateRoleRequest);

export default router;
