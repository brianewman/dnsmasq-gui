import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthRequest, AuthResponse } from '../types/auth';
import { ApiResponse, ExpressHandler } from '../types/express';
import { authMiddleware } from '../middleware/auth';

export const authRoutes = Router();

// TODO: Replace with proper user storage (database, file, etc.)
// For now, we'll use a simple in-memory user for development
const defaultUser = {
  id: '1',
  username: 'admin',
  passwordHash: '$2b$12$Gv3zkUg.gIzOFbF4F.uc.eILhT5cqvilzf5Ksxrxs5W8wQ6K3Ztg.', // 'admin'
  isAdmin: true,
  lastLogin: undefined,
  loginAttempts: 0,
  lockedUntil: undefined
};

const login: ExpressHandler = async (req, res) => {
  try {
    const { username, password }: AuthRequest = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      } as ApiResponse);
      return;
    }

    // TODO: Implement proper user lookup from storage
    if (username !== defaultUser.username) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as ApiResponse);
      return;
    }

    const isValidPassword = await bcrypt.compare(password, defaultUser.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as ApiResponse);
      return;
    }

    const token = jwt.sign(
      {
        userId: defaultUser.id,
        username: defaultUser.username,
        isAdmin: defaultUser.isAdmin
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    const response: AuthResponse = {
      success: true,
      token,
      user: {
        id: defaultUser.id,
        username: defaultUser.username,
        isAdmin: defaultUser.isAdmin,
        loginAttempts: 0
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed'
    } as ApiResponse);
  }
};

const verifyToken: ExpressHandler = (req, res) => {
  // This endpoint is protected by authMiddleware
  res.json({
    success: true,
    message: 'Token is valid'
  } as ApiResponse);
};

authRoutes.post('/login', login);
authRoutes.get('/verify', authMiddleware, verifyToken);
