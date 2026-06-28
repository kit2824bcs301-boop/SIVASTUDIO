/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Connection status flag
export let isUsingMockDB = true;

const DB_FILE_PATH = path.join(process.cwd(), 'db_storage.json');

// Fallback in-memory database arrays
let mockUsers: any[] = [];
let mockBookings: any[] = [];
let mockProofs: any[] = [];
let mockLogs: any[] = [];
let mockGalleryPhotos: any[] = [];
let mockAssetFolders: any[] = [];
let mockAssetPhotos: any[] = [];

function saveToDisk() {
  try {
    const data = {
      mockUsers,
      mockBookings,
      mockProofs,
      mockLogs,
      mockGalleryPhotos,
      mockAssetFolders,
      mockAssetPhotos
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save database to disk:', error);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const data = JSON.parse(content);
      mockUsers = data.mockUsers || [];
      mockBookings = data.mockBookings || [];
      mockProofs = data.mockProofs || [];
      mockLogs = data.mockLogs || [];
      mockGalleryPhotos = data.mockGalleryPhotos || [];
      mockAssetFolders = data.mockAssetFolders || [];
      mockAssetPhotos = data.mockAssetPhotos || [];
      console.log(`✅ Loaded persistent database from ${DB_FILE_PATH}`);
    } else {
      console.log('No persistent database file found. It will be created with default seed data.');
    }
  } catch (error) {
    console.error('Failed to load database from disk:', error);
  }
}

// Define Mongoose Schemas if connected
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'client', 'standard'], default: 'standard' },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  resetPasswordToken: { type: String }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  sessionDate: { type: Date, required: true },
  sessionType: { type: String, enum: ['Wedding', 'Portrait', 'Commercial', 'Event', 'Custom'], required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  price: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

const photoProofSchema = new mongoose.Schema({
  title: { type: String, required: true },
  clientEmail: { type: String, required: true },
  bookingId: { type: String },
  images: [{
    url: { type: String, required: true },
    title: { type: String, required: true },
    isWatermarked: { type: Boolean, default: true }
  }],
  status: { type: String, enum: ['Under Review', 'Approved', 'Revision Requested'], default: 'Under Review' },
  clientNotes: { type: String },
  screenshotPrevention: { type: Boolean, default: true },
  expiresAt: { type: Date }
}, { timestamps: true });

const systemLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  email: { type: String },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  details: { type: String, required: true }
}, { timestamps: true });

const galleryPhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'General' }
}, { timestamps: true });

const assetFolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

const assetPhotoSchema = new mongoose.Schema({
  folderId: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  format: { type: String, enum: ['JPG', 'PNG', 'RAW', 'TIFF', 'OTHER'], default: 'JPG' },
  sizeBytes: { type: Number, default: 0 }
}, { timestamps: true });

// Compile models
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export const BookingModel = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export const PhotoProofModel = mongoose.models.PhotoProof || mongoose.model('PhotoProof', photoProofSchema);
export const SystemLogModel = mongoose.models.SystemLog || mongoose.model('SystemLog', systemLogSchema);
export const GalleryPhotoModel = mongoose.models.GalleryPhoto || mongoose.model('GalleryPhoto', galleryPhotoSchema);
export const AssetFolderModel = mongoose.models.AssetFolder || mongoose.model('AssetFolder', assetFolderSchema);
export const AssetPhotoModel = mongoose.models.AssetPhoto || mongoose.model('AssetPhoto', assetPhotoSchema);

