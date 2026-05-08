import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const getComments = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const comments = await prisma.comment.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true } },
        replies: { include: { user: { select: { id: true, name: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(comments, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const userId = req.user.id;
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        projectId,
        parentId: parentId ? BigInt(parentId) : null,
        content,
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, data: JSON.parse(JSON.stringify(comment, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });
    if (comment.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You are not allowed to edit this comment' });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(updated, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });
    if (comment.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You are not allowed to delete this comment' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

export const markCommentHelpful = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { helpfulCount: { increment: 1 } }
    });

    res.json({ success: true, data: JSON.parse(JSON.stringify(comment, bigintReplacer)) });
  } catch (error) {
    next(error);
  }
};
