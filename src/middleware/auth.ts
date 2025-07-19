import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { JwtPayload } from '../types/auth';
import { AuthenticatedRequest } from '../types/express';

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ 
        success: false, 
        error: 'Access denied. No token provided.' 
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      isAdmin: decoded.isAdmin
    };
    
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token.' 
    });
  }
};
