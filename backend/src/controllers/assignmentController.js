import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const createAssignment = async (req, res, next) => {
  try {
    const classId = BigInt(req.params.classId);
    const { title, description, maxScore, deadline } = req.body;

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        title,
        description,
        maxScore: parseInt(maxScore) || 20,
        deadline: deadline ? new Date(deadline) : null,
        isPublished: true
      }
    });

    res.status(201).json({
      success: true,
      data: JSON.parse(JSON.stringify(assignment, bigintReplacer))
    });
  } catch (error) {
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
