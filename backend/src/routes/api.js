import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { submitProject, getProjects, getProject, getUserProfile } from '../controllers/projectController.js';
import { createClass, joinClass, getClasses, getClassDetails } from '../controllers/classController.js';
import { createAssignment, getAssignments, getAssignmentDetails } from '../controllers/assignmentController.js';
import { submitAssignment, getSubmissionsForAssignment, gradeSubmission, getSubmissionDetails } from '../controllers/submissionController.js';
import { createChallenge, getChallenges, initiateBattle, getBattles, getBattleDetails, submitBattleProject, compareBattle } from '../controllers/arenaController.js';
import { quickAnalyze, getAnalysisStatus } from '../controllers/analyzeController.js';
import { rateProject, getRatings } from '../controllers/ratingController.js';
import { getComments, addComment, updateComment, deleteComment, markCommentHelpful } from '../controllers/commentController.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { listUsers, updateUserRole, deleteUser, deleteProjectAdmin, deleteCommentAdmin, getReports, getMetrics } from '../controllers/adminController.js';
import { isAuthenticated, isTeacher, isAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Evalify API is running' });
});

// Auth Routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', isAuthenticated, logout);
router.get('/auth/me', isAuthenticated, getMe);

// Project Routes
router.post('/projects/analyze', isAuthenticated, upload.single('projectFile'), submitProject);
router.get('/projects', getProjects);
router.get('/projects/:id', getProject);
router.post('/projects/:id/rate', isAuthenticated, rateProject);
router.get('/projects/:id/ratings', getRatings);
router.post('/projects/:id/comments', isAuthenticated, addComment);
router.get('/projects/:id/comments', getComments);

// User Profile Route
router.get('/users/:id', getUserProfile);

// Class Routes
router.post('/classes', isAuthenticated, isTeacher, createClass);
router.post('/classes/join', isAuthenticated, joinClass);
router.get('/classes', isAuthenticated, getClasses);
router.get('/classes/:id', isAuthenticated, getClassDetails);

// Assignment Routes
router.post('/classes/:classId/assignments', isAuthenticated, isTeacher, createAssignment);
router.get('/classes/:classId/assignments', isAuthenticated, getAssignments);
router.get('/assignments/:id', isAuthenticated, getAssignmentDetails);

// Submission Routes
router.post('/assignments/:id/submit', isAuthenticated, upload.single('projectFile'), submitAssignment);
router.get('/assignments/:id/submissions', isAuthenticated, isTeacher, getSubmissionsForAssignment);
router.get('/submissions/:id', isAuthenticated, getSubmissionDetails);
router.patch('/submissions/:id/grade', isAuthenticated, isTeacher, gradeSubmission);

// Arena Routes
router.post('/arena/challenges', isAuthenticated, createChallenge);
router.get('/arena/challenges', getChallenges);
router.post('/arena/battles', isAuthenticated, initiateBattle);
router.get('/arena/battles', getBattles);
router.get('/arena/battles/:id', getBattleDetails);
router.get('/arena/battles/:id/comparison', isAuthenticated, compareBattle);
router.post('/arena/battles/:id/submit', isAuthenticated, upload.single('projectFile'), submitBattleProject);

// Analysis Routes
router.post('/analyze/quick', isAuthenticated, quickAnalyze);
router.get('/analyze/status/:id', isAuthenticated, getAnalysisStatus);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// Admin Routes
router.get('/admin/users', isAuthenticated, isAdmin, listUsers);
router.patch('/admin/users/:id/role', isAuthenticated, isAdmin, updateUserRole);
router.delete('/admin/users/:id', isAuthenticated, isAdmin, deleteUser);
router.delete('/admin/projects/:id', isAuthenticated, isAdmin, deleteProjectAdmin);
router.delete('/admin/comments/:id', isAuthenticated, isAdmin, deleteCommentAdmin);
router.get('/admin/reports', isAuthenticated, isAdmin, getReports);
router.get('/admin/metrics', isAuthenticated, isAdmin, getMetrics);

export default router;
