import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const createClass = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const teacherId = req.user.id;

    // Generate unique 6 character invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        inviteCode,
        teacherId
      }
    });

    res.status(201).json({
      success: true,
      data: JSON.parse(JSON.stringify(newClass, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const joinClass = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const studentId = req.user.id;

    const targetClass = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!targetClass) {
      return res.status(404).json({ success: false, error: 'Class not found with this invite code' });
    }

    // Check if already enrolled
    const existing = await prisma.classEnrollment.findUnique({
      where: {
        classId_studentId: { classId: targetClass.id, studentId }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'You are already enrolled in this class' });
    }

    const enrollment = await prisma.classEnrollment.create({
      data: { classId: targetClass.id, studentId }
    });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(enrollment, bigintReplacer)),
      message: `Successfully joined ${targetClass.name}`
    });
  } catch (error) {
    next(error);
  }
};

export const getClasses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let classes;
    if (role === 'TEACHER' || role === 'ADMIN') {
      classes = await prisma.class.findMany({
        where: { teacherId: userId },
        include: { _count: { select: { enrollments: true, assignments: true } } }
      });
    } else {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { studentId: userId },
        include: {
          class: {
            include: { teacher: { select: { name: true } } }
          }
        }
      });
      classes = enrollments.map(e => e.class);
    }

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(classes, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const getClassDetails = async (req, res, next) => {
  try {
    const classId = BigInt(req.params.id);
    const userId = req.user.id;
    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { name: true } },
        assignments: { 
          orderBy: { createdAt: 'desc' },
          include: {
            submissions: {
              where: { studentId: userId },
              select: { id: true, submittedAt: true, aiScore: true, gradedAt: true }
            }
          }
        },
        enrollments: {
          include: { student: { select: { id: true, name: true, avatarUrl: true } } }
        }
      }
    });

    if (!targetClass) return res.status(404).json({ success: false, error: 'Class not found' });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(targetClass, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};
