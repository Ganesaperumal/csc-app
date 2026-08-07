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

export default function UserDetailsModal({ user, onClose, onSave, onDelete }: UserDetailsModalProps) {
  const isCreate = !user || !user.id;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
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

  // ---------- Segment button style helper ----------
  const seg = (
    active: boolean,
    color: { active: string; glow: string; border: string }
  ): React.CSSProperties => ({
    flex: 1,
    padding: '0.6rem 0',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: active ? `2px solid ${color.border}` : '2px solid transparent',
    background: active
      ? `linear-gradient(135deg, ${color.active}22, ${color.active}11)`
      : 'transparent',
    color: active ? color.active : 'var(--text-secondary)',
    boxShadow: active ? `0 0 12px ${color.glow}` : 'none',
    transition: 'all 0.18s ease',
    outline: 'none',
    letterSpacing: '0.01em',
  });

  const segRow: React.CSSProperties = {
    display: 'flex',
    background: 'var(--bg-color)',
    borderRadius: '12px',
    padding: '4px',
    gap: '4px',
    border: '1px solid var(--border-color)',
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const lbl: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  };

  const lblLeft: React.CSSProperties = {
    fontSize: '0.73rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const lblRight: React.CSSProperties = {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    opacity: 0.7,
    fontStyle: 'italic',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .udm-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; }
        .udm-drawer { font-family: 'Outfit', sans-serif; }
        .udm-branch-pill:hover { transform: scale(1.05); }
        .udm-seg-btn:hover { opacity: 0.9; }
        .udm-save:hover { box-shadow: 0 8px 25px rgba(99,102,241,0.45) !important; transform: translateY(-1px); }
        .udm-delete:hover { background: rgba(239,68,68,0.2) !important; }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex', justifyContent: 'flex-end',
        }}
      >
        <div
          className="udm-drawer"
          onClick={e => e.stopPropagation()}
          style={{
            width: '520px', maxWidth: '100vw', height: '100vh',
            background: 'var(--surface-color)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* ─── Top hero band ─── */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
            padding: '2rem 1.75rem 1.5rem',
            position: 'relative',
            flexShrink: 0,
          }}>
            {/* Close × */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: '50%', width: '32px', height: '32px',
                color: 'white', fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >×</button>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: '3px solid rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', fontSize: '1.8rem', color: 'white',
                  fontWeight: 800, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                  {photo
                    ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (name[0] || username[0] || 'U').toUpperCase()}
                </div>
                <label htmlFor="photo-upload-udm" style={{
                  position: 'absolute', bottom: -2, right: -2,
                  background: '#fff', borderRadius: '50%',
                  width: '26px', height: '26px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}>📷</label>
                <input id="photo-upload-udm" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>

              {/* Name / email + approved */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name || (isCreate ? 'New User' : 'Unknown')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.1rem', marginBottom: '0.65rem' }}>
                  {email || 'username@transworldintl.com'}
                </div>
                {/* Approved toggle */}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                  background: isApproved ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
                  border: `1px solid ${isApproved ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                  borderRadius: '20px', padding: '0.25rem 0.75rem 0.25rem 0.5rem',
                }}>
                  <div style={{
                    width: '34px', height: '18px', borderRadius: '9px',
                    background: isApproved ? '#10b981' : 'rgba(255,255,255,0.3)',
                    position: 'relative', transition: 'all 0.25s ease',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: '2px',
                      left: isApproved ? '18px' : '2px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: 'white', transition: 'all 0.25s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </div>
                  <input
                    type="checkbox" disabled={isSuperAdmin} checked={isApproved}
                    onChange={e => setIsApproved(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isApproved ? '#6ee7b7' : '#fca5a5' }}>
                    {isApproved ? 'Approved' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            {isCreate && (
              <div style={{
                marginTop: '1rem',
                background: 'rgba(255,255,255,0.15)', borderRadius: '10px',
                padding: '0.5rem 0.85rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              }}>
                ➕ Creating new user account
              </div>
            )}
          </div>

          {/* ─── Form body ─── */}
          <div style={{ flex: 1, padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>

            {/* Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={lbl}><span style={lblLeft}>Full Name *</span></div>
                <input
                  required type="text" className="udm-input" value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe" style={field}
                />
              </div>
              <div>
                <div style={lbl}><span style={lblLeft}>Username *</span></div>
                <input
                  required type="text" className="udm-input" value={username}
                  onChange={e => {
                    const u = e.target.value.toLowerCase();
                    setUsername(u);
                    if (isCreate) setEmail(`${u}@transworldintl.com`);
                  }}
                  placeholder="johndoe" style={field}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={lbl}><span style={lblLeft}>Email Address *</span></div>
                <input
                  required type="email" className="udm-input" value={email}
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                  placeholder="john@transworldintl.com" style={field}
                />
              </div>
              <div>
                <div style={lbl}><span style={lblLeft}>Phone Number</span></div>
                <input
                  type="text" className="udm-input" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210" style={field}
                />
              </div>
            </div>

            {/* Password */}
            {isCreate && (
              <div>
                <div style={lbl}><span style={lblLeft}>Password *</span></div>
                <input
                  required type="password" minLength={6} className="udm-input" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" style={field}
                />
              </div>
            )}

            {/* ─── Permissions Panel ─── */}
            <div style={{
              background: 'var(--bg-color)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.08))',
                borderBottom: '1px solid var(--border-color)',
                padding: '0.85rem 1.1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem',
                }}>🔒</div>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Page & Section Permissions
                </span>
              </div>

              <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* ── CSC Jobs ── */}
                <div>
                  <div style={lbl}>
                    <span style={{ ...lblLeft, color: '#6366f1' }}>📋 CSC Jobs</span>
                    <span style={lblRight}>Active &amp; Closed Jobs</span>
                  </div>
                  <div style={segRow}>
                    {(['None', 'View', 'Edit'] as CscAccess[]).map(opt => (
                      <button key={opt} className="udm-seg-btn"
                        type="button"
                        onClick={() => {
                          setCscAccess(opt);
                          if (opt === 'None') setFollowupAccess('None');
                        }}
                        style={seg(cscAccess === opt, {
                          active: opt === 'None' ? '#94a3b8' : opt === 'View' ? '#6366f1' : '#4f46e5',
                          glow: opt === 'None' ? 'transparent' : 'rgba(99,102,241,0.3)',
                          border: opt === 'None' ? '#94a3b8' : '#6366f1',
                        })}
                      >
                        {opt === 'None' ? '🚫 None' : opt === 'View' ? '👁️ View' : '✏️ Edit'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Follow-Ups (conditional) ── */}
                {cscAccess !== 'None' && (
                  <div style={{
                    paddingLeft: '1rem',
                    borderLeft: '2px solid rgba(99,102,241,0.25)',
                  }}>
                    <div style={lbl}>
                      <span style={{ ...lblLeft, color: '#818cf8' }}>⏰ Follow-Ups</span>
                      <span style={lblRight}>Follow-up Reminders</span>
                    </div>
                    <div style={segRow}>
                      {(['None', 'Self', 'All'] as FollowupAccess[]).map(opt => (
                        <button key={opt} className="udm-seg-btn"
                          type="button"
                          onClick={() => setFollowupAccess(opt)}
                          style={seg(followupAccess === opt, {
                            active: opt === 'None' ? '#94a3b8' : opt === 'Self' ? '#818cf8' : '#6366f1',
                            glow: opt === 'None' ? 'transparent' : 'rgba(129,140,248,0.3)',
                            border: opt === 'None' ? '#94a3b8' : '#818cf8',
                          })}
                        >
                          {opt === 'None' ? '🚫 None' : opt === 'Self' ? '👤 Self' : '🌐 All'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-color)' }} />

                {/* ── All Jobs ── */}
                <div>
                  <div style={lbl}>
                    <span style={{ ...lblLeft, color: '#0284c7' }}>📁 All Jobs</span>
                    <span style={lblRight}>Full-Width Jobs Table</span>
                  </div>
                  <div style={segRow}>
                    {(['None', 'View'] as AllJobsAccess[]).map(opt => (
                      <button key={opt} className="udm-seg-btn"
                        type="button"
                        onClick={() => setAllJobsAccess(opt)}
                        style={seg(allJobsAccess === opt, {
                          active: opt === 'None' ? '#94a3b8' : '#0284c7',
                          glow: opt === 'None' ? 'transparent' : 'rgba(2,132,199,0.3)',
                          border: opt === 'None' ? '#94a3b8' : '#0284c7',
                        })}
                      >
                        {opt === 'None' ? '🚫 None' : '👁️ View'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border-color)' }} />

                {/* ── Unbilled ── */}
                <div>
                  <div style={lbl}>
                    <span style={{ ...lblLeft, color: '#10b981' }}>🧾 Unbilled</span>
                    <span style={lblRight}>Unbilled Jobs Portal</span>
                  </div>
                  <div style={segRow}>
                    {(['None', 'View', 'Edit'] as UnbilledAccess[]).map(opt => (
                      <button key={opt} className="udm-seg-btn"
                        type="button"
                        onClick={() => {
                          setUnbilledAccess(opt);
                          if (opt === 'None') setSelectedBranches([]);
                        }}
                        style={seg(unbilledAccess === opt, {
                          active: opt === 'None' ? '#94a3b8' : opt === 'View' ? '#10b981' : '#059669',
                          glow: opt === 'None' ? 'transparent' : 'rgba(16,185,129,0.3)',
                          border: opt === 'None' ? '#94a3b8' : '#10b981',
                        })}
                      >
                        {opt === 'None' ? '🚫 None' : opt === 'View' ? '👁️ View' : '✏️ Edit'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Assigned Branches (conditional) ── */}
                {unbilledAccess !== 'None' && (
                  <div style={{
                    paddingLeft: '1rem',
                    borderLeft: '2px solid rgba(16,185,129,0.25)',
                  }}>
                    <div style={{ ...lblLeft, color: '#10b981', marginBottom: '0.5rem' }}>
                      📍 Assigned Branches
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {BRANCH_CODES.map(code => {
                        const isSelected = selectedBranches.includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            className="udm-branch-pill"
                            onClick={() => toggleBranch(code)}
                            style={{
                              padding: '0.3rem 0.7rem',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: `1.5px solid ${isSelected ? '#10b981' : 'var(--border-color)'}`,
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))'
                                : 'var(--bg-color)',
                              color: isSelected ? '#10b981' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 0 8px rgba(16,185,129,0.2)' : 'none',
                            }}
                          >
                            {isSelected ? `✓ ${code}` : `+ ${code}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Action Buttons ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '0.5rem' }}>
              {isCreate ? (
                <button
                  type="button"
                  onClick={handleSaveData}
                  disabled={saving}
                  className="udm-save"
                  style={{
                    width: '100%', padding: '0.9rem',
                    borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white', fontWeight: 800, fontSize: '0.9rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saving ? '⏳ Creating...' : '➕ Create User Account'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveData}
                  disabled={saving}
                  className="udm-save"
                  style={{
                    width: '100%', padding: '0.9rem',
                    borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white', fontWeight: 800, fontSize: '0.9rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save Profile & Permissions'}
                </button>
              )}

              {!isCreate && !isSuperAdmin && onDelete && (
                <button
                  type="button"
                  className="udm-delete"
                  onClick={async () => {
                    const confirmed = await customConfirm(
                      `⚠️ Are you sure you want to permanently delete "${name || username}"?\nThis action cannot be undone.`
                    );
                    if (confirmed) await onDelete(user.id);
                  }}
                  style={{
                    width: '100%', padding: '0.65rem',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(239,68,68,0.35)',
                    background: 'rgba(239,68,68,0.07)',
                    color: '#ef4444', fontWeight: 700, fontSize: '0.82rem',
                    cursor: 'pointer', transition: 'all 0.2s ease',
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
