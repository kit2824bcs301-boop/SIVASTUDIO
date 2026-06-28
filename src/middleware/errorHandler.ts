/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { DBSystemLog } from '../db/mongoose.js';

// Custom Error Class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global Express Error Middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  // Log to DB for administrative auditing
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  DBSystemLog.create({
    eventType: 'UNAUTHORIZED_ACCESS',
    email: (req as any).user?.email || 'unauthenticated',
    ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
    userAgent: req.headers['user-agent'] || 'unknown',
    details: `Error processed: [${err.statusCode}] ${err.message}`
  }).catch(console.error);

  // 1. Mongoose Bad ObjectId Error (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid resource identifier: ${err.path}`;
    error = new AppError(message, 400);
  }

  // 2. Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : '';
    const message = `Duplicate value error: ${value}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el: any) => el.message);
    const message = `Validation error. ${errors.join('. ')}`;
    error = new AppError(message, 400);
  }

  // 4. JWT JsonWebTokenError
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid security session. Please log in again.';
    error = new AppError(message, 401);
  }

  // 5. JWT TokenExpiredError
  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please log in again.';
    error = new AppError(message, 401);
  }

  // Send Error Response
  const finalStatusCode = error.statusCode || err.statusCode || 500;
  const finalStatus = error.status || err.status || 'error';
  res.status(finalStatusCode).json({
    status: finalStatus,
    message: error.message || err.message || 'An internal error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
