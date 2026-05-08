import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const listUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { projects: true, comments: true, ratings: true, battlesWon: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(users, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const userId = BigInt(req.params.id);
    const { role } = req.body;
    const validRoles = ['USER', 'STUDENT', 'TEACHER', 'ADMIN'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(user, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = BigInt(req.params.id);
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

export const deleteProjectAdmin = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    await prisma.project.delete({ where: { id: projectId } });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};

export const deleteCommentAdmin = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const reportedComments = await prisma.comment.findMany({
      where: { isReported: true },
      include: { user: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(reportedComments, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const [projectCount, userCount, commentCount, battleCount, submissionCount] = await Promise.all([
      prisma.project.count(),
      prisma.user.count(),
      prisma.comment.count(),
      prisma.battle.count(),
      prisma.submission.count(),
    ]);

    const averageAiScore = await prisma.project.aggregate({ _avg: { aiScore: true } });

    res.json({
      success: true,
      data: {
        projectCount,
        userCount,
        commentCount,
        battleCount,
        submissionCount,
        averageAiScore: averageAiScore._avg.aiScore || 0,
      }
    });
  } catch (error) {
    next(error);
  }
};
