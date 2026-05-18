import { PrismaClient } from '@prisma/client';
import { getProjectZipUrl } from '../services/zipService.js';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

// Generate shareable link for a project
export const shareProject = async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const { customMessage = null } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Generate share URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/projects/${projectId}`;
    
    // Generate download URL for ZIP if available
    let downloadUrl = null;
    if (project.zipPath) {
      try {
        downloadUrl = await getProjectZipUrl(project.zipPath);
      } catch (error) {
        console.error('Error generating download URL:', error);
      }
    }

    // Create share record for analytics
    const shareRecord = await prisma.share.create({
      data: {
        userId: req.user.id,
        projectId,
        shareUrl,
        customMessage
      }
    });

    res.json({
      success: true,
      data: {
        shareUrl,
        downloadUrl,
        project: JSON.parse(JSON.stringify(project, bigintReplacer)),
        shareId: shareRecord.id,
        customMessage
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate shareable link for a battle
export const shareBattle = async (req, res, next) => {
  try {
    const battleId = BigInt(req.params.id);
    const { customMessage = null } = req.body;

    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        challenge: true,
        playerA: {
          select: { id: true, name: true, avatarUrl: true }
        },
        playerB: {
          select: { id: true, name: true, avatarUrl: true }
        },
        winner: {
          select: { id: true, name: true }
        },
        submissions: {
          include: {
            project: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true }
                }
              }
            }
          }
        }
      }
    });

    if (!battle) {
      return res.status(404).json({ success: false, error: 'Battle not found' });
    }

    // Generate share URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/arena/battles/${battleId}`;

    // Create share record for analytics
    const shareRecord = await prisma.share.create({
      data: {
        userId: req.user.id,
        battleId,
        shareUrl,
        customMessage
      }
    });

    res.json({
      success: true,
      data: {
        shareUrl,
        battle: JSON.parse(JSON.stringify(battle, bigintReplacer)),
        shareId: shareRecord.id,
        customMessage
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get share analytics
export const getShareAnalytics = async (req, res, next) => {
  try {
    const { shareId } = req.params;

    const shareRecord = await prisma.share.findUnique({
      where: { id: BigInt(shareId) },
      include: {
        user: {
          select: { id: true, name: true }
        },
        project: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        },
        battle: {
          include: {
            playerA: {
              select: { id: true, name: true }
            },
            playerB: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!shareRecord) {
      return res.status(404).json({ success: false, error: 'Share record not found' });
    }

    // Get click analytics for this share
    const clicks = await prisma.shareClick.findMany({
      where: { shareId: BigInt(shareId) },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const analytics = {
      ...JSON.parse(JSON.stringify(shareRecord, bigintReplacer)),
      totalClicks: clicks.length,
      uniqueClicks: new Set(clicks.map(c => c.ipAddress)).size,
      recentClicks: clicks.slice(0, 10),
      clicksByDay: clicks.reduce((acc, click) => {
        const day = click.createdAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Track share click
export const trackShareClick = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Record the click
    await prisma.shareClick.create({
      data: {
        shareId: BigInt(shareId),
        userAgent,
        ipAddress,
        referer: req.get('Referer') || null
      }
    });

    // Get the original share record to redirect
    const shareRecord = await prisma.share.findUnique({
      where: { id: BigInt(shareId) }
    });

    if (!shareRecord) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    res.json({
      success: true,
      data: {
        redirectUrl: shareRecord.shareUrl,
        message: 'Click tracked successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user's shared content
export const getUserShares = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [shares, total] = await Promise.all([
      prisma.share.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true }
              }
            }
          },
          battle: {
            include: {
              playerA: {
                select: { id: true, name: true }
              },
              playerB: {
                select: { id: true, name: true }
              }
            }
          },
          _count: { select: { clicks: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.share.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      data: {
        shares: JSON.parse(JSON.stringify(shares, bigintReplacer)),
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

// Delete share
export const deleteShare = async (req, res, next) => {
  try {
    const shareId = BigInt(req.params.id);
    const userId = req.user.id;

    const share = await prisma.share.findUnique({
      where: { id: shareId }
    });

    if (!share) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    if (share.userId.toString() !== userId.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this share' });
    }

    await prisma.share.delete({
      where: { id: shareId }
    });

    res.json({
      success: true,
      message: 'Share deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
