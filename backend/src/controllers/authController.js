import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateToken = (user) => {
  // Convert BigInt to string to avoid JSON serialization issues
  return jwt.sign(
    { id: user.id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Validate role
    const validRoles = ['USER', 'STUDENT', 'TEACHER', 'ADMIN'];
    const userRole = validRoles.includes(role) ? role : 'USER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
      },
    });

    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    // req.user is attached by the isAuthenticated middleware
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id.toString(),
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          avatarUrl: req.user.avatarUrl,
          bio: req.user.bio,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // For stateless JWT, logout can be handled client-side by removing the token.
    // This endpoint is kept for consistency and to allow future server-side token revocation.
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