// Initial Seed Data Generator
async function seedDefaultData() {
  const adminEmail = 'admin@studio.com';
  const clientEmail = 'client@studio.com';
  const standardEmail = 'user@studio.com';
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const hashedClientPassword = await bcrypt.hash('Client123!', 10);
  const hashedStandardPassword = await bcrypt.hash('User123!', 10);

  const initialUsers = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      name: 'Studio Director',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin' as const,
      isVerified: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      name: 'Sarah Connor',
      email: clientEmail,
      password: hashedClientPassword,
      role: 'client' as const,
      isVerified: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      name: 'John Doe',
      email: standardEmail,
      password: hashedStandardPassword,
      role: 'standard' as const,
      isVerified: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialBookings = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientName: 'Sarah Connor',
      clientEmail: clientEmail,
      sessionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      sessionType: 'Portrait' as const,
      status: 'Confirmed' as const,
      price: 15000,
      notes: 'Studio portrait with high-key lighting setup. Wants black & white options.',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientName: 'Sarah Connor',
      clientEmail: clientEmail,
      sessionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      sessionType: 'Event' as const,
      status: 'Completed' as const,
      price: 45000,
      notes: 'Corporate anniversary event photoshoot. Prompt delivery requested.',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientName: 'Marcus Wright',
      clientEmail: 'marcus@skynet.com',
      sessionDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      sessionType: 'Commercial' as const,
      status: 'Pending' as const,
      price: 85000,
      notes: 'Industrial product catalog shoot. Awaiting security clearance.',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialProofs = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      title: 'Connor Studio Portrait Proofs',
      clientEmail: clientEmail,
      bookingId: '',
      images: [
        {
          id: 'img1',
          url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
          title: 'Portrait Selection 01',
          isWatermarked: true
        },
        {
          id: 'img2',
          url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
          title: 'Portrait Selection 02 - Profile',
          isWatermarked: true
        },
        {
          id: 'img3',
          url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
          title: 'Portrait Selection 03 - Editorial',
          isWatermarked: true
        }
      ],
      status: 'Under Review' as const,
      clientNotes: 'Loving the second option! Can we get a black and white retouching?',
      screenshotPrevention: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialLogs = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      eventType: 'SYSTEM_INITIALIZATION',
      email: 'system',
      ipAddress: '127.0.0.1',
      userAgent: 'Node-Core-Server',
      details: 'Photography portal backend initialized successfully with full security protocols.',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialGalleryPhotos = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      title: 'Wedding Ceremony Walk',
      category: 'Wedding',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      title: 'Bride Portrait Light',
      category: 'Wedding',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      title: 'Seaside Couple Editorial',
      category: 'Portrait',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      title: 'High Key Studio Fashion',
      category: 'Portrait',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      title: 'Classic B&W Profile',
      category: 'Portrait',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      title: 'Casual Mens Editorial',
      category: 'Portrait',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialFolders = [
    {
      _id: 'folder_wedding_01',
      name: 'Sarah & John Wedding',
      description: 'Wedding ceremony, outdoor couple portraits, and reception dance floor.',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'folder_portrait_02',
      name: 'Summer Portrait Sessions',
      description: 'Outdoor fashion editorial and corporate personal branding profiles.',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'folder_event_03',
      name: 'Corporate Gala Showcase',
      description: 'Award ceremonies and low-light ballroom event coverage.',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialPhotos = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      folderId: 'folder_wedding_01',
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      title: 'Wedding Ceremony Walk',
      format: 'RAW',
      sizeBytes: 24500000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      folderId: 'folder_wedding_01',
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      title: 'Bride Portrait Light',
      format: 'JPG',
      sizeBytes: 5400000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      folderId: 'folder_portrait_02',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      title: 'Classic Studio Profile',
      format: 'PNG',
      sizeBytes: 8900000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      folderId: 'folder_portrait_02',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      title: 'Casual Mens Editorial',
      format: 'RAW',
      sizeBytes: 31200000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      folderId: 'folder_event_03',
      url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      title: 'Gala Ballroom Crowd',
      format: 'JPG',
      sizeBytes: 4200000,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  if (!isUsingMockDB) {
    try {
      // Seed MDB
      const userCount = await (UserModel as any).countDocuments();
      if (userCount === 0) {
        await (BookingModel as any).insertMany(initialBookings);
        await (PhotoProofModel as any).insertMany(initialProofs);
        await (SystemLogModel as any).insertMany(initialLogs);
        await (GalleryPhotoModel as any).insertMany(initialGalleryPhotos);
        await (AssetFolderModel as any).insertMany(initialFolders);
        await (AssetPhotoModel as any).insertMany(initialPhotos);
        console.log('MongoDB pre-seeded successfully.');
      }
    } catch (e) {
      console.error('Error seeding MongoDB:', e);
    }
  } else {
    // Seed in-memory arrays only if empty
    if (mockUsers.length === 0) {
      mockUsers = [...initialUsers];
    }
    if (mockBookings.length === 0) {
      mockBookings = [...initialBookings];
    }
    if (mockProofs.length === 0) {
      mockProofs = [...initialProofs];
    }
    if (mockLogs.length === 0) {
      mockLogs = [...initialLogs];
    }
    if (mockGalleryPhotos.length === 0) {
      mockGalleryPhotos = [...initialGalleryPhotos];
    }
    if (mockAssetFolders.length === 0) {
      mockAssetFolders = [...initialFolders];
    }
    if (mockAssetPhotos.length === 0) {
      mockAssetPhotos = [...initialPhotos];
    }
    console.log('Mock local database pre-seeded successfully.');
    saveToDisk();
  }
}

// Connect to MongoDB
export async function connectDB() {
  console.log('Initializing local secure file-system storage database...');
  isUsingMockDB = true;
  loadFromDisk();
  await seedDefaultData();
  console.log('✅ Local persistent database is ready and active.');
}

// DB Abstraction API for User
export const DBUser = {
  async findOne(query: { email?: string; _id?: string; resetPasswordToken?: string }) {
    if (!isUsingMockDB) {
      return await (UserModel as any).findOne(query);
    }
    if (query.email) {
      return mockUsers.find(u => u.email === query.email.toLowerCase());
    }
    if (query._id) {
      return mockUsers.find(u => u._id === query._id);
    }
    if (query.resetPasswordToken) {
      return mockUsers.find(u => u.resetPasswordToken === query.resetPasswordToken);
    }
    return null;
  },

  async create(userData: any) {
    userData._id = userData._id || new mongoose.Types.ObjectId().toString();
    userData.createdAt = new Date();
    userData.updatedAt = new Date();
    userData.failedLoginAttempts = userData.failedLoginAttempts || 0;
    userData.email = userData.email.toLowerCase();

    if (!isUsingMockDB) {
      const newUser = new (UserModel as any)(userData);
      return await newUser.save();
    }
    mockUsers.push(userData);
    saveToDisk();
    return userData;
  },

  async updateOne(query: { _id: string }, updateData: any) {
    if (!isUsingMockDB) {
      return await (UserModel as any).updateOne(query, { $set: updateData });
    }
    const idx = mockUsers.findIndex(u => u._id === query._id);
    if (idx !== -1) {
      mockUsers[idx] = { ...mockUsers[idx], ...updateData, updatedAt: new Date() };
      saveToDisk();
      return { nModified: 1 };
    }
    return { nModified: 0 };
  },

  async find() {
    if (!isUsingMockDB) {
      return await (UserModel as any).find({}, '-password');
    }
    return mockUsers.map(({ password, ...rest }) => rest);
  }
};

// DB Abstraction API for Bookings
export const DBBooking = {
  async find(query: any = {}) {
    if (!isUsingMockDB) {
      return await (BookingModel as any).find(query).sort({ sessionDate: -1 });
    }
    let res = [...mockBookings];
    if (query.clientEmail) {
      res = res.filter(b => b.clientEmail === query.clientEmail.toLowerCase());
    }
    return res.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  },

  async findById(id: string) {
    if (!isUsingMockDB) {
      return await (BookingModel as any).findById(id);
    }
    return mockBookings.find(b => b._id === id) || null;
  },

  async create(bookingData: any) {
    bookingData._id = bookingData._id || new mongoose.Types.ObjectId().toString();
    bookingData.createdAt = new Date();
    bookingData.updatedAt = new Date();
    bookingData.status = bookingData.status || 'Pending';

    if (!isUsingMockDB) {
      const newBooking = new (BookingModel as any)(bookingData);
      return await newBooking.save();
    }
    mockBookings.push(bookingData);
    saveToDisk();
    return bookingData;
  },

  async findByIdAndUpdate(id: string, updateData: any) {
    if (!isUsingMockDB) {
      return await (BookingModel as any).findByIdAndUpdate(id, updateData, { new: true });
    }
    const idx = mockBookings.findIndex(b => b._id === id);
    if (idx !== -1) {
      mockBookings[idx] = { ...mockBookings[idx], ...updateData, updatedAt: new Date() };
      saveToDisk();
      return mockBookings[idx];
    }
    return null;
  },

  async findByIdAndDelete(id: string) {
    if (!isUsingMockDB) {
      return await (BookingModel as any).findByIdAndDelete(id);
    }
    const idx = mockBookings.findIndex(b => b._id === id);
    if (idx !== -1) {
      const removed = mockBookings[idx];
      mockBookings.splice(idx, 1);
      saveToDisk();
      return removed;
    }
    return null;
  }
};

// DB Abstraction API for PhotoProofs
export const DBPhotoProof = {
  async find(query: any = {}) {
    if (!isUsingMockDB) {
      return await (PhotoProofModel as any).find(query).sort({ createdAt: -1 });
    }
    let res = [...mockProofs];
    if (query.clientEmail) {
      res = res.filter(p => p.clientEmail === query.clientEmail.toLowerCase());
    }
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findById(id: string) {
    if (!isUsingMockDB) {
      return await (PhotoProofModel as any).findById(id);
    }
    return mockProofs.find(p => p._id === id) || null;
  },

  async create(proofData: any) {
    proofData._id = proofData._id || new mongoose.Types.ObjectId().toString();
    proofData.createdAt = new Date();
    proofData.updatedAt = new Date();

    if (!isUsingMockDB) {
      const newProof = new (PhotoProofModel as any)(proofData);
      return await newProof.save();
    }
    mockProofs.push(proofData);
    saveToDisk();
    return proofData;
  },

  async findByIdAndUpdate(id: string, updateData: any) {
    if (!isUsingMockDB) {
      return await (PhotoProofModel as any).findByIdAndUpdate(id, updateData, { new: true });
    }
    const idx = mockProofs.findIndex(p => p._id === id);
    if (idx !== -1) {
      mockProofs[idx] = { ...mockProofs[idx], ...updateData, updatedAt: new Date() };
      saveToDisk();
      return mockProofs[idx];
    }
    return null;
  },

  async findByIdAndDelete(id: string) {
    if (!isUsingMockDB) {
      return await (PhotoProofModel as any).findByIdAndDelete(id);
    }
    const idx = mockProofs.findIndex(p => p._id === id);
    if (idx !== -1) {
      const removed = mockProofs[idx];
      mockProofs.splice(idx, 1);
      saveToDisk();
      return removed;
    }
    return null;
  }
};

// DB Abstraction API for SystemLogs
export const DBSystemLog = {
  async find() {
    if (!isUsingMockDB) {
      return await (SystemLogModel as any).find().sort({ createdAt: -1 }).limit(100);
    }
    return [...mockLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100);
  },

  async create(logData: any) {
    logData._id = logData._id || new mongoose.Types.ObjectId().toString();
    logData.createdAt = new Date();

    if (!isUsingMockDB) {
      const newLog = new (SystemLogModel as any)(logData);
      return await newLog.save();
    }
    mockLogs.push(logData);
    saveToDisk();
    return logData;
  }
};

// DB Abstraction API for GalleryPhotos
export const DBGalleryPhoto = {
  async find(query: any = {}) {
    if (!isUsingMockDB) {
      return await (GalleryPhotoModel as any).find(query).sort({ createdAt: -1 });
    }
    let res = [...mockGalleryPhotos];
    if (query.category) {
      res = res.filter(p => p.category === query.category);
    }
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findById(id: string) {
    if (!isUsingMockDB) {
      return await (GalleryPhotoModel as any).findById(id);
    }
    return mockGalleryPhotos.find(p => p._id === id) || null;
  },

  async create(photoData: any) {
    photoData._id = photoData._id || new mongoose.Types.ObjectId().toString();
    photoData.createdAt = new Date();
    photoData.updatedAt = new Date();

    if (!isUsingMockDB) {
      const newPhoto = new (GalleryPhotoModel as any)(photoData);
      return await newPhoto.save();
    }
    mockGalleryPhotos.push(photoData);
    saveToDisk();
    return photoData;
  },

  async findByIdAndDelete(id: string) {
    if (!isUsingMockDB) {
      return await (GalleryPhotoModel as any).findByIdAndDelete(id);
    }
    const idx = mockGalleryPhotos.findIndex(p => p._id === id);
    if (idx !== -1) {
      const removed = mockGalleryPhotos[idx];
      mockGalleryPhotos.splice(idx, 1);
      saveToDisk();
      return removed;
    }
    return null;
  }
};

// DB Abstraction API for AssetFolders
export const DBAssetFolder = {
  async find() {
    if (!isUsingMockDB) {
      return await (AssetFolderModel as any).find({}).sort({ createdAt: -1 });
    }
    return [...mockAssetFolders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(folderData: any) {
    folderData._id = folderData._id || new mongoose.Types.ObjectId().toString();
    folderData.createdAt = new Date();
    folderData.updatedAt = new Date();

    if (!isUsingMockDB) {
      const folder = new (AssetFolderModel as any)(folderData);
      return await folder.save();
    }
    mockAssetFolders.push(folderData);
    saveToDisk();
    return folderData;
  },

  async findByIdAndDelete(id: string) {
    if (!isUsingMockDB) {
      await (AssetPhotoModel as any).deleteMany({ folderId: id });
      return await (AssetFolderModel as any).findByIdAndDelete(id);
    }
    mockAssetPhotos = mockAssetPhotos.filter(p => p.folderId !== id);
    const idx = mockAssetFolders.findIndex(f => f._id === id);
    if (idx !== -1) {
      const removed = mockAssetFolders[idx];
      mockAssetFolders.splice(idx, 1);
      saveToDisk();
      return removed;
    }
    return null;
  }
};

// DB Abstraction API for AssetPhotos
export const DBAssetPhoto = {
  async find(query: any = {}) {
    if (!isUsingMockDB) {
      return await (AssetPhotoModel as any).find(query).sort({ createdAt: -1 });
    }
    let res = [...mockAssetPhotos];
    if (query.folderId) {
      res = res.filter(p => p.folderId === query.folderId);
    }
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(photoData: any) {
    photoData._id = photoData._id || new mongoose.Types.ObjectId().toString();
    photoData.createdAt = new Date();
    photoData.updatedAt = new Date();
    if (!photoData.format) photoData.format = 'JPG';
    if (!photoData.sizeBytes) photoData.sizeBytes = 5000000;

    if (!isUsingMockDB) {
      const photo = new (AssetPhotoModel as any)(photoData);
      return await photo.save();
    }
    mockAssetPhotos.push(photoData);
    saveToDisk();
    return photoData;
  },

  async findByIdAndDelete(id: string) {
    if (!isUsingMockDB) {
      return await (AssetPhotoModel as any).findByIdAndDelete(id);
    }
    const idx = mockAssetPhotos.findIndex(p => p._id === id);
    if (idx !== -1) {
      const removed = mockAssetPhotos[idx];
      mockAssetPhotos.splice(idx, 1);
      saveToDisk();
      return removed;
    }
    return null;
  }
};
