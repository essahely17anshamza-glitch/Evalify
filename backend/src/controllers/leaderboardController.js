import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

// Global project leaderboard
export const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all', language, minRatings = '0', sortBy = 'rating' } = req.query;
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
      },
      orderBy: sortBy === 'views' ? { viewsCount: 'desc' } : undefined
    });

    const leaderboard = projects
      .map((project) => {
        const count = project.ratings.length;
        const avg = count > 0 ? project.ratings.reduce((sum, item) => sum + item.score, 0) / count : 0;
        return {
          ...project,
          averageRating: Math.round(avg * 10) / 10,
          ratingCount: count,
          rank: 0 // Will be set after sorting
        };
      })
      .filter((project) => project.ratingCount >= minRatingsNumber)
      .sort((a, b) => {
        if (sortBy === 'views') {
          return b.viewsCount - a.viewsCount;
        } else if (sortBy === 'aiScore') {
          return (b.aiScore || 0) - (a.aiScore || 0);
        } else {
          // Default: sort by rating
          return b.averageRating - a.averageRating || (b.ratingCount - a.ratingCount);
        }
      })
      .slice(0, 50)
      .map((project, index) => ({ ...project, rank: index + 1 }));

    res.json({ success: true, data: JSON.parse(JSON.stringify(leaderboard, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// Arena leaderboard
export const getArenaLeaderboard = async (req, res, next) => {
  try {
    const { season = 'current', tier = 'all' } = req.query;
    
    let whereClause = {};
    if (season !== 'current') {
      whereClause.season = season;
    }
    if (tier !== 'all') {
      whereClause.tier = tier;
    }

    const rankings = await prisma.arenaRanking.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: [
        { wins: 'desc' },
        { reputation: 'desc' },
        { winStreak: 'desc' }
      ]
    });

    const leaderboard = rankings
      .map((ranking, index) => ({
        ...ranking,
        rank: index + 1,
        winRate: ranking.wins + ranking.losses > 0 
          ? Math.round((ranking.wins / (ranking.wins + ranking.losses)) * 100) 
          : 0
      }))
      .slice(0, 100);

    res.json({ success: true, data: JSON.parse(JSON.stringify(leaderboard, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// Classroom leaderboard
export const getClassroomLeaderboard = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { period = 'all' } = req.query;

    // Verify user is enrolled in the class
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId: BigInt(classId),
        studentId: req.user.id
      }
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, error: 'Not enrolled in this classroom' });
    }

    let whereClause = {
      assignment: {
        classId: BigInt(classId)
      }
    };

    if (period === 'week') {
      whereClause.submittedAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === 'month') {
      whereClause.submittedAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true }
        },
        assignment: {
          select: { id: true, title: true, maxScore: true }
        }
      }
    });

    // Group by student and calculate metrics
    const studentStats = {};
    submissions.forEach(submission => {
      const studentId = submission.studentId.toString();
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          student: submission.student,
          totalSubmissions: 0,
          totalAiScore: 0,
          totalTeacherScore: 0,
          gradedSubmissions: 0,
          averageAiScore: 0,
          averageTeacherScore: 0,
          rank: 0
        };
      }

      const stats = studentStats[studentId];
      stats.totalSubmissions++;
      
      if (submission.aiScore) {
        stats.totalAiScore += submission.aiScore;
      }
      
      if (submission.teacherScore) {
        stats.totalTeacherScore += parseFloat(submission.teacherScore);
        stats.gradedSubmissions++;
      }
    });

    // Calculate averages and sort
    const leaderboard = Object.values(studentStats)
      .map(stats => ({
        ...stats,
        averageAiScore: stats.totalAiScore > 0 ? Math.round((stats.totalAiScore / stats.totalSubmissions) * 10) / 10 : 0,
        averageTeacherScore: stats.gradedSubmissions > 0 ? Math.round((stats.totalTeacherScore / stats.gradedSubmissions) * 100) / 100 : 0
      }))
      .sort((a, b) => {
        // Prioritize teacher scores, then AI scores
        if (a.gradedSubmissions > 0 && b.gradedSubmissions > 0) {
          return b.averageTeacherScore - a.averageTeacherScore;
        } else if (a.gradedSubmissions > 0) {
          return -1;
        } else if (b.gradedSubmissions > 0) {
          return 1;
        } else {
          return b.averageAiScore - a.averageAiScore;
        }
      })
      .slice(0, 50)
      .map((student, index) => ({ ...student, rank: index + 1 }));

    res.json({ success: true, data: JSON.parse(JSON.stringify(leaderboard, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// User's ranking across all leaderboards
export const getUserRankings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's project ranking
    const userProjects = await prisma.project.findMany({
      where: { userId },
      include: { ratings: { select: { score: true } } }
    });

    const userBestProject = userProjects
      .map(project => {
        const count = project.ratings.length;
        const avg = count > 0 ? project.ratings.reduce((sum, item) => sum + item.score, 0) / count : 0;
        return { ...project, averageRating: avg, ratingCount: count };
      })
      .filter(project => project.ratingCount > 0)
      .sort((a, b) => b.averageRating - a.averageRating)[0];

    // Get user's arena ranking
    const arenaRanking = await prisma.arenaRanking.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    // Get user's classroom rankings
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: userId },
      include: {
        class: { select: { id: true, name: true } }
      }
    });

    const classroomRankings = [];
    for (const enrollment of enrollments) {
      const submissions = await prisma.submission.findMany({
        where: {
          studentId: userId,
          assignment: { classId: enrollment.classId }
        }
      });

      if (submissions.length > 0) {
        const avgScore = submissions.reduce((sum, sub) => sum + (sub.aiScore || 0), 0) / submissions.length;
        classroomRankings.push({
          class: enrollment.class,
          submissionsCount: submissions.length,
          averageScore: Math.round(avgScore * 10) / 10
        });
      }
    }

    res.json({
      success: true,
      data: {
        projectRanking: userBestProject ? JSON.parse(JSON.stringify(userBestProject, bigintReplacer)) : null,
        arenaRanking: arenaRanking ? JSON.parse(JSON.stringify(arenaRanking, bigintReplacer)) : null,
        classroomRankings: JSON.parse(JSON.stringify(classroomRankings, bigintReplacer))
      }
    });
  } catch (error) {
    next(error);
  }
};
