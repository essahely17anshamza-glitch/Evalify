import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bigintReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 30, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    res.json({
      success: true,
      data: {
        notifications: JSON.parse(JSON.stringify(notifications, bigintReplacer)),
        unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notificationId = BigInt(req.params.id);
    const userId = req.user.id;

    const notification = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true, message: 'All marked as read' });
  } catch (error) {
    next(error);
  }
};

export const dismissNotification = async (req, res, next) => {
  try {
    const notificationId = BigInt(req.params.id);
    const userId = req.user.id;
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    });
    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    next(error);
  }
};

export const clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await prisma.notification.deleteMany({ where: { userId } });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
};

// Helper to create a notification and send it via socket
export const createNotification = async (userId, type, title, message, link = null) => {
  try {
    // Prisma's userId field is BigInt — coerce defensively
    const uidForDb = typeof userId === 'bigint' ? userId : BigInt(userId);

    const notification = await prisma.notification.create({
      data: { userId: uidForDb, type, title, message, link }
    });

    console.log(`[notification] Created for user=${uidForDb} type=${type} title="${title}"`);

    // Send real-time notification via socket
    const { default: notificationService } = await import('../services/notificationService.js');
    notificationService.notifyUser(uidForDb, 'newNotification', {
      id: notification.id.toString(),
      type,
      title,
      message,
      link,
      createdAt: notification.createdAt.toISOString()
    });

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};