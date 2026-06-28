/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types.js';
import LoginRegister from './components/LoginRegister.js';
import AdminDashboard from './components/AdminDashboard.js';
import ClientDashboard from './components/ClientDashboard.js';
import ProofGalleryViewer from './components/ProofGalleryViewer.js';
import StandardDashboard from './components/StandardDashboard.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation for Client
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);

  // Restore secure session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedAccess = localStorage.getItem('secure_access_token');
      const storedRefresh = localStorage.getItem('secure_refresh_token');

      if (!storedAccess || !storedRefresh) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate access token by calling GET /me
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedAccess}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
        } else {
          // If expired, attempt token refresh automatically
          const refreshRes = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefresh })
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            localStorage.setItem('secure_access_token', refreshData.accessToken);
            localStorage.setItem('secure_refresh_token', refreshData.refreshToken);
            
            setAccessToken(refreshData.accessToken);
            setRefreshToken(refreshData.refreshToken);

            // Retry fetching profile
            const retryRes = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${refreshData.accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              setUser(retryData.user);
            }
          } else {
            // Refresh failed, purge session
            handleLogout();
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const handleLoginSuccess = (userObj: User, access: string, refresh: string) => {
    setUser(userObj);
    setAccessToken(access);
    setRefreshToken(refresh);
    
    localStorage.setItem('secure_access_token', access);
    localStorage.setItem('secure_refresh_token', refresh);
    
    setSelectedProofId(null);
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setSelectedProofId(null);
    localStorage.removeItem('secure_access_token');
    localStorage.removeItem('secure_refresh_token');
  };

  if (isLoading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-[#0f172a] text-slate-100 relative overflow-hidden font-sans">
        {/* Background Mesh Gradients */}
        <div className="bg-mesh-container">
          <div className="mesh-blob-1"></div>
          <div className="mesh-blob-2"></div>
        </div>
        <div className="spinner-border text-light mb-3 position-relative z-1" style={{ width: '3rem', height: '3rem' }} role="status"></div>
        <h5 className="fw-bold text-white font-mono position-relative z-1">Unlocking secure portal firewall...</h5>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-[#0f172a] text-slate-100 relative overflow-hidden font-sans">
      {/* Background Mesh Gradients */}
      <div className="bg-mesh-container">
        <div className="mesh-blob-1"></div>
        <div className="mesh-blob-2"></div>
      </div>

      {/* Dynamic Nav Header Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-white/5 backdrop-blur-md border-b border-white/10 py-3 mb-4 shadow-lg position-relative z-2">
        <div className="container">
          <span className="navbar-brand d-flex align-items-center gap-2 fw-extrabold font-sans text-white">
            <i className="fa-solid fa-camera-retro text-blue-400"></i>
            <span>SHIVA STUDIO & PHOTOGRAPHY</span>
          </span>

          {user && (
            <div className="d-flex align-items-center gap-3">
              <div className="d-none d-md-flex flex-column align-items-end text-end text-white">
                <span className="small fw-bold">{user.name}</span>
                <span className="text-white-50 text-xs uppercase tracking-wider">
                  Role: {user.role === 'admin' ? 'Studio Director' : user.role === 'standard' ? 'Standard User' : 'Verified Client'}
                </span>
              </div>
              <button 
                className="btn btn-outline-light btn-sm fw-bold px-3 rounded-2"
                onClick={handleLogout}
              >
                <i className="fa-solid fa-arrow-right-from-bracket me-1 text-blue-400"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Container Wrapper */}
      <main className="container pb-5 position-relative z-1">
        {!user ? (
          <div className="row justify-content-center mt-md-4">
            <div className="col-lg-10 col-xl-9">
              <LoginRegister onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        ) : (
          <div>
            {user.role === 'admin' ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h1 className="fw-extrabold text-dark tracking-tight mb-1">Administrative Center</h1>
                    <p className="text-muted small mb-0">Monitor photography metrics, share secure proofs, and audit screenshot violations.</p>
                  </div>
                  <span className="badge bg-dark px-3 py-2 rounded-2 d-none d-sm-inline-block">
                    <i className="fa-solid fa-user-shield me-1"></i> Studio Admin Mode
                  </span>
                </div>
                
                <AdminDashboard accessToken={accessToken!} />
              </div>
            ) : user.role === 'standard' ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h1 className="fw-extrabold text-dark tracking-tight mb-1">Standard Staff Portal</h1>
                    <p className="text-muted small mb-0">Browse schedules, track upcoming sessions, and view secure proofing lists.</p>
                  </div>
                  <span className="badge bg-secondary px-3 py-2 rounded-2 d-none d-sm-inline-block">
                    <i className="fa-solid fa-user me-1 text-blue-400"></i> Standard Staff Access
                  </span>
                </div>
                
                <StandardDashboard accessToken={accessToken!} />
              </div>
            ) : (
              <div>
                {selectedProofId ? (
                  <ProofGalleryViewer 
                    accessToken={accessToken!} 
                    galleryId={selectedProofId} 
                    onBack={() => setSelectedProofId(null)} 
                  />
                ) : (
                  <ClientDashboard 
                    accessToken={accessToken!} 
                    onSelectProofGallery={(id) => setSelectedProofId(id)} 
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
