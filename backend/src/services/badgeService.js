import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Badge definitions with criteria
const BADGE_DEFINITIONS = [
  {
    name: 'First Submission',
    description: 'Submitted your first project to the community',
    icon: '🚀',
    criteria: { type: 'first_project' }
  },
  {
    name: 'Clean Coder',
    description: 'Achieved an AI score of 90+ on a project',
    icon: '✨',
    criteria: { type: 'high_ai_score', threshold: 90 }
  },
  {
    name: 'Arena King',
    description: 'Won 10 Arena battles',
    icon: '👑',
    criteria: { type: 'arena_wins', threshold: 10 }
  },
  {
    name: 'Battle Veteran',
    description: 'Participated in 25 Arena battles',
    icon: '⚔️',
    criteria: { type: 'arena_battles', threshold: 25 }
  },
  {
    name: 'Top Rated',
    description: 'Received an average rating of 4.5+ with at least 5 ratings',
    icon: '⭐',
    criteria: { type: 'high_rating', threshold: 4.5, minRatings: 5 }
  },
  {
    name: 'Community Leader',
    description: 'Helpful comments marked as helpful 10 times',
    icon: '💬',
    criteria: { type: 'helpful_comments', threshold: 10 }
  },
  {
    name: 'Perfect Score',
    description: 'Achieved a perfect AI score of 100',
    icon: '💯',
    criteria: { type: 'perfect_score', threshold: 100 }
  },
  {
    name: 'Rising Star',
    description: 'Submitted 5 high-quality projects (80+ AI score)',
    icon: '🌟',
    criteria: { type: 'quality_projects', threshold: 5, minScore: 80 }
  },
  {
    name: 'Class Champion',
    description: 'Ranked #1 in a classroom leaderboard',
    icon: '🏆',
    criteria: { type: 'class_rank', threshold: 1 }
  },
  {
    name: 'Master Tier',
    description: 'Reached Master tier in Arena',
    icon: '🎖️',
    criteria: { type: 'arena_tier', tier: 'MASTER' }
  },
  {
    name: 'Consistent Coder',
    description: 'Submitted projects for 7 consecutive days',
    icon: '📅',
    criteria: { type: 'consecutive_days', threshold: 7 }
  },
  {
    name: 'Polyglot',
    description: 'Submitted projects in 5 different programming languages',
    icon: '🌍',
    criteria: { type: 'language_diversity', threshold: 5 }
  }
];

// Initialize badges in database
export const initializeBadges = async () => {
  try {
    for (const badgeDef of BADGE_DEFINITIONS) {
      await prisma.badge.upsert({
        where: { name: badgeDef.name },
        update: { description: badgeDef.description, icon: badgeDef.icon, criteria: badgeDef.criteria },
        create: {
          name: badgeDef.name,
          description: badgeDef.description,
          icon: badgeDef.icon,
          criteria: badgeDef.criteria
        }
      });
    }
    console.log('Badges initialized successfully');
  } catch (error) {
    console.error('Error initializing badges:', error);
  }
};

// Check and award badges for a user
export const checkAndAwardBadges = async (userId, triggerType, context = {}) => {
  try {
    const user = BigInt(userId);
    const awardedBadges = [];

    // Get all badges
    const badges = await prisma.badge.findMany();
    
    // Get user's existing badges
    const existingBadges = await prisma.userBadge.findMany({
      where: { userId: user },
      select: { badgeId: true }
    });
    const existingBadgeIds = new Set(existingBadges.map(ub => ub.badgeId.toString()));

    for (const badge of badges) {
      if (existingBadgeIds.has(badge.id.toString())) {
        continue; // Skip already awarded badges
      }

      const criteria = badge.criteria;
      let earned = false;

      switch (criteria.type) {
        case 'first_project':
          earned = await checkFirstProject(user, triggerType);
          break;
        case 'high_ai_score':
          earned = await checkHighAiScore(user, criteria.threshold, context, triggerType);
          break;
        case 'arena_wins':
          earned = await checkArenaWins(user, criteria.threshold);
          break;
        case 'arena_battles':
          earned = await checkArenaBattles(user, criteria.threshold);
          break;
        case 'high_rating':
          earned = await checkHighRating(user, criteria.threshold, criteria.minRatings);
          break;
        case 'helpful_comments':
          earned = await checkHelpfulComments(user, criteria.threshold);
          break;
        case 'perfect_score':
          earned = await checkPerfectScore(user, context, triggerType);
          break;
        case 'quality_projects':
          earned = await checkQualityProjects(user, criteria.threshold, criteria.minScore);
          break;
        case 'class_rank':
          earned = await checkClassRank(user, criteria.threshold);
          break;
        case 'arena_tier':
          earned = await checkArenaTier(user, criteria.tier);
          break;
        case 'consecutive_days':
          earned = await checkConsecutiveDays(user, criteria.threshold);
          break;
        case 'language_diversity':
          earned = await checkLanguageDiversity(user, criteria.threshold);
          break;
      }

      if (earned) {
        await prisma.userBadge.create({
          data: {
            userId: user,
            badgeId: badge.id
          }
        });
        awardedBadges.push(badge);
      }
    }

    return awardedBadges;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
};

// Badge checking functions
const checkFirstProject = async (userId, triggerType) => {
  if (triggerType !== 'project_submission') return false;
  
  const projectCount = await prisma.project.count({
    where: { userId }
  });
  
  return projectCount === 1;
};

const checkHighAiScore = async (userId, threshold, context, triggerType) => {
  if (triggerType !== 'project_submission' && !context.projectId) return false;
  
  const projectId = context.projectId;
  const project = await prisma.project.findFirst({
    where: { 
      userId, 
      id: projectId,
      aiScore: { gte: threshold }
    }
  });
  
  return !!project;
};

const checkArenaWins = async (userId, threshold) => {
  const winCount = await prisma.battle.count({
    where: { winnerId: userId }
  });
  
  return winCount >= threshold;
};

const checkArenaBattles = async (userId, threshold) => {
  const battleCount = await prisma.battleSubmission.count({
    where: { userId }
  });
  
  return battleCount >= threshold;
};

const checkHighRating = async (userId, threshold, minRatings) => {
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      ratings: { select: { score: true } }
    }
  });

  return projects.some(project => {
    const count = project.ratings.length;
    if (count < minRatings) return false;
    
    const avg = project.ratings.reduce((sum, rating) => sum + rating.score, 0) / count;
    return avg >= threshold;
  });
};

