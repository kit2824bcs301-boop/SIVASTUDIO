/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { DBBooking, DBSystemLog } from '../db/mongoose.js';
import { protect, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 1. Get bookings (Admin: All, Client: Theirs)
router.get('/', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    let bookings;
    if (req.user.role === 'admin' || req.user.role === 'standard') {
      bookings = await DBBooking.find();
    } else {
      bookings = await DBBooking.find({ clientEmail: req.user.email });
    }

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      bookings
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get single booking by ID (Admin, or Client if it is theirs)
router.get('/:id', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const booking = await DBBooking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('Booking not found.', 404));
    }

    if (req.user.role !== 'admin' && req.user.role !== 'standard' && booking.clientEmail !== req.user.email) {
      return next(new AppError('You do not have permission to view this booking.', 403));
    }

    res.status(200).json({
      status: 'success',
      booking
    });
  } catch (error) {
    next(error);
  }
});

// 3. Create booking (Admin, or Client)
router.post('/', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  const { clientName, clientEmail, sessionDate, sessionType, price, notes } = req.body;

  if (!clientName || !clientEmail || !sessionDate || !sessionType || !price) {
    return next(new AppError('Missing required booking fields.', 400));
  }

  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (req.user.role === 'standard') {
      return next(new AppError('Standard users are not authorized to create bookings.', 403));
    }

    // Force clientEmail to match logged in client unless the user is Admin
    const finalEmail = req.user.role === 'admin' ? clientEmail : req.user.email;
    const finalName = req.user.role === 'admin' ? clientName : req.user.name;

    const newBooking = await DBBooking.create({
      clientName: finalName,
      clientEmail: finalEmail,
      sessionDate: new Date(sessionDate),
      sessionType,
      price: Number(price),
      notes,
      status: 'Pending'
    });

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'SYSTEM_INITIALIZATION', // generic log or system action
      email: req.user.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `New photography booking session requested for ${finalName} (${sessionType})`
    });

    res.status(201).json({
      status: 'success',
      booking: newBooking
    });
  } catch (error) {
    next(error);
  }
});

// 4. Update booking (Admin can update all, Client can cancel theirs)
router.put('/:id', protect, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const booking = await DBBooking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('Booking not found.', 404));
    }

    if (req.user.role === 'standard') {
      return next(new AppError('Standard users are not authorized to update bookings.', 403));
    }

    // Authorization checks
    if (req.user.role !== 'admin' && booking.clientEmail !== req.user.email) {
      return next(new AppError('You are not authorized to update this booking.', 403));
    }

    let updateData = { ...req.body };
    // Clients can ONLY update status to "Cancelled" or modify notes.
    if (req.user.role !== 'admin') {
      const allowedStatusUpdate = req.body.status === 'Cancelled';
      updateData = {};
      if (allowedStatusUpdate) {
        updateData.status = 'Cancelled';
      }
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }
    }

    const updated = await DBBooking.findByIdAndUpdate(req.params.id, updateData);

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'SYSTEM_INITIALIZATION',
      email: req.user.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Booking ${req.params.id} updated by ${req.user.name}`
    });

    res.status(200).json({
      status: 'success',
      booking: updated
    });
  } catch (error) {
    next(error);
  }
});

// 5. Delete booking (Admin Only)
router.delete('/:id', protect, restrictTo('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const deleted = await DBBooking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return next(new AppError('Booking not found.', 404));
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await DBSystemLog.create({
      eventType: 'SYSTEM_INITIALIZATION',
      email: req.user?.email,
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      details: `Booking ${req.params.id} deleted by Admin`
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
