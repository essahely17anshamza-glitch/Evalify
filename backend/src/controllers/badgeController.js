import { PrismaClient } from '@prisma/client';
import { checkAndAwardBadges, getUserBadges, getAllBadgesWithUserStatus } from '../services/badgeService.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

// Get user's earned badges
export const getUserBadgesController = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id;
    const badges = await getUserBadges(userId);

    res.json({ 
      success: true, 
      data: JSON.parse(JSON.stringify(badges, bigintReplacer)) 
    });
  } catch (error) {
    next(error);
  }
};

// Get all badges with user's award status
export const getAllBadgesController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const badges = await getAllBadgesWithUserStatus(userId);

    res.json({ 
      success: true, 
      data: JSON.parse(JSON.stringify(badges, bigintReplacer)) 
    });
  } catch (error) {
    next(error);
  }
};

// Manually trigger badge check (for testing or manual awarding)
export const checkBadgesController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { triggerType, context } = req.body;

    const awardedBadges = await checkAndAwardBadges(userId, triggerType, context);

    res.json({ 
      success: true, 
      data: { 
        awardedBadges: JSON.parse(JSON.stringify(awardedBadges, bigintReplacer)),
        count: awardedBadges.length
      } 
    });
  } catch (error) {
    next(error);
  }
};

// Get badge statistics
export const getBadgeStatsController = async (req, res, next) => {
  try {
    const totalBadges = await prisma.badge.count();
    
    const userBadges = await prisma.userBadge.groupBy({
      by: ['badgeId'],
      _count: true
    });

    const mostEarnedBadges = await prisma.userBadge.groupBy({
      by: ['badgeId'],
      _count: true,
      orderBy: { _count: 'desc' },
      take: 5
    });

    // Get badge details for most earned
    const badgeDetails = await prisma.badge.findMany({
      where: {
        id: {
          in: mostEarnedBadges.map(b => b.badgeId)
        }
      }
    });

    const mostEarnedWithDetails = mostEarnedBadges.map(most => {
      const badge = badgeDetails.find(b => b.id === most.badgeId);
      return {
        badge,
        count: most._count
      };
    });

    res.json({
      success: true,
      data: {
        totalBadges,
        totalAwarded: userBadges.reduce((sum, ub) => sum + ub._count, 0),
        uniqueBadgesEarned: userBadges.length,
        mostEarnedBadges: JSON.parse(JSON.stringify(mostEarnedWithDetails, bigintReplacer))
      }
    });
  } catch (error) {
    next(error);
  }
};
