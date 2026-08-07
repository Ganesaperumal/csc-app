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

type CscAccess      = 'None' | 'View' | 'Edit';
type FollowupAccess = 'None' | 'Self' | 'All';
type AllJobsAccess  = 'None' | 'View';
type UnbilledAccess = 'None' | 'View' | 'Edit';

/* ── Cycle helpers ── */
const cscCycle:      CscAccess[]      = ['None', 'View', 'Edit'];
const followupCycle: FollowupAccess[] = ['None', 'Self', 'All'];
const allJobsCycle:  AllJobsAccess[]  = ['None', 'View'];
const unbilledCycle: UnbilledAccess[] = ['None', 'View', 'Edit'];

function next<T>(arr: T[], cur: T): T { return arr[(arr.indexOf(cur) + 1) % arr.length]; }

/* ── User Preferred Emoji Map (None has no emoji) ── */
const valueEmoji: Record<string, string> = {
  None: '',
  View: '🔍',
  Edit: '✏️',
  Self: '👤',
  All:  '🌐',
};

/* ── Access Badge Colors ── */
const badgeColor: Record<string, { bg: string; color: string; border: string }> = {
  None: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
  View: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Edit: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Self: { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' },
  All:  { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
};

/* ── Access Tile ── */
function AccessTile({
  label, icon, value, onClick, dim,
}: { label: string; icon: string; value: string; onClick: () => void; dim?: boolean }) {
  const c = badgeColor[value] ?? badgeColor.None;
  const emoji = valueEmoji[value] ?? '';
  const isNone = value === 'None';
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Click to cycle access (Current: ${value})`}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.65rem 0.85rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: dim ? 0.4 : 1,
        pointerEvents: dim ? 'none' : 'auto',
        gap: '0.5rem',
        height: '46px',
      }}
    >
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
        <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      {/* Badge — Uniform width rounded pill */}
      <span style={{
        padding: '0.22rem 0.5rem',
        borderRadius: '20px',
        fontSize: '0.72rem', fontWeight: 700,
        letterSpacing: '0.02em',
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        opacity: isNone ? 0.75 : 1,
        flexShrink: 0, transition: 'all 0.15s ease',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
        width: '76px', textAlign: 'center',
      }}>
        {emoji ? <span>{emoji}</span> : null}
        <span>{value}</span>
      </span>
    </button>
  );
}

/* ── Main Modal ── */
export default function UserDetailsModal({ user, onClose, onSave, onDelete }: UserDetailsModalProps) {
  const isCreate = !user || !user.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [name,     setName]     = useState(user?.name     || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email,    setEmail]    = useState(user?.email    || (user?.username ? `${user.username}@transworldintl.com` : ''));
  const [phone,    setPhone]    = useState(user?.phone    || '');
  const [password, setPassword] = useState('');

  /* Direct Role Parsing */
  const parseCsc = (r?: string): CscAccess => {
    if (!r || r === 'None') return 'None';
    if (r === 'Edit' || r === 'Executive' || r === 'Manager' || r === 'Admin' || r === 'Branch Manager') return 'Edit';
    if (r === 'View' || r === 'Viewer') return 'View';
    return 'None';
  };

  const parseFollowup = (f?: string, t?: string): FollowupAccess => {
    const val = f || t;
    if (!val || val === 'None') return 'None';
    if (val === 'All' || val === 'Admin') return 'All';
    if (val === 'Self' || val === 'Executive' || val === 'Viewer') return 'Self';
    return 'None';
  };

  const parseAllJobs = (a?: string, r?: string): AllJobsAccess => {
    const val = a || r;
    if (!val || val === 'None') return 'None';
    if (val === 'View' || val === 'Viewer' || val === 'Executive' || val === 'Admin') return 'View';
    return 'None';
  };

  const parseUnbilled = (r?: string): UnbilledAccess => {
    if (!r || r === 'None') return 'None';
    if (r === 'Edit' || r === 'Executive' || r === 'Manager' || r === 'Admin' || r === 'Branch Manager') return 'Edit';
    if (r === 'View' || r === 'Viewer') return 'View';
    return 'None';
  };

  const [cscAccess,     setCscAccess]     = useState<CscAccess>(parseCsc(user?.csc_role));
  const [followupAccess,setFollowupAccess]= useState<FollowupAccess>(parseFollowup(user?.followups_role, user?.tracking_role));
  const [allJobsAccess, setAllJobsAccess] = useState<AllJobsAccess>(parseAllJobs(user?.all_jobs_role, user?.role));
  const [unbilledAccess,setUnbilledAccess]= useState<UnbilledAccess>(parseUnbilled(user?.unbilled_role));
  const [branches,      setBranches]      = useState<string[]>(user?.branches?.length ? user.branches : ['ALL']);
  const [savedBranches, setSavedBranches] = useState<string[]>(user?.branches?.length ? user.branches : ['ALL']);
  const [isApproved,    setIsApproved]    = useState<boolean>(user?.is_approved !== false);
  const [photo,         setPhoto]         = useState<string | null>(user?.photo || null);
  const [saving,        setSaving]        = useState(false);

  const isSuperAdmin = user?.username === 'ganesh' || user?.name?.includes('Ganesaperumal');

  /* Branch restoration requirement:
     When Unbilled = None, branches are cleared. If Unbilled is changed back to View/Edit, restore branches! */
  const handleUnbilledToggle = () => {
    const nextVal = next(unbilledCycle, unbilledAccess);
    setUnbilledAccess(nextVal);
    if (nextVal === 'None') {
      if (branches.length > 0) setSavedBranches(branches);
      setBranches([]);
    } else if (branches.length === 0) {
      setBranches(savedBranches.length ? savedBranches : ['ALL']);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      userId: user?.id, name, username, email, phone,
      password: isCreate ? password : (password || undefined),
      csc_role:       cscAccess,
      followups_role: cscAccess === 'None' ? 'None' : followupAccess,
      all_jobs_role:  allJobsAccess,
      unbilled_role:  unbilledAccess,
      // Legacy columns saved for backward compat:
      tracking_role: cscAccess === 'None' ? 'None' : (followupAccess === 'None' ? 'None' : (followupAccess === 'Self' ? 'Executive' : 'Admin')),
      role:          allJobsAccess === 'None' ? 'None' : 'Viewer',
      branches:      unbilledAccess === 'None' ? [] : (branches.length ? branches : ['ALL']),
      is_approved:   isApproved, photo,
    });
    setSaving(false);
  };

  const toggleBranch = (code: string) => {
    if (code === 'ALL') { setBranches(branches.includes('ALL') ? [] : ['ALL']); return; }
    const without = branches.filter(b => b !== 'ALL');
    setBranches(without.includes(code) ? without.filter(b => b !== code) : [...without, code]);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.85rem',
    borderRadius: '10px', border: '1px solid #cbd5e1',
    background: '#ffffff', color: '#0f172a',
    fontSize: '0.85rem',
    outline: 'none', transition: 'border-color 0.2s',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '540px', height: '100vh',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'slideIn 0.25s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', fontWeight: 700, color: '#334155', fontSize: '1rem',
            }}>
              {photo ? (
                <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (name?.[0] || username?.[0] || 'U').toUpperCase()
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {isCreate ? 'Create New User Account' : (name || username)}
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {isCreate ? 'Set up login credentials & access roles' : `@${username} · User Details & Access Matrix`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%', border: 'none',
              background: '#f1f5f9', color: '#64748b', fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section 1: Profile Information */}
          <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              👤 Profile Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>FULL NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>USERNAME</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. johndoe" style={inputStyle} disabled={!isCreate && isSuperAdmin} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>EMAIL ADDRESS</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@transworldintl.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>PHONE NUMBER</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" style={inputStyle} />
              </div>
            </div>

            {/* Password input */}
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                {isCreate ? 'ACCOUNT PASSWORD *' : 'RESET PASSWORD (leave blank to keep current)'}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isCreate ? 'Minimum 6 characters' : 'Enter new password...'} style={inputStyle} />
            </div>
          </div>

          {/* Section 2: Access Permissions (2x2 Grid) */}
          <div style={{ background: '#ffffff', padding: '1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🛡️ Access Permissions
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Click tile to cycle permission level</span>
            </div>

            {/* 2x2 Permission Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <AccessTile
                label="CSC Jobs"
                icon="📋"
                value={cscAccess}
                onClick={() => {
                  const nextVal = next(cscCycle, cscAccess);
                  setCscAccess(nextVal);
                  if (nextVal === 'None') setFollowupAccess('None');
                  else if (followupAccess === 'None') setFollowupAccess('Self');
                }}
              />
              <AccessTile
                label="Follow-Ups"
                icon="⏰"
                value={followupAccess}
                dim={cscAccess === 'None'}
                onClick={() => setFollowupAccess(next(followupCycle, followupAccess))}
              />
              <AccessTile
                label="All Jobs"
                icon="📁"
                value={allJobsAccess}
                onClick={() => setAllJobsAccess(next(allJobsCycle, allJobsAccess))}
              />
              <AccessTile
                label="Unbilled"
                icon="🧾"
                value={unbilledAccess}
                onClick={handleUnbilledToggle}
              />
            </div>
          </div>

          {/* Section 3: Branch Assignments */}
          <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', opacity: unbilledAccess === 'None' ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📍 Assigned Unbilled Branches
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {unbilledAccess === 'None' ? 'Disabled (Unbilled is None)' : (branches.includes('ALL') ? 'All Branches Assigned' : `${branches.length} Branch(es)`)}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {BRANCH_CODES.map(code => {
                const isSelected = branches.includes(code);
                const isAllSelected = branches.includes('ALL') && code !== 'ALL';
                const active = isSelected || isAllSelected;

                return (
                  <button
                    key={code}
                    type="button"
                    disabled={unbilledAccess === 'None'}
                    onClick={() => toggleBranch(code)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: active ? 700 : 500,
                      border: active ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                      background: active ? '#eeef44' : '#ffffff',
                      color: active ? '#1e1b4b' : '#64748b',
                      cursor: unbilledAccess === 'None' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 1px 3px rgba(79,70,229,0.15)' : 'none',
                    }}
                  >
                    {active ? '✓ ' : '+ '}
                    {code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Account Status Toggle */}
          <div style={{ background: '#ffffff', padding: '1rem 1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Account Status</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isApproved ? 'User is active & can log in to the portal' : 'User account is disabled / pending approval'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsApproved(!isApproved)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '20px',
                border: isApproved ? '1px solid #bbf7d0' : '1px solid #fecaca',
                background: isApproved ? '#f0fdf4' : '#fef2f2',
                color: isApproved ? '#15803d' : '#dc2626',
                fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {isApproved ? '✓ Active' : '⛔ Disabled'}
            </button>
          </div>

        </div>

        {/* ── Footer Actions ── */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          {!isCreate && onDelete ? (
            <button
              type="button"
              onClick={async () => {
                const conf = await customConfirm(`Delete user "${name || username}"? This action cannot be undone.`);
                if (conf) {
                  await onDelete(user.id);
                  onClose();
                }
              }}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontWeight: 600, fontSize: '0.82rem',
                cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              🗑️ Delete User
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 600, fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                border: 'none',
                background: saving ? '#86efac' : '#16a34a',
                color: '#ffffff',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              💾 {saving ? 'Saving...' : 'Save Profile & Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
