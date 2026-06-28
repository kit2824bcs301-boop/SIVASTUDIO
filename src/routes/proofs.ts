/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { DBPhotoProof, DBSystemLog } from '../db/mongoose.js';
import { protect, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 1. Get proofs (Admin/Standard: All, Client: Theirs)
router.get('/', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    let proofs;
    if (req.user.role === 'admin' || req.user.role === 'standard') {
      proofs = await DBPhotoProof.find();
    } else {
      proofs = await DBPhotoProof.find({ clientEmail: req.user.email });
    }

    res.status(200).json({
      status: 'success',
      results: proofs.length,
      proofs
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get single proof by ID
router.get('/:id', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const proof = await DBPhotoProof.findById(req.params.id);
    if (!proof) {
      return next(new AppError('Photo proof gallery not found.', 404));
    }

    if (req.user.role !== 'admin' && req.user.role !== 'standard' && proof.clientEmail !== req.user.email) {
      return next(new AppError('You do not have permission to view this proof gallery.', 403));
    }

    res.status(200).json({
      status: 'success',
      proof
    });
  } catch (error) {
    next(error);
  }
});

// 3. Create proof gallery (Admin Only)
router.post('/', protect, restrictTo('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  const { title, clientEmail, bookingId, images, screenshotPrevention, expiresAt } = req.body;

  if (!title || !clientEmail || !images || !Array.isArray(images)) {
    return next(new AppError('Missing required proofing fields. Title, client email, and images are required.', 400));
  }

  try {
    const newProof = await DBPhotoProof.create({
      title,
      clientEmail: clientEmail.toLowerCase(),
      bookingId,
      images,
      status: 'Under Review',
      screenshotPrevention: screenshotPrevention !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'SYSTEM_INITIALIZATION',
      email: req.user?.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Created new photo proofing gallery "${title}" for client ${clientEmail}`
    });

    res.status(201).json({
      status: 'success',
      proof: newProof
    });
  } catch (error) {
    next(error);
  }
});

// 4. Update proof gallery status or notes (Admin: Any fields; Client: Only feedback, notes & status)
router.put('/:id', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const proof = await DBPhotoProof.findById(req.params.id);
    if (!proof) {
      return next(new AppError('Photo proof gallery not found.', 404));
    }

    if (req.user.role === 'standard') {
      return next(new AppError('Standard users are not authorized to update or submit proof feedback.', 403));
    }

    if (req.user.role !== 'admin' && proof.clientEmail !== req.user.email) {
      return next(new AppError('You do not have permission to update this gallery.', 403));
    }

    let updateData = { ...req.body };

    // Strict Client Guardrails
    if (req.user.role !== 'admin') {
      updateData = {};
      if (req.body.status && ['Approved', 'Revision Requested'].includes(req.body.status)) {
        updateData.status = req.body.status;
      }
      if (req.body.clientNotes !== undefined) {
        updateData.clientNotes = req.body.clientNotes;
      }
    }

    const updated = await DBPhotoProof.findByIdAndUpdate(req.params.id, updateData);

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'SYSTEM_INITIALIZATION',
      email: req.user.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Proof gallery "${proof.title}" updated by ${req.user.name}`
    });

    res.status(200).json({
      status: 'success',
      proof: updated
    });
  } catch (error) {
    next(error);
  }
});

// 5. Screenshot violation logging
router.post('/:id/screenshot-alert', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const proof = await DBPhotoProof.findById(req.params.id);
    if (!proof) {
      return next(new AppError('Photo proof gallery not found.', 404));
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const ipStr = Array.isArray(clientIp) ? clientIp[0] : clientIp;

    // Log the security event
    await DBSystemLog.create({
      eventType: 'SCREENSHOT_DETECTION',
      email: req.user.email,
      ipAddress: ipStr,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `🚨 ALERT: Potential screenshot or print-screen attempt detected for client proof gallery "${proof.title}"`
    });

    res.status(200).json({
      status: 'success',
      message: 'Screenshot security event logged. Studio administration notified.'
    });
  } catch (error) {
    next(error);
  }
});

// 6. Delete proof gallery (Admin Only)
router.delete('/:id', protect, restrictTo('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const deleted = await DBPhotoProof.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return next(new AppError('Photo proof gallery not found.', 404));
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'SYSTEM_INITIALIZATION',
      email: req.user?.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Deleted photo proofing gallery "${deleted.title}"`
    });

    res.status(200).json({
      status: 'success',
      message: 'Proof gallery deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
