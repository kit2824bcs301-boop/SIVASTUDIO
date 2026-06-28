/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, PhotoProof, SystemLog } from '../types.js';

interface AdminDashboardProps {
  accessToken: string;
}

// Preset photo assets for easy gallery creation (avoids forcing manual text input of URLs)
const PHOTO_PRESETS = [
  { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', title: 'Wedding Ceremony Walk' },
  { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80', title: 'Bride Portrait Light' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', title: 'Seaside Couple Editorial' },
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', title: 'High Key Studio Fashion' },
  { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80', title: 'Classic B&W Profile' },
  { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80', title: 'Casual Mens Editorial' }
];

export default function AdminDashboard({ accessToken }: AdminDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'analytics' | 'bookings' | 'proofs' | 'logs' | 'gallery' | 'library'>('analytics');

  // Database States
  const [analytics, setAnalytics] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proofs, setProofs] = useState<PhotoProof[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<{ _id?: string, id?: string, url: string, title: string, category: string }[]>([]);
  const [assetFolders, setAssetFolders] = useState<{ _id?: string, id?: string, name: string, description: string, createdAt: Date }[]>([]);
  const [assetPhotos, setAssetPhotos] = useState<{ _id?: string, id?: string, folderId: string, url: string, title: string, format: string, sizeBytes: number, createdAt: Date }[]>([]);

  // Page Level UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form States - Create Booking
  const [newBookingClientName, setNewBookingClientName] = useState('');
  const [newBookingClientEmail, setNewBookingClientEmail] = useState('');
  const [newBookingDate, setNewBookingDate] = useState('');
  const [newBookingType, setNewBookingType] = useState<'Wedding' | 'Portrait' | 'Commercial' | 'Event' | 'Custom'>('Portrait');
  const [newBookingPrice, setNewBookingPrice] = useState('500');
  const [newBookingNotes, setNewBookingNotes] = useState('');
  const [bookingSubmitLoading, setBookingSubmitLoading] = useState(false);

  // Form States - Create Proof
  const [newProofTitle, setNewProofTitle] = useState('');
  const [newProofClientEmail, setNewProofClientEmail] = useState('client@studio.com');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [screenshotPrevention, setScreenshotPrevention] = useState(true);
  const [proofExpiryDays, setProofExpiryDays] = useState('30');
  const [proofSubmitLoading, setProofSubmitLoading] = useState(false);

  // Form States - Gallery Photo
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Wedding');
  const [photoSubmitLoading, setPhotoSubmitLoading] = useState(false);

  // Form States - Library Folder & Photos
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [folderSubmitLoading, setFolderSubmitLoading] = useState(false);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetFormat, setNewAssetFormat] = useState<'JPG' | 'PNG' | 'RAW' | 'TIFF' | 'OTHER'>('JPG');
  const [newAssetSizeMB, setNewAssetSizeMB] = useState('5');
  const [assetSubmitLoading, setAssetSubmitLoading] = useState(false);

  // File change helper for Gallery Upload
  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGalleryFile(file);
      // Auto-populate Title if it's currently empty
      if (!newPhotoTitle) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const titleCased = nameWithoutExt
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        setNewPhotoTitle(titleCased);
      }
    }
  };

  // File change helper for Client Asset Upload
  const handleAssetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAssetFile(file);
      // Auto-populate Title if it's currently empty
      if (!newAssetTitle) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const titleCased = nameWithoutExt
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        setNewAssetTitle(titleCased);
      }
      // Auto-populate Format
      const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();
      if (['JPG', 'JPEG'].includes(ext)) {
        setNewAssetFormat('JPG');
      } else if (ext === 'PNG') {
        setNewAssetFormat('PNG');
      } else if (['RAW', 'NEF', 'CR3', 'ARW', 'DNG', 'CR2', 'RAF', 'RW2', 'ORF', 'PEF'].includes(ext)) {
        setNewAssetFormat('RAW');
      } else if (['TIF', 'TIFF'].includes(ext)) {
        setNewAssetFormat('TIFF');
      } else {
        setNewAssetFormat('OTHER');
      }
      // Auto-populate Size MB
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setNewAssetSizeMB(sizeMB);
    }
  };

  // Active viewing/selected folder in Library UI
  const [activeFolderId, setActiveFolderId] = useState<string>('');

  // Active viewing/selected folder filter in Deploy/Share Proofs Form
  const [proofSelectorFolderId, setProofSelectorFolderId] = useState<string>('');

  // Async loader
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
      
      const [analyticsRes, bookingsRes, proofsRes, logsRes, galleryRes, foldersRes, photosRes] = await Promise.all([
        fetch('/api/analytics', { headers }),
        fetch('/api/bookings', { headers }),
        fetch('/api/proofs', { headers }),
        fetch('/api/auth/logs', { headers }),
        fetch('/api/gallery'),
        fetch('/api/asset-folders', { headers }),
        fetch('/api/asset-photos', { headers })
      ]);

      if (!analyticsRes.ok || !bookingsRes.ok || !proofsRes.ok || !logsRes.ok || !galleryRes.ok || !foldersRes.ok || !photosRes.ok) {
        throw new Error('Could not pull secure administrative data. Session may be expired.');
      }

      const analyticsData = await analyticsRes.json();
      const bookingsData = await bookingsRes.json();
      const proofsData = await proofsRes.json();
      const logsData = await logsRes.json();
      const galleryData = await galleryRes.json();
      const foldersData = await foldersRes.json();
      const photosData = await photosRes.json();

      setAnalytics(analyticsData.data);
      setBookings(bookingsData.bookings);
      setProofs(proofsData.proofs);
      setLogs(logsData.logs);
      
      const photosList = galleryData.photos || [];
      setGalleryPhotos(photosList);

      const foldersList = foldersData.folders || [];
      setAssetFolders(foldersList);
      if (foldersList.length > 0) {
        if (!activeFolderId) {
          const firstFolderId = foldersList[0]._id || foldersList[0].id;
          if (firstFolderId) setActiveFolderId(firstFolderId);
        }
        if (!selectedFolderId) {
          const firstFolderId = foldersList[0]._id || foldersList[0].id;
          if (firstFolderId) setSelectedFolderId(firstFolderId);
        }
        if (!proofSelectorFolderId) {
          const firstFolderId = foldersList[0]._id || foldersList[0].id;
          if (firstFolderId) setProofSelectorFolderId(firstFolderId);
        }
      }

      const assetPhotosList = photosData.photos || [];
      setAssetPhotos(assetPhotosList);

      if (selectedPhotoIds.length === 0 && assetPhotosList.length > 0) {
        const firstId = assetPhotosList[0]._id || assetPhotosList[0].id;
        if (firstId) {
          setSelectedPhotoIds([firstId]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  // Handle Create Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionSuccess(null);
    setBookingSubmitLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: newBookingClientName,
          clientEmail: newBookingClientEmail,
          sessionDate: newBookingDate,
          sessionType: newBookingType,
          price: Number(newBookingPrice),
          notes: newBookingNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create booking.');

      // Clear fields
      setNewBookingClientName('');
      setNewBookingClientEmail('');
      setNewBookingDate('');
      setNewBookingNotes('');
      
      setActionSuccess('Booking successfully logged in DB.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBookingSubmitLoading(false);
    }
  };

  // Handle Edit Booking Status
  const handleUpdateBookingStatus = async (id: string, newStatus: string) => {
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update booking status.');

      setActionSuccess('Booking status updated.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Delete Booking
  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this booking entry?')) return;
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete booking.');

      setActionSuccess('Booking removed.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Create Proof
  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionSuccess(null);
    setProofSubmitLoading(true);

    if (selectedPhotoIds.length === 0) {
      setError('Please select at least one photo from the asset library.');
      setProofSubmitLoading(false);
      return;
    }

    // Map selected photo IDs to image objects
    const imagesArray = selectedPhotoIds.map(id => {
      const p = assetPhotos.find(photo => (photo._id || photo.id) === id);
      return {
        url: p?.url || '',
        title: p?.title || '',
        isWatermarked: true
      };
    }).filter(img => img.url !== '');

    if (imagesArray.length === 0) {
      setError('Please select valid photos from the asset library.');
      setProofSubmitLoading(false);
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(proofExpiryDays));

    try {
      const res = await fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProofTitle,
          clientEmail: newProofClientEmail,
          images: imagesArray,
          screenshotPrevention,
          expiresAt: expiryDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create proofing gallery.');

      // Clear fields
      setNewProofTitle('');
      if (assetPhotos.length > 0) {
        const firstId = assetPhotos[0]._id || assetPhotos[0].id;
        if (firstId) {
          setSelectedPhotoIds([firstId]);
        }
      } else {
        setSelectedPhotoIds([]);
      }
      
      setActionSuccess('Photo proofing gallery created and shared.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProofSubmitLoading(false);
    }
  };

  // Handle Delete Proof
  const handleDeleteProof = async (id: string) => {
    if (!window.confirm('Delete this shared photo proofing gallery? This will block client proofing access immediately.')) return;
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/proofs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete proof.');

      setActionSuccess('Proofing gallery deleted.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Helper toggle photo selection
  const togglePhotoIdSelection = (id: string) => {
    if (selectedPhotoIds.includes(id)) {
      setSelectedPhotoIds(selectedPhotoIds.filter(i => i !== id));
    } else {
      setSelectedPhotoIds([...selectedPhotoIds, id]);
    }
  };

  // Handle Add Gallery Photo manually
  const handleAddGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionSuccess(null);
    setPhotoSubmitLoading(true);

    if (!galleryFile) {
      setError('Please select an image file to upload.');
      setPhotoSubmitLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', galleryFile);
      formData.append('title', newPhotoTitle);
      formData.append('category', newPhotoCategory);

      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add photo to portfolio gallery.');

      // Clear input fields
      setGalleryFile(null);
      setNewPhotoTitle('');
      
      setActionSuccess('New photo successfully uploaded to the Studio Portfolio Gallery.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPhotoSubmitLoading(false);
    }
  };

  // Handle Delete Gallery Photo manually
  const handleDeleteGalleryPhoto = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this photo from the Studio Portfolio Gallery?')) return;
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete photo.');

      setActionSuccess('Photo removed from the Studio Portfolio Gallery.');
      
      // Filter out deleted ID from selection
      setSelectedPhotoIds(selectedPhotoIds.filter(i => i !== id));
      
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Create Client Asset Folder
  const handleCreateAssetFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionSuccess(null);
    setFolderSubmitLoading(true);

    if (!newFolderName) {
      setError('Folder Name is required.');
      setFolderSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/asset-folders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDescription
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create asset folder.');

      setNewFolderName('');
      setNewFolderDescription('');
      setActionSuccess(`Successfully created asset folder "${data.folder.name}".`);
      
      const newId = data.folder._id || data.folder.id;
      if (newId) {
        setActiveFolderId(newId);
        setSelectedFolderId(newId);
      }

      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFolderSubmitLoading(false);
    }
  };

  // Handle Delete Client Asset Folder
  const handleDeleteAssetFolder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this folder and ALL contained photos? This action cannot be undone.')) return;
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/asset-folders/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete folder.');

      setActionSuccess('Asset folder and all nested photos deleted successfully.');
      
      // Reset active folder if it was deleted
      if (activeFolderId === id) {
        setActiveFolderId('');
      }
      if (selectedFolderId === id) {
        setSelectedFolderId('');
      }
      if (proofSelectorFolderId === id) {
        setProofSelectorFolderId('');
      }

      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Create Client Asset Photo
  const handleCreateAssetPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionSuccess(null);
    setAssetSubmitLoading(true);

    const folderToUse = selectedFolderId || activeFolderId;

    if (!folderToUse) {
      setError('Please select or create a client folder first.');
      setAssetSubmitLoading(false);
      return;
    }
    if (!assetFile) {
      setError('Please select a photo file to upload.');
      setAssetSubmitLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', assetFile);
      formData.append('folderId', folderToUse);
      formData.append('title', newAssetTitle);
      formData.append('format', newAssetFormat);

      const res = await fetch('/api/asset-photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload photo asset.');

      setAssetFile(null);
      setNewAssetTitle('');
      setActionSuccess(`Photo "${data.photo.title}" uploaded to the folder.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssetSubmitLoading(false);
    }
  };

  // Handle Delete Client Asset Photo
  const handleDeleteAssetPhoto = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this photo from the library?')) return;
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/asset-photos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete photo asset.');

      setActionSuccess('Photo asset deleted.');
      setSelectedPhotoIds(selectedPhotoIds.filter(i => i !== id));
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-dark mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
        <p className="fw-semibold text-muted">Securing administrative sandbox environment...</p>
      </div>
    );
  }

  // Format currency helper
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Tab Navigation Menu */}
      <div className="nav nav-pills mb-4 bg-light p-1.5 rounded-3 d-flex gap-1 justify-content-center justify-content-md-start">
        <button 
          className={`nav-link rounded-2.5 px-3 py-2 fw-semibold ${activeTab === 'analytics' ? 'bg-dark text-white active' : 'text-dark'}`}
          onClick={() => { setActiveTab('analytics'); setActionSuccess(null); }}
        >
          <i className="fa-solid fa-chart-pie me-1.5"></i> Administrative Analytics
        </button>
        <button 
          className={`nav-link rounded-2.5 px-3 py-2 fw-semibold ${activeTab === 'bookings' ? 'bg-dark text-white active' : 'text-dark'}`}
          onClick={() => { setActiveTab('bookings'); setActionSuccess(null); }}
        >
          <i className="fa-solid fa-calendar-days me-1.5"></i> Manage Bookings
        </button>
        <button 
          className={`nav-link rounded-2.5 px-3 py-2 fw-semibold ${activeTab === 'proofs' ? 'bg-dark text-white active' : 'text-dark'}`}
          onClick={() => { setActiveTab('proofs'); setActionSuccess(null); }}
        >
          <i className="fa-solid fa-images me-1.5"></i> Client Photo Proofs
        </button>
        <button 
          className={`nav-link rounded-2.5 px-3 py-2 fw-semibold ${activeTab === 'gallery' ? 'bg-dark text-white active' : 'text-dark'}`}
          onClick={() => { setActiveTab('gallery'); setActionSuccess(null); }}
        >
          <i className="fa-solid fa-camera me-1.5"></i> Studio Portfolio Gallery
        </button>
        <button 
          className={`nav-link rounded-2.5 px-3 py-2 fw-semibold ${activeTab === 'library' ? 'bg-dark text-white active' : 'text-dark'}`}
          onClick={() => { setActiveTab('library'); setActionSuccess(null); }}
        >
          <i className="fa-solid fa-folder-open me-1.5"></i> Client Asset Library
        </button>
        <button 
          className={`nav-link rounded-2.5 px-3 py-2 fw-semibold ${activeTab === 'logs' ? 'bg-dark text-white active' : 'text-dark'}`}
          onClick={() => { setActiveTab('logs'); setActionSuccess(null); }}
        >
          <i className="fa-solid fa-shield-halved me-1.5"></i> Security Auditing Logs
          {logs.some(l => l.eventType === 'SCREENSHOT_DETECTION') && (
            <span className="badge bg-danger ms-1 text-xxs">Alert</span>
          )}
        </button>
      </div>

      {/* Global Toast Success and Error Bars */}
      {actionSuccess && (
        <div className="alert alert-success d-flex align-items-center mb-4 border-0 py-2.5 rounded-3 shadow-sm" role="alert">
          <i className="fa-solid fa-circle-check me-2 fs-5"></i>
          <div className="small fw-semibold">{actionSuccess}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4 border-0 py-2.5 rounded-3 shadow-sm" role="alert">
          <i className="fa-solid fa-triangle-exclamation me-2 fs-5"></i>
          <div className="small fw-semibold">{error}</div>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}

      {/* 1. ANALYTICS VIEW */}
      {activeTab === 'analytics' && analytics && (
        <div>
          {/* Key Metrics Bento Grid */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small fw-bold text-muted uppercase tracking-wider">Total Revenue</span>
                  <div className="p-2 bg-success bg-opacity-10 text-success rounded-3"><i className="fa-solid fa-indian-rupee-sign"></i></div>
                </div>
                <h3 className="fw-extrabold text-dark mb-1">{formatINR(analytics.summary.totalRevenue)}</h3>
                <span className="text-xs text-muted">Confirmed & Completed</span>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small fw-bold text-muted uppercase tracking-wider">Active Bookings</span>
                  <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3"><i className="fa-solid fa-calendar-check"></i></div>
                </div>
                <h3 className="fw-extrabold text-dark mb-1">{analytics.summary.totalBookings}</h3>
                <span className="text-xs text-muted">Pending: {analytics.summary.pendingRevenue > 0 ? formatINR(analytics.summary.pendingRevenue) : '0'} potential</span>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small fw-bold text-muted uppercase tracking-wider">Proofs Uploaded</span>
                  <div className="p-2 bg-info bg-opacity-10 text-info rounded-3"><i className="fa-solid fa-film"></i></div>
                </div>
                <h3 className="fw-extrabold text-dark mb-1">{analytics.summary.totalProofs}</h3>
                <span className="text-xs text-muted">Galleries shared with clients</span>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100 border-start border-danger border-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small fw-bold text-muted uppercase tracking-wider">Security Violations</span>
                  <div className="p-2 bg-danger bg-opacity-10 text-danger rounded-3 animate-pulse"><i className="fa-solid fa-triangle-exclamation"></i></div>
                </div>
                <h3 className="fw-extrabold text-danger mb-1">{analytics.summary.screenshotDetections}</h3>
                <span className="text-xs text-muted">Potential screenshots logged</span>
              </div>
            </div>
          </div>

          {/* Interactive Custom SVG Analytics Charts */}
          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold text-dark mb-3"><i className="fa-solid fa-chart-line me-1 text-primary"></i> Studio Monthly Revenue Trend</h5>
                <div className="position-relative" style={{ height: '240px' }}>
                  {/* Dynamic SVG bar chart designed with pixel-perfect details */}
                  <svg className="w-100 h-100" viewBox="0 0 500 240" preserveAspectRatio="none">
                    {/* Gridlines */}
                    <line x1="40" y1="40" x2="480" y2="40" stroke="#e9ecef" strokeDasharray="4" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="#e9ecef" strokeDasharray="4" />
                    <line x1="40" y1="160" x2="480" y2="160" stroke="#e9ecef" strokeDasharray="4" />
                    <line x1="40" y1="200" x2="480" y2="200" stroke="#e9ecef" />

                    {/* Chart Bars */}
                    {analytics.revenueTrend.map((item: any, idx: number) => {
                      const totalWidth = 440;
                      const barGap = totalWidth / analytics.revenueTrend.length;
                      const x = 50 + idx * barGap;
                      // Normalize height to max revenue
                      const maxRevenue = Math.max(...analytics.revenueTrend.map((i: any) => i.revenue), 50000);
                      const barHeight = (item.revenue / maxRevenue) * 140;
                      const y = 200 - barHeight;
                      
                      return (
                        <g key={idx}>
                          <rect 
                            x={x} 
                            y={y} 
                            width="28" 
                            height={barHeight} 
                            rx="4" 
                            fill="rgba(59, 130, 246, 0.65)" 
                            stroke="rgba(255, 255, 255, 0.15)"
                            className="transition-all hover:fill-blue-500"
                          />
                          <text x={x + 14} y="222" fontSize="9" fontWeight="bold" fill="#94a3b8" textAnchor="middle">{item.name}</text>
                          <text x={x + 14} y={y - 8} fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">{formatINR(item.revenue)}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold text-dark mb-3"><i className="fa-solid fa-camera-retro me-1 text-info"></i> Session Categories</h5>
                <div className="d-flex flex-column gap-3 mt-2">
                  {analytics.sessionBreakdown.map((item: any, idx: number) => {
                    const colors = ['bg-dark', 'bg-secondary', 'bg-info', 'bg-primary', 'bg-success'];
                    const colorClass = colors[idx % colors.length];
                    const maxVal = Math.max(...analytics.sessionBreakdown.map((b: any) => b.value), 1);
                    const percentage = (item.value / maxVal) * 100;

                    return (
                      <div key={idx}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small fw-semibold text-dark">{item.name}</span>
                          <span className="small fw-bold text-muted">{item.value} bookings</span>
                        </div>
                        <div className="progress rounded-pill" style={{ height: '8px' }}>
                          <div 
                            className={`progress-bar rounded-pill ${colorClass}`} 
                            role="progressbar" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Security Threat Matrix Alert */}
          {analytics.securityStats.screenshotDetections > 0 && (
            <div className="card border-0 shadow-sm rounded-4 bg-danger bg-opacity-10 border border-danger border-opacity-20 p-4 mb-4">
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 bg-danger text-white rounded-4 fs-3">
                  <i className="fa-solid fa-shield-halved animate-bounce"></i>
                </div>
                <div>
                  <h5 className="fw-bold text-danger mb-1">Screenshot Intrusion Alerts Present</h5>
                  <p className="small text-dark mb-0 opacity-85">
                    Our multi-layer screenshot protection system has intercepted <strong>{analytics.securityStats.screenshotDetections} potential screenshot attempts</strong>. Review the Security Auditing Logs immediately to verify client compliance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MANAGE BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div className="row g-4">
          {/* Create Booking Form */}
          <div className="col-xl-4">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <h5 className="fw-bold text-dark mb-3"><i className="fa-solid fa-plus me-1 text-primary"></i> Record New Session</h5>
              <form onSubmit={handleCreateBooking}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Client Full Name</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0" 
                    placeholder="Enter client name" 
                    value={newBookingClientName} 
                    onChange={e => setNewBookingClientName(e.target.value)} 
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Client Email Address</label>
                  <input 
                    type="email" 
                    className="form-control bg-light border-0" 
                    placeholder="client@studio.com" 
                    value={newBookingClientEmail} 
                    onChange={e => setNewBookingClientEmail(e.target.value)} 
                    required
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Session Date</label>
                    <input 
                      type="date" 
                      className="form-control bg-light border-0" 
                      value={newBookingDate} 
                      onChange={e => setNewBookingDate(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Base Price (INR)</label>
                    <input 
                      type="number" 
                      className="form-control bg-light border-0" 
                      placeholder="15000" 
                      value={newBookingPrice} 
                      onChange={e => setNewBookingPrice(e.target.value)} 
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Shoot Category</label>
                  <select 
                    className="form-select bg-light border-0" 
                    value={newBookingType} 
                    onChange={e => setNewBookingType(e.target.value as any)}
                  >
                    <option value="Portrait">Portrait Shoot</option>
                    <option value="Wedding">Wedding Session</option>
                    <option value="Commercial">Commercial/Catalog</option>
                    <option value="Event">Event Coverage</option>
                    <option value="Custom">Custom Editorial</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Notes & Specifications</label>
                  <textarea 
                    className="form-control bg-light border-0 text-sm" 
                    rows={3} 
                    placeholder="E.g. retouches, high-key lights, specific location details..."
                    value={newBookingNotes}
                    onChange={e => setNewBookingNotes(e.target.value)}
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold"
                  disabled={bookingSubmitLoading}
                >
                  {bookingSubmitLoading ? 'Saving...' : 'Register Secure Session'}
                </button>
              </form>
            </div>
          </div>

          {/* Bookings Table Panel */}
          <div className="col-xl-8">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0"><i className="fa-solid fa-list me-1"></i> Recorded Photography Sessions ({bookings.length})</h5>
                <button className="btn btn-light btn-sm text-xs rounded-2 fw-semibold" onClick={loadData}>
                  <i className="fa-solid fa-arrows-rotate"></i> Sync DB
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-0">No booking sessions currently logged in database.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted small">
                        <th>Client</th>
                        <th>Session Date</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b: any) => (
                        <tr key={b._id || b.id} className="text-sm">
                          <td>
                            <div className="fw-bold text-dark">{b.clientName}</div>
                            <div className="text-muted text-xs">{b.clientEmail}</div>
                          </td>
                          <td className="fw-medium">{new Date(b.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1">{b.sessionType}</span>
                          </td>
                          <td className="fw-bold">{formatINR(b.price)}</td>
                          <td>
                            <span className={`badge px-2 py-1 rounded-pill text-xs fw-semibold ${
                              b.status === 'Completed' ? 'bg-success bg-opacity-10 text-success' :
                              b.status === 'Confirmed' ? 'bg-primary bg-opacity-10 text-primary' :
                              b.status === 'Cancelled' ? 'bg-danger bg-opacity-10 text-danger' :
                              'bg-warning bg-opacity-10 text-warning'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="dropdown d-inline-block">
                              <button className="btn btn-outline-dark btn-xs dropdown-toggle rounded-2" type="button" data-bs-toggle="dropdown">
                                Status
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end text-sm">
                                <li><button className="dropdown-item" onClick={() => handleUpdateBookingStatus(b._id || b.id, 'Confirmed')}>Confirm</button></li>
                                <li><button className="dropdown-item" onClick={() => handleUpdateBookingStatus(b._id || b.id, 'Completed')}>Mark Completed</button></li>
                                <li><button className="dropdown-item" onClick={() => handleUpdateBookingStatus(b._id || b.id, 'Cancelled')}>Cancel</button></li>
                              </ul>
                            </div>
                            <button 
                              className="btn btn-link text-danger btn-xs ms-1.5 p-0"
                              onClick={() => handleDeleteBooking(b._id || b.id)}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MANAGE PROOFS TAB */}
      {activeTab === 'proofs' && (
        <div className="row g-4">
          {/* Create Proofing Gallery */}
          <div className="col-xl-5">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <h5 className="fw-bold text-dark mb-3"><i className="fa-solid fa-plus me-1 text-primary"></i> Create Client Proof Gallery</h5>
              <form onSubmit={handleCreateProof}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Gallery Project Title</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0" 
                    placeholder="Connor Portrait Selection Session" 
                    value={newProofTitle} 
                    onChange={e => setNewProofTitle(e.target.value)} 
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Target Client Email</label>
                  <input 
                    type="email" 
                    className="form-control bg-light border-0" 
                    placeholder="client@studio.com" 
                    value={newProofClientEmail} 
                    onChange={e => setNewProofClientEmail(e.target.value)} 
                    required
                  />
                </div>

                {/* Grid Photo Selector - Folder organized */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted mb-1">Select Client Folder to Pull Photos From</label>
                  {assetFolders.length === 0 ? (
                    <div className="text-center p-3 border rounded bg-light text-xxs text-muted">
                      No client folders available. Please create folders and add client photos in the <span className="fw-bold">Client Asset Library</span> tab first.
                    </div>
                  ) : (
                    <>
                      <select 
                        className="form-select bg-light border-0 text-xs mb-2.5"
                        value={proofSelectorFolderId}
                        onChange={e => setProofSelectorFolderId(e.target.value)}
                      >
                        <option value="">-- Choose a Folder --</option>
                        {assetFolders.map(f => (
                          <option key={f._id || f.id} value={f._id || f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>

                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-bold text-muted mb-0">Select Photos to Share ({selectedPhotoIds.length} selected)</label>
                        <span className="text-muted text-xxs">Click to toggle images</span>
                      </div>

                      {(() => {
                        const filteredPhotos = assetPhotos.filter(p => p.folderId === proofSelectorFolderId);
                        if (filteredPhotos.length === 0) {
                          return (
                            <div className="text-center p-3 border rounded bg-light text-xxs text-muted">
                              No photos inside this folder. Add photos under this folder in the <span className="fw-bold">Client Asset Library</span> tab first.
                            </div>
                          );
                        }
                        return (
                          <div className="row g-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredPhotos.map((p) => {
                              const pid = p._id || p.id;
                              if (!pid) return null;
                              const isSelected = selectedPhotoIds.includes(pid);
                              const isRenderable = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG'].includes((p.format || '').toUpperCase());
                              return (
                                <div className="col-4" key={pid}>
                                  <div 
                                    className={`position-relative rounded-2 overflow-hidden border border-2 cursor-pointer ${isSelected ? 'border-dark' : 'border-transparent'}`}
                                    style={{ height: '64px' }}
                                    onClick={() => togglePhotoIdSelection(pid)}
                                    title={`${p.title} (${p.format})`}
                                  >
                                    {isRenderable ? (
                                      <img src={p.url} className="w-100 h-100 object-cover" referrerPolicy="no-referrer" alt="" />
                                    ) : (
                                      <div className="w-100 h-100 bg-secondary bg-opacity-10 d-flex flex-column align-items-center justify-content-center text-secondary text-center">
                                        <i className="fa-solid fa-camera-retro text-dark" style={{ fontSize: '14px' }}></i>
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="position-absolute top-0 end-0 bg-dark text-white p-1 rounded-bottom-start d-flex justify-content-center align-items-center" style={{ width: '16px', height: '16px', fontSize: '10px' }}>
                                        <i className="fa-solid fa-check"></i>
                                      </div>
                                    )}
                                    <span className="position-absolute top-0 start-0 m-0.5 badge bg-dark bg-opacity-70 text-xxs" style={{ fontSize: '8px', padding: '1px 3px' }}>
                                      {p.format}
                                    </span>
                                    <div className="position-absolute bottom-0 start-0 w-100 text-xxs bg-dark bg-opacity-60 text-white p-0.5 truncate text-center">
                                      {p.title}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Expires In (Days)</label>
                    <input 
                      type="number" 
                      className="form-control bg-light border-0" 
                      value={proofExpiryDays} 
                      onChange={e => setProofExpiryDays(e.target.value)} 
                      min="1"
                    />
                  </div>
                  <div className="col-6 d-flex flex-column justify-content-end pb-1.5">
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        id="switchPrevention" 
                        checked={screenshotPrevention}
                        onChange={e => setScreenshotPrevention(e.target.checked)}
                      />
                      <label className="form-check-label text-dark small fw-bold" htmlFor="switchPrevention">
                        Intrusion Control
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border border-info bg-light p-2 rounded-3 mb-3 text-xxs">
                  <span className="fw-bold text-info"><i className="fa-solid fa-circle-info me-1"></i> Multi-layer Intrusion Control:</span> Enforces anti-right click, watermark overlays, active tab lose-focus blurring, and hardware PrintScreen alerts back to backend auditing.
                </div>

                <button 
                  type="submit" 
                  className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold"
                  disabled={proofSubmitLoading}
                >
                  {proofSubmitLoading ? 'Sharing...' : 'Deploy Client Proof Gallery'}
                </button>
              </form>
            </div>
          </div>

          {/* Active Proof Galleries List */}
          <div className="col-xl-7">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0"><i className="fa-solid fa-images me-1"></i> Active Proofing Galleries ({proofs.length})</h5>
                <button className="btn btn-light btn-sm text-xs rounded-2 fw-semibold" onClick={loadData}>
                  <i className="fa-solid fa-arrows-rotate"></i> Sync DB
                </button>
              </div>

              {proofs.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-0">No shared client proofing galleries logged in database.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {proofs.map((p: any) => (
                    <div className="col-md-6" key={p._id || p.id}>
                      <div className="card border rounded-3 overflow-hidden h-100 bg-white">
                        {p.images && p.images.length > 0 && (
                          <div className="position-relative" style={{ height: '110px' }}>
                            <img src={p.images[0].url} className="w-100 h-100 object-cover" referrerPolicy="no-referrer" alt="" />
                            <div className="position-absolute top-0 start-0 m-2 badge bg-dark opacity-90">
                              {p.images.length} Images
                            </div>
                            {p.screenshotPrevention && (
                              <div className="position-absolute top-0 end-0 m-2 badge bg-danger d-flex align-items-center gap-1">
                                <i className="fa-solid fa-shield-halved"></i> Protected
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-3">
                          <h6 className="fw-bold text-dark mb-1">{p.title}</h6>
                          <div className="text-muted text-xs mb-2">Client: {p.clientEmail}</div>
                          
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-xxs uppercase fw-bold text-muted">Status:</span>
                            <span className={`badge px-2 py-0.5 rounded-pill text-xxs fw-semibold ${
                              p.status === 'Approved' ? 'bg-success bg-opacity-10 text-success' :
                              p.status === 'Revision Requested' ? 'bg-danger bg-opacity-10 text-danger' :
                              'bg-warning bg-opacity-10 text-warning'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          {p.clientNotes && (
                            <div className="bg-light p-2 rounded-2 text-xxs text-dark mb-3 italic">
                              <strong>Client notes:</strong> "{p.clientNotes}"
                            </div>
                          )}

                          <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                            <span className="text-xxs text-muted">
                              Exp: {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'N/A'}
                            </span>
                            <button 
                              className="btn btn-outline-danger btn-xs py-1 rounded-2"
                              onClick={() => handleDeleteProof(p._id || p.id)}
                            >
                              <i className="fa-solid fa-trash-can me-1"></i> Revoke Access
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. AUDITING LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="fw-bold text-dark mb-1"><i className="fa-solid fa-receipt me-1 text-primary"></i> Intrusion & Auth Security Auditing Logs</h5>
              <p className="text-muted small mb-0">System logs generated by users, security rate-limit headers, and interactive printscreen traps</p>
            </div>
            <button className="btn btn-light btn-sm text-xs rounded-2 fw-semibold" onClick={loadData}>
              <i className="fa-solid fa-arrows-rotate"></i> Clear & Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">No audit logs stored in databases.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '500px' }}>
              <table className="table align-middle table-sm">
                <thead>
                  <tr className="text-muted text-xxs uppercase font-semibold">
                    <th>Timestamp</th>
                    <th>Audit Event</th>
                    <th>Associated email</th>
                    <th>Client IP</th>
                    <th>User Agent / Browser</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l._id || l.id} className="text-xxs">
                      <td className="text-muted">{new Date(l.createdAt || l.timestamp).toLocaleString()}</td>
                      <td>
                        <span className={`badge px-2 py-1 rounded-2 font-semibold ${
                          l.eventType === 'SCREENSHOT_DETECTION' ? 'bg-danger text-white animate-pulse' :
                          l.eventType === 'AUTH_FAILED' ? 'bg-warning text-dark' :
                          l.eventType === 'AUTH_SUCCESS' ? 'bg-success text-white' :
                          l.eventType === 'RATE_LIMIT_EXCEEDED' ? 'bg-danger bg-opacity-20 text-danger' :
                          'bg-primary text-white'
                        }`}>
                          {l.eventType}
                        </span>
                      </td>
                      <td className="fw-semibold text-dark">{l.email || 'anonymous'}</td>
                      <td><code className="text-muted">{l.ipAddress}</code></td>
                      <td className="text-muted truncate" style={{ maxWidth: '120px' }} title={l.userAgent}>{l.userAgent}</td>
                      <td className="fw-medium text-dark">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. STUDIO PORTFOLIO GALLERY TAB */}
      {activeTab === 'gallery' && (
        <div className="row g-4">
          {/* Add Photo Form Card */}
          <div className="col-xl-4 animate-fade-in">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <h5 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-plus me-1 text-primary"></i> Add Photo Manually
              </h5>
              <form onSubmit={handleAddGalleryPhoto}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Upload Photo File</label>
                  <input 
                    type="file" 
                    className="form-control bg-light border-0 text-xs" 
                    accept=".jpg,.jpeg,.png,.pnm,.img,.raw,.tiff,.nef,.cr3,.arw,.dng"
                    onChange={handleGalleryFileChange} 
                    required
                  />
                  <div className="text-xxs text-muted mt-1.5">
                    Directly upload files of type JPG, PNG, PNM, IMG, RAW, or TIFF. No upload size limits!
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Photo Title</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0" 
                    placeholder="Auto-filled from filename, or edit..." 
                    value={newPhotoTitle} 
                    onChange={e => setNewPhotoTitle(e.target.value)} 
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Category Tag</label>
                  <select 
                    className="form-select bg-light border-0 text-sm"
                    value={newPhotoCategory}
                    onChange={e => setNewPhotoCategory(e.target.value)}
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Portrait">Portrait</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Event">Event</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold"
                  disabled={photoSubmitLoading}
                >
                  {photoSubmitLoading ? 'Saving Photo...' : 'Add Photo to Portfolio'}
                </button>
              </form>
            </div>
          </div>

          {/* Gallery View Card */}
          <div className="col-xl-8 animate-fade-in">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="fa-solid fa-camera me-1"></i> Active Studio Portfolio ({galleryPhotos.length} Photos)
                </h5>
                <button className="btn btn-light btn-sm text-xs rounded-2 fw-semibold" onClick={loadData}>
                  <i className="fa-solid fa-arrows-rotate"></i> Sync DB
                </button>
              </div>

              {galleryPhotos.length === 0 ? (
                <div className="text-center py-5 border rounded bg-light">
                  <p className="text-muted mb-0">Your Studio Portfolio is empty. Use the form on the left to manually add images.</p>
                </div>
              ) : (
                <div className="row g-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {galleryPhotos.map((p) => {
                    const pid = p._id || p.id;
                    if (!pid) return null;
                    return (
                      <div className="col-sm-6 col-md-4" key={pid}>
                        <div className="card h-100 border rounded-3 overflow-hidden bg-white hover-shadow-sm transition">
                          <div className="position-relative" style={{ height: '140px' }}>
                            <img src={p.url} className="w-100 h-100 object-cover" referrerPolicy="no-referrer" alt={p.title} />
                            <div className="position-absolute top-0 start-0 m-2 badge bg-dark text-xxs opacity-90">
                              {p.category}
                            </div>
                            <button 
                              className="position-absolute top-0 end-0 m-2 btn btn-danger btn-sm p-1 rounded-circle d-flex align-items-center justify-content-center animate-fade-in" 
                              style={{ width: '24px', height: '24px' }}
                              onClick={() => handleDeleteGalleryPhoto(pid)}
                              title="Delete Photo"
                            >
                              <i className="fa-solid fa-trash-can text-xxs"></i>
                            </button>
                          </div>
                          <div className="p-2 bg-light">
                            <div className="fw-bold text-dark text-xs truncate" title={p.title}>{p.title}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CLIENT ASSET LIBRARY TAB */}
      {activeTab === 'library' && (
        <div className="row g-4">
          {/* Left Column: Management Forms */}
          <div className="col-xl-4 animate-fade-in">
            {/* Create Client Folder Card */}
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
              <h5 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-folder-plus text-primary me-1.5"></i> Create Client Folder
              </h5>
              <form onSubmit={handleCreateAssetFolder}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Folder Name</label>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0" 
                    placeholder="E.g. Jennifer & Michael Wedding" 
                    value={newFolderName} 
                    onChange={e => setNewFolderName(e.target.value)} 
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Description / Client Note</label>
                  <textarea 
                    className="form-control bg-light border-0 text-sm" 
                    rows={2}
                    placeholder="E.g. Full high-res and RAW selects from the beach shoot." 
                    value={newFolderDescription} 
                    onChange={e => setNewFolderDescription(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold text-xs"
                  disabled={folderSubmitLoading}
                >
                  {folderSubmitLoading ? 'Creating...' : 'Create Folder'}
                </button>
              </form>
            </div>

            {/* Upload/Add Photo to Folder Card */}
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
              <h5 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-cloud-arrow-up text-primary me-1.5"></i> Add Client Photos
              </h5>
              {assetFolders.length === 0 ? (
                <div className="alert alert-warning text-center border-0 py-3 text-xxs mb-0">
                  <i className="fa-solid fa-triangle-exclamation d-block mb-1.5 fs-5"></i>
                  Please create a folder above before adding client photo assets.
                </div>
              ) : (
                <form onSubmit={handleCreateAssetPhoto}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Select Target Folder</label>
                    <select 
                      className="form-select bg-light border-0 text-sm"
                      value={selectedFolderId}
                      onChange={e => setSelectedFolderId(e.target.value)}
                      required
                    >
                      {assetFolders.map(f => (
                        <option key={f._id || f.id} value={f._id || f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Upload Photo File</label>
                    <input 
                      type="file" 
                      className="form-control bg-light border-0 text-xs" 
                      accept=".jpg,.jpeg,.png,.pnm,.img,.raw,.tiff,.nef,.cr3,.arw,.dng"
                      onChange={handleAssetFileChange} 
                      required
                    />
                    <div className="text-xxs text-muted mt-1.5">
                      Directly upload standard, RAW (.NEF, .CR3, etc.), PNM, or IMG files. No size limits!
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Photo Title</label>
                    <input 
                      type="text" 
                      className="form-control bg-light border-0" 
                      placeholder="Auto-filled from filename, or edit..." 
                      value={newAssetTitle} 
                      onChange={e => setNewAssetTitle(e.target.value)} 
                      required
                    />
                  </div>

                  <div className="row g-2 mb-4">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">File Format</label>
                      <select 
                        className="form-select bg-light border-0 text-xs"
                        value={newAssetFormat}
                        onChange={e => setNewAssetFormat(e.target.value as any)}
                        required
                      >
                        <option value="JPG">JPG / JPEG</option>
                        <option value="PNG">PNG</option>
                        <option value="RAW">RAW (.NEF/.CR3)</option>
                        <option value="TIFF">TIFF</option>
                        <option value="OTHER">Other Format</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">File Size (MB)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="form-control bg-light border-0 text-xs" 
                        placeholder="Auto-calculated..." 
                        value={newAssetSizeMB} 
                        onChange={e => setNewAssetSizeMB(e.target.value)} 
                        required
                        disabled
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold text-xs"
                    disabled={assetSubmitLoading}
                  >
                    {assetSubmitLoading ? 'Saving...' : 'Add Photo Asset'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Asset Explorer */}
          <div className="col-xl-8 animate-fade-in">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="fa-solid fa-folder-open me-1.5 text-secondary"></i> Client Folder Explorer
                </h5>
                <button className="btn btn-light btn-sm text-xs rounded-2 fw-semibold" onClick={loadData}>
                  <i className="fa-solid fa-arrows-rotate me-1"></i> Sync Assets
                </button>
              </div>

              {/* Folders Tab Bar (Aesthetics Folder design) */}
              {assetFolders.length === 0 ? (
                <div className="text-center py-5 border rounded bg-light mb-4">
                  <i className="fa-regular fa-folder text-muted d-block mb-2 fs-2"></i>
                  <p className="text-muted small">No Client Folders created yet.</p>
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2 mb-4 p-2 bg-light rounded-3">
                  {assetFolders.map(f => {
                    const fid = f._id || f.id;
                    if (!fid) return null;
                    const isActive = activeFolderId === fid;
                    const count = assetPhotos.filter(p => p.folderId === fid).length;
                    return (
                      <button
                        key={fid}
                        className={`btn text-xs d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-2 fw-semibold transition ${isActive ? 'btn-dark' : 'btn-white text-dark shadow-sm'}`}
                        onClick={() => {
                          setActiveFolderId(fid);
                          setSelectedFolderId(fid);
                        }}
                      >
                        <i className={`fa-solid ${isActive ? 'fa-folder-open text-warning' : 'fa-folder text-muted'}`}></i>
                        <span>{f.name}</span>
                        <span className={`badge ${isActive ? 'bg-light text-dark' : 'bg-dark text-white'} text-xxs`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active Folder Display */}
              {(() => {
                const activeFolder = assetFolders.find(f => (f._id || f.id) === activeFolderId);
                if (!activeFolder) {
                  return (
                    <div className="text-center py-5 text-muted small">
                      Select an asset folder above to explore client items.
                    </div>
                  );
                }

                const currentPhotos = assetPhotos.filter(p => p.folderId === activeFolderId);
                const totalFolderSizeMB = (currentPhotos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0) / (1024 * 1024)).toFixed(1);

                return (
                  <div className="animate-fade-in">
                    {/* Active Folder Header */}
                    <div className="p-3 bg-light border border-start-5 border-start-dark rounded-3 d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                          📁 {activeFolder.name}
                          <span className="badge bg-secondary text-xxs fw-semibold">
                            {currentPhotos.length} Files • {totalFolderSizeMB} MB
                          </span>
                        </h6>
                        <p className="small text-muted mb-0">{activeFolder.description || 'No description provided.'}</p>
                      </div>
                      <button
                        className="btn btn-outline-danger btn-sm text-xxs py-1 px-2.5 rounded-2"
                        onClick={() => handleDeleteAssetFolder(activeFolder._id || activeFolder.id || '')}
                        title="Delete entire folder and contents"
                      >
                        <i className="fa-solid fa-trash-can me-1"></i> Delete Folder
                      </button>
                    </div>

                    {/* Contained Photos Grid */}
                    {currentPhotos.length === 0 ? (
                      <div className="text-center py-5 border rounded bg-light bg-opacity-50">
                        <i className="fa-solid fa-photo-film text-muted fs-3 mb-2 d-block"></i>
                        <p className="text-muted small mb-0">This client folder is empty. Use the left sidebar form to upload JPG, PNG, or RAW select photos manually.</p>
                      </div>
                    ) : (
                      <div className="row g-3">
                        {currentPhotos.map(p => {
                          const pid = p._id || p.id;
                          if (!pid) return null;
                          const sizeMB = ((p.sizeBytes || 5000000) / (1024 * 1024)).toFixed(1);
                          const isRenderable = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG'].includes((p.format || '').toUpperCase());
                          return (
                            <div className="col-sm-6 col-md-4 col-xxl-3" key={pid}>
                              <div className="card h-100 border-0 bg-light rounded-3 overflow-hidden shadow-sm hover-shadow transition">
                                <div className="position-relative" style={{ height: '110px' }}>
                                  {isRenderable ? (
                                    <img src={p.url} className="w-100 h-100 object-cover" referrerPolicy="no-referrer" alt={p.title} />
                                  ) : (
                                    <div className="w-100 h-100 bg-secondary bg-opacity-10 d-flex flex-column align-items-center justify-content-center text-secondary text-center">
                                      <i className="fa-solid fa-camera-retro text-dark fs-4 mb-1"></i>
                                      <span className="font-mono text-xxs fw-bold text-dark">{p.format}</span>
                                    </div>
                                  )}
                                  <span className="position-absolute top-0 start-0 m-2 badge bg-dark text-xxs">
                                    {p.format}
                                  </span>
                                  <button
                                    className="position-absolute top-0 end-0 m-2 btn btn-danger btn-sm p-1 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: '22px', height: '22px' }}
                                    onClick={() => handleDeleteAssetPhoto(pid)}
                                    title="Delete Photo Asset"
                                  >
                                    <i className="fa-solid fa-trash text-xxs" style={{ fontSize: '9px' }}></i>
                                  </button>
                                </div>
                                <div className="p-2.5">
                                  <div className="fw-bold text-dark text-xs truncate mb-1" title={p.title}>
                                    {p.title}
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center text-xxs text-muted font-mono pt-1.5 border-top">
                                    <span>{sizeMB} MB</span>
                                    <a href={p.url} download={p.title} className="text-primary text-decoration-none fw-semibold">
                                      <i className="fa-solid fa-download me-0.5"></i> Get File
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
