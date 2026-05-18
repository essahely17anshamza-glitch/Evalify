import { PrismaClient } from '@prisma/client';
import { createNotification } from './notificationController.js';
const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = BigInt(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true, // might want to hide this for public profiles, but keeping for now
        role: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        arenaRankings: true,
        badges: {
          include: { badge: true }
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { comments: true } }
          }
        },
        _count: {
          select: {
            projects: true,
            battlesWon: true,
            taughtClasses: true,
            createdChallenges: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.arenaRankings && user.arenaRankings.length > 0) {
      user.arenaRanking = user.arenaRankings.find(r => r.type === 'COMMUNITY') || user.arenaRankings[0];
    }

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(user, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: q
        },
        id: {
          not: req.user.id
        }
      },
      take: 10,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        arenaRankings: {
          select: { tier: true, type: true }
        }
      }
    });

    // Map arenaRankings back to arenaRanking for frontend compatibility
    const mappedUsers = users.map(u => {
      const communityRanking = u.arenaRankings?.find(r => r.type === 'COMMUNITY') || u.arenaRankings?.[0];
      return {
        ...u,
        arenaRanking: communityRanking,
        arenaRankings: undefined
      };
    });

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(mappedUsers, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

export const requestTeacherRole = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { proof } = req.body;

    if (!proof) {
      return res.status(400).json({ success: false, error: 'Proof is required' });
    }

    // Check if user is already a teacher or admin
    if (req.user.role === 'TEACHER' || req.user.role === 'ADMIN') {
      return res.status(400).json({ success: false, error: 'User is already a teacher or admin' });
    }

    // Check if a pending request already exists
    const existingRequest = await prisma.roleRequest.findFirst({
      where: {
        userId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'You already have a pending request.' });
    }

    const request = await prisma.roleRequest.create({
      data: {
        userId,
        proof
      }
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });
    for (const admin of admins) {
      createNotification(
        admin.id,
        'request',
        'New Teacher Request',
        `${req.user.name || 'A user'} has requested to become a teacher.`,
        '/admin?section=requests' // Assuming this is where admins see requests
      );
    }

    res.json({ success: true, data: JSON.parse(JSON.stringify(request, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};
