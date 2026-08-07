'use client';

import { useState } from 'react';
import Link from 'next/link';

const BRANCH_CODES = ['ALL', 'BLR', 'DEL', 'BOM', 'MAA', 'PNQ', 'HYD', 'AMD', 'COK', 'KOL', 'OSS'];

export default function SignupPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Category Multi-Selection — both false by default
  const [requestCsc, setRequestCsc] = useState(false);
  const [requestUnbilled, setRequestUnbilled] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['ALL']);
  const [photo, setPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to max 10 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const toggleBranch = (code: string) => {
    if (code === 'ALL') {
      if (selectedBranches.includes('ALL')) {
        setSelectedBranches([]);
      } else {
        setSelectedBranches(['ALL']);
      }
    } else {
      let updated = selectedBranches.filter(b => b !== 'ALL');
      if (updated.includes(code)) {
        updated = updated.filter(b => b !== code);
      } else {
        updated.push(code);
      }
      setSelectedBranches(updated);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (phone.length !== 10) {
        throw new Error('Mobile number must be exactly 10 digits.');
      }

      const formattedEmail = email ? email.toLowerCase() : `${username.toLowerCase()}@transworldintl.com`;
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formattedEmail,
          password,
          name,
          username: username.toLowerCase(),
          csc_role: requestCsc ? 'Edit' : 'None',
          followups_role: 'None',
          all_jobs_role: 'None',
          unbilled_role: requestUnbilled ? 'Edit' : 'None',
          branches: requestUnbilled ? selectedBranches : [],
          phone,
          photo,
          is_approved: false // Requires Super Admin approval!
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit registration request');

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      overflowY: 'auto',
      background: 'var(--bg-color)',
      padding: '2.5rem 1rem',
      boxSizing: 'border-box',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '540px',
        margin: '2rem auto',
        background: 'var(--surface-color)',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--glass-shadow)',
        padding: '2.5rem'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            🚀 Staff Self-Registration
          </h1>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', margin: '0 0 0.5rem' }}>Account Pending Approval!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Thank you <strong>{name}</strong>. Your registration request has been sent to Super Admin <strong>Ganesaperumal</strong> for approval and role assignment.
            </p>
            <Link href="/login" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.65rem 1.5rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 700, textDecoration: 'none' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {errorMsg && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                ❌ {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Full Name *</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Username *</label>
                <input required type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="john" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Mobile Number *</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="10 digit mobile number"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Email Address *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@transworldintl.com" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Password *</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
            </div>

            {/* Category Access Multi-Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                🔐 Request Access Modules (Select all that apply):
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${requestCsc ? '#4f46e5' : 'var(--border-color)'}`,
                  background: requestCsc ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={requestCsc}
                    onChange={(e) => setRequestCsc(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5', flexShrink: 0 }}
                  />
                  <span>📋 Jobs Portal Access</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${requestUnbilled ? '#10b981' : 'var(--border-color)'}`,
                  background: requestUnbilled ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={requestUnbilled}
                    onChange={(e) => setRequestUnbilled(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981', flexShrink: 0 }}
                  />
                  <span>🧾 Unbilled Management Access</span>
                </label>
              </div>
            </div>

            {/* Unbilled Branch Selector */}
            {requestUnbilled && (
              <div style={{ background: 'var(--bg-color)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  📍 Select Your Working Branches:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {BRANCH_CODES.map(code => {
                    const isSelected = selectedBranches.includes(code);
                    return (
                      <div
                        key={code}
                        onClick={() => toggleBranch(code)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '16px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: `1px solid ${isSelected ? '#10b981' : 'var(--border-color)'}`,
                          background: isSelected ? 'rgba(16,185,129,0.15)' : 'var(--surface-color)',
                          color: isSelected ? '#10b981' : 'var(--text-secondary)'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '} {code}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional Photo Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Profile Photo (Optional - Not Compulsory)
              </label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}
            >
              {loading ? 'Submitting Request...' : '🚀 Submit Sign-Up Request'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Already have an account? <Link href="/login" style={{ color: '#4f46e5', fontWeight: 700 }}>Log In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
