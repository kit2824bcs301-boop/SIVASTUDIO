/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { DBSystemLog } from '../db/mongoose.js';

// 1. CORS Configuration
export const corsMiddleware = cors({
  origin: true, // Allow all origins for the sandbox, or you can specify process.env.APP_URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

// 2. Helmet Configuration for secure portal (allowing iframe embedding for AI Studio preview)
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://referrer.pixylab.io"],
      connectSrc: ["'self'", "https:", "http:"],
      frameAncestors: ["'self'", "https://*.google.com", "https://*.googleusercontent.com", "https://*.ai.studio", "https://*.run.app", "*"]
    }
  },
  frameguard: false, // Disables X-Frame-Options to allow embedding in the AI Studio preview pane
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
});

// 3. General Rate Limiting
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  handler: (req, res, next, options) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    DBSystemLog.create({
      eventType: 'RATE_LIMIT_EXCEEDED',
      email: 'anonymous',
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Rate limit hit on path: ${req.path}`
    }).catch(console.error);
    
    res.status(429).json(options.message);
  }
});

// Auth-specific limiter (stricter limit for login/register/reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit login attempts to 15 per 15 minutes
  validate: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// 4. NoSQL Injection Prevention
export const mongoSanitizeMiddleware = mongoSanitize();

// 5. Input Sanitization (Recursive string escaping/stripping to prevent XSS)
function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};
