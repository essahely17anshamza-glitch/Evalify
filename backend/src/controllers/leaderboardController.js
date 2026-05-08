import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all', language, minRatings = '0' } = req.query;
    const minRatingsNumber = parseInt(minRatings, 10) || 0;
    const where = {};

    if (language && language !== 'all') {
      where.language = language;
    }

    if (period === 'week') {
      where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === 'month') {
      where.createdAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        ratings: { select: { score: true } }
      }
    });

    const leaderboard = projects
      .map((project) => {
        const count = project.ratings.length;
        const avg = count > 0 ? project.ratings.reduce((sum, item) => sum + item.score, 0) / count : 0;
        return {
          ...project,
          averageRating: Math.round(avg * 10) / 10,
          ratingCount: count
        };
      })
      .filter((project) => project.ratingCount >= minRatingsNumber)
      .sort((a, b) => b.averageRating - a.averageRating || (b.ratingCount - a.ratingCount));

    res.json({ success: true, data: JSON.parse(JSON.stringify(leaderboard.slice(0, 50), bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};
