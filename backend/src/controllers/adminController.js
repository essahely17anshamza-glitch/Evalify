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
    const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // Security: Prevent last admin from demoting themselves
    if (role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      
      if (targetUser.role === 'ADMIN' && adminCount <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot demote the last administrator.' });
      }
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
    const [projectCount, userCount, commentCount, battleCount, submissionCount, classCount] = await Promise.all([
      prisma.project.count(),
      prisma.user.count(),
      prisma.comment.count(),
      prisma.battle.count(),
      prisma.submission.count(),
      prisma.class.count(),
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
        classCount,
        averageAiScore: averageAiScore._avg.aiScore || 0,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRoleRequests = async (req, res, next) => {
  try {
    const requests = await prisma.roleRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    res.json({ success: true, data: JSON.parse(JSON.stringify(requests, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const updateRoleRequest = async (req, res, next) => {
  try {
    const requestId = BigInt(req.params.id);
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const request = await prisma.roleRequest.findUnique({ where: { id: requestId } });
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Request is already processed' });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.roleRequest.update({
        where: { id: requestId },
        data: { status }
      });

      if (status === 'APPROVED') {
        await tx.user.update({
          where: { id: request.userId },
          data: { role: 'TEACHER' }
        });
      }

      return updatedReq;
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(updatedRequest, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// ── COMMENTS MODERATION ──

export const getReportedComments = async (req, res, next) => {
  try {
    const reportedComments = await prisma.comment.findMany({
      where: { isReported: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, title: true } },
        reports: {
          include: {
            user: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(reportedComments, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const dismissReport = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);

    await prisma.$transaction(async (tx) => {
      // Delete all reports for this comment
      await tx.commentReport.deleteMany({ where: { commentId } });
      // Unmark the comment
      await tx.comment.update({
        where: { id: commentId },
        data: { isReported: false }
      });
    });

    res.json({ success: true, message: 'Report dismissed' });
  } catch (error) {
    next(error);
  }
};

export const getAllComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.content = { contains: search };
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, title: true } },
          _count: { select: { reports: true, helpfulVotes: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.comment.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        comments: JSON.parse(JSON.stringify(comments, bigintReplacer)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ── CLASSES MANAGEMENT ──

export const getAllClasses = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const where = {};
    if (search) {
      where.name = { contains: search };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, assignments: true, challenges: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(classes, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req, res, next) => {
  try {
    const classId = BigInt(req.params.id);
    await prisma.class.delete({ where: { id: classId } });
    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    next(error);
  }
};

// ── ARENA MANAGEMENT ──

export const getAllChallenges = async (req, res, next) => {
  try {
    const challenges = await prisma.challenge.findMany({
      include: {
        creator: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { battles: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(challenges, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const deleteChallenge = async (req, res, next) => {
  try {
    const challengeId = BigInt(req.params.id);
    await prisma.challenge.delete({ where: { id: challengeId } });
    res.json({ success: true, message: 'Challenge deleted' });
  } catch (error) {
    next(error);
  }
};

export const getAllBattles = async (req, res, next) => {
  try {
    const battles = await prisma.battle.findMany({
      include: {
        challenge: { select: { id: true, title: true } },
        playerA: { select: { id: true, name: true } },
        playerB: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(battles, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const deleteBattle = async (req, res, next) => {
  try {
    const battleId = BigInt(req.params.id);
    await prisma.battle.delete({ where: { id: battleId } });
    res.json({ success: true, message: 'Battle deleted' });
  } catch (error) {
    next(error);
  }
};
