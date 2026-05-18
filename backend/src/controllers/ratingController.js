import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const rateProject = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const userId = req.user.id;
    const score = parseInt(req.body.score, 10);

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, error: 'Score must be a number between 1 and 5' });
    }

    // Check if user is rating their own project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (project && project.userId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot rate your own project' });
    }

    const rating = await prisma.rating.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { score },
      create: { userId, projectId, score }
    });

    // Get comprehensive rating statistics
    const [stats, distribution] = await Promise.all([
      prisma.rating.aggregate({
        where: { projectId },
        _avg: { score: true },
        _count: { score: true },
        _sum: { score: true }
      }),
      prisma.rating.groupBy({
        by: ['score'],
        where: { projectId },
        _count: true
      })
    ]);

    // Create distribution object (1-5 stars)
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    distribution.forEach(item => {
      ratingDistribution[item.score] = item._count;
    });

    // Check for badge awarding
    const { checkAndAwardBadges } = await import('../services/badgeService.js');
    await checkAndAwardBadges(userId, 'project_rating', { projectId, score });

    res.json({ 
      success: true, 
      data: JSON.parse(JSON.stringify(rating, bigintReplacer)), 
      meta: { 
        average: Math.round((stats._avg.score || 0) * 10) / 10, 
        count: stats._count.score,
        sum: stats._sum.score || 0,
        distribution: ratingDistribution
      } 
    });
  } catch (error) {
    next(error);
  }
};

export const getRatings = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build order by clause
    const orderBy = {};
    if (sortBy === 'score') {
      orderBy.score = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [ratings, total, stats, distribution] = await Promise.all([
      prisma.rating.findMany({
        where: { projectId },
        include: { 
          user: { 
            select: { id: true, name: true, avatarUrl: true } 
          } 
        },
        orderBy,
        skip,
        take
      }),
      prisma.rating.count({ where: { projectId } }),
      prisma.rating.aggregate({
        where: { projectId },
        _avg: { score: true },
        _count: { score: true },
        _sum: { score: true }
      }),
      prisma.rating.groupBy({
        by: ['score'],
        where: { projectId },
        _count: true
      })
    ]);

    // Create distribution object (1-5 stars)
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    distribution.forEach(item => {
      ratingDistribution[item.score] = item._count;
    });

    res.json({ 
      success: true, 
      data: {
        ratings: JSON.parse(JSON.stringify(ratings, bigintReplacer)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: skip + take < total,
          hasPrev: page > 1
        },
        statistics: {
          average: Math.round((stats._avg.score || 0) * 10) / 10,
          count: stats._count.score,
          sum: stats._sum.score || 0,
          distribution: ratingDistribution
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserRating = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const userId = req.user.id;

    const rating = await prisma.rating.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    res.json({ 
      success: true, 
      data: rating ? JSON.parse(JSON.stringify(rating, bigintReplacer)) : null 
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRating = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const userId = req.user.id;

    const rating = await prisma.rating.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    if (!rating) {
      return res.status(404).json({ success: false, error: 'Rating not found' });
    }

    await prisma.rating.delete({
      where: { userId_projectId: { userId, projectId } }
    });

    res.json({ success: true, message: 'Rating deleted successfully' });
  } catch (error) {
    next(error);
  }
};
