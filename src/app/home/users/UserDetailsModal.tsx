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

/* ─────────────────────────── Permission Option Button ─────────────────────── */
interface PermOptProps {
  label: string;
  icon: string;
  active: boolean;
  activeColor: string;
  activeGlow: string;
  onClick: () => void;
}
function PermOpt({ label, icon, active, activeColor, activeGlow, onClick }: PermOptProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '0.55rem 0.9rem',
        borderRadius: '12px',
        border: active ? `2px solid ${activeColor}` : '2px solid var(--border-color)',
        background: active ? `${activeColor}18` : 'var(--bg-color)',
        color: active ? activeColor : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
        boxShadow: active ? `0 0 16px ${activeGlow}, inset 0 1px 0 ${activeColor}22` : 'none',
        minWidth: '58px',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </button>
  );
}

/* ─────────────────────────── Permission Card ──────────────────────────────── */
interface PermCardProps {
  emoji: string;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  indented?: boolean;
}
function PermCard({ emoji, iconBg, title, subtitle, children, indented }: PermCardProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem',
      padding: '0.9rem 1rem',
      borderRadius: '14px',
      border: '1px solid var(--border-color)',
      background: 'var(--surface-color)',
      marginLeft: indented ? '1.5rem' : 0,
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Icon pill */}
      <div style={{
        width: '42px', height: '42px', borderRadius: '12px',
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', flexShrink: 0,
        boxShadow: `0 4px 12px ${iconBg}80`,
      }}>
        {emoji}
      </div>

      {/* Title + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem', opacity: 0.8 }}>{subtitle}</div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Modal ──────────────────────────────────── */
export default function UserDetailsModal({ user, onClose, onSave, onDelete }: UserDetailsModalProps) {
  const isCreate = !user || !user.id;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || (user?.username ? `${user.username}@transworldintl.com` : ''));
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');

  const getInitialCscAccess = (r?: string): CscAccess => {
    if (!r || r === 'None') return 'None';
    if (r === 'Viewer' || r === 'View') return 'View';
    return 'Edit';
  };
  const getInitialFollowupAccess = (r?: string): FollowupAccess => {
    if (!r || r === 'None') return 'None';
    if (r === 'Executive' || r === 'Self' || r === 'Viewer') return 'Self';
    return 'All';
  };
  const getInitialAllJobsAccess = (r?: string): AllJobsAccess => {
    if (r === 'None') return 'None';
    return 'View';
  };
  const getInitialUnbilledAccess = (r?: string): UnbilledAccess => {
    if (!r || r === 'None') return 'None';
    if (r === 'Viewer' || r === 'View') return 'View';
    return 'Edit';
  };

  const [cscAccess, setCscAccess] = useState<CscAccess>(getInitialCscAccess(user?.csc_role));
  const [followupAccess, setFollowupAccess] = useState<FollowupAccess>(getInitialFollowupAccess(user?.tracking_role));
  const [allJobsAccess, setAllJobsAccess] = useState<AllJobsAccess>(getInitialAllJobsAccess(user?.role));
  const [unbilledAccess, setUnbilledAccess] = useState<UnbilledAccess>(getInitialUnbilledAccess(user?.unbilled_role));
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    user?.branches && user?.branches.length > 0 ? user.branches : ['ALL']
  );
  const [isApproved, setIsApproved] = useState<boolean>(user?.is_approved !== false);
  const [photo, setPhoto] = useState<string | null>(user?.photo || null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.username === 'ganesh' || user?.name?.includes('Ganesaperumal');

  const handleSaveData = async () => {
    setSaving(true);
    const csc_role = cscAccess === 'None' ? 'None' : (cscAccess === 'View' ? 'Viewer' : 'Executive');
    const tracking_role = cscAccess === 'None' ? 'None' : (followupAccess === 'None' ? 'None' : (followupAccess === 'Self' ? 'Executive' : 'Admin'));
    const unbilled_role = unbilledAccess === 'None' ? 'None' : (unbilledAccess === 'View' ? 'Viewer' : 'Executive');
    const role = (cscAccess === 'Edit' || unbilledAccess === 'Edit') ? 'Executive' : (cscAccess === 'View' || unbilledAccess === 'View' || allJobsAccess === 'View' ? 'Viewer' : 'None');
    const branches = unbilledAccess === 'None' ? [] : (selectedBranches.length > 0 ? selectedBranches : ['ALL']);
    await onSave({
      userId: user?.id, name, username, email, phone,
      password: isCreate ? password : (password || undefined),
      csc_role, tracking_role, unbilled_role, role, branches,
      is_approved: isApproved, photo
    });
    setSaving(false);
  };

  const toggleBranch = (code: string) => {
    let updated: string[];
    if (code === 'ALL') {
      updated = selectedBranches.includes('ALL') ? [] : ['ALL'];
    } else {
      updated = selectedBranches.filter(b => b !== 'ALL');
      updated = updated.includes(code) ? updated.filter(b => b !== code) : [...updated, code];
    }
    setSelectedBranches(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.85rem',
    borderRadius: '10px', border: '1px solid var(--border-color)',
    background: 'var(--bg-color)', color: 'var(--text-primary)',
    fontSize: '0.875rem', fontFamily: "'Outfit', sans-serif",
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'block',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .udm-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; }
        .udm-save:hover:not(:disabled) { box-shadow: 0 10px 28px rgba(99,102,241,0.5) !important; transform: translateY(-2px); }
        .udm-delete:hover { background: rgba(239,68,68,0.18) !important; border-color: rgba(239,68,68,0.5) !important; }
        .udm-branch:hover { transform: scale(1.06); }
        .udm-perm-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          zIndex: 9999, display: 'flex', justifyContent: 'flex-end',
        }}
      >
        {/* Drawer */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '520px', maxWidth: '100vw', height: '100vh',
            background: 'var(--surface-color)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-24px 0 64px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Outfit', sans-serif",
            overflowY: 'auto',
          }}
        >

          {/* ── Hero Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6366f1 100%)',
            padding: '2rem 1.75rem 1.6rem',
            position: 'relative', flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%',
              width: '30px', height: '30px', color: 'white', fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}>×</button>

            <div style={{ display: 'flex', gap: '1.15rem', alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '68px', height: '68px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)', border: '3px solid rgba(255,255,255,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', fontSize: '1.7rem', color: 'white',
                  fontWeight: 800, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                  {photo
                    ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (name[0] || username[0] || 'U').toUpperCase()}
                </div>
                <label htmlFor="photo-udm" style={{
                  position: 'absolute', bottom: -2, right: -2,
                  background: 'white', borderRadius: '50%', width: '24px', height: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}>📷</label>
                <input id="photo-udm" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>

              {/* Name + email + toggle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name || (isCreate ? 'New User' : '—')}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.1rem', marginBottom: '0.6rem' }}>
                  {email || 'username@transworldintl.com'}
                </div>
                {/* Approved Toggle */}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                  background: isApproved ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)',
                  border: `1px solid ${isApproved ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}`,
                  borderRadius: '20px', padding: '0.22rem 0.65rem 0.22rem 0.45rem',
                }}>
                  <div style={{
                    width: '32px', height: '17px', borderRadius: '9px',
                    background: isApproved ? '#10b981' : 'rgba(255,255,255,0.25)',
                    position: 'relative', transition: 'all 0.25s ease', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: '1.5px', left: isApproved ? '16px' : '1.5px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: 'white', transition: 'all 0.25s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </div>
                  <input type="checkbox" disabled={isSuperAdmin} checked={isApproved}
                    onChange={e => setIsApproved(e.target.checked)} style={{ display: 'none' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isApproved ? '#6ee7b7' : '#fca5a5' }}>
                    {isApproved ? 'Approved' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Form Body ── */}
          <div style={{ flex: 1, padding: '1.4rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'auto' }}>

            {/* Fields Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input className="udm-input" type="text" required value={name}
                  onChange={e => setName(e.target.value)} placeholder="John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Username *</label>
                <input className="udm-input" type="text" required value={username}
                  onChange={e => {
                    const u = e.target.value.toLowerCase();
                    setUsername(u);
                    if (isCreate) setEmail(`${u}@transworldintl.com`);
                  }} placeholder="johndoe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input className="udm-input" type="email" required value={email}
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                  placeholder="john@transworldintl.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input className="udm-input" type="text" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="9876543210" style={inputStyle} />
              </div>
              {isCreate && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Password *</label>
                  <input className="udm-input" type="password" required minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters" style={inputStyle} />
                </div>
              )}
            </div>

            {/* ── Permissions Section ── */}
            <div>
              {/* Section heading */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  width: '3px', height: '18px', borderRadius: '2px',
                  background: 'linear-gradient(135deg, #6366f1, #10b981)',
                }} />
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'var(--text-secondary)',
                }}>Access Permissions</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>

                {/* CSC Jobs */}
                <div className="udm-perm-card">
                  <PermCard
                    emoji="📋" iconBg="linear-gradient(135deg, #4f46e5, #6366f1)"
                    title="CSC Jobs" subtitle="Active & Closed Jobs"
                  >
                    <PermOpt label="None" icon="🚫" active={cscAccess === 'None'} activeColor="#94a3b8" activeGlow="rgba(148,163,184,0.2)"
                      onClick={() => { setCscAccess('None'); setFollowupAccess('None'); }} />
                    <PermOpt label="View" icon="👁️" active={cscAccess === 'View'} activeColor="#6366f1" activeGlow="rgba(99,102,241,0.35)"
                      onClick={() => setCscAccess('View')} />
                    <PermOpt label="Edit" icon="✏️" active={cscAccess === 'Edit'} activeColor="#4f46e5" activeGlow="rgba(79,70,229,0.35)"
                      onClick={() => setCscAccess('Edit')} />
                  </PermCard>
                </div>

                {/* Follow-Ups (conditional, indented) */}
                {cscAccess !== 'None' && (
                  <div style={{ display: 'flex', gap: '0' }}>
                    <div style={{ width: '20px', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
                      <div style={{ width: '2px', margin: '0 auto', background: 'rgba(99,102,241,0.25)', borderRadius: '2px' }} />
                    </div>
                    <div style={{ flex: 1 }} className="udm-perm-card">
                      <PermCard
                        emoji="⏰" iconBg="linear-gradient(135deg, #8b5cf6, #a78bfa)"
                        title="Follow-Ups" subtitle="Follow-up Reminders" indented={false}
                      >
                        <PermOpt label="None" icon="🚫" active={followupAccess === 'None'} activeColor="#94a3b8" activeGlow="rgba(148,163,184,0.2)"
                          onClick={() => setFollowupAccess('None')} />
                        <PermOpt label="Self" icon="👤" active={followupAccess === 'Self'} activeColor="#8b5cf6" activeGlow="rgba(139,92,246,0.35)"
                          onClick={() => setFollowupAccess('Self')} />
                        <PermOpt label="All" icon="🌐" active={followupAccess === 'All'} activeColor="#7c3aed" activeGlow="rgba(124,58,237,0.35)"
                          onClick={() => setFollowupAccess('All')} />
                      </PermCard>
                    </div>
                  </div>
                )}

                {/* All Jobs */}
                <div className="udm-perm-card">
                  <PermCard
                    emoji="📁" iconBg="linear-gradient(135deg, #0284c7, #38bdf8)"
                    title="All Jobs" subtitle="Full-Width Jobs Table"
                  >
                    <PermOpt label="None" icon="🚫" active={allJobsAccess === 'None'} activeColor="#94a3b8" activeGlow="rgba(148,163,184,0.2)"
                      onClick={() => setAllJobsAccess('None')} />
                    <PermOpt label="View" icon="👁️" active={allJobsAccess === 'View'} activeColor="#0284c7" activeGlow="rgba(2,132,199,0.35)"
                      onClick={() => setAllJobsAccess('View')} />
                  </PermCard>
                </div>

                {/* Unbilled */}
                <div className="udm-perm-card">
                  <PermCard
                    emoji="🧾" iconBg="linear-gradient(135deg, #059669, #10b981)"
                    title="Unbilled" subtitle="Unbilled Jobs Portal"
                  >
                    <PermOpt label="None" icon="🚫" active={unbilledAccess === 'None'} activeColor="#94a3b8" activeGlow="rgba(148,163,184,0.2)"
                      onClick={() => { setUnbilledAccess('None'); setSelectedBranches([]); }} />
                    <PermOpt label="View" icon="👁️" active={unbilledAccess === 'View'} activeColor="#10b981" activeGlow="rgba(16,185,129,0.35)"
                      onClick={() => setUnbilledAccess('View')} />
                    <PermOpt label="Edit" icon="✏️" active={unbilledAccess === 'Edit'} activeColor="#059669" activeGlow="rgba(5,150,105,0.35)"
                      onClick={() => setUnbilledAccess('Edit')} />
                  </PermCard>
                </div>

                {/* Branches (conditional, indented under Unbilled) */}
                {unbilledAccess !== 'None' && (
                  <div style={{ display: 'flex', gap: '0' }}>
                    <div style={{ width: '20px', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
                      <div style={{ width: '2px', margin: '0 auto', background: 'rgba(16,185,129,0.25)', borderRadius: '2px' }} />
                    </div>
                    <div style={{
                      flex: 1, padding: '0.85rem 1rem',
                      borderRadius: '14px', border: '1px solid var(--border-color)',
                      background: 'var(--surface-color)',
                    }}>
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 800, color: '#10b981',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      }}>
                        📍 Assigned Branches
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {BRANCH_CODES.map(code => {
                          const active = selectedBranches.includes(code);
                          return (
                            <button
                              key={code} type="button" className="udm-branch"
                              onClick={() => toggleBranch(code)}
                              style={{
                                padding: '0.28rem 0.65rem', borderRadius: '20px',
                                fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                                border: `1.5px solid ${active ? '#10b981' : 'var(--border-color)'}`,
                                background: active ? 'rgba(16,185,129,0.15)' : 'var(--bg-color)',
                                color: active ? '#10b981' : 'var(--text-secondary)',
                                transition: 'all 0.15s ease',
                                boxShadow: active ? '0 0 8px rgba(16,185,129,0.2)' : 'none',
                              }}
                            >
                              {active ? `✓ ${code}` : `+ ${code}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingBottom: '0.5rem' }}>
              <button
                type="button" disabled={saving}
                onClick={handleSaveData}
                className="udm-save"
                style={{
                  width: '100%', padding: '0.9rem',
                  borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white', fontWeight: 800, fontSize: '0.9rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 18px rgba(79,70,229,0.35)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                }}
              >
                {saving
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Saving...</>
                  : isCreate
                    ? '➕ Create User Account'
                    : '💾 Save Profile & Permissions'
                }
              </button>

              {!isCreate && !isSuperAdmin && onDelete && (
                <button
                  type="button"
                  className="udm-delete"
                  onClick={async () => {
                    const ok = await customConfirm(`⚠️ Permanently delete "${name || username}"? This cannot be undone.`);
                    if (ok) await onDelete(user.id);
                  }}
                  style={{
                    width: '100%', padding: '0.65rem',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.06)',
                    color: '#ef4444', fontWeight: 700, fontSize: '0.82rem',
                    cursor: 'pointer', transition: 'all 0.18s ease',
                  }}
                >
                  🗑️ Permanently Delete User Account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
