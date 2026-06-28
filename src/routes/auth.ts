/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DBUser, DBSystemLog } from '../db/mongoose.js';
import { protect, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-jwt-secret-key-1029384756';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'another-super-secure-refresh-key-998811';

// Constants for Lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

// Helper to sign tokens
const signTokens = (user: any) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id || user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

// 1. User Registration
router.post('/register', async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide all required fields: name, email, password.', 400));
  }

  try {
    const existingUser = await DBUser.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists.', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a mock verification token
    const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });

    const newUser = await DBUser.create({
      name,
      email,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'client', // restrict roles safely
      isVerified: false,
      verificationToken,
      failedLoginAttempts: 0
    });

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'AUTH_SUCCESS',
      email: email.toLowerCase(),
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `User registration completed successfully: ${name} (${role || 'client'})`
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! A verification link has been simulated below.',
      verificationToken,
      user: {
        id: newUser._id || newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
});

// 2. User Login with lockouts & auditing
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ipStr = Array.isArray(clientIp) ? clientIp[0] : clientIp;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  try {
    const user = await DBUser.findOne({ email });
    if (!user) {
      // Create failure log
      await DBSystemLog.create({
        eventType: 'AUTH_FAILED',
        email: email.toLowerCase(),
        ipAddress: ipStr,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Login attempt for non-existent email.`
      });
      return next(new AppError('Incorrect email or password.', 401));
    }

    // Check if account is locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
      return next(new AppError(`This account is temporarily locked due to 5 failed login attempts. Please try again in ${remainingMinutes} minute(s).`, 403));
    }

    // Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntil: Date | undefined;
      let detailsMsg = `Failed login attempt ${attempts}/${MAX_FAILED_ATTEMPTS}`;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCKOUT_TIME_MS);
        detailsMsg = `Account locked for 15 minutes due to exceeding max login failures.`;
      }

      await DBUser.updateOne(
        { _id: user._id || user.id },
        { 
          failedLoginAttempts: attempts,
          ...(lockUntil && { lockUntil })
        }
      );

      await DBSystemLog.create({
        eventType: 'AUTH_FAILED',
        email: email.toLowerCase(),
        ipAddress: ipStr,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: detailsMsg
      });

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        return next(new AppError('This account has been locked for 15 minutes due to 5 failed attempts.', 403));
      }

      return next(new AppError(`Incorrect email or password. Attempt ${attempts} of ${MAX_FAILED_ATTEMPTS}.`, 401));
    }

    // Reset login failures on success
    await DBUser.updateOne(
      { _id: user._id || user.id },
      { failedLoginAttempts: 0, lockUntil: null }
    );

    // Sign JWT tokens
    const { accessToken, refreshToken } = signTokens(user);

    await DBSystemLog.create({
      eventType: 'AUTH_SUCCESS',
      email: email.toLowerCase(),
      ipAddress: ipStr,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Successful login for user ${user.name}`
    });

    res.status(200).json({
      status: 'success',
      accessToken,
      refreshToken,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
});

// 3. Simulated Email Verification
router.post('/verify-email/:token', async (req, res, next) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = await DBUser.findOne({ email: decoded.email });

    if (!user) {
      return next(new AppError('No user found matching this token.', 404));
    }

    await DBUser.updateOne({ _id: user._id || user.id }, { isVerified: true, verificationToken: null });

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'AUTH_SUCCESS',
      email: user.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Email address successfully verified via simulated verification link.`
    });

    res.status(200).json({
      status: 'success',
      message: 'Email successfully verified! You can now log in.'
    });
  } catch (error) {
    return next(new AppError('The verification link is invalid or has expired.', 400));
  }
});

// 4. Refresh Token Flow
router.post('/refresh-token', async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required.', 400));
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
    const user = await DBUser.findOne({ _id: decoded.id });

    if (!user) {
      return next(new AppError('Session user no longer exists.', 401));
    }

    const tokens = signTokens(user);

    res.status(200).json({
      status: 'success',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token. Please sign in again.', 401));
  }
});

// 5. Audit logs (Admin Only)
router.get('/logs', protect, restrictTo('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const logs = await DBSystemLog.find();
    res.status(200).json({
      status: 'success',
      logs
    });
  } catch (error) {
    next(error);
  }
});

// 6. Current User check
router.get('/me', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthenticated user.', 401));
    }
    const user = await DBUser.findOne({ _id: req.user.id });
    if (!user) {
      return next(new AppError('User not found.', 404));
    }
    res.status(200).json({
      status: 'success',
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
