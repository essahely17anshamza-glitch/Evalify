import { PrismaClient } from '@prisma/client';
import { extractZip, readExtractedFiles, cleanupTempFiles } from '../services/zipService.js';
import { analyzeProject, compareSubmissions } from '../services/geminiService.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const createChallenge = async (req, res, next) => {
  try {
    const { title, prompt, language, duration, difficulty } = req.body;
    const creatorId = req.user.id;

    const challenge = await prisma.challenge.create({
      data: { title, prompt, language, duration, difficulty, creatorId }
    });

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
      }
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

export const compareBattle = async (req, res, next) => {
  try {
    const battleId = BigInt(req.params.id);
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        challenge: true,
        submissions: { include: { project: true, user: true } },
      }
    });

    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (battle.submissions.length < 2) {
      return res.status(400).json({ success: false, error: 'Both submissions are required to compare' });
    }

    const [first, second] = battle.submissions;
    const comparison = await compareSubmissions(first.project, second.project, battle.challenge.prompt);

    res.json({ success: true, data: { battleId: battle.id, comparison } });
  } catch (error) {
    next(error);
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
      await prisma.battle.update({ where: { id: battleId }, data: { status: 'JUDGING' } });
    } else if (battle.status === 'PENDING') {
      await prisma.battle.update({ where: { id: battleId }, data: { status: 'ACTIVE' } });
    }

    await cleanupTempFiles(null, extractedDir);

    res.status(201).json({ success: true, data: JSON.parse(JSON.stringify(battleSubmission, bigintReplacer)) });
  } catch (error) {
    await cleanupTempFiles(zipPath, extractedDir);
    next(error);
  }
};
