import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { extractZip, readExtractedFiles, cleanupTempFiles } from '../services/zipService.js';
import { analyzeProject } from '../services/aiService.js';
import notificationService from '../services/notificationService.js';
import { createNotification } from './notificationController.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

// ─── SUBMIT ASSIGNMENT (upload only — no AI) ──────────────────────────────────
export const submitAssignment = async (req, res, next) => {
  let filePath = null;

  try {
    const assignmentId = BigInt(req.params.id);
    const studentId = req.user.id;
    const { notes, submissionType } = req.body;

    if (!req.file) return res.status(400).json({ success: false, error: 'A file is required' });
    filePath = req.file.path;

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new Error('Assignment not found');

    const isLate = assignment.deadline && new Date() > assignment.deadline;

    // Detect type
    let detectedType = submissionType || 'zip';
    if (!submissionType) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const { detectFileType } = await import('../middleware/upload.js');
      detectedType = await detectFileType(filePath, ext === '.zip');
    }

    // Upsert submission (allow resubmitting) — AI fields intentionally null
    const submission = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: {
        filePath,
        notes,
        type: detectedType,
        submittedAt: new Date(),
        isLate,
        aiFeedback: null,
        aiScore: null,
        aiAnalysisJson: null,
      },
      create: {
        assignmentId,
        studentId,
        filePath,
        notes,
        type: detectedType,
        isLate,
        aiFeedback: null,
        aiScore: null,
        aiAnalysisJson: null,
      }
    });

    res.status(201).json({
      success: true,
      data: JSON.parse(JSON.stringify(submission, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

// ─── ON-DEMAND AI ANALYSIS FOR SUBMISSIONS ────────────────────────────────────
export const analyzeSubmissionById = async (req, res, next) => {
  try {
    const submissionId = BigInt(req.params.id);
    const requesterId = BigInt(req.user.id);

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { include: { class: { select: { teacherId: true } } } }
      }
    });

    if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

    const isStudent = submission.studentId === requesterId;
    const isTeacher = submission.assignment?.class?.teacherId === requesterId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isStudent && !isTeacher && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to analyze this submission' });
    }

    if (!submission.filePath) {
      return res.status(400).json({ success: false, error: 'No source file found for this submission.' });
    }

    let files = [];
    const ext = path.extname(submission.filePath).toLowerCase();

    if (ext === '.zip') {
      const tmpDir = `sub-analyze-tmp-${Date.now()}`;
      const extractedDir = await extractZip(submission.filePath, tmpDir);
      files = await readExtractedFiles(extractedDir);
      await cleanupTempFiles(null, extractedDir);
    } else {
      const content = await fs.promises.readFile(submission.filePath, 'utf8');
      files = [{ path: path.basename(submission.filePath), content }];
    }

    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No readable code files found.' });
    }

    const submissionType = submission.type || 'zip';
    const assignmentTitle = submission.assignment?.title || 'Assignment';
    const context = submission.notes || '';

    console.log(`[AnalyzeSubmission] Running AI on submission ${submissionId} (type: ${submissionType})...`);
    const aiResult = await analyzeProject(files, `Submission for: ${assignmentTitle}`, context, submissionType);

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiFeedback: aiResult.feedback,
        aiScore: aiResult.scores?.overall || 0,
        aiAnalysisJson: aiResult,
      }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(updated, bigintReplacer)) });
  } catch (error) {
    console.error('analyzeSubmissionById error:', error);
    next(error);
  }
};



