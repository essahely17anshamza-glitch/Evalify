import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

const buildAttachmentData = (file) => file ? {
  attachmentPath: file.path,
  attachmentOriginalName: file.originalname,
  attachmentMimeType: file.mimetype,
  attachmentSize: file.size
} : {};

const deleteStoredFile = async (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error('Failed to delete assignment attachment:', error);
  }
};

const cleanupUploadedAttachment = async (req) => {
  if (req.file?.path) {
    await deleteStoredFile(req.file.path);
  }
};

const parseRemoveAttachment = (value) => value === true || value === 'true' || value === '1';

export const createAssignment = async (req, res, next) => {
  let attachmentPersisted = false;
  try {
    const classId = BigInt(req.params.classId);
    const { title, description, maxScore, deadline } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';

    if (!cleanTitle) {
      await cleanupUploadedAttachment(req);
      return res.status(400).json({ success: false, error: 'Assignment title is required' });
    }

    if (!cleanDescription && !req.file) {
      await cleanupUploadedAttachment(req);
      return res.status(400).json({ success: false, error: 'Add a description or attach an assignment file' });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    });

    if (!targetClass) {
      await cleanupUploadedAttachment(req);
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    if (String(req.user.id) !== String(targetClass.teacherId) && req.user.role !== 'ADMIN') {
      await cleanupUploadedAttachment(req);
      return res.status(403).json({ success: false, error: 'Not authorized to create assignments for this class' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        title: cleanTitle,
        description: cleanDescription,
        maxScore: parseInt(maxScore) || 20,
        deadline: deadline ? new Date(deadline) : null,
        isPublished: true,
        ...buildAttachmentData(req.file)
      }
    });
    attachmentPersisted = Boolean(req.file);

    res.status(201).json({
      success: true,
      data: JSON.parse(JSON.stringify(assignment, bigintReplacer))
    });
  } catch (error) {
    if (!attachmentPersisted) {
      await cleanupUploadedAttachment(req);
    }
    next(error);
  }
};

export const getAssignments = async (req, res, next) => {
  try {
    const classId = BigInt(req.params.classId);
    
    const assignments = await prisma.assignment.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(assignments, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (req, res, next) => {
  let newAttachmentPersisted = false;
  try {
    const assignmentId = BigInt(req.params.id);
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: { select: { teacherId: true } } }
    });

    if (!assignment) {
      await cleanupUploadedAttachment(req);
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    if (String(req.user.id) !== String(assignment.class.teacherId) && req.user.role !== 'ADMIN') {
      await cleanupUploadedAttachment(req);
      return res.status(403).json({ success: false, error: 'Not authorized to update this assignment' });
    }

    const { title, description, maxScore, deadline } = req.body;
    const removeAttachment = parseRemoveAttachment(req.body.removeAttachment);
    const nextTitle = title !== undefined ? String(title).trim() : assignment.title;
    const nextDescription = description !== undefined ? String(description).trim() : assignment.description;
    const nextHasAttachment = Boolean(req.file || (!removeAttachment && assignment.attachmentPath));

    if (!nextTitle) {
      await cleanupUploadedAttachment(req);
      return res.status(400).json({ success: false, error: 'Assignment title is required' });
    }

    if (!nextDescription && !nextHasAttachment) {
      await cleanupUploadedAttachment(req);
      return res.status(400).json({ success: false, error: 'Add a description or attach an assignment file' });
    }

    const attachmentUpdate = req.file
      ? buildAttachmentData(req.file)
      : removeAttachment
        ? {
          attachmentPath: null,
          attachmentOriginalName: null,
          attachmentMimeType: null,
          attachmentSize: null
        }
        : {};

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: nextTitle,
        description: nextDescription,
        maxScore: maxScore !== undefined ? parseInt(maxScore, 10) || assignment.maxScore : assignment.maxScore,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : assignment.deadline,
        ...attachmentUpdate
      }
    });
    newAttachmentPersisted = Boolean(req.file);

    if (req.file || removeAttachment) {
      await deleteStoredFile(assignment.attachmentPath);
    }

    res.json({ success: true, data: JSON.parse(JSON.stringify(updated, bigintReplacer)) });
  } catch (error) {
    if (!newAttachmentPersisted) {
      await cleanupUploadedAttachment(req);
    }
    next(error);
  }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    const assignmentId = BigInt(req.params.id);
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: { select: { teacherId: true } } }
    });

    if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
    if (String(req.user.id) !== String(assignment.class.teacherId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this assignment' });
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });
    await deleteStoredFile(assignment.attachmentPath);
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentDetails = async (req, res, next) => {
  try {
    const assignmentId = BigInt(req.params.id);
    
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: { select: { name: true, teacherId: true } } }
    });

    if (!assignment) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(assignment, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAssignmentAttachment = async (req, res, next) => {
  try {
    const assignmentId = BigInt(req.params.id);
    const requesterId = BigInt(req.user.id);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          select: {
            teacherId: true,
            enrollments: {
              where: { studentId: requesterId },
              select: { id: true },
              take: 1
            }
          }
        }
      }
    });

    if (!assignment || !assignment.attachmentPath) {
      return res.status(404).json({ success: false, error: 'Assignment attachment not found' });
    }

    const isTeacher = String(assignment.class.teacherId) === String(req.user.id);
    const isStudent = assignment.class.enrollments.length > 0;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to download this attachment' });
    }

    if (!fs.existsSync(assignment.attachmentPath)) {
      return res.status(404).json({ success: false, error: 'Attachment file is no longer available on the server' });
    }

    const fallbackName = `assignment-${assignment.id}${path.extname(assignment.attachmentPath)}`;
    res.download(assignment.attachmentPath, assignment.attachmentOriginalName || fallbackName);
  } catch (error) {
    next(error);
  }
};
