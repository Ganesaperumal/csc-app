'use client';

import { useState } from 'react';
import CustomSelect from '../components/CustomSelect';

const ROLE_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Viewer', label: 'Viewer' },
  { value: 'Executive', label: 'Executive' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' }
];

const BRANCH_CODES = ['ALL', 'BLR', 'DEL', 'BOM', 'MAA', 'PNQ', 'HYD', 'AMD', 'COK', 'KOL', 'OSS'];

interface UserDetailsModalProps {
  user: any;
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
  onDelete?: (userId: string) => Promise<void>;
}

export default function UserDetailsModal({ user, onClose, onSave, onDelete }: UserDetailsModalProps) {
  const isCreate = !user || !user.id;

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || (user?.username ? `${user.username}@transworldintl.com` : ''));
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');

  const normalizeRole = (r: string) => {
    if (!r || r === 'None') return 'None';
    if (r === 'Executive') return 'Executive';
    if (r === 'Branch Manager' || r === 'Manager') return 'Manager';
    if (r === 'Viewer' || r === 'SPOC') return 'Viewer';
    if (r === 'Admin') return 'Admin';
    return 'None';
  };

  const [cscRole, setCscRole] = useState(normalizeRole(user?.csc_role));
  const [trackingRole, setTrackingRole] = useState(normalizeRole(user?.tracking_role));
  const [unbilledRole, setUnbilledRole] = useState(normalizeRole(user?.unbilled_role));
  const [selectedBranches, setSelectedBranches] = useState<string[]>(user?.branches && user?.branches.length > 0 ? user?.branches : ['ALL']);
  const [isApproved, setIsApproved] = useState<boolean>(user?.is_approved !== false);
  const [photo, setPhoto] = useState<string | null>(user?.photo || null);
  const [saving, setSaving] = useState(false);

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
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      userId: user?.id,
      name,
      username,
      email,
      phone,
      password: isCreate ? password : (password || undefined),
      csc_role: cscRole,
      tracking_role: trackingRole,
      unbilled_role: unbilledRole,
      branches: selectedBranches,
      is_approved: isApproved,
      photo
    });
    setSaving(false);
  };

  const isSuperAdmin = user?.username === 'ganesh' || user?.name?.includes('Ganesaperumal');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '550px', maxWidth: '100vw', height: '100vh', background: '#ffffff', color: '#0f172a', borderLeft: '1px solid #cbd5e1', boxShadow: '-10px 0 40px rgba(0,0,0,0.35)', padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {isCreate ? '➕ Create New User Account' : `⚙️ User Profile (${user?.name || user?.username})`}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Photo & Basic Info */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #4f46e5', fontSize: '1.5rem' }}>
                {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name[0] || username[0] || 'U')}
              </div>
              <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: -2, right: -2, background: '#4f46e5', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                📷
              </label>
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{name || 'New User Profile'}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{email || 'john@transworldintl.com'}</div>
              {isSuperAdmin && (
                <span style={{ display: 'inline-block', marginTop: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 800 }}>
                  👑 SUPER ADMIN (Ganesaperumal)
                </span>
              )}
            </div>
          </div>

          {/* Account Details Inputs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Full Name *</label>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Username *</label>
              <input required type="text" value={username} onChange={(e) => {
                const u = e.target.value.toLowerCase();
                setUsername(u);
                if (isCreate) setEmail(`${u}@transworldintl.com`);
              }} placeholder="john" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Email Address *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} placeholder="john@transworldintl.com" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isCreate ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>
            {isCreate && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Password *</label>
                <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
              </div>
            )}
          </div>

          {/* Approval Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isApproved ? '#ecfdf5' : '#fef2f2', padding: '0.85rem 1rem', borderRadius: '10px', border: `1px solid ${isApproved ? '#a7f3d0' : '#fecaca'}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isApproved ? '#059669' : '#dc2626' }}>
                {isApproved ? '✅ Account Status: Approved & Active' : '⏳ Account Status: Pending Admin Approval'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Toggle to enable or block user login access.</div>
            </div>
            <input
              type="checkbox"
              disabled={isSuperAdmin}
              checked={isApproved}
              onChange={(e) => setIsApproved(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {/* Module Permissions Matrix */}
          <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🔐 Module Access Control Matrix
          </h3>

          {/* 1. CSC Portal Access */}
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', marginBottom: '0.4rem' }}>📋 1. CSC Portal Access</label>
            <CustomSelect
              value={cscRole}
              onChange={(val) => setCscRole(val)}
              options={ROLE_OPTIONS}
            />
          </div>

          {/* 2. Jobs Tracking Access */}
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.4rem' }}>📱 2. Jobs Tracking Portal Access</label>
            <CustomSelect
              value={trackingRole}
              onChange={(val) => setTrackingRole(val)}
              options={ROLE_OPTIONS}
            />
          </div>

          {/* 3. Unbilled Management Access */}
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', marginBottom: '0.4rem' }}>💰 3. Unbilled Management Access</label>
            <CustomSelect
              value={unbilledRole}
              onChange={(val) => setUnbilledRole(val)}
              options={ROLE_OPTIONS}
            />

            {/* Branch Multi-Select Pills */}
            {unbilledRole !== 'None' && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  📍 Assigned Unbilled Branches:
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
                          border: `1px solid ${isSelected ? '#10b981' : '#cbd5e1'}`,
                          background: isSelected ? 'rgba(16,185,129,0.15)' : '#ffffff',
                          color: isSelected ? '#10b981' : '#475569'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '} {code}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving...' : '💾 Save Profile & Permissions'}
              </button>
            </div>

            {!isSuperAdmin && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`⚠️ Are you sure you want to permanently delete user "${name || username}"?`)) {
                    await onDelete(user.id);
                  }
                }}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                🗑️ Permanently Delete User Account
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
