/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface LoginRegisterProps {
  onLoginSuccess: (user: any, accessToken: string, refreshToken: string) => void;
}

export default function LoginRegister({ onLoginSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'client' | 'standard'>('client');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Simulated verification helpers
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { name, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'An authentication error occurred.');
      }

      if (isLogin) {
        onLoginSuccess(data.user, data.accessToken, data.refreshToken);
      } else {
        setMessage('Registration successful! Click the simulated button below to verify your email address before logging in.');
        if (data.verificationToken) {
          setVerificationToken(data.verificationToken);
        }
        // Switch fields to login but keep values
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedVerification = async () => {
    if (!verificationToken) return;
    setVerifying(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/auth/verify-email/${verificationToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      setMessage('✅ Email verified successfully! You can now log in.');
      setVerificationToken(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const setCredentialPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setIsLogin(true);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
      <div className="row g-0">
        <div className="col-lg-5 d-none d-lg-block position-relative" style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
          <div className="position-absolute bottom-0 start-0 p-4 text-white z-1">
            <h4 className="fw-bold mb-1">SHIVA STUDIO & PHOTOGRAPHY</h4>
            <p className="small mb-0 opacity-75">Secure Studio Client Portal & Creative Proofing System.</p>
          </div>
        </div>

        <div className="col-lg-7 p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold mb-0 text-dark">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h3>
            <span className="text-muted small">
              {isLogin ? 'New to Aura?' : 'Already have an account?'}
              <button 
                className="btn btn-link btn-sm p-0 ms-1 fw-bold text-decoration-none text-primary"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </span>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-3 py-2 border-0 rounded-3" role="alert">
              <i className="fa-solid fa-triangle-exclamation me-2"></i>
              <div className="small fw-semibold">{error}</div>
            </div>
          )}

          {message && (
            <div className="alert alert-success d-flex align-items-center mb-3 py-2 border-0 rounded-3" role="alert">
              <i className="fa-solid fa-circle-check me-2"></i>
              <div className="small fw-semibold">{message}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">Full Name</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-0"><i className="fa-solid fa-user text-muted"></i></span>
                  <input 
                    type="text" 
                    className="form-control bg-light border-0" 
                    placeholder="Enter full name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0"><i className="fa-solid fa-envelope text-muted"></i></span>
                <input 
                  type="email" 
                  className="form-control bg-light border-0" 
                  placeholder="name@company.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0"><i className="fa-solid fa-lock text-muted"></i></span>
                <input 
                  type="password" 
                  className="form-control bg-light border-0" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">Account Access Role</label>
                <div className="d-flex gap-3 flex-wrap">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="rolePreset" 
                      id="roleClient" 
                      checked={role === 'client'} 
                      onChange={() => setRole('client')}
                    />
                    <label className="form-check-label text-dark small" htmlFor="roleClient">
                      Studio Client
                    </label>
                  </div>
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="rolePreset" 
                      id="roleAdmin" 
                      checked={role === 'admin'} 
                      onChange={() => setRole('admin')}
                    />
                    <label className="form-check-label text-dark small" htmlFor="roleAdmin">
                      Studio Admin
                    </label>
                  </div>
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="rolePreset" 
                      id="roleStandard" 
                      checked={role === 'standard'} 
                      onChange={() => setRole('standard')}
                    />
                    <label className="form-check-label text-dark small" htmlFor="roleStandard">
                      Standard User (Read-Only)
                    </label>
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-dark w-100 py-2.5 rounded-3 fw-bold mb-3 shadow-sm d-flex align-items-center justify-content-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing Secure Session...
                </>
              ) : (
                isLogin ? 'Sign In Securely' : 'Create Secure Account'
              )}
            </button>
          </form>

          {verificationToken && (
            <div className="border border-warning bg-light p-3 rounded-3 mb-4 text-center">
              <p className="small text-dark mb-2">
                <strong>📧 Simulating Verification Email:</strong> For security compliance, newly registered users must verify their email. Use this button to simulate clicking the email link.
              </p>
              <button 
                type="button" 
                className="btn btn-warning btn-sm fw-bold px-4 rounded-3"
                onClick={handleSimulatedVerification}
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Simulate Clicking Verification Email'}
              </button>
            </div>
          )}

          <div className="mt-4 border-top pt-4">
            <h6 className="small fw-bold text-muted mb-2 text-center uppercase tracking-wider">Demo Access Quick Presets</h6>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button 
                type="button" 
                className="btn btn-outline-dark btn-sm rounded-3 px-3 fw-semibold text-xs"
                onClick={() => setCredentialPreset('admin@studio.com', 'Admin123!')}
              >
                <i className="fa-solid fa-user-shield me-1 text-blue-400"></i> Admin
              </button>
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm rounded-3 px-3 fw-semibold text-xs"
                onClick={() => setCredentialPreset('client@studio.com', 'Client123!')}
              >
                <i className="fa-solid fa-user-tie me-1 text-blue-400"></i> Client
              </button>
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm rounded-3 px-3 fw-semibold text-xs"
                onClick={() => setCredentialPreset('user@studio.com', 'User123!')}
              >
                <i className="fa-solid fa-user me-1 text-blue-400"></i> Standard User
              </button>
            </div>
            <div className="mt-3 text-center">
              <span className="text-muted text-xs d-block">🔒 Security Features Active: Rate Limiting, 5-Attempt Account Lockout, JWT Signatures</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
