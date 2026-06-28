/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, PhotoProof } from '../types.js';

interface ClientDashboardProps {
  accessToken: string;
  onSelectProofGallery: (id: string) => void;
}

export default function ClientDashboard({ accessToken, onSelectProofGallery }: ClientDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proofs, setProofs] = useState<PhotoProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create booking form states
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingType, setBookingType] = useState<'Wedding' | 'Portrait' | 'Commercial' | 'Event' | 'Custom'>('Portrait');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingPrice, setBookingPrice] = useState(15000); // client defaults
  const [bookingSubmitLoading, setBookingSubmitLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Auto-adjust price estimate depending on shoot category selected
  const handleTypeChange = (type: any) => {
    setBookingType(type);
    const priceEstimates = {
      Portrait: 15000,
      Wedding: 80000,
      Commercial: 120000,
      Event: 45000,
      Custom: 30000
    };
    setBookingPrice(priceEstimates[type as keyof typeof priceEstimates] || 15000);
  };

  const loadClientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
      
      const [bookingsRes, proofsRes] = await Promise.all([
        fetch('/api/bookings', { headers }),
        fetch('/api/proofs', { headers })
      ]);

      if (!bookingsRes.ok || !proofsRes.ok) {
        throw new Error('Could not synchronize client data with studio servers.');
      }

      const bookingsData = await bookingsRes.json();
      const proofsData = await proofsRes.json();

      setBookings(bookingsData.bookings);
      setProofs(proofsData.proofs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [accessToken]);

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSubmitLoading(true);
    setError(null);
    setBookingSuccess(false);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Studio Client', // Server resolves real names automatically
          clientEmail: 'client@studio.com',
          sessionDate: bookingDate,
          sessionType: bookingType,
          price: bookingPrice,
          notes: bookingNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit booking session.');

      setBookingSuccess(true);
      setBookingDate('');
      setBookingNotes('');
      setShowBookingForm(false);
      await loadClientData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBookingSubmitLoading(false);
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-dark mb-3" role="status"></div>
        <p className="fw-semibold text-muted">Securing client portal session...</p>
      </div>
    );
  }

  return (
    <div className="client-dashboard-container">
      {/* Intro Header */}
      <div className="card border-0 shadow-sm rounded-4 bg-dark text-white p-4 mb-4 position-relative overflow-hidden" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        minHeight: '160px'
      }}>
        <div className="position-relative z-1 d-flex flex-column justify-content-end h-100">
          <h2 className="fw-extrabold mb-1">Welcome back, Client</h2>
          <p className="small mb-0 text-white-50">View shared studio photo proofs and schedule photography sessions safely in a secured environment.</p>
        </div>
      </div>

      {bookingSuccess && (
        <div className="alert alert-success d-flex align-items-center mb-4 border-0 py-2.5 rounded-3 shadow-sm" role="alert">
          <i className="fa-solid fa-circle-check me-2 fs-5"></i>
          <div>
            <strong className="d-block">Photoshoot Request Submitted Successfully!</strong>
            <span className="small">The studio administration has been notified and will review your session schedule shortly.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4 border-0 py-2.5 rounded-3 shadow-sm" role="alert">
          <i className="fa-solid fa-triangle-exclamation me-2 fs-5"></i>
          <div className="small fw-semibold">{error}</div>
        </div>
      )}

      <div className="row g-4">
        {/* SHARED PROOF GALLERIES COLUMN */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
            <h5 className="fw-extrabold text-dark mb-3"><i className="fa-solid fa-images text-primary me-1.5"></i> Shared Photo Proof Galleries</h5>
            
            {proofs.length === 0 ? (
              <div className="text-center py-5 border rounded-3 border-dashed bg-light">
                <i className="fa-solid fa-image-portrait fs-1 text-muted opacity-50 mb-3 d-block"></i>
                <h6 className="fw-bold text-dark">No Galleries Shared Yet</h6>
                <p className="small text-muted mb-0 px-4">Once the studio completes photo-shoot processing, your secure proofs will appear here for review.</p>
              </div>
            ) : (
              <div className="row g-3">
                {proofs.map((p: any) => (
                  <div className="col-md-6" key={p._id || p.id}>
                    <div className="card border rounded-3 overflow-hidden h-100 bg-white shadow-xs">
                      {p.images && p.images.length > 0 && (() => {
                        const ext = (p.images[0].url || '').split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
                        const isRenderable = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
                        return (
                          <div className="position-relative" style={{ height: '120px' }}>
                            {isRenderable ? (
                              <img src={p.images[0].url} className="w-100 h-100 object-cover filter-blur-sm" referrerPolicy="no-referrer" alt="" />
                            ) : (
                              <div className="w-100 h-100 bg-secondary bg-opacity-10 d-flex flex-column align-items-center justify-content-center text-secondary text-center">
                                <i className="fa-solid fa-camera-retro fs-3 mb-1 text-dark"></i>
                                <span className="fw-bold text-xxs tracking-wider font-mono uppercase text-dark">{ext.toUpperCase()} SELECTS</span>
                              </div>
                            )}
                            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-30 d-flex align-items-center justify-content-center">
                              <span className="badge bg-dark bg-opacity-85 text-white px-2.5 py-1.5 rounded-2.5 small fw-bold">
                                <i className="fa-solid fa-lock me-1"></i> Secure Vault
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="p-3 d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="fw-bold text-dark mb-1">{p.title}</h6>
                          <div className="d-flex justify-content-between align-items-center mb-2 text-xxs">
                            <span className="text-muted">{p.images?.length || 0} secure photos</span>
                            <span className={`badge px-2 py-0.5 rounded-pill ${
                              p.status === 'Approved' ? 'bg-success bg-opacity-10 text-success' :
                              p.status === 'Revision Requested' ? 'bg-danger bg-opacity-10 text-danger' :
                              'bg-warning bg-opacity-10 text-warning'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>

                        <button 
                          className="btn btn-dark w-100 btn-sm rounded-2 fw-bold mt-2"
                          onClick={() => onSelectProofGallery(p._id || p.id)}
                        >
                          <i className="fa-solid fa-shield-halved me-1"></i> Unlock Proof Gallery
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOOKINGS HISTORY AND CREATOR COLUMN */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-extrabold text-dark mb-0"><i className="fa-solid fa-calendar text-primary me-1.5"></i> My Sessions</h5>
              <button 
                className={`btn btn-xs py-1 px-2.5 rounded-2 fw-bold ${showBookingForm ? 'btn-outline-danger' : 'btn-dark'}`}
                onClick={() => { setShowBookingForm(!showBookingForm); setBookingSuccess(false); }}
              >
                {showBookingForm ? 'Cancel Request' : 'Book Session'}
              </button>
            </div>

            {showBookingForm ? (
              <form onSubmit={handleRequestBooking} className="border-top pt-3">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Shoot Type Selection</label>
                  <select 
                    className="form-select bg-light border-0" 
                    value={bookingType} 
                    onChange={e => handleTypeChange(e.target.value)}
                  >
                    <option value="Portrait">Portrait session (Est: ₹15,000)</option>
                    <option value="Wedding">Wedding Session (Est: ₹80,000)</option>
                    <option value="Event">Corporate/Social Event (Est: ₹45,000)</option>
                    <option value="Commercial">Commercial/Catalog (Est: ₹1,20,000)</option>
                    <option value="Custom">Custom Concept (Est: ₹30,000)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Target Shoot Date</label>
                  <input 
                    type="date" 
                    className="form-control bg-light border-0" 
                    value={bookingDate} 
                    onChange={e => setBookingDate(e.target.value)} 
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Special Requests / Specifications</label>
                  <textarea 
                    className="form-control bg-light border-0 text-sm" 
                    rows={3} 
                    placeholder="E.g. retouches, high-key lights, specific location details..."
                    value={bookingNotes}
                    onChange={e => setBookingNotes(e.target.value)}
                  ></textarea>
                </div>
                
                <div className="bg-light p-2.5 rounded-3 mb-3 d-flex justify-content-between align-items-center">
                  <span className="small text-muted fw-bold">Price Estimation:</span>
                  <span className="fw-extrabold text-dark">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(bookingPrice)}</span>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold"
                  disabled={bookingSubmitLoading}
                >
                  {bookingSubmitLoading ? 'Submitting Request...' : 'Submit Session Booking'}
                </button>
              </form>
            ) : (
              <div>
                {bookings.length === 0 ? (
                  <p className="text-muted small text-center py-4 mb-0">No booking histories recorded for your email.</p>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {bookings.map((b: any) => (
                      <div key={b._id || b.id} className="border p-3 rounded-3 bg-white hover:bg-light transition-all">
                        <div className="d-flex justify-content-between align-items-start mb-1.5">
                          <span className="fw-bold text-dark text-sm">{b.sessionType} Session</span>
                          <span className={`badge px-2 py-0.5 rounded-pill text-xxs fw-semibold ${
                            b.status === 'Completed' ? 'bg-success bg-opacity-10 text-success' :
                            b.status === 'Confirmed' ? 'bg-primary bg-opacity-10 text-primary' :
                            b.status === 'Cancelled' ? 'bg-danger bg-opacity-10 text-danger' :
                            'bg-warning bg-opacity-10 text-warning'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center text-muted text-xs">
                          <span>
                            <i className="fa-solid fa-clock-rotate-left me-1"></i> 
                            {new Date(b.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="fw-bold text-dark">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
