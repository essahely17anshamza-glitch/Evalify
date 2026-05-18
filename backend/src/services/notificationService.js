import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

class NotificationService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // String(userId) -> socket.id
  }

  // Normalize a userId (BigInt/Number/String) to a stable string key
  _uid(userId) {
    return userId == null ? '' : String(userId);
  }

  // Helper to safely serialize BigInts for Socket.IO
  _sanitize(data) {
    if (!data) return data;
    return JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));
  }

  initialize(server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (token) => {
        try {
          const decoded = this.verifyToken(token);
          const userId = this._uid(decoded.id);

          // Store user connection (string key)
          this.connectedUsers.set(userId, socket.id);
          socket.userId = userId;

          // Join user-specific room
          socket.join(`user:${userId}`);

          // Join role-based rooms
          if (decoded.role) socket.join(`role:${decoded.role}`);

          socket.emit('authenticated', { success: true, userId });
          console.log(`[socket] User ${userId} (${decoded.role}) authenticated, socket=${socket.id}`);
        } catch (error) {
          console.warn(`[socket] auth failed for socket=${socket.id}: ${error.message}`);
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      });

      // Handle joining classroom rooms
      socket.on('joinClassroom', (classId) => {
        if (socket.userId) {
          socket.join(`classroom:${classId}`);
          socket.emit('joinedClassroom', { classId });
          console.log(`User ${socket.userId} joined classroom ${classId}`);
        }
      });

      // Handle joining battle rooms
      socket.on('joinBattle', (battleId) => {
        if (socket.userId) {
          socket.join(`battle:${battleId}`);
          socket.emit('joinedBattle', { battleId });
          console.log(`User ${socket.userId} joined battle ${battleId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          // Only forget the mapping if this was the latest socket for that user
          if (this.connectedUsers.get(socket.userId) === socket.id) {
            this.connectedUsers.delete(socket.userId);
          }
          console.log(`User ${socket.userId} disconnected`);
        }
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  // Notification methods
  notifyUser(userId, event, data) {
    if (!this.io) return;
    const uid = this._uid(userId);
    // Emit to the user-specific room — this delivers to every active tab/device
    // and avoids the BigInt/string mismatch that broke connectedUsers.get().
    this.io.to(`user:${uid}`).emit(event, this._sanitize(data));
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[socket] notifyUser uid=${uid} event=${event}`);
    }
  }

  notifyRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, this._sanitize(data));
  }

  notifyClassroom(classId, event, data) {
    this.io.to(`classroom:${classId}`).emit(event, this._sanitize(data));
  }

  notifyBattle(battleId, event, data) {
    this.io.to(`battle:${battleId}`).emit(event, this._sanitize(data));
  }

  notifyAll(event, data) {
    this.io.emit(event, this._sanitize(data));
  }

  // Specific notification types
  notifyProjectSubmitted(project) {
    this.notifyAll('projectSubmitted', {
      id: project.id,
      title: project.title,
      author: project.user.name,
      authorId: project.userId,
      timestamp: new Date().toISOString()
    });
  }

  notifyBattleUpdated(battle) {
    this.notifyBattle(battle.id, 'battleUpdated', {
      id: battle.id,
      status: battle.status,
      playerA: battle.playerA,
      playerB: battle.playerB,
      winner: battle.winner,
      timestamp: new Date().toISOString()
    });
  }

  notifyBattleInvite(userId, data) {
    this.notifyUser(userId, 'battleInvited', {
      battleId: data.battleId,
      challengerName: data.challengerName,
      challengeTitle: data.challengeTitle,
      timestamp: new Date().toISOString()
    });
  }

  notifySubmissionGraded(submission) {
    this.notifyUser(submission.studentId, 'submissionGraded', {
      id: submission.id,
      assignmentId: submission.assignmentId,
      teacherScore: submission.teacherScore,
      teacherComment: submission.teacherComment,
      gradedAt: submission.gradedAt,
      timestamp: new Date().toISOString()
    });
  }

  notifyCommentAdded(comment) {
    this.notifyUser(comment.project.userId, 'commentAdded', {
      id: comment.id,
      projectId: comment.projectId,
      author: comment.user.name,
      authorId: comment.userId,
      content: comment.content,
      timestamp: new Date().toISOString()
    });
  }

  notifyBadgeAwarded(userId, badge) {
    this.notifyUser(userId, 'badgeAwarded', {
      badge: {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon
      },
      awardedAt: new Date().toISOString()
    });
  }

  notifyArenaRankingUpdated(userId, ranking) {
    this.notifyUser(userId, 'arenaRankingUpdated', {
      tier: ranking.tier,
      wins: ranking.wins,
      losses: ranking.losses,
      winStreak: ranking.winStreak,
      reputation: ranking.reputation,
      timestamp: new Date().toISOString()
    });
  }

  // Verify a JWT and return its payload. Falls back to base64 decode if no JWT_SECRET.
  verifyToken(token) {
    if (!token) throw new Error('No token');
    if (process.env.JWT_SECRET) {
      try {
        return jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        throw new Error('Invalid token: ' + e.message);
      }
    }
    // Fallback (no signature check) — base64url decode payload
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(this._uid(userId));
  }
}

const notificationService = new NotificationService();
export default notificationService;
