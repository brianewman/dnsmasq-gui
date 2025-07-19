import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  console.error('Error:', error);

  if (res.headersSent) {
    return next(error);
  }

  // Default error
  let status = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
  } else if (error.message) {
    message = error.message;
  }

  res.status(status).json({
    success: false,
    error: message
  });
};
