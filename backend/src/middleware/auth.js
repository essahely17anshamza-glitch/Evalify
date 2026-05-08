import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. Invalid token.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token. User not found.' });
    }

    // Convert BigInt id to string for easier frontend handling if necessary, or just attach the user object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

export const isTeacher = (req, res, next) => {
  if (req.user && (req.user.role === 'TEACHER' || req.user.role === 'ADMIN')) {
    next();
  } else {
    return res.status(403).json({ success: false, error: 'Access denied. Teacher privileges required.' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
  }
};
