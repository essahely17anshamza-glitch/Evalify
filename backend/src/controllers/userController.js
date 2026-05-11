import { PrismaClient } from '@prisma/client';

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
        arenaRanking: true,
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
            battlesWon: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(user, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};
