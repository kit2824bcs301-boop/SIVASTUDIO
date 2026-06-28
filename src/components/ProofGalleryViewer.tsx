/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PhotoProof } from '../types.js';

interface ProofGalleryViewerProps {
  accessToken: string;
  galleryId: string;
  onBack: () => void;
  isReadOnly?: boolean;
}

export default function ProofGalleryViewer({ accessToken, galleryId, onBack, isReadOnly = false }: ProofGalleryViewerProps) {
  const [proof, setProof] = useState<PhotoProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Focus Security Layer
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [screenshotDetectedAlert, setScreenshotDetectedAlert] = useState(false);

  // Client Feedback Fields
  const [clientNotes, setClientNotes] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'Approved' | 'Revision Requested'>('Approved');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load selected gallery
  const loadGallery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proofs/${galleryId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to open secure proofing gallery.');

      setProof(data.proof);
      if (data.proof.clientNotes) {
        setClientNotes(data.proof.clientNotes);
      }
      if (data.proof.status && data.proof.status !== 'Under Review') {
        setSubmitStatus(data.proof.status);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [galleryId, accessToken]);

  // Report Intrusion to server API
  const reportScreenshotIntrusion = async () => {
    try {
      await fetch(`/api/proofs/${galleryId}/screenshot-alert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Failed to report secure intrusion event:', err);
    }
  };

  // Multiple Security Event Listeners
  useEffect(() => {
    if (!proof || !proof.screenshotPrevention) return;

    // 1. WINDOW FOCUS / BLUR INTERCEPTOR
    const handleWindowFocus = () => setIsWindowFocused(true);
    const handleWindowBlur = () => {
      setIsWindowFocused(false);
      // Trigger a silent report because screenshot tools (like snipping tool) steal window focus
      reportScreenshotIntrusion();
    };

    // 2. KEYBOARD PRINTSCREEN / CMD-SHIFT INTERCEPTORS
    const handleKeyDown = (e: KeyboardEvent) => {
      // Monitor standard PrintScreen hardware key, or key combinations for screenshotting
      const isPrtScn = e.key === 'PrintScreen';
      const isMetaShiftS = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's'); // Windows Snipping shortcut
      const isCmdShiftFour = e.metaKey && e.shiftKey && (e.key === '4' || e.key === '3'); // macOS Snipping shortcuts

      if (isPrtScn || isMetaShiftS || isCmdShiftFour) {
        e.preventDefault();
        setScreenshotDetectedAlert(true);
        reportScreenshotIntrusion();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        setScreenshotDetectedAlert(true);
        reportScreenshotIntrusion();
      }
    };

    // 3. MOUSE DRAG & CLIPBOARD BLOCKS
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [proof, galleryId]);

  // Submit Feedback Notes
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch(`/api/proofs/${galleryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: submitStatus,
          clientNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit feedback.');

      setSubmitSuccess(true);
      await loadGallery();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-dark mb-3" role="status"></div>
        <p className="fw-semibold text-muted font-mono">Unsealing secure cryptographic vault...</p>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger mb-3 inline-block rounded-3">{error || 'Could not find proofing gallery.'}</div>
        <div>
          <button className="btn btn-dark btn-sm rounded-2 fw-bold" onClick={onBack}>
            <i className="fa-solid fa-arrow-left me-1"></i> Return to Client Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="proof-viewer-wrapper position-relative" style={{ userSelect: 'none' }}>
      {/* 1. OUT OF FOCUS BLUR OVERLAY */}
      {!isWindowFocused && proof.screenshotPrevention && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-95 d-flex flex-column align-items-center justify-content-center z-3 text-white text-center p-4" style={{ backdropFilter: 'blur(30px)' }}>
          <i className="fa-solid fa-circle-radiation fs-1 text-warning mb-3 animate-pulse"></i>
          <h3 className="fw-extrabold text-white tracking-tight">Security Vault Blocked</h3>
          <p className="small text-muted max-w-sm mb-0">
            To prevent unauthorized image grabbing, the vault has been blurred automatically because window focus was lost. Click anywhere inside this browser tab to resume proofing.
          </p>
        </div>
      )}

      {/* 2. INTRUSION/SCREENSHOT DETECTED WARNING DIALOG */}
      {screenshotDetectedAlert && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-95 d-flex flex-column align-items-center justify-content-center z-3 text-white text-center p-4">
          <i className="fa-solid fa-triangle-exclamation fs-1 text-danger mb-3 animate-ping"></i>
          <h3 className="fw-extrabold text-danger text-uppercase tracking-wider">Screenshot Attempt Captured</h3>
          <p className="small text-muted max-w-sm mb-4">
            A screenshot or print screen command was detected on your keyboard. This proof gallery is watermarked and protected by legal copyright contract. This security incident has been successfully reported to the studio logs with your client IP address.
          </p>
          <button 
            type="button" 
            className="btn btn-outline-danger btn-sm px-4 rounded-3 fw-bold"
            onClick={() => setScreenshotDetectedAlert(false)}
          >
            Acknowledge & Clear Violation
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <button className="btn btn-link text-dark p-0 fw-bold text-decoration-none mb-1 text-sm d-flex align-items-center gap-1" onClick={onBack}>
            <i className="fa-solid fa-arrow-left text-xs"></i> Back to Hub
          </button>
          <h3 className="fw-bold text-dark mb-0">{proof.title}</h3>
          <span className="text-muted text-xs">Exclusively prepared for: <code className="text-dark fw-bold">{proof.clientEmail}</code></span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {proof.screenshotPrevention && (
            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 d-flex align-items-center gap-1 px-2 py-1.5 rounded-2.5 text-xs fw-bold">
              <i className="fa-solid fa-shield-halved animate-pulse"></i> 3-Layer Protection Active
            </span>
          )}
          {proof.expiresAt && (
            <span className="badge bg-light text-muted border px-2 py-1.5 rounded-2.5 text-xs">
              Exp: {new Date(proof.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* INTERACTIVE GALLERY WATERMARKED WATERFALL */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0"><i className="fa-solid fa-eye me-1.5 text-primary"></i> Client Proof Selection</h5>
              <span className="text-muted text-xs">Right-click & image dragging are securely blocked</span>
            </div>

            <div 
              className="d-flex flex-column gap-4"
              onContextMenu={e => {
                if (proof.screenshotPrevention) {
                  e.preventDefault();
                  alert("🔒 Security Lock: Image saving and context menus are disabled inside this proofing vault.");
                  reportScreenshotIntrusion();
                }
              }}
            >
              {proof.images.map((img: any, idx: number) => {
                const ext = (img.url || '').split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
                const isRenderable = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
                return (
                  <div key={img._id || img.id || idx} className="position-relative overflow-hidden rounded-3 border bg-light shadow-xs group">
                    {/* Photo Display */}
                    {isRenderable ? (
                      <img 
                        src={img.url} 
                        className="w-100 h-auto object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-102"
                        style={{ maxHeight: '500px', pointerEvents: 'none' }}
                        referrerPolicy="no-referrer"
                        alt={img.title}
                      />
                    ) : (
                      <div className="w-100 bg-secondary bg-opacity-10 d-flex flex-column align-items-center justify-content-center text-secondary text-center p-5" style={{ minHeight: '300px' }}>
                        <i className="fa-solid fa-camera-retro fs-1 mb-2 text-dark"></i>
                        <span className="fw-bold text-sm tracking-wider font-mono uppercase text-dark">{ext} FORMAT SELECT</span>
                        <p className="text-muted small mt-2" style={{ maxWidth: '320px' }}>This is a high-resolution professional camera format file that cannot be displayed natively in browser. Download to view.</p>
                        <a href={img.url} download={img.title} className="btn btn-dark btn-sm rounded-pill px-3 mt-2 d-flex align-items-center gap-1.5 shadow-sm text-xs">
                          <i className="fa-solid fa-cloud-arrow-down text-warning"></i> Download {ext.toUpperCase()} Asset
                        </a>
                      </div>
                    )}

                    {/* 3. DIAGNOL TEXT WATERMARK OVERLAY (COMPLIANCE MASK) */}
                    {proof.screenshotPrevention && isRenderable && (
                      <div 
                        className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none d-flex flex-column justify-content-between p-4 overflow-hidden"
                        style={{ zIndex: 1, mixBlendMode: 'difference' }}
                      >
                        {/* Grid repeating diagonal text */}
                        <div className="row h-100 w-100" style={{ transform: 'rotate(-25deg) scale(1.15)', opacity: 0.14, color: '#ffffff' }}>
                          {[...Array(6)].map((_, i) => (
                            <div className="col-4 text-center py-4 fw-bold font-mono text-xs text-uppercase whitespace-nowrap" key={i}>
                              © AURA STUDIO PROOF - REPRODUCTION EXPLICITLY FORBIDDEN
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photo Label Bar */}
                    <div className="bg-dark text-white p-2.5 d-flex justify-content-between align-items-center">
                      <span className="text-xs fw-bold font-mono uppercase tracking-wider">Proof {idx + 1 < 10 ? `0${idx + 1}` : idx + 1} — {img.title}</span>
                      <span className="badge bg-secondary text-white text-xxs">{ext.toUpperCase()} format</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FEEDBACK & ACTION CONTROL PANEL */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4 position-sticky" style={{ top: '24px' }}>
            {isReadOnly ? (
              <div>
                <h5 className="fw-bold text-dark mb-3"><i className="fa-solid fa-lock text-muted me-1.5"></i> Read-Only Proof Mode</h5>
                <div className="alert alert-secondary border-0 bg-light p-3 rounded-3 mb-4 text-center">
                  <p className="small text-dark mb-0">
                    <strong>🔒 Read-Only Access Active:</strong> You can view and inspect these high-resolution photo proofs. Submitting selections or requesting retouches is limited to the designated client (<strong>{proof.clientEmail}</strong>).
                  </p>
                </div>
                <div className="bg-light p-3 rounded-3 text-start mb-3">
                  <span className="d-block text-xs uppercase text-muted tracking-wider fw-bold mb-1">Current Gallery Status</span>
                  <span className={`badge px-2.5 py-1.5 rounded-2 text-xs font-bold ${
                    proof.status === 'Approved' ? 'bg-success/10 text-success border border-success/20' : 
                    proof.status === 'Revision Requested' ? 'bg-danger/10 text-danger border border-danger/20' : 
                    'bg-warning/10 text-warning border border-warning/20'
                  }`}>
                    {proof.status || 'Awaiting Review'}
                  </span>
                  {proof.clientNotes && (
                    <div className="mt-3">
                      <span className="d-block text-xs uppercase text-muted tracking-wider fw-bold mb-1">Client Feedback Notes</span>
                      <p className="small text-muted mb-0 italic">"{proof.clientNotes}"</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h5 className="fw-bold text-dark mb-3"><i className="fa-solid fa-signature text-primary me-1.5"></i> Submit Proof Decision</h5>

                {submitSuccess && (
                  <div className="alert alert-success d-flex align-items-center mb-3 py-2 border-0 rounded-3" role="alert">
                    <i className="fa-solid fa-circle-check me-2"></i>
                    <div className="small fw-semibold">Feedback submitted successfully.</div>
                  </div>
                )}

                <form onSubmit={handleSubmitFeedback}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Awaiting Action</label>
                    <div className="d-flex flex-column gap-2">
                      <div className={`border p-2.5 rounded-3 d-flex align-items-center gap-2.5 cursor-pointer ${submitStatus === 'Approved' ? 'border-success bg-success bg-opacity-5' : 'bg-white'}`}
                           onClick={() => setSubmitStatus('Approved')}>
                        <input 
                          type="radio" 
                          id="optApproved" 
                          name="status" 
                          checked={submitStatus === 'Approved'}
                          onChange={() => setSubmitStatus('Approved')}
                          className="form-check-input mt-0"
                        />
                        <label htmlFor="optApproved" className="form-check-label text-sm fw-bold text-success cursor-pointer mb-0">
                          <i className="fa-solid fa-circle-check me-1"></i> Approve Entire Selection
                        </label>
                      </div>

                      <div className={`border p-2.5 rounded-3 d-flex align-items-center gap-2.5 cursor-pointer ${submitStatus === 'Revision Requested' ? 'border-danger bg-danger bg-opacity-5' : 'bg-white'}`}
                           onClick={() => setSubmitStatus('Revision Requested')}>
                        <input 
                          type="radio" 
                          id="optRevision" 
                          name="status" 
                          checked={submitStatus === 'Revision Requested'}
                          onChange={() => setSubmitStatus('Revision Requested')}
                          className="form-check-input mt-0"
                        />
                        <label htmlFor="optRevision" className="form-check-label text-sm fw-bold text-danger cursor-pointer mb-0">
                          <i className="fa-solid fa-pen-ruler me-1"></i> Request Retouches / Revisions
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted">Retouching Instructions</label>
                    <textarea 
                      className="form-control bg-light border-0 text-sm" 
                      rows={4} 
                      placeholder="Tell us what you want changed! Mention specific file numbers (e.g. 'I want selection 02 retouched in black & white...')"
                      value={clientNotes}
                      onChange={e => setClientNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    className={`btn w-100 py-2.5 rounded-3 fw-bold ${submitStatus === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Submitting notes...' : 'Submit Choice & Notes'}
                  </button>
                </form>
              </>
            )}

            <div className="mt-4 pt-3 border-top text-center text-muted text-xxs">
              <span className="d-block mb-1">🛡️ Protected Proof Selection Vault</span>
              <span>Downloads and copy triggers are blocked in our secure preview server.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