export const getSubmissionsForAssignment = async (req, res, next) => {
  try {
    const assignmentId = BigInt(req.params.id);
    
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(submissions, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmissionDetails = async (req, res, next) => {
  try {
    const submissionId = BigInt(req.params.id);
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } },
        assignment: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                teacherId: true,
                teacher: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    res.json({ success: true, data: JSON.parse(JSON.stringify(submission, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (req, res, next) => {
  try {
    const submissionId = BigInt(req.params.id);
    const { teacherScore, teacherComment } = req.body;

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        teacherScore,
        teacherComment,
        gradedAt: new Date()
      },
      include: { student: { select: { id: true, name: true } }, assignment: { select: { id: true, title: true, classId: true } } }
    });

    // Notify student via Socket.IO
    notificationService.notifySubmissionGraded(updated);
    
    // Persist notification
    createNotification(
      updated.studentId,
      'grade',
      'Assignment graded',
      `Your submission for "${updated.assignment?.title}" was graded: ${teacherScore}/20`,
      `/submissions/${submissionId.toString()}`
    );

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(updated, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const bulkGradeSubmissions = async (req, res, next) => {
  try {
    const { submissions } = req.body; // Array of { id, teacherScore, teacherComment }
    
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ success: false, error: 'Submissions array is required' });
    }

    const results = await prisma.$transaction(
      submissions.map(submission => 
        prisma.submission.update({
          where: { id: BigInt(submission.id) },
          data: {
            teacherScore: submission.teacherScore,
            teacherComment: submission.teacherComment,
            gradedAt: new Date()
          }
        })
      )
    );

    res.json({
      success: true,
      data: {
        graded: JSON.parse(JSON.stringify(results, bigintReplacer)),
        count: results.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDownloadSubmissions = async (req, res, next) => {
  try {
    const assignmentId = BigInt(req.params.id);
    const { submissionIds } = req.body;

    let whereClause = { assignmentId };
    if (submissionIds && Array.isArray(submissionIds)) {
      whereClause.id = { in: submissionIds.map(id => BigInt(id)) };
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    // Create a simple response with download links
    // In a real implementation, you'd create a ZIP file with all submissions
    const downloadLinks = submissions.map(submission => ({
      studentName: submission.student.name,
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
      downloadUrl: submission.filePath ? `/api/submissions/${submission.id}/download` : null
    }));

    res.json({
      success: true,
      data: downloadLinks
    });
  } catch (error) {
    next(error);
  }
};

export const checkPlagiarism = async (req, res, next) => {
  try {
    const assignmentId = BigInt(req.params.id);
    const { submissionId, threshold = 0.8 } = req.body;

    // Get all submissions for the assignment
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    if (submissions.length < 2) {
      return res.json({
        success: true,
        data: { message: 'Need at least 2 submissions to check for plagiarism' }
      });
    }

    // Get the target submission (if specified)
    const targetSubmission = submissionId 
      ? submissions.find(s => s.id.toString() === submissionId.toString())
      : null;

    const plagiarismResults = [];

    // Compare each submission with others
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const submission1 = submissions[i];
        const submission2 = submissions[j];

        // Skip if we're only checking one submission and neither matches
        if (targetSubmission && 
            submission1.id !== targetSubmission.id && 
            submission2.id !== targetSubmission.id) {
          continue;
        }

        // Simple similarity check based on AI analysis
        const similarity = calculateSimilarity(
          submission1.aiAnalysisJson,
          submission2.aiAnalysisJson
        );

        if (similarity >= threshold) {
          plagiarismResults.push({
            submission1: {
              id: submission1.id,
              studentName: submission1.student.name,
              similarity: similarity
            },
            submission2: {
              id: submission2.id,
              studentName: submission2.student.name,
              similarity: similarity
            },
            similarityScore: similarity,
            flagged: similarity >= threshold
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        assignmentId,
        threshold,
        totalComparisons: plagiarismResults.length,
        flaggedSubmissions: plagiarismResults.filter(r => r.flagged),
        results: plagiarismResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// Simple similarity calculation function
const calculateSimilarity = (analysis1, analysis2) => {
  try {
    if (!analysis1 || !analysis2) return 0;

    // Extract key features for comparison
    const features1 = extractFeatures(analysis1);
    const features2 = extractFeatures(analysis2);

    // Calculate Jaccard similarity
    const intersection = new Set([...features1].filter(x => features2.has(x)));
    const union = new Set([...features1, ...features2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
};

// Extract features from AI analysis for similarity comparison
const extractFeatures = (analysis) => {
  const features = new Set();
  
  if (analysis?.strengths) {
    analysis.strengths.forEach(strength => {
      features.add(strength.toLowerCase());
    });
  }
  
  if (analysis?.improvements) {
    analysis.improvements.forEach(improvement => {
      features.add(improvement.toLowerCase());
    });
  }
  
  if (analysis?.feedback) {
    // Extract key terms from feedback
    const words = analysis.feedback.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 4) { // Only consider words longer than 4 characters
        features.add(word);
      }
    });
  }
  
  return features;
};
