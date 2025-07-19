import { Request, Response, NextFunction } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    isAdmin: boolean;
  };
}

export type ExpressHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export type AuthenticatedHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void>;