const checkHelpfulComments = async (userId, threshold) => {
  const helpfulCount = await prisma.comment.aggregate({
    where: { userId, helpfulCount: { gt: 0 } },
    _sum: { helpfulCount: true }
  });
  
  return (helpfulCount._sum.helpfulCount || 0) >= threshold;
};

const checkPerfectScore = async (userId, context, triggerType) => {
  if (triggerType !== 'project_submission' && !context.projectId) return false;
  
  const projectId = context.projectId;
  const project = await prisma.project.findFirst({
    where: { 
      userId, 
      id: projectId,
      aiScore: 100
    }
  });
  
  return !!project;
};

const checkQualityProjects = async (userId, threshold, minScore) => {
  const qualityCount = await prisma.project.count({
    where: { 
      userId, 
      aiScore: { gte: minScore }
    }
  });
  
  return qualityCount >= threshold;
};

const checkClassRank = async (userId, threshold) => {
  // This would need to be implemented based on classroom leaderboard logic
  // For now, return false as it requires complex classroom ranking calculation
  return false;
};

const checkArenaTier = async (userId, targetTier) => {
  const ranking = await prisma.arenaRanking.findUnique({
    where: { userId }
  });
  
  return ranking?.tier === targetTier;
};

const checkConsecutiveDays = async (userId, threshold) => {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  if (projects.length < threshold) return false;

  let consecutiveDays = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const project of projects) {
    const projectDate = new Date(project.createdAt);
    projectDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((currentDate - projectDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === consecutiveDays) {
      consecutiveDays++;
      currentDate = new Date(projectDate);
    } else if (diffDays > consecutiveDays) {
      break;
    }
  }

  return consecutiveDays >= threshold;
};

const checkLanguageDiversity = async (userId, threshold) => {
  const languages = await prisma.project.findMany({
    where: { userId, language: { not: null } },
    select: { language: true },
    distinct: ['language']
  });

  return languages.length >= threshold;
};

// Get user's badges
export const getUserBadges = async (userId) => {
  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: BigInt(userId) },
      include: {
        badge: true
      },
      orderBy: { awardedAt: 'desc' }
    });

    return userBadges.map(ub => ({
      ...ub.badge,
      awardedAt: ub.awardedAt
    }));
  } catch (error) {
    console.error('Error getting user badges:', error);
    return [];
  }
};

// Get all available badges with user's status
export const getAllBadgesWithUserStatus = async (userId) => {
  try {
    const [badges, userBadges] = await Promise.all([
      prisma.badge.findMany(),
      prisma.userBadge.findMany({
        where: { userId: BigInt(userId) },
        select: { badgeId: true, awardedAt: true }
      })
    ]);

    const awardedBadgeIds = new Set(userBadges.map(ub => ub.badgeId.toString()));
    const awardedAtMap = new Map(userBadges.map(ub => [ub.badgeId.toString(), ub.awardedAt]));

    return badges.map(badge => ({
      ...badge,
      awarded: awardedBadgeIds.has(badge.id.toString()),
      awardedAt: awardedAtMap.get(badge.id.toString()) || null
    }));
  } catch (error) {
    console.error('Error getting badges with status:', error);
    return [];
  }
};

export default {
  initializeBadges,
  checkAndAwardBadges,
  getUserBadges,
  getAllBadgesWithUserStatus
};
