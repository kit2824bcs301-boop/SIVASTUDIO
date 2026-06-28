/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client' | 'standard';
  isVerified: boolean;
  failedLoginAttempts: number;
  lockUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  sessionDate: string;
  sessionType: 'Wedding' | 'Portrait' | 'Commercial' | 'Event' | 'Custom';
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  price: number;
  notes?: string;
  createdAt: string;
}

export interface PhotoProofItem {
  id: string;
  url: string;
  title: string;
  isWatermarked: boolean;
}

export interface PhotoProof {
  id: string;
  title: string;
  clientEmail: string;
  bookingId?: string;
  images: PhotoProofItem[];
  status: 'Under Review' | 'Approved' | 'Revision Requested';
  clientNotes?: string;
  screenshotPrevention: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface SystemLog {
  id: string;
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILED' | 'SCREENSHOT_DETECTION' | 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS' | 'SYSTEM_INITIALIZATION';
  email?: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}
