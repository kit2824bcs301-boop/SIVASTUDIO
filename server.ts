/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environmental parameters
dotenv.config();

// Initialize Database connection
import { connectDB } from './src/db/mongoose.js';

// Import security controls
import {
  corsMiddleware,
  helmetMiddleware,
  globalLimiter,
  mongoSanitizeMiddleware,
  inputSanitizer
} from './src/middleware/security.js';

// Import route controllers
import authRouter from './src/routes/auth.js';
import bookingsRouter from './src/routes/bookings.js';
import proofsRouter from './src/routes/proofs.js';
import analyticsRouter from './src/routes/analytics.js';

// Import gallery and auth middlewares
import { DBGalleryPhoto, DBSystemLog, DBAssetFolder, DBAssetPhoto } from './src/db/mongoose.js';
import { protect, restrictTo } from './src/middleware/auth.js';

// Import Error managers
import { errorHandler, AppError } from './src/middleware/errorHandler.js';
import fs from 'fs';
import multer from 'multer';

// Configure multer disk storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000 * 1024 * 1024 } // 1000MB high limit to remove upload limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Express to trust reverse proxy headers (like Cloud Run or Nginx)
  app.set('trust proxy', 1);

  // 1. Database Connection Initialization
  await connectDB();

  // 2. Global Security Middlewares
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use('/api', globalLimiter); // Rate limit all API calls
  app.use(express.json({ limit: '1000mb' })); // Large payload size limit
  app.use(express.urlencoded({ extended: true, limit: '1000mb' }));
  
  // NoSQL injection and XSS mitigation (restricted to API routes to avoid interfering with Vite assets)
  app.use('/api', mongoSanitizeMiddleware);
  app.use('/api', inputSanitizer);

  // 3. API endpoints routing
  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/proofs', proofsRouter);
  app.use('/api/analytics', analyticsRouter);

  // 3.5. Dynamic Studio Portfolio Gallery API endpoints
  app.get('/api/gallery', async (req, res, next) => {
    try {
      const photos = await DBGalleryPhoto.find();
      res.status(200).json({
        status: 'success',
        results: photos.length,
        photos
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/gallery', protect, restrictTo('admin'), upload.single('file'), async (req: any, res, next) => {
    try {
      const { title, category } = req.body;
      if (!req.file) {
        return next(new AppError('No photo file uploaded.', 400));
      }
      const finalTitle = title || req.file.originalname;
      const fileUrl = `/uploads/${req.file.filename}`;

      const newPhoto = await DBGalleryPhoto.create({
        url: fileUrl,
        title: finalTitle,
        category: category || 'General'
      });

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      await DBSystemLog.create({
        eventType: 'SYSTEM_INITIALIZATION',
        email: req.user?.email,
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Admin uploaded photo to studio gallery: "${finalTitle}"`
      });

      res.status(201).json({
        status: 'success',
        photo: newPhoto
      });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/gallery/:id', protect, restrictTo('admin'), async (req: any, res, next) => {
    try {
      const deleted = await DBGalleryPhoto.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return next(new AppError('Photo not found in gallery.', 404));
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      await DBSystemLog.create({
        eventType: 'SYSTEM_INITIALIZATION',
        email: req.user?.email,
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Admin deleted photo from studio gallery: "${deleted.title}"`
      });

      res.status(200).json({
        status: 'success',
        message: 'Photo deleted successfully from studio gallery.'
      });
    } catch (err) {
      next(err);
    }
  });

  // 3.6. Client Master Asset Library (Folders & Photos) API endpoints
  app.get('/api/asset-folders', protect, restrictTo('admin'), async (req, res, next) => {
    try {
      const folders = await DBAssetFolder.find();
      res.status(200).json({
        status: 'success',
        results: folders.length,
        folders
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/asset-folders', protect, restrictTo('admin'), async (req: any, res, next) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return next(new AppError('Folder name is required.', 400));
      }
      const newFolder = await DBAssetFolder.create({
        name,
        description: description || ''
      });

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      await DBSystemLog.create({
        eventType: 'SYSTEM_INITIALIZATION',
        email: req.user?.email,
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Admin created client asset folder: "${name}"`
      });

      res.status(201).json({
        status: 'success',
        folder: newFolder
      });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/asset-folders/:id', protect, restrictTo('admin'), async (req: any, res, next) => {
    try {
      const deleted = await DBAssetFolder.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return next(new AppError('Asset folder not found.', 404));
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      await DBSystemLog.create({
        eventType: 'SYSTEM_INITIALIZATION',
        email: req.user?.email,
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Admin deleted client asset folder: "${deleted.name}" and all nested photos`
      });

      res.status(200).json({
        status: 'success',
        message: 'Client asset folder and nested photos deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/asset-photos', protect, restrictTo('admin'), async (req, res, next) => {
    try {
      const { folderId } = req.query;
      const query: any = {};
      if (folderId) query.folderId = folderId;
      
      const photos = await DBAssetPhoto.find(query);
      res.status(200).json({
        status: 'success',
        results: photos.length,
        photos
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/asset-photos', protect, restrictTo('admin'), upload.single('file'), async (req: any, res, next) => {
    try {
      const { folderId, title, format } = req.body;
      if (!folderId) {
        return next(new AppError('Folder ID is required.', 400));
      }
      if (!req.file) {
        return next(new AppError('No photo file uploaded.', 400));
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const finalTitle = title || req.file.originalname;
      const fileExt = path.extname(req.file.originalname).replace('.', '').toUpperCase();
      const finalFormat = format || fileExt || 'JPG';
      const finalSize = req.file.size;

      const newPhoto = await DBAssetPhoto.create({
        folderId,
        url: fileUrl,
        title: finalTitle,
        format: finalFormat,
        sizeBytes: finalSize
      });

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      await DBSystemLog.create({
        eventType: 'SYSTEM_INITIALIZATION',
        email: req.user?.email,
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Admin uploaded nested photo "${finalTitle}" (${finalFormat}) to folder ID ${folderId}`
      });

      res.status(201).json({
        status: 'success',
        photo: newPhoto
      });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/asset-photos/:id', protect, restrictTo('admin'), async (req: any, res, next) => {
    try {
      const deleted = await DBAssetPhoto.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return next(new AppError('Photo asset not found.', 404));
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      await DBSystemLog.create({
        eventType: 'SYSTEM_INITIALIZATION',
        email: req.user?.email,
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: `Admin deleted photo asset "${deleted.title}" from nested folder ID ${deleted.folderId}`
      });

      res.status(200).json({
        status: 'success',
        message: 'Photo asset deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  });

  // Serve uploaded files statically before routing to frontend
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 4. Client Web Interface Setup (Development vs. Production Build)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode with Vite live compiler...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode with compiled asset serving...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Unhandled Route Fail-over (404)
  app.use('/api/*', (req, res, next) => {
    next(new AppError(`The requested API route '${req.originalUrl}' does not exist.`, 404));
  });

  // 6. Global Exception Mitigation Middleware
  app.use(errorHandler);

  // 7. Network Listening Bind
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===========================================================`);
    console.log(`🚀 SERVING SERVER AT PORT: ${PORT}`);
    console.log(`🔗 Local interface URL: http://0.0.0.0:${PORT}`);
    console.log(`===========================================================`);
  });
}

startServer().catch((err) => {
  console.error('CRITICAL: Server boot sequence interrupted!', err);
});
