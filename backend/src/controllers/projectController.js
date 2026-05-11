import { PrismaClient } from '@prisma/client';
import { extractZip, readExtractedFiles, cleanupTempFiles } from '../services/zipService.js';
import { analyzeProject } from '../services/aiService.js';

const prisma = new PrismaClient();

// BigInt replacer for JSON stringification if needed
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const submitProject = async (req, res, next) => {
  let zipPath = null;
  let extractedDir = null;

  try {
    const { title, description, language, tags, githubUrl, liveUrl } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ZIP file is required' });
    }

    zipPath = req.file.path;
    const targetDirName = `extract-${Date.now()}`;
    
    console.log(`[SubmitProject] Starting extraction of ${zipPath}`);
    // 1. Extract ZIP
    extractedDir = await extractZip(zipPath, targetDirName);
    console.log(`[SubmitProject] Extracted to ${extractedDir}`);

    // 2. Read Files
    const files = await readExtractedFiles(extractedDir);
    console.log(`[SubmitProject] Read ${files.length} code files successfully.`);
    
    if (files.length === 0) {
      throw new Error("No readable code files found in the ZIP.");
    }

    console.log(`[SubmitProject] Sending ${files.length} files to Gemini for analysis...`);
    // 3. AI Analysis
    const aiResult = await analyzeProject(files, title, description);
    console.log(`[SubmitProject] Received Gemini response. Success: ${aiResult.success}`);
    
    let tagsJson = null;
    if (tags) {
      try { tagsJson = JSON.parse(tags); } catch(e) { tagsJson = [tags]; }
    }

    console.log(`[SubmitProject] Saving project to DB...`);
    // 4. Save to DB
    const project = await prisma.project.create({
      data: {
        userId,
        title,
        description,
        zipPath: zipPath, // In a real app we might upload this to S3 and save URL
        githubUrl,
        liveUrl,
        language,
        tags: tagsJson,
        aiFeedback: aiResult.feedback,
        aiScore: aiResult.scores?.overall || 0,
        aiAnalysisJson: aiResult,
      }
    });

    // Cleanup extracted dir, but keep ZIP if we want to serve it later (or we can just delete it)
    await cleanupTempFiles(null, extractedDir); // we keep zipPath

    // Convert BigInt to string for response
    const projectResponse = JSON.parse(JSON.stringify(project, bigintReplacer));

    res.status(201).json({
      success: true,
      data: projectResponse
    });

  } catch (error) {
    console.error("Submit project error:", error);
    await cleanupTempFiles(zipPath, extractedDir);
    next(error);
  }
};

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

export const getProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        },
        _count: { select: { comments: true, ratings: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(projects, bigintReplacer))
    });
  } catch (error) {
    next(error);
  }
};

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
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: JSON.parse(JSON.stringify(project, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        projects: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { comments: true, ratings: true } } }
        },
        arenaRanking: true,
        badges: { include: { badge: true } },
        _count: { select: { projects: true, battlesWon: true } }
      }
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: JSON.parse(JSON.stringify(user, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};
