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

/* ── Access Badge Colors ──
   None: Greyed light opacity | View: Bluish | Edit: Greenish | Self: Orange | All: Purplish
*/
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

  /* Init from DB roles */
  const initCsc      = (r?: string): CscAccess      => (!r || r === 'None') ? 'None' : (r === 'Edit' ? 'Edit' : 'View');
  const initFollowup = (f?: string, t?: string): FollowupAccess => {
    const r = f || t;
    return (!r || r === 'None') ? 'None' : (r === 'All' ? 'All' : 'Self');
  };
  const initAllJobs  = (a?: string, r?: string): AllJobsAccess  => {
    const val = a || r;
    return (!val || val === 'None') ? 'None' : 'View';
  };
  const initUnbilled = (r?: string): UnbilledAccess => (!r || r === 'None') ? 'None' : (r === 'Edit' ? 'Edit' : 'View');

  const [cscAccess,     setCscAccess]     = useState<CscAccess>(initCsc(user?.csc_role));
  const [followupAccess,setFollowupAccess]= useState<FollowupAccess>(initFollowup(user?.followups_role, user?.tracking_role));
  const [allJobsAccess, setAllJobsAccess] = useState<AllJobsAccess>(initAllJobs(user?.all_jobs_role, user?.role));
  const [unbilledAccess,setUnbilledAccess]= useState<UnbilledAccess>(initUnbilled(user?.unbilled_role));
  const [branches,      setBranches]      = useState<string[]>(user?.branches?.length ? user.branches : ['ALL']);
  const [isApproved,    setIsApproved]    = useState<boolean>(user?.is_approved !== false);
  const [photo,         setPhoto]         = useState<string | null>(user?.photo || null);
  const [saving,        setSaving]        = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      userId: user?.id, name, username, email, phone,
      password: isCreate ? password : (password || undefined),
      csc_role:       cscAccess,
      followups_role: cscAccess === 'None' ? 'None' : followupAccess,
      all_jobs_role:  allJobsAccess,
      unbilled_role:  unbilledAccess,
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
    width: '100%', padding: '0.55rem 0.8rem',
    borderRadius: '8px', border: '1px solid #cbd5e1',
    background: '#ffffff', color: '#0f172a',
    fontSize: '0.85rem', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        @keyframes udmFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes udmSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .udm-backdrop { animation: udmFade 0.2s ease-out forwards; }
        .udm-panel { animation: udmSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .udm-field:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }
        .udm-save:hover { background: #15803d !important; }
        .udm-delete:hover { background: #fee2e2 !important; }
        .udm-branch:hover { border-color: #16a34a !important; }
      `}</style>

      {/* Overlay Backdrop */}
      <div
        className="udm-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex', justifyContent: 'flex-end',
        }}
      >
        {/* Slide-over Drawer Panel */}
        <div
          className="udm-panel"
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '440px', height: '100vh',
            background: '#ffffff',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Drawer Header ── */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
          }}>
            {/* Left: Photo + Name/Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: '#e0e7ff', border: '1px solid #a5b4fc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', fontWeight: 700, color: '#3730a3', fontSize: '1rem',
                flexShrink: 0,
              }}>
                {photo ? (
                  <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (name?.[0] || username?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isCreate ? 'Create New User' : (name || username)}
                </h2>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isCreate ? 'Add new system user' : (email || `${username}@transworldintl.com`)}
                </p>
              </div>
            </div>

            {/* Right: Approval Toggle + Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setIsApproved(!isApproved)}
                title={isApproved ? 'Account is Active (Click to Disable)' : 'Account is Disabled (Click to Approve)'}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  border: isApproved ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  background: isApproved ? '#f0fdf4' : '#fef2f2',
                  color: isApproved ? '#15803d' : '#dc2626',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {isApproved ? '✓ Active' : '⛔ Disabled'}
              </button>

              <button
                type="button" onClick={onClose}
                style={{
                  width: '30px', height: '30px', borderRadius: '50%', border: 'none',
                  background: '#f1f5f9', color: '#64748b', fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Drawer Content Body ── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1.1rem 1.25rem',
            display: 'flex', flexDirection: 'column', gap: '1.1rem',
          }}>

            {/* Profile fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              {[
                { lbl: 'Full Name *',    val: name,     set: setName,     type: 'text',     ph: 'John Doe' },
                { lbl: 'Username *',     val: username, set: (v: string) => { setUsername(v.toLowerCase()); if (isCreate) setEmail(`${v.toLowerCase()}@transworldintl.com`); }, type: 'text', ph: 'johndoe' },
                { lbl: 'Email *',        val: email,    set: (v: string) => setEmail(v.toLowerCase()), type: 'email', ph: 'john@transworldintl.com' },
                { lbl: 'Phone',          val: phone,    set: setPhone,    type: 'text',     ph: '9876543210' },
              ].map(({ lbl, val, set, type, ph }) => (
                <div key={lbl}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
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
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>Password *</div>
                  <input className="udm-field" type="password" minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle} />
                </div>
              )}
            </div>

            {/* ── Access Permissions Grid ── */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem',
                borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem',
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>
                  Access Permissions
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Click badge to cycle</span>
              </div>

              {/* 2×2 grid:
                  Row 1: CSC Jobs (Left), Follow-Ups (Right)
                  Row 2: All Jobs (Left), Unbilled (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>

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

              {/* Branches — shown under Unbilled when Unbilled ≠ None */}
              {unbilledAccess !== 'None' && (
                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}>
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 700, color: '#16a34a',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem',
                  }}>
                    📍 Assigned Unbilled Branches
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {BRANCH_CODES.map(code => {
                      const active = branches.includes(code);
                      return (
                        <button key={code} type="button" className="udm-branch"
                          onClick={() => toggleBranch(code)}
                          style={{
                            padding: '0.25rem 0.65rem', borderRadius: '20px',
                            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${active ? '#16a34a' : '#cbd5e1'}`,
                            background: active ? '#dcfce7' : '#ffffff',
                            color: active ? '#15803d' : '#475569',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {active ? `✓ ${code}` : `+ ${code}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
              {/* Positive Green Curved Rectangle Save Button */}
              <button
                type="button" disabled={saving} onClick={handleSave}
                className="udm-save"
                style={{
                  width: '100%', padding: '0.75rem',
                  borderRadius: '8px', border: 'none',
                  background: '#16a34a',
                  color: '#ffffff', fontWeight: 700, fontSize: '0.88rem',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  transition: 'background 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {saving ? '⏳ Saving...' : isCreate ? '➕ Create User Account' : '💾 Save Profile & Permissions'}
              </button>

              {/* Curved Rectangle Delete Button */}
              {!isCreate && onDelete && (
                <button
                  type="button" className="udm-delete"
                  onClick={async () => {
                    const ok = await customConfirm(`⚠️ Permanently delete "${name || username}"? This cannot be undone.`);
                    if (ok) await onDelete(user.id);
                  }}
                  style={{
                    width: '100%', padding: '0.65rem',
                    borderRadius: '8px', border: '1px solid #fecaca',
                    background: '#fef2f2', color: '#dc2626',
                    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
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
