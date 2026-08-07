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

type CscAccess     = 'None' | 'View' | 'Edit';
type FollowupAccess = 'None' | 'Self' | 'All';
type AllJobsAccess = 'None' | 'View';
type UnbilledAccess = 'None' | 'View' | 'Edit';

/* ── Cycle helpers ── */
const cscCycle:      CscAccess[]      = ['None', 'View', 'Edit'];
const followupCycle: FollowupAccess[] = ['None', 'Self', 'All'];
const allJobsCycle:  AllJobsAccess[]  = ['None', 'View'];
const unbilledCycle: UnbilledAccess[] = ['None', 'View', 'Edit'];

function next<T>(arr: T[], cur: T): T { return arr[(arr.indexOf(cur) + 1) % arr.length]; }

/* ── Badge colors ── */
const badgeColor: Record<string, { bg: string; color: string; border: string }> = {
  None:  { bg: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'rgba(100,116,139,0.25)' },
  View:  { bg: 'rgba(99,102,241,0.14)', color: '#818cf8', border: 'rgba(99,102,241,0.35)' },
  Edit:  { bg: 'rgba(16,185,129,0.14)', color: '#10b981', border: 'rgba(16,185,129,0.35)' },
  Self:  { bg: 'rgba(139,92,246,0.14)', color: '#a78bfa', border: 'rgba(139,92,246,0.35)' },
  All:   { bg: 'rgba(124,58,237,0.14)', color: '#8b5cf6', border: 'rgba(124,58,237,0.35)' },
};

