import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';
import { notificationService } from '../services/api';

const useSocket = () => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Hydrate persisted notifications from the DB whenever the user/token changes.
  // Runs independently of the socket connection so it still works if sockets are down.
  useEffect(() => {
    if (!user || !token) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    notificationService.list({ limit: 30 })
      .then(res => {
        if (cancelled) return;
        const dbNotifs = (res.data?.notifications || []).map(n => ({
          id: n.id,
          persistent: true,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          timestamp: n.createdAt,
          read: n.isRead,
        }));
        // Replace any DB-loaded entries; keep transient (non-persistent) ones at the end
        setNotifications(prev => [
          ...dbNotifs,
          ...prev.filter(n => !n.persistent),
        ]);
      })
      .catch(err => console.error('[useSocket] Failed to load notifications:', err));
    return () => { cancelled = true; };
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        setConnected(true);

        // Authenticate with token
        newSocket.emit('authenticate', token);
      });

      newSocket.on('authenticated', (data) => {
        if (data.success) {
          console.log('Socket authenticated successfully', data);
          // Join user-specific room
          newSocket.emit('joinClassroom', 'user');
        } else {
          console.error('Socket authentication failed:', data.error);
        }
      });

      // Handle persisted notifications (e.g. reported comments, new teacher requests)
      newSocket.on('newNotification', (data) => {
        console.log('[useSocket] newNotification received:', data);
        setNotifications(prev => {
          // Dedupe: if the DB hydrate already loaded this notification, skip it
          if (prev.some(n => n.persistent && String(n.id) === String(data.id))) return prev;
          return [{
            id: data.id,
            persistent: true,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link,
            timestamp: data.createdAt,
            read: false,
          }, ...prev];
        });
      });

      // Handle project submissions
      newSocket.on('projectSubmitted', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'project',
          title: 'New Project Submitted',
          message: `${data.author} submitted "${data.title}"`,
          data,
          timestamp: data.timestamp,
          read: false
        }, ...prev]);
      });

      // Handle battle updates
      newSocket.on('battleUpdated', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'battle',
          title: 'Battle Updated',
          message: `Battle status: ${data.status}`,
          data,
          timestamp: data.timestamp,
          read: false
        }, ...prev]);
      });

      // Handle battle invites
      newSocket.on('battleInvited', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'battleInvite',
          title: 'Battle Challenge!',
          message: `${data.challengerName} challenged you to "${data.challengeTitle}"`,
          data,
          timestamp: data.timestamp,
          read: false
        }, ...prev]);
      });

      // Handle submission grading
      newSocket.on('submissionGraded', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'grade',
          title: 'Submission Graded',
          message: `Your submission was graded: ${data.teacherScore}/20`,
          data,
          timestamp: data.timestamp,
          read: false
        }, ...prev]);
      });

      // Handle comment notifications
      newSocket.on('commentAdded', (data) => {
        if (data.authorId !== user.id) {
          setNotifications(prev => [{
            id: Date.now(),
            type: 'comment',
            title: 'New Comment',
            message: `${data.author} commented on your project`,
            data,
            timestamp: data.timestamp,
            read: false
          }, ...prev]);
        }
      });

      // Handle badge awards
      newSocket.on('badgeAwarded', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'badge',
          title: 'Badge Earned!',
          message: `You earned the "${data.badge.name}" badge!`,
          data,
          timestamp: data.awardedAt,
          read: false
        }, ...prev]);
      });

      // Handle arena ranking updates
      newSocket.on('arenaRankingUpdated', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'arena',
          title: 'Arena Ranking Updated',
          message: `New rank: ${data.tier} - ${data.wins} wins`,
          data,
          timestamp: data.timestamp,
          read: false
        }, ...prev]);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from socket server');
        setConnected(false);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, token]);

  // Join/leave rooms
  const joinClassroom = (classId) => {
    if (socket && connected) {
      socket.emit('joinClassroom', classId);
    }
  };

  const joinBattle = (battleId) => {
    if (socket && connected) {
      socket.emit('joinBattle', battleId);
    }
  };

  // Mark notification as read
  const markNotificationRead = (notificationId) => {
    setNotifications(prev => {
      const notif = prev.find(n => n.id === notificationId);
      // Persist to DB if it's a persistent (DB-backed) notification that isn't already read
      if (notif?.persistent && !notif.read) {
        notificationService.markRead(notificationId).catch(err =>
          console.error('Failed to mark notification as read:', err)
        );
      }
      return prev.map(notif => {
        if (notif.id === notificationId) {
          return { ...notif, read: true };
        }
        return notif;
      });
    });
  };

  // Clear all notifications (also clears persisted ones from DB)
  const clearNotifications = () => {
    const hadPersistent = notifications.some(n => n.persistent);
    setNotifications([]);
    if (hadPersistent) {
      notificationService.clearAll().catch(err =>
        console.error('Failed to clear notifications:', err)
      );
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    socket,
    connected,
    notifications,
    unreadCount,
    joinClassroom,
    joinBattle,
    markNotificationRead,
    clearNotifications
  };
};

export default useSocket;
