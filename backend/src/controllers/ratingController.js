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

    const rating = await prisma.rating.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { score },
      create: { userId, projectId, score }
    });

    const stats = await prisma.rating.aggregate({
      where: { projectId },
      _avg: { score: true },
      _count: { score: true }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(rating, bigintReplacer)), meta: { average: stats._avg.score || 0, count: stats._count.score } });
  } catch (error) {
    next(error);
  }
};

export const getRatings = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const ratings = await prisma.rating.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(ratings, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};
