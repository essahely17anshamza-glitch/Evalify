import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { extractZip, readExtractedFiles, cleanupTempFiles } from '../services/zipService.js';
import { analyzeProject } from '../services/aiService.js';
import { getRepoMeta, fetchRepoZip } from '../services/githubService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

// ─── SUBMIT PROJECT (upload only — no AI) ────────────────────────────────────
export const submitProject = async (req, res, next) => {
  let filePath = null;
  let extractedDir = null;

  try {
    const { title, description, language, tags, githubUrl, liveUrl, projectType, submissionType, isGithubLink } = req.body;
    const userId = req.user.id;
    let finalTitle = title;
    let finalDesc = description;
    let finalLang = language;
    let repoStars = 0;
    let detectedType = submissionType || 'zip';

    if (isGithubLink === 'true' && githubUrl) {
      console.log(`[SubmitProject] Fetching GitHub repo: ${githubUrl}`);
      const meta = await getRepoMeta(githubUrl);
      finalTitle = finalTitle || meta.repo;
      finalDesc = finalDesc || meta.description || 'No description provided';
      finalLang = finalLang || meta.language || 'Code';
      repoStars = meta.stars;
      filePath = await fetchRepoZip(githubUrl, meta.defaultBranch);
      detectedType = submissionType || 'zip';
    } else if (req.file) {
      filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isZip = ext === '.zip';
      if (!submissionType) {
        const { detectFileType } = await import('../middleware/upload.js');
        detectedType = await detectFileType(filePath, isZip);
      }
    } else {
      return res.status(400).json({ success: false, error: 'A file or GitHub URL is required' });
    }

    let tagsJson = null;
    if (tags) {
      try { tagsJson = JSON.parse(tags); } catch(e) { tagsJson = [tags]; }
    }

    console.log(`[SubmitProject] Saving project to DB (type: ${detectedType}) — AI deferred...`);

    const project = await prisma.project.create({
      data: {
        userId,
        title: finalTitle || 'Untitled Project',
        description: finalDesc || '',
        zipPath: filePath,
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        language: finalLang || 'Code',
        tags: tagsJson,
        projectType: projectType || detectedType,
        repoStars,
        // AI fields intentionally left null — triggered on-demand
        aiFeedback: null,
        aiScore: null,
        aiAnalysisJson: null,
      }
    });

    // If Web Project, extract permanently to previews folder for live preview
    if (projectType === 'web' || detectedType === 'html_css') {
      const ext = filePath ? path.extname(filePath).toLowerCase() : '.zip';
      if (ext === '.zip') {
        const previewTargetDir = `previews/${project.id.toString()}`;
        await extractZip(filePath, previewTargetDir);
        const previewPath = path.resolve(__dirname, '../../uploads', previewTargetDir);
        try {
          const items = await fs.promises.readdir(previewPath);
          if (items.length === 1) {
            const singleItemPath = path.join(previewPath, items[0]);
            const stat = await fs.promises.stat(singleItemPath);
            if (stat.isDirectory()) {
              await fs.promises.cp(singleItemPath, previewPath, { recursive: true });
              await fs.promises.rm(singleItemPath, { recursive: true, force: true });
            }
          }
        } catch (err) {
          console.error('Failed to flatten preview directory structure:', err);
        }
      }
    }

    const projectResponse = JSON.parse(JSON.stringify(project, bigintReplacer));
    res.status(201).json({ success: true, data: projectResponse });

  } catch (error) {
    console.error('Submit project error:', error);
    await cleanupTempFiles(null, extractedDir);
    next(error);
  }
};

// ─── ON-DEMAND AI ANALYSIS ────────────────────────────────────────────────────
export const analyzeProjectById = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const requesterId = BigInt(req.user.id);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const isOwner = project.userId === requesterId;
    const isPrivileged = req.user.role === 'TEACHER' || req.user.role === 'ADMIN';
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ success: false, error: 'Not authorized to analyze this project' });
    }

    if (!project.zipPath) {
      return res.status(400).json({ success: false, error: 'No source file found. Please re-upload.' });
    }

    let files = [];
    const ext = path.extname(project.zipPath).toLowerCase();

    if (ext === '.zip') {
      const tmpDir = `analyze-tmp-${Date.now()}`;
      const extractedDir = await extractZip(project.zipPath, tmpDir);
      files = await readExtractedFiles(extractedDir);
      await cleanupTempFiles(null, extractedDir);
    } else {
      // Single-file: .html, .py, .sql
      const content = await fs.promises.readFile(project.zipPath, 'utf8');
      files = [{ path: path.basename(project.zipPath), content }];
    }

    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No readable code files found in the project.' });
    }

    const submissionType = project.projectType || 'zip';
    console.log(`[AnalyzeProject] Running AI on project ${projectId} (type: ${submissionType})...`);
    const aiResult = await analyzeProject(files, project.title, project.description, submissionType);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        aiFeedback: aiResult.feedback,
        aiScore: aiResult.scores?.overall || 0,
        aiAnalysisJson: aiResult,
      }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(updated, bigintReplacer)) });
  } catch (error) {
    console.error('analyzeProjectById error:', error);
    next(error);
  }
};

