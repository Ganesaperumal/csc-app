'use client';

import { useState, useEffect } from 'react';
import { customConfirm } from '@/components/GlobalDialogs';

const BRANCH_CODES = ['ALL', 'BLR', 'DEL', 'BOM', 'MAA', 'PNQ', 'HYD', 'AMD', 'COK', 'KOL', 'OSS'];

interface UserDetailsModalProps {
  user: any;
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
  onDelete?: (userId: string) => Promise<void>;
}

export default function UserDetailsModal({ user, onClose, onSave, onDelete }: UserDetailsModalProps) {
  const isCreate = !user || !user.id;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || (user?.username ? `${user.username}@transworldintl.com` : ''));
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');

  const getInitialCscAccess = (r?: string): 'None' | 'View' | 'Edit' => {
    if (!r || r === 'None') return 'None';
    if (r === 'Viewer' || r === 'View') return 'View';
    return 'Edit';
  };

  const getInitialFollowupAccess = (r?: string): 'None' | 'Self' | 'All' => {
    if (!r || r === 'None') return 'None';
    if (r === 'Executive' || r === 'Self' || r === 'Viewer') return 'Self';
    return 'All';
  };

  const getInitialAllJobsAccess = (r?: string): 'None' | 'View' => {
    if (r === 'None') return 'None';
    return 'View';
  };

  const getInitialUnbilledAccess = (r?: string): 'None' | 'View' | 'Edit' => {
    if (!r || r === 'None') return 'None';
    if (r === 'Viewer' || r === 'View') return 'View';
    return 'Edit';
  };

  const [cscAccess, setCscAccess] = useState<'None' | 'View' | 'Edit'>(getInitialCscAccess(user?.csc_role));
  const [followupAccess, setFollowupAccess] = useState<'None' | 'Self' | 'All'>(getInitialFollowupAccess(user?.tracking_role));
  const [allJobsAccess, setAllJobsAccess] = useState<'None' | 'View'>(getInitialAllJobsAccess(user?.role));
  const [unbilledAccess, setUnbilledAccess] = useState<'None' | 'View' | 'Edit'>(getInitialUnbilledAccess(user?.unbilled_role));
  
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    user?.branches && user?.branches.length > 0 ? user?.branches : ['ALL']
  );
  const [isApproved, setIsApproved] = useState<boolean>(user?.is_approved !== false);
  const [photo, setPhoto] = useState<string | null>(user?.photo || null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveData = async () => {
    setSaving(true);

    const csc_role = cscAccess === 'None' ? 'None' : (cscAccess === 'View' ? 'Viewer' : 'Executive');
    const tracking_role = cscAccess === 'None' ? 'None' : (followupAccess === 'None' ? 'None' : (followupAccess === 'Self' ? 'Executive' : 'Admin'));
    const unbilled_role = unbilledAccess === 'None' ? 'None' : (unbilledAccess === 'View' ? 'Viewer' : 'Executive');
    const role = (cscAccess === 'Edit' || unbilledAccess === 'Edit') ? 'Executive' : (cscAccess === 'View' || unbilledAccess === 'View' || allJobsAccess === 'View' ? 'Viewer' : 'None');
    const branches = unbilledAccess === 'None' ? [] : (selectedBranches.length > 0 ? selectedBranches : ['ALL']);

    await onSave({
      userId: user?.id,
      name,
      username,
      email,
      phone,
      password: isCreate ? password : (password || undefined),
      csc_role,
      tracking_role,
      unbilled_role,
      role,
      branches,
      is_approved: isApproved,
      photo
    });
    setSaving(false);
    setHasChanges(false);
  };

  const toggleBranch = (code: string) => {
    setHasChanges(true);
    let updated: string[];
    if (code === 'ALL') {
      if (selectedBranches.includes('ALL')) {
        updated = [];
      } else {
        updated = ['ALL'];
      }
    } else {
      updated = selectedBranches.filter(b => b !== 'ALL');
      if (updated.includes(code)) {
        updated = updated.filter(b => b !== code);
      } else {
        updated.push(code);
      }
    }
    setSelectedBranches(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHasChanges(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveData();
  };

  const isSuperAdmin = user?.username === 'ganesh' || user?.name?.includes('Ganesaperumal');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '580px', maxWidth: '100vw', height: '100vh', background: '#ffffff', color: '#0f172a', borderLeft: '1px solid #cbd5e1', boxShadow: '-10px 0 40px rgba(0,0,0,0.35)', padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        {isCreate && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              ➕ Create New User Account
            </h2>
          </div>
        )}

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

            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{name || 'New User Profile'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{email || 'john@transworldintl.com'}</div>
              </div>

              {/* Approved status switch */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isApproved ? '#059669' : '#dc2626' }}>
                  Approved
                </span>
                <input
                  type="checkbox"
                  disabled={isSuperAdmin}
                  checked={isApproved}
                  onChange={(e) => {
                    setIsApproved(e.target.checked);
                    setHasChanges(true);
                  }}
                  style={{ width: '18px', height: '18px', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}
                />
              </label>
            </div>
          </div>

          {/* Row 1: Full Name * (Left) | Username * (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Full Name *</label>
              <input required type="text" value={name} onChange={(e) => { setName(e.target.value); setHasChanges(true); }} placeholder="John Doe" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Username *</label>
              <input required type="text" value={username} onChange={(e) => {
                const u = e.target.value.toLowerCase();
                setUsername(u);
                setHasChanges(true);
                if (isCreate) setEmail(`${u}@transworldintl.com`);
              }} placeholder="john" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>
          </div>

          {/* Row 2: Email Address * (Left) | Phone Number (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Email Address *</label>
              <input required type="email" value={email} onChange={(e) => { setEmail(e.target.value.toLowerCase()); setHasChanges(true); }} placeholder="john@transworldintl.com" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Phone Number</label>
              <input type="text" value={phone} onChange={(e) => { setPhone(e.target.value); setHasChanges(true); }} placeholder="e.g. 9876543210" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>
          </div>

          {/* Password (if creating new account) */}
          {isCreate && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Password *</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => { setPassword(e.target.value); setHasChanges(true); }} placeholder="Min. 6 characters" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem' }} />
            </div>
          )}

          {/* 🔒 Direct Page & Section Permissions Matrix */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
              🔒 Direct Page &amp; Section Permissions
            </div>

            {/* 1. CSC Jobs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>📋 CSC Jobs Access</label>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Active &amp; Closed Jobs</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['None', 'View', 'Edit'] as const).map(option => {
                  const isSelected = cscAccess === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setCscAccess(option);
                        if (option === 'None') setFollowupAccess('None');
                        setHasChanges(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        background: isSelected ? 'rgba(79, 70, 229, 0.12)' : '#ffffff',
                        color: isSelected ? '#4f46e5' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {option === 'None' ? '🚫 None' : option === 'View' ? '👁️ View' : '✏️ Edit'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Follow-Ups (Shown ONLY if CSC Jobs !== 'None') */}
            {cscAccess !== 'None' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>⏰ Follow-Ups Access</label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Follow-up Reminders</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['None', 'Self', 'All'] as const).map(option => {
                    const isSelected = followupAccess === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setFollowupAccess(option);
                          setHasChanges(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #6366f1' : '1px solid #cbd5e1',
                          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : '#ffffff',
                          color: isSelected ? '#6366f1' : '#475569',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {option === 'None' ? '🚫 None' : option === 'Self' ? '👤 Self' : '🌐 All'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. All Jobs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>📁 All Jobs Access</label>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Full-Width Jobs View</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['None', 'View'] as const).map(option => {
                  const isSelected = allJobsAccess === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAllJobsAccess(option);
                        setHasChanges(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: isSelected ? 'rgba(2, 132, 199, 0.12)' : '#ffffff',
                        color: isSelected ? '#0284c7' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {option === 'None' ? '🚫 None' : '👁️ View'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Unbilled */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>🧾 Unbilled Access</label>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Unbilled Jobs Portal</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['None', 'View', 'Edit'] as const).map(option => {
                  const isSelected = unbilledAccess === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setUnbilledAccess(option);
                        if (option === 'None') setSelectedBranches([]);
                        setHasChanges(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : '#ffffff',
                        color: isSelected ? '#10b981' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {option === 'None' ? '🚫 None' : option === 'View' ? '👁️ View' : '✏️ Edit'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Assigned Unbilled Branches (Shown ONLY if Unbilled !== 'None') */}
            {unbilledAccess !== 'None' && (
              <div style={{ paddingTop: '0.25rem' }}>
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

          {/* Footer Actions Immediately Below Branches */}
          <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isCreate ? (
              <button
                type="submit"
                disabled={saving}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Creating...' : '➕ Create User Account'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveData}
                disabled={saving}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}
              >
                {saving ? 'Saving Changes...' : '💾 Save Profile & Permissions'}
              </button>
            )}

            {!isCreate && !isSuperAdmin && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await customConfirm(`⚠️ Are you sure you want to permanently delete user account "${name || username}"?\nThis action cannot be undone.`);
                  if (confirmed) {
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
