import React, { useState, useEffect } from 'react';
import { Booking, PhotoProof } from '../types.js';
import ProofGalleryViewer from './ProofGalleryViewer.js';

interface StandardDashboardProps {
  accessToken: string;
}

export default function StandardDashboard({ accessToken }: StandardDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proofs, setProofs] = useState<PhotoProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view states
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'proofs'>('bookings');

  // Search filter states
  const [bookingSearch, setBookingSearch] = useState('');
  const [proofSearch, setProofSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
      
      const [bookingsRes, proofsRes] = await Promise.all([
        fetch('/api/bookings', { headers }),
        fetch('/api/proofs', { headers })
      ]);

      if (!bookingsRes.ok || !proofsRes.ok) {
        throw new Error('Failed to pull portal scheduler data. Session might be expired.');
      }

      const bookingsData = await bookingsRes.json();
      const proofsData = await proofsRes.json();

      setBookings(bookingsData.bookings || []);
      setProofs(proofsData.proofs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  // Filters
  const filteredBookings = bookings.filter(b => 
    b.clientName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
    b.clientEmail.toLowerCase().includes(bookingSearch.toLowerCase()) ||
    b.sessionType.toLowerCase().includes(bookingSearch.toLowerCase())
  );

  const filteredProofs = proofs.filter(p => 
    p.title.toLowerCase().includes(proofSearch.toLowerCase()) ||
    p.clientEmail.toLowerCase().includes(proofSearch.toLowerCase())
  );

  if (selectedProofId) {
    return (
      <ProofGalleryViewer 
        accessToken={accessToken}
        galleryId={selectedProofId}
        onBack={() => setSelectedProofId(null)}
        isReadOnly={true}
      />
    );
  }

  return (
    <div className="standard-dashboard">
      {/* Informational Role Box */}
      <div className="alert alert-info border-0 shadow-sm bg-white/10 backdrop-blur-md p-4 rounded-4 text-white mb-4 d-flex gap-3 align-items-start">
        <div className="bg-blue-500/10 p-2.5 rounded-3 border border-blue-400/20 text-blue-300">
          <i className="fa-solid fa-circle-info fs-4"></i>
        </div>
        <div>
          <h5 className="fw-bold tracking-tight text-white mb-1">Standard Staff Mode — Read-Only Access</h5>
          <p className="small mb-0 opacity-80 leading-relaxed">
            You are logged in with a Standard user account. You have permission to search, view, and inspect active photography bookings and client proof galleries. Creating new booking templates, uploading proofs, viewing admin logs, or submitting client retouch instructions require administrative or specific client permissions.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 rounded-4 p-3 mb-4 d-flex align-items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span className="fw-semibold small">{error}</span>
        </div>
      )}

      {/* Overview Quick Counter Badges */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-4 p-3.5 text-white d-flex flex-row justify-content-between align-items-center shadow-md">
            <div>
              <span className="text-white-50 text-xs uppercase tracking-wider font-mono">Active Studio Bookings</span>
              <h3 className="fw-extrabold text-white mb-0 mt-1">{loading ? '...' : bookings.length}</h3>
            </div>
            <div className="bg-white/10 px-3 py-2.5 rounded-3">
              <i className="fa-solid fa-calendar-days text-blue-300 fs-4"></i>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-4 p-3.5 text-white d-flex flex-row justify-content-between align-items-center shadow-md">
            <div>
              <span className="text-white-50 text-xs uppercase tracking-wider font-mono">Proofing Galleries</span>
              <h3 className="fw-extrabold text-white mb-0 mt-1">{loading ? '...' : proofs.length}</h3>
            </div>
            <div className="bg-white/10 px-3 py-2.5 rounded-3">
              <i className="fa-solid fa-images text-purple-300 fs-4"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden bg-white">
        <div className="card-header bg-light border-0 p-0">
          <div className="d-flex border-b">
            <button 
              className={`flex-1 py-3 px-4 text-center fw-bold border-b-2 text-sm transition-all d-flex align-items-center justify-content-center gap-2 ${
                activeTab === 'bookings' 
                  ? 'border-dark text-dark bg-white' 
                  : 'border-transparent text-muted hover:text-dark'
              }`}
              onClick={() => setActiveTab('bookings')}
            >
              <i className="fa-solid fa-calendar text-xs"></i> Studio Bookings
            </button>
            <button 
              className={`flex-1 py-3 px-4 text-center fw-bold border-b-2 text-sm transition-all d-flex align-items-center justify-content-center gap-2 ${
                activeTab === 'proofs' 
                  ? 'border-dark text-dark bg-white' 
                  : 'border-transparent text-muted hover:text-dark'
              }`}
              onClick={() => setActiveTab('proofs')}
            >
              <i className="fa-solid fa-images text-xs"></i> Proofing Galleries
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-dark mb-2" role="status"></div>
              <p className="text-muted small font-mono">Pulling secure data records...</p>
            </div>
          ) : (
            <>
              {activeTab === 'bookings' ? (
                <div>
                  {/* Search Bar */}
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 text-muted"><i className="fa-solid fa-magnifying-glass text-xs"></i></span>
                      <input 
                        type="text" 
                        className="form-control bg-light border-0 text-sm" 
                        placeholder="Search bookings by client name, email, or session type..." 
                        value={bookingSearch}
                        onChange={e => setBookingSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-5 border rounded-3 bg-light">
                      <i className="fa-solid fa-folder-open text-muted fs-3 mb-2"></i>
                      <p className="text-muted small mb-0">No booking records match your search criteria.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 text-sm">
                        <thead className="table-light text-uppercase tracking-wider text-muted text-xxs font-mono">
                          <tr>
                            <th>Client</th>
                            <th>Session Details</th>
                            <th>Date</th>
                            <th>Session Fee</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookings.map((b) => (
                            <tr key={b._id || b.id}>
                              <td>
                                <div className="fw-bold text-dark">{b.clientName}</div>
                                <span className="text-muted text-xs font-mono">{b.clientEmail}</span>
                              </td>
                              <td>
                                <span className="badge bg-secondary text-white font-mono text-xxs uppercase tracking-wider">{b.sessionType}</span>
                                {b.notes && <p className="text-muted text-xs mb-0 mt-1 italic text-truncate max-w-sm">"{b.notes}"</p>}
                              </td>
                              <td>{new Date(b.sessionDate).toLocaleDateString()}</td>
                              <td className="font-mono text-dark fw-bold">₹{b.price.toLocaleString('en-IN')}</td>
                              <td>
                                <span className={`badge text-xs px-2.5 py-1 rounded-2.5 ${
                                  b.status === 'Confirmed' ? 'bg-success/10 text-success border border-success/20' :
                                  b.status === 'Cancelled' ? 'bg-danger/10 text-danger border border-danger/20' :
                                  'bg-warning/10 text-warning border border-warning/20'
                                }`}>
                                  {b.status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Search Bar */}
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 text-muted"><i className="fa-solid fa-magnifying-glass text-xs"></i></span>
                      <input 
                        type="text" 
                        className="form-control bg-light border-0 text-sm" 
                        placeholder="Search proofs by gallery title or client email..." 
                        value={proofSearch}
                        onChange={e => setProofSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredProofs.length === 0 ? (
                    <div className="text-center py-5 border rounded-3 bg-light">
                      <i className="fa-solid fa-folder-open text-muted fs-3 mb-2"></i>
                      <p className="text-muted small mb-0">No photo proofing galleries match your search criteria.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 text-sm">
                        <thead className="table-light text-uppercase tracking-wider text-muted text-xxs font-mono">
                          <tr>
                            <th>Gallery Title</th>
                            <th>Client Email</th>
                            <th>Images</th>
                            <th>Security</th>
                            <th>Status</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProofs.map((p) => (
                            <tr key={p._id || p.id}>
                              <td>
                                <div className="fw-bold text-dark">{p.title}</div>
                              </td>
                              <td>
                                <span className="font-mono text-xs">{p.clientEmail}</span>
                              </td>
                              <td>
                                <span className="badge bg-light text-muted border px-2 py-1 text-xs">
                                  {p.images?.length || 0} Files
                                </span>
                              </td>
                              <td>
                                {p.screenshotPrevention ? (
                                  <span className="text-danger text-xs fw-bold d-flex align-items-center gap-1">
                                    <i className="fa-solid fa-shield-halved"></i> Active
                                  </span>
                                ) : (
                                  <span className="text-muted text-xs">Standard</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge text-xs px-2.5 py-1 rounded-2.5 ${
                                  p.status === 'Approved' ? 'bg-success/10 text-success border border-success/20' :
                                  p.status === 'Revision Requested' ? 'bg-danger/10 text-danger border border-danger/20' :
                                  'bg-warning/10 text-warning border border-warning/20'
                                }`}>
                                  {p.status || 'Awaiting Review'}
                                </span>
                              </td>
                              <td className="text-end">
                                <button 
                                  className="btn btn-dark btn-sm rounded-2.5 fw-bold px-3 py-1"
                                  onClick={() => setSelectedProofId(p._id || p.id || null)}
                                >
                                  <i className="fa-solid fa-eye me-1.5"></i> Inspect Proofs
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