// ─── UPDATE PROJECT ───────────────────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Project not found' });
    if (String(existing.userId) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this project' });
    }

    const { title, description, language, githubUrl, liveUrl, tags } = req.body;
    let tagsJson = undefined;
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        try { tagsJson = JSON.parse(tags); } catch (e) { tagsJson = [tags]; }
      } else if (Array.isArray(tags)) {
        tagsJson = tags;
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        language: language ?? existing.language,
        githubUrl: githubUrl ?? existing.githubUrl,
        liveUrl: liveUrl ?? existing.liveUrl,
        tags: tagsJson !== undefined ? tagsJson : existing.tags,
      }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(updated, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE PROJECT ───────────────────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Project not found' });
    if (String(existing.userId) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this project' });
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── DOWNLOAD PROJECT ─────────────────────────────────────────────────────────
export const downloadProject = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.zipPath) {
      return res.status(404).json({ success: false, error: 'Source code not found for this project' });
    }
    if (!fs.existsSync(project.zipPath)) {
      return res.status(404).json({ success: false, error: 'Source code file is no longer available on the server' });
    }
    res.download(project.zipPath, `${project.title.replace(/\s+/g, '_')}_source${path.extname(project.zipPath)}`);
  } catch (error) {
    next(error);
  }
};

// ─── UPLOAD SCREENSHOT ────────────────────────────────────────────────────────
export const uploadScreenshot = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    if (!req.file) return res.status(400).json({ success: false, error: 'Screenshot file is required' });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (String(project.userId) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { screenshotPath: req.file.filename }
    });
    res.json({ success: true, data: JSON.parse(JSON.stringify(updated, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// ─── GET PROJECT SOURCE ───────────────────────────────────────────────────────
export const getProjectSource = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.zipPath) {
      return res.status(404).json({ success: false, error: 'Source code not found for this project' });
    }
    if (!fs.existsSync(project.zipPath)) {
      return res.status(404).json({ success: false, error: 'Source code file is no longer available on the server' });
    }
    const ext = path.extname(project.zipPath).toLowerCase();
    if (ext !== '.zip') {
      const content = fs.readFileSync(project.zipPath, 'utf8');
      return res.json({ success: true, files: [{ path: path.basename(project.zipPath), content }] });
    }
    const targetDirName = `temp-source-${Date.now()}`;
    const extractedDir = await extractZip(project.zipPath, targetDirName);
    const files = await readExtractedFiles(extractedDir);
    await cleanupTempFiles(null, extractedDir);
    res.json({ success: true, files });
  } catch (error) {
    next(error);
  }
};

// ─── GET PROJECTS LIST ────────────────────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
      language, minScore, maxScore, minRatings, search, userId, tags
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};

    if (language && language !== 'all') where.language = language;
    if (minScore) where.aiScore = { gte: parseInt(minScore) };
    if (maxScore) where.aiScore = { ...where.aiScore, lte: parseInt(maxScore) };
    if (userId) where.userId = BigInt(userId);
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { path: [], string_contains: tagArray.join(',') };
    }

    const orderBy = {};
    if (sortBy === 'score') orderBy.aiScore = sortOrder;
    else if (sortBy === 'views') orderBy.viewsCount = sortOrder;
    else if (sortBy === 'ratings') orderBy.ratings = { _count: sortOrder };
    else orderBy.createdAt = sortOrder;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          ratings: { select: { score: true } },
          _count: { select: { comments: true, ratings: true } }
        },
        orderBy, skip, take
      }),
      prisma.project.count({ where })
    ]);

    const projectsWithRatings = projects.map(project => {
      const ratings = project.ratings || [];
      const averageRating = ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
        : 0;
      if (minRatings && ratings.length < parseInt(minRatings)) return null;
      return { ...project, averageRating, ratingCount: ratings.length };
    }).filter(Boolean);

    if (sortBy === 'rating') {
      projectsWithRatings.sort((a, b) => {
        const cmp = sortOrder === 'desc' ? b.averageRating - a.averageRating : a.averageRating - b.averageRating;
        return cmp !== 0 ? cmp : b.ratingCount - a.ratingCount;
      });
    }

    res.json({
      success: true,
      data: {
        projects: JSON.parse(JSON.stringify(projectsWithRatings, bigintReplacer)),
        pagination: {
          page: parseInt(page), limit: parseInt(limit), total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: skip + take < total, hasPrev: page > 1
        },
        filters: { language, minScore, maxScore, minRatings, search, sortBy, sortOrder }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE PROJECT ───────────────────────────────────────────────────────
export const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, bio: true, role: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' }
        },
        ratings: true,
        _count: { select: { comments: true, ratings: true } }
      }
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, data: JSON.parse(JSON.stringify(project, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

// ─── GET USER PROFILE ─────────────────────────────────────────────────────────
export const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true, name: true, email: true, role: true, bio: true,
        avatarUrl: true, createdAt: true,
        projects: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { comments: true, ratings: true } } }
        },
        arenaRankings: true,
        badges: { include: { badge: true } },
        _count: { select: { projects: true, battlesWon: true } }
      }
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: JSON.parse(JSON.stringify(user, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};