/* ── Access Tile ── */
function AccessTile({
  label, icon, value, onClick, dim,
}: { label: string; icon: string; value: string; onClick: () => void; dim?: boolean }) {
  const c = badgeColor[value] ?? badgeColor.None;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Click to cycle (currently: ${value})`}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 0.75rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-color)',
        cursor: 'pointer',
        transition: 'background 0.15s, box-shadow 0.15s',
        opacity: dim ? 0.38 : 1,
        pointerEvents: dim ? 'none' : 'auto',
        gap: '0.5rem',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
        <span style={{ fontSize: '0.88rem', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      {/* Badge — rectangular, small */}
      <span style={{
        padding: '0.18rem 0.55rem',
        borderRadius: '5px',
        fontSize: '0.68rem', fontWeight: 800,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        flexShrink: 0, transition: 'all 0.18s ease',
        boxShadow: value !== 'None' ? `0 0 8px ${c.border}` : 'none',
      }}>
        {value}
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

  /* Init from DB roles */
  const initCsc      = (r?: string): CscAccess      => (!r || r === 'None') ? 'None' : (r === 'Viewer' || r === 'View' ? 'View' : 'Edit');
  const initFollowup = (r?: string): FollowupAccess => (!r || r === 'None') ? 'None' : (r === 'Executive' || r === 'Self' || r === 'Viewer' ? 'Self' : 'All');
  const initAllJobs  = (r?: string): AllJobsAccess  => (!r || r === 'None') ? 'None' : 'View';
  const initUnbilled = (r?: string): UnbilledAccess => (!r || r === 'None') ? 'None' : (r === 'Viewer' || r === 'View' ? 'View' : 'Edit');

  const [cscAccess,     setCscAccess]     = useState<CscAccess>(initCsc(user?.csc_role));
  const [followupAccess,setFollowupAccess]= useState<FollowupAccess>(initFollowup(user?.tracking_role));
  const [allJobsAccess, setAllJobsAccess] = useState<AllJobsAccess>(initAllJobs(user?.role));
  const [unbilledAccess,setUnbilledAccess]= useState<UnbilledAccess>(initUnbilled(user?.unbilled_role));
  const [branches,      setBranches]      = useState<string[]>(user?.branches?.length ? user.branches : ['ALL']);
  const [isApproved,    setIsApproved]    = useState<boolean>(user?.is_approved !== false);
  const [photo,         setPhoto]         = useState<string | null>(user?.photo || null);
  const [saving,        setSaving]        = useState(false);

  const isSuperAdmin = user?.username === 'ganesh' || user?.name?.includes('Ganesaperumal');

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      userId: user?.id, name, username, email, phone,
      password: isCreate ? password : (password || undefined),
      csc_role:      cscAccess === 'None' ? 'None' : (cscAccess === 'View' ? 'Viewer' : 'Executive'),
      tracking_role: cscAccess === 'None' ? 'None' : (followupAccess === 'None' ? 'None' : (followupAccess === 'Self' ? 'Executive' : 'Admin')),
      unbilled_role: unbilledAccess === 'None' ? 'None' : (unbilledAccess === 'View' ? 'Viewer' : 'Executive'),
      role: (cscAccess === 'Edit' || unbilledAccess === 'Edit') ? 'Executive' : (cscAccess === 'View' || unbilledAccess === 'View' || allJobsAccess === 'View' ? 'Viewer' : 'None'),
      branches: unbilledAccess === 'None' ? [] : (branches.length ? branches : ['ALL']),
      is_approved: isApproved, photo,
    });
    setSaving(false);
  };

  const toggleBranch = (code: string) => {
    if (code === 'ALL') { setBranches(branches.includes('ALL') ? [] : ['ALL']); return; }
    const without = branches.filter(b => b !== 'ALL');
    setBranches(without.includes(code) ? without.filter(b => b !== code) : [...without, code]);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem',
    borderRadius: '9px', border: '1px solid var(--border-color)',
    background: 'var(--bg-color)', color: 'var(--text-primary)',
    fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif",
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .udm-field:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.14) !important; }
        .udm-tile:hover  { background: var(--surface-hover) !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important; }
        .udm-save:hover:not(:disabled)   { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,70,229,0.42) !important; }
        .udm-delete:hover { background: rgba(239,68,68,0.14) !important; }
        .udm-branch:hover { transform: scale(1.05); }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
        zIndex: 9999, display: 'flex', justifyContent: 'flex-end',
      }}>
        {/* Drawer */}
        <div onClick={e => e.stopPropagation()} style={{
          width: '480px', maxWidth: '100vw', height: '100vh',
          background: 'var(--surface-color)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-20px 0 56px rgba(0,0,0,0.28)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Outfit', sans-serif",
          overflowY: 'auto',
        }}>

          {/* ── Hero ── */}
          <div style={{
            background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#6366f1 100%)',
            padding: '1.75rem 1.5rem 1.4rem', position: 'relative', flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              position: 'absolute', top: '0.9rem', right: '0.9rem',
              background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', color: 'white', fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)', border: '2.5px solid rgba(255,255,255,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', fontSize: '1.5rem', color: 'white', fontWeight: 800,
                }}>
                  {photo
                    ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (name[0] || username[0] || 'U').toUpperCase()}
                </div>
                <label htmlFor="photo-udm" style={{
                  position: 'absolute', bottom: -2, right: -2, background: 'white',
                  borderRadius: '50%', width: '22px', height: '22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
                }}>📷</label>
                <input id="photo-udm" type="file" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setPhoto(r.result as string); r.readAsDataURL(f); }}
                  style={{ display: 'none' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name || (isCreate ? 'New User' : '—')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.1rem', marginBottom: '0.5rem' }}>
                  {email || 'username@transworldintl.com'}
                </div>
                {/* Approved toggle */}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                  background: isApproved ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${isApproved ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  borderRadius: '20px', padding: '0.2rem 0.6rem 0.2rem 0.4rem',
                }}>
                  <div style={{
                    width: '30px', height: '16px', borderRadius: '8px',
                    background: isApproved ? '#10b981' : 'rgba(255,255,255,0.2)',
                    position: 'relative', transition: 'all 0.22s', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: '1.5px', left: isApproved ? '15px' : '1.5px',
                      width: '13px', height: '13px', borderRadius: '50%', background: 'white',
                      transition: 'all 0.22s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }} />
                  </div>
                  <input type="checkbox" disabled={isSuperAdmin} checked={isApproved}
                    onChange={e => setIsApproved(e.target.checked)} style={{ display: 'none' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isApproved ? '#6ee7b7' : '#fca5a5' }}>
                    {isApproved ? 'Approved' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Profile fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
              {[
                { lbl: 'Full Name *',    val: name,     set: setName,     type: 'text',     ph: 'John Doe' },
                { lbl: 'Username *',     val: username, set: (v: string) => { setUsername(v.toLowerCase()); if (isCreate) setEmail(`${v.toLowerCase()}@transworldintl.com`); }, type: 'text', ph: 'johndoe' },
                { lbl: 'Email *',        val: email,    set: (v: string) => setEmail(v.toLowerCase()), type: 'email', ph: 'john@transworldintl.com' },
                { lbl: 'Phone',          val: phone,    set: setPhone,    type: 'text',     ph: '9876543210' },
              ].map(({ lbl, val, set, type, ph }) => (
                <div key={lbl}>
                  <div style={{ fontSize: '0.69rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                    {lbl}
                  </div>
                  <input
                    className="udm-field" type={type} value={val} placeholder={ph}
                    onChange={e => set(e.target.value)} style={inputStyle}
                  />
                </div>
              ))}
              {isCreate && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.69rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Password *</div>
                  <input className="udm-field" type="password" minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle} />
                </div>
              )}
            </div>

            {/* ── Permissions ── */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem',
              }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'linear-gradient(#6366f1,#10b981)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.69rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Access Permissions
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.55, marginLeft: '0.2rem' }}>— click badge to cycle</span>
              </div>

              {/* 2×2 grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>

                {/* CSC Jobs */}
                <AccessTile
                  label="CSC Jobs" icon="📋" value={cscAccess}
                  onClick={() => {
                    const next_ = next(cscCycle, cscAccess);
                    setCscAccess(next_);
                    if (next_ === 'None') setFollowupAccess('None');
                  }}
                />

                {/* Follow-Ups */}
                <AccessTile
                  label="Follow-Ups" icon="⏰" value={followupAccess}
                  dim={cscAccess === 'None'}
                  onClick={() => setFollowupAccess(next(followupCycle, followupAccess))}
                />

                {/* All Jobs */}
                <AccessTile
                  label="All Jobs" icon="📁" value={allJobsAccess}
                  onClick={() => setAllJobsAccess(next(allJobsCycle, allJobsAccess))}
                />

                {/* Unbilled */}
                <AccessTile
                  label="Unbilled" icon="🧾" value={unbilledAccess}
                  onClick={() => {
                    const next_ = next(unbilledCycle, unbilledAccess);
                    setUnbilledAccess(next_);
                    if (next_ === 'None') setBranches([]);
                  }}
                />
              </div>

              {/* Branches — shown when Unbilled ≠ None */}
              {unbilledAccess !== 'None' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.7rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                }}>
                  <div style={{
                    fontSize: '0.67rem', fontWeight: 800, color: '#10b981',
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem',
                  }}>
                    📍 Assigned Branches
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {BRANCH_CODES.map(code => {
                      const active = branches.includes(code);
                      return (
                        <button key={code} type="button" className="udm-branch"
                          onClick={() => toggleBranch(code)}
                          style={{
                            padding: '0.22rem 0.55rem', borderRadius: '5px',
                            fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                            border: `1.5px solid ${active ? '#10b981' : 'var(--border-color)'}`,
                            background: active ? 'rgba(16,185,129,0.13)' : 'var(--surface-color)',
                            color: active ? '#10b981' : 'var(--text-secondary)',
                            transition: 'all 0.13s ease',
                            boxShadow: active ? '0 0 6px rgba(16,185,129,0.2)' : 'none',
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

            {/* ── Buttons ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.5rem' }}>
              <button
                type="button" disabled={saving} onClick={handleSave}
                className="udm-save"
                style={{
                  width: '100%', padding: '0.8rem',
                  borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: 'white', fontWeight: 800, fontSize: '0.88rem',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 16px rgba(79,70,229,0.32)',
                  transition: 'all 0.18s ease',
                }}
              >
                {saving ? '⏳ Saving...' : isCreate ? '➕ Create User Account' : '💾 Save Profile & Permissions'}
              </button>

              {!isCreate && !isSuperAdmin && onDelete && (
                <button
                  type="button" className="udm-delete"
                  onClick={async () => {
                    const ok = await customConfirm(`⚠️ Permanently delete "${name || username}"? This cannot be undone.`);
                    if (ok) await onDelete(user.id);
                  }}
                  style={{
                    width: '100%', padding: '0.6rem',
                    borderRadius: '10px', border: '1.5px solid rgba(239,68,68,0.28)',
                    background: 'rgba(239,68,68,0.05)', color: '#ef4444',
                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
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
