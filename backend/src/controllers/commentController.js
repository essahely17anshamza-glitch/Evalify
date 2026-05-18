import { PrismaClient } from '@prisma/client';
import { createNotification } from './notificationController.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const getComments = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'asc',
      onlyTopLevel = false 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = { projectId };
    if (onlyTopLevel === 'true') {
      where.parentId = null;
    }

    // Build order by clause
    const orderBy = {};
    if (sortBy === 'helpful') {
      orderBy.helpfulCount = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          replies: {
            include: { 
              user: { select: { id: true, name: true, avatarUrl: true, role: true } },
              _count: { select: { helpfulVotes: true } }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: { select: { replies: true, helpfulVotes: true } }
        },
        orderBy,
        skip,
        take
      }),
      prisma.comment.count({ where })
    ]);

    // Get which comments the current user has liked
    const allCommentIds = [];
    comments.forEach(c => {
      allCommentIds.push(c.id);
      c.replies.forEach(r => allCommentIds.push(r.id));
    });

    const userHelpfulVotes = await prisma.helpfulVote.findMany({
      where: {
        userId,
        commentId: { in: allCommentIds }
      },
      select: { commentId: true }
    });

    const likedCommentIds = new Set(userHelpfulVotes.map(v => v.commentId.toString()));

    // Attach likedByCurrentUser to each comment and reply
    const attachLiked = (comment) => ({
      ...comment,
      likedByCurrentUser: likedCommentIds.has(comment.id.toString()),
      replies: comment.replies?.map(r => ({
        ...r,
        likedByCurrentUser: likedCommentIds.has(r.id.toString())
      }))
    });

    res.json({ 
      success: true, 
      data: {
        comments: JSON.parse(JSON.stringify(comments.map(attachLiked), bigintReplacer)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: skip + take < total,
          hasPrev: page > 1
        }
      }
    });
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

    // Notify project owner (if not the commenter)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, title: true }
    });
    if (project && project.userId !== userId) {
      const isReply = !!parentId;
      createNotification(
        project.userId,
        isReply ? 'reply' : 'comment',
        isReply ? 'New reply on your project' : 'New comment on your project',
        `${comment.user.name} ${isReply ? 'replied to a comment' : 'commented'} on "${project.title}"`,
        `/projects/${projectId.toString()}`
      );
    }

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
    const userId = req.user.id;

    // Check if user already marked this comment as helpful
    const existingHelpful = await prisma.helpfulVote.findFirst({
      where: {
        userId,
        commentId
      }
    });

    if (existingHelpful) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already marked this comment as helpful' 
      });
    }

    // Create helpful vote and increment count in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the helpful vote record
      await tx.helpfulVote.create({
        data: {
          userId,
          commentId
        }
      });

      // Increment the helpful count
      const comment = await tx.comment.update({
        where: { id: commentId },
        data: { helpfulCount: { increment: 1 } },
        include: {
          user: { select: { id: true, name: true } }
        }
      });

      return comment;
    });

    // Check for badge awarding
    // Import here to avoid circular dependency
    const { checkAndAwardBadges } = await import('../services/badgeService.js');
    await checkAndAwardBadges(userId, 'helpful_comment', { commentId });

    // Notify the comment author
    const commentAuthor = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, content: true }
    });
    if (commentAuthor && commentAuthor.userId !== userId) {
      createNotification(
        commentAuthor.userId,
        'like',
        'Someone liked your comment',
        `${req.user.name} liked your comment`,
        `/projects/${result.projectId?.toString() || ''}`
      );
    }

    res.json({ 
      success: true, 
      data: JSON.parse(JSON.stringify(result, bigintReplacer)),
      message: 'Comment marked as helpful'
    });
  } catch (error) {
    next(error);
  }
};

export const unmarkCommentHelpful = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    const userId = req.user.id;

    // Check if user has marked this comment as helpful
    const existingHelpful = await prisma.helpfulVote.findFirst({
      where: {
        userId,
        commentId
      }
    });

    if (!existingHelpful) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have not marked this comment as helpful' 
      });
    }

    // Remove helpful vote and decrement count in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete the helpful vote record
      await tx.helpfulVote.delete({
        where: { id: existingHelpful.id }
      });

      // Decrement the helpful count
      const comment = await tx.comment.update({
        where: { id: commentId },
        data: { helpfulCount: { decrement: 1 } },
        include: {
          user: { select: { id: true, name: true } }
        }
      });

      return comment;
    });

    res.json({ 
      success: true, 
      data: JSON.parse(JSON.stringify(result, bigintReplacer)),
      message: 'Helpful mark removed'
    });
  } catch (error) {
    next(error);
  }
};

export const reportComment = async (req, res, next) => {
  try {
    const commentId = BigInt(req.params.id);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Report reason is required' 
      });
    }

    // Check if user already reported this comment
    const existingReport = await prisma.commentReport.findFirst({
      where: {
        userId: req.user.id,
        commentId
      }
    });

    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already reported this comment' 
      });
    }

    const report = await prisma.commentReport.create({
      data: {
        userId: req.user.id,
        commentId,
        reason: reason.trim()
      }
    });

    // Mark comment as reported
    await prisma.comment.update({
      where: { id: commentId },
      data: { isReported: true }
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });
    const reportedComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { content: true, user: { select: { name: true } } }
    });
    for (const admin of admins) {
      createNotification(
        admin.id,
        'report',
        'Comment reported',
        `${req.user.name} reported a comment by ${reportedComment?.user?.name || 'unknown'}: "${reportedComment?.content?.substring(0, 60)}..."`,
        '/admin?section=comments'
      );
    }

    res.status(201).json({ 
      success: true, 
      data: JSON.parse(JSON.stringify(report, bigintReplacer)),
      message: 'Comment reported successfully'
    });
  } catch (error) {
    next(error);
  }
};
