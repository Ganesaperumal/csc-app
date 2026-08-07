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

type CscAccess = 'None' | 'View' | 'Edit';
type FollowupAccess = 'None' | 'Self' | 'All';
type AllJobsAccess = 'None' | 'View';
type UnbilledAccess = 'None' | 'View' | 'Edit';

const cscCycle: CscAccess[] = ['None', 'View', 'Edit'];
const followupCycle: FollowupAccess[] = ['None', 'Self', 'All'];
const allJobsCycle: AllJobsAccess[] = ['None', 'View'];
const unbilledCycle: UnbilledAccess[] = ['None', 'View', 'Edit'];

function next<T>(arr: T[], cur: T): T {
  return arr[(arr.indexOf(cur) + 1) % arr.length];
}

const badgeStyleMap: Record<string, { bg: string; color: string; border: string }> = {
  None: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  View: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  Edit: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  Self: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  All: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
};

function AccessTile({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const b = badgeStyleMap[value] || badgeStyleMap.None;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      title={disabled ? 'Disabled' : `Click to cycle (current: ${value})`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.55rem 0.75rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        background: disabled ? 'var(--bg-color, #f8fafc)' : 'var(--surface-color, #ffffff)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '0.2rem 0.55rem',
          borderRadius: '4px',
          background: b.bg,
          color: b.color,
          border: `1px solid ${b.border}`,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function UserDetailsModal({ user, onClose, onSave, onDelete }: UserDetailsModalProps) {
  const isCreate = !user || !user.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || (user?.username ? `${user.username}@transworldintl.com` : ''));
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');

  const initCsc = (r?: string): CscAccess => (!r || r === 'None' ? 'None' : r === 'Viewer' || r === 'View' ? 'View' : 'Edit');
  const initFollowup = (r?: string): FollowupAccess => (!r || r === 'None' ? 'None' : r === 'Executive' || r === 'Self' || r === 'Viewer' ? 'Self' : 'All');
  const initAllJobs = (r?: string): AllJobsAccess => (!r || r === 'None' ? 'None' : 'View');
  const initUnbilled = (r?: string): UnbilledAccess => (!r || r === 'None' ? 'None' : r === 'Viewer' || r === 'View' ? 'View' : 'Edit');

  const [cscAccess, setCscAccess] = useState<CscAccess>(initCsc(user?.csc_role));
  const [followupAccess, setFollowupAccess] = useState<FollowupAccess>(initFollowup(user?.tracking_role));
  const [allJobsAccess, setAllJobsAccess] = useState<AllJobsAccess>(initAllJobs(user?.role));
  const [unbilledAccess, setUnbilledAccess] = useState<UnbilledAccess>(initUnbilled(user?.unbilled_role));
  const [branches, setBranches] = useState<string[]>(user?.branches?.length ? user.branches : ['ALL']);
  const [isApproved, setIsApproved] = useState<boolean>(user?.is_approved !== false);
  const [photo, setPhoto] = useState<string | null>(user?.photo || null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.username === 'ganesh' || user?.name?.includes('Ganesaperumal');

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      userId: user?.id,
      name,
      username,
      email,
      phone,
      password: isCreate ? password : password || undefined,
      csc_role: cscAccess === 'None' ? 'None' : cscAccess === 'View' ? 'Viewer' : 'Executive',
      tracking_role: cscAccess === 'None' ? 'None' : followupAccess === 'None' ? 'None' : followupAccess === 'Self' ? 'Executive' : 'Admin',
      unbilled_role: unbilledAccess === 'None' ? 'None' : unbilledAccess === 'View' ? 'Viewer' : 'Executive',
      role: cscAccess === 'Edit' || unbilledAccess === 'Edit' ? 'Executive' : cscAccess === 'View' || unbilledAccess === 'View' || allJobsAccess === 'View' ? 'Viewer' : 'None',
      branches: unbilledAccess === 'None' ? [] : branches.length ? branches : ['ALL'],
      is_approved: isApproved,
      photo,
    });
    setSaving(false);
  };

  const toggleBranch = (code: string) => {
    if (code === 'ALL') {
      setBranches(branches.includes('ALL') ? [] : ['ALL']);
      return;
    }
    const without = branches.filter((b) => b !== 'ALL');
    setBranches(without.includes(code) ? without.filter((b) => b !== code) : [...without, code]);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #cbd5e1)',
    background: 'var(--surface-color, #ffffff)',
    color: 'var(--text-primary, #0f172a)',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--text-secondary, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.3rem',
    display: 'block',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          maxWidth: '100vw',
          height: '100vh',
          background: 'var(--surface-color, #ffffff)',
          borderLeft: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-color, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem',
                overflow: 'hidden',
              }}
            >
              {photo ? (
                <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (name[0] || username[0] || 'U').toUpperCase()
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                {name || (isCreate ? 'Add User' : 'Edit User')}
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                {username ? `@${username}` : 'User Profile Details'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: 'var(--text-secondary, #64748b)',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              background: 'var(--bg-color, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>Account Status</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}>
              <input
                type="checkbox"
                disabled={isSuperAdmin}
                checked={isApproved}
                onChange={(e) => setIsApproved(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isApproved ? '#059669' : '#dc2626' }}>
                {isApproved ? 'Approved' : 'Disabled'}
              </span>
            </label>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Username *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  const u = e.target.value.toLowerCase();
                  setUsername(u);
                  if (isCreate) setEmail(`${u}@transworldintl.com`);
                }}
                placeholder="Username"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="Email"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inputStyle} />
            </div>
            {isCreate && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Permissions Grid */}
          <div>
            <label style={{ ...labelStyle, marginBottom: '0.6rem' }}>Direct Section Access (Click to change)</label>

            {/* 2x2 Grid: CSC & Follow-Ups top, All Jobs & Unbilled bottom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <AccessTile
                label="CSC Jobs"
                value={cscAccess}
                onClick={() => {
                  const n = next(cscCycle, cscAccess);
                  setCscAccess(n);
                  if (n === 'None') setFollowupAccess('None');
                }}
              />
              <AccessTile
                label="Follow-Ups"
                value={followupAccess}
                disabled={cscAccess === 'None'}
                onClick={() => setFollowupAccess(next(followupCycle, followupAccess))}
              />
              <AccessTile
                label="All Jobs"
                value={allJobsAccess}
                onClick={() => setAllJobsAccess(next(allJobsCycle, allJobsAccess))}
              />
              <AccessTile
                label="Unbilled"
                value={unbilledAccess}
                onClick={() => {
                  const n = next(unbilledCycle, unbilledAccess);
                  setUnbilledAccess(n);
                  if (n === 'None') setBranches([]);
                }}
              />
            </div>

            {/* Assigned Branches */}
            {unbilledAccess !== 'None' && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'var(--bg-color, #f8fafc)',
                }}
              >
                <div style={{ ...labelStyle, fontSize: '0.7rem', color: '#059669', marginBottom: '0.4rem' }}>
                  Assigned Unbilled Branches
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {BRANCH_CODES.map((code) => {
                    const active = branches.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleBranch(code)}
                        style={{
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${active ? '#059669' : 'var(--border-color, #cbd5e1)'}`,
                          background: active ? '#ecfdf5' : 'var(--surface-color, #ffffff)',
                          color: active ? '#059669' : 'var(--text-secondary, #64748b)',
                        }}
                      >
                        {active ? `✓ ${code}` : code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Save Profile & Delete User immediately under permissions/branches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : isCreate ? 'Create User Profile' : 'Save Profile & Permissions'}
            </button>

            {!isCreate && !isSuperAdmin && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await customConfirm(`Are you sure you want to delete "${name || username}"?`);
                  if (ok) await onDelete(user.id);
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Delete User Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
