import { PrismaClient } from '@prisma/client';
import { extractZip, readExtractedFiles, cleanupTempFiles } from '../services/zipService.js';
import { analyzeProject, compareSubmissions } from '../services/aiService.js';
import notificationService from '../services/notificationService.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const createChallenge = async (req, res, next) => {
  try {
    const { title, prompt, language, duration, difficulty, type, classId } = req.body;
    const creatorId = req.user.id;

    const challengeType = type === 'OFFICIAL' ? 'OFFICIAL' : 'COMMUNITY';
    if (challengeType === 'OFFICIAL' && req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only teachers can create official challenges' });
    }

    const data = { title, prompt, language, duration, difficulty, creatorId, type: challengeType };
    if (challengeType === 'OFFICIAL' && classId) {
      data.classId = BigInt(classId);
    }

    const challenge = await prisma.challenge.create({ data });

    res.status(201).json({ success: true, data: JSON.parse(JSON.stringify(challenge, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const getChallenges = async (req, res, next) => {
  try {
    const challenges = await prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: JSON.parse(JSON.stringify(challenges, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const initiateBattle = async (req, res, next) => {
  try {
    const { challengeId, opponentId } = req.body;
    const playerAId = req.user.id;

    if (playerAId.toString() === opponentId.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot battle yourself' });
    }

    const battle = await prisma.battle.create({
      data: {
        challengeId: BigInt(challengeId),
        playerAId,
        playerBId: BigInt(opponentId),
        status: 'PENDING'
      },
      include: {
        challenge: true,
        playerA: { select: { id: true, name: true } }
      }
    });

    notificationService.notifyBattleInvite(opponentId, {
      battleId: battle.id.toString(),
      challengerName: battle.playerA.name,
      challengeTitle: battle.challenge.title,
    });

    res.status(201).json({ success: true, data: JSON.parse(JSON.stringify(battle, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const getBattles = async (req, res, next) => {
  try {
    const battles = await prisma.battle.findMany({
      include: {
        challenge: true,
        playerA: { select: { id: true, name: true, avatarUrl: true } },
        playerB: { select: { id: true, name: true, avatarUrl: true } },
        winner: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: JSON.parse(JSON.stringify(battles, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const getBattleDetails = async (req, res, next) => {
  try {
    const battleId = BigInt(req.params.id);
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        challenge: true,
        playerA: { select: { id: true, name: true, avatarUrl: true } },
        playerB: { select: { id: true, name: true, avatarUrl: true } },
        submissions: { include: { project: true } }
      }
    });

    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    res.json({ success: true, data: JSON.parse(JSON.stringify(battle, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const acceptBattle = async (req, res, next) => {
  try {
    const battleId = BigInt(req.params.id);
    const userId = req.user.id;

    const battle = await prisma.battle.findUnique({ where: { id: battleId } });
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });

    if (battle.playerBId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the challenged player can accept' });
    }
    if (battle.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Battle is not pending' });
    }

    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: { status: 'ACTIVE', startsAt: new Date() }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(updatedBattle, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const compareBattle = async (req, res, next) => {
  try {
    const battleId = BigInt(req.params.id);
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        challenge: true,
        submissions: { 
          include: { 
            project: true, 
            user: { select: { id: true, name: true } } 
          } 
        },
      }
    });

    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.submissions.length < 2) {
      return res.status(400).json({ success: false, error: 'Both submissions are required to compare' });
    }

    // Update battle status to JUDGING
    await prisma.battle.update({
      where: { id: battleId },
      data: { status: 'JUDGING' }
    });

    const [first, second] = battle.submissions;
    const comparison = await compareSubmissions(first.project, second.project, battle.challenge.prompt);

    let winnerId = null;
    let battleStatus = 'COMPLETE';

    // Determine winner based on AI comparison
    if (comparison.success) {
      if (comparison.winner === 'A') {
        winnerId = first.userId;
      } else if (comparison.winner === 'B') {
        winnerId = second.userId;
      }
      // If 'Tie', winnerId remains null
    } else {
      // Fallback to AI scores if comparison fails
      const firstScore = first.aiScore || 0;
      const secondScore = second.aiScore || 0;
      
      if (firstScore > secondScore) {
        winnerId = first.userId;
      } else if (secondScore > firstScore) {
        winnerId = second.userId;
      }
    }

    // Update battle with results
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        status: battleStatus,
        winnerId: winnerId,
        endsAt: new Date()
      },
      include: {
        challenge: true,
        playerA: { select: { id: true, name: true, avatarUrl: true } },
        playerB: { select: { id: true, name: true, avatarUrl: true } },
        winner: { select: { id: true, name: true } },
        submissions: { 
          include: { 
            project: true,
            user: { select: { id: true, name: true } }
          } 
        }
      }
    });

    // Update arena rankings for both players
    await updateArenaRankings(first.userId, second.userId, winnerId, battle.challenge.type);

    res.json({ 
      success: true, 
      data: { 
        battle: JSON.parse(JSON.stringify(updatedBattle, bigintReplacer)),
        comparison 
      } 
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update arena rankings
const updateArenaRankings = async (playerAId, playerBId, winnerId, challengeType) => {
  const season = new Date().toISOString().slice(0, 7).replace('-', '-Q'); // e.g., "2026-Q1"
  
  // Update or create ranking for player A
  await updatePlayerRanking(playerAId, winnerId === playerAId, season, challengeType);
  
  // Update or create ranking for player B
  await updatePlayerRanking(playerBId, winnerId === playerBId, season, challengeType);
};

const updatePlayerRanking = async (userId, isWinner, season, challengeType = 'COMMUNITY') => {
  const existingRanking = await prisma.arenaRanking.findUnique({
    where: { 
      userId_type: {
        userId: BigInt(userId),
        type: challengeType
      }
    }
  });

  if (existingRanking) {
    const updateData = {
      wins: isWinner ? { increment: 1 } : existingRanking.wins,
      losses: !isWinner ? { increment: 1 } : existingRanking.losses,
      winStreak: isWinner ? { increment: 1 } : 0,
      reputation: isWinner ? { increment: 10 } : { increment: -5 }
    };

    // Update tier based on wins
    if (isWinner && existingRanking.wins + 1 >= 50) {
      updateData.tier = 'MASTER';
    } else if (isWinner && existingRanking.wins + 1 >= 25) {
      updateData.tier = 'DIAMOND';
    } else if (isWinner && existingRanking.wins + 1 >= 10) {
      updateData.tier = 'GOLD';
    } else if (isWinner && existingRanking.wins + 1 >= 5) {
      updateData.tier = 'SILVER';
    }

    await prisma.arenaRanking.update({
      where: { id: existingRanking.id },
      data: updateData
    });
  } else {
    // Create new ranking
    await prisma.arenaRanking.create({
      data: {
        userId: BigInt(userId),
        type: challengeType,
        tier: isWinner ? 'BRONZE' : 'BRONZE',
        wins: isWinner ? 1 : 0,
        losses: isWinner ? 0 : 1,
        winStreak: isWinner ? 1 : 0,
        reputation: isWinner ? 10 : -5,
        season
      }
    });
  }
};

// Helper function to run the battle comparison asynchronously in the background
const runBattleComparison = async (battleId) => {
  try {
    const battle = await prisma.battle.findUnique({
      where: { id: BigInt(battleId) },
      include: {
        challenge: true,
        submissions: { 
          include: { 
            project: true, 
            user: { select: { id: true, name: true } } 
          } 
        },
      }
    });

    if (!battle || battle.submissions.length < 2) return;

    const [first, second] = battle.submissions;
    const comparison = await compareSubmissions(first.project, second.project, battle.challenge.prompt);

    let winnerId = null;
    let battleStatus = 'COMPLETE';

    if (comparison.success) {
      if (comparison.winner === 'A') winnerId = first.userId;
      else if (comparison.winner === 'B') winnerId = second.userId;
    } else {
      const firstScore = first.aiScore || 0;
      const secondScore = second.aiScore || 0;
      if (firstScore > secondScore) winnerId = first.userId;
      else if (secondScore > firstScore) winnerId = second.userId;
    }

    const updatedBattle = await prisma.battle.update({
      where: { id: BigInt(battleId) },
      data: {
        status: battleStatus,
        winnerId: winnerId,
        endsAt: new Date()
      },
      include: {
        challenge: true,
        playerA: { select: { id: true, name: true, avatarUrl: true } },
        playerB: { select: { id: true, name: true, avatarUrl: true } },
        winner: { select: { id: true, name: true } },
      }
    });

    await updateArenaRankings(first.userId, second.userId, winnerId, battle.challenge.type);
    
    // Notify users that battle is complete
    notificationService.notifyBattleUpdated(updatedBattle);
  } catch (error) {
    console.error('Error running battle comparison:', error);
  }
};

export const submitBattleProject = async (req, res, next) => {
  let zipPath = null;
  let extractedDir = null;

  try {
    const battleId = BigInt(req.params.id);
    const userId = req.user.id;
    const { title, description, language } = req.body;

    if (!req.file) return res.status(400).json({ success: false, error: 'ZIP file required' });
    zipPath = req.file.path;

    const battle = await prisma.battle.findUnique({ where: { id: battleId } });
    if (!battle) throw new Error('Battle not found');

    if (battle.playerAId !== userId && battle.playerBId !== userId) {
      throw new Error('You are not a participant in this battle');
    }

    extractedDir = await extractZip(zipPath, `battle-${Date.now()}`);
    const files = await readExtractedFiles(extractedDir);
    if (files.length === 0) throw new Error("No code files found.");

    const aiResult = await analyzeProject(files, `Battle Submission: ${title}`, description || '');

    // Create the project first
    const project = await prisma.project.create({
      data: {
        userId, title, description, language, zipPath,
        aiFeedback: aiResult.feedback,
        aiScore: aiResult.scores?.overall || 0,
        aiAnalysisJson: aiResult,
      }
    });

    // Create battle submission
    const battleSubmission = await prisma.battleSubmission.create({
      data: {
        battleId, userId, projectId: project.id, aiScore: project.aiScore
      }
    });

    // If both players submitted, update battle status to JUDGING
    const submissionsCount = await prisma.battleSubmission.count({ where: { battleId } });
    if (submissionsCount >= 2) {
      const updatedBattle = await prisma.battle.update({ 
        where: { id: battleId }, 
        data: { status: 'JUDGING' },
        include: { playerA: { select: { id: true, name: true } }, playerB: { select: { id: true, name: true } } }
      });
      notificationService.notifyBattleUpdated(updatedBattle);
      
      // Trigger background comparison
      setTimeout(() => {
        runBattleComparison(battleId).catch(err => console.error('Background comparison failed:', err));
      }, 0);
    }

    await cleanupTempFiles(null, extractedDir);

    res.status(201).json({ success: true, data: JSON.parse(JSON.stringify(battleSubmission, bigintReplacer)) });
  } catch (error) {
    await cleanupTempFiles(zipPath, extractedDir);
    next(error);
  }
};
