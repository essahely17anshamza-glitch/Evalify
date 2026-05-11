import { PrismaClient } from '@prisma/client';
import { extractZip, readExtractedFiles, cleanupTempFiles } from '../services/zipService.js';
import { analyzeProject } from '../services/aiService.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const submitAssignment = async (req, res, next) => {
  let zipPath = null;
  let extractedDir = null;

  try {
    const assignmentId = BigInt(req.params.id);
    const studentId = req.user.id;
    const { notes } = req.body;

    if (!req.file) return res.status(400).json({ success: false, error: 'ZIP file required' });
    zipPath = req.file.path;

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new Error('Assignment not found');

    extractedDir = await extractZip(zipPath, `sub-${Date.now()}`);
    const files = await readExtractedFiles(extractedDir);
    
    if (files.length === 0) throw new Error("No code files found.");

    // AI Analysis
    const aiResult = await analyzeProject(files, `Submission for ${assignment.title}`, notes || '');

    // Check if late
    const isLate = assignment.deadline && new Date() > assignment.deadline;

    // Upsert submission (allow resubmitting)
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId }
      },
      update: {
        filePath: zipPath,
        notes,
        submittedAt: new Date(),
        isLate,
        aiFeedback: aiResult.feedback,
        aiScore: aiResult.scores?.overall || 0,
        aiAnalysisJson: aiResult,
      },
      create: {
        assignmentId,
        studentId,
        filePath: zipPath,
        notes,
        isLate,
        aiFeedback: aiResult.feedback,
        aiScore: aiResult.scores?.overall || 0,
        aiAnalysisJson: aiResult,
      }
    });

    await cleanupTempFiles(null, extractedDir); // keep zip for teacher

    res.status(201).json({
      success: true,
      data: JSON.parse(JSON.stringify(submission, bigintReplacer))
    });
  } catch (error) {
    await cleanupTempFiles(zipPath, extractedDir);
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
      }
    });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(updated, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};
