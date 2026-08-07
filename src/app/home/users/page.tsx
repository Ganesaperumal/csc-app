'use client';
import { showToast } from '@/components/GlobalDialogs';
import { useState, useEffect } from 'react';
import UserDetailsModal from './UserDetailsModal';
import { usePermissions } from '@/components/PermissionsContext';

export default function UsersPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const { getAccessLevel } = usePermissions();
  const [users, setUsers] = useState<any[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalUser, setActiveModalUser] = useState<any | null>(null);
  const [isViewerMode, setIsViewerMode] = useState(false);

  useEffect(() => {
    setCheckingAuth(false);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleSaveModalUser = async (formData: any) => {
    try {
      if (!formData.userId) {
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email, password: formData.password,
            name: formData.name, username: formData.username, phone: formData.phone,
            csc_role: formData.csc_role, tracking_role: formData.tracking_role,
            unbilled_role: formData.unbilled_role, branches: formData.branches,
            photo: formData.photo, is_approved: formData.is_approved
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        showToast(`✅ User "${formData.name || formData.username}" created!`, 'success');
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        showToast('✅ Profile & permissions updated!', 'success');
      }
      setActiveModalUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleToggleApproval = async (user: any) => {
    const newStatus = user.is_approved === false;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, is_approved: newStatus })
      });
      if (!res.ok) throw new Error('Failed to toggle');
      showToast(`User ${user.username} is now ${newStatus ? 'Approved ✅' : 'Disabled ⛔'}`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleResetPassword = (user: any) => {
    const newPwd = prompt(`Enter new password for ${user.username}:`, 'csc@2026');
    if (!newPwd) return;
    fetch('/api/admin/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, password: newPwd })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');
        const credText = `Hi ${user.name || user.username},\nYour Jobs Portal password has been updated.\nUsername: ${user.username}\nPassword: ${newPwd}\nLogin: ${window.location.origin}/login`;
        navigator.clipboard.writeText(credText);
        showToast('📋 Password updated & credentials copied!', 'success');
      })
      .catch((err) => showToast(`❌ ${err.message}`, 'error'));
  };

  const filteredUsers = users
    .filter(u => {
      const q = searchQuery.toLowerCase();
      return !q || (u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
    })
    .sort((a, b) => ((a.name || a.username) || '').localeCompare((b.name || b.username) || ''));

  const getAccessBadge = (label: string, type: 'csc' | 'followup' | 'unbilled' | 'alljobs') => {
    const isNone = label === 'None';
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      csc_view: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
      csc_edit: { bg: 'rgba(79,70,229,0.18)', color: '#6366f1', border: 'rgba(79,70,229,0.4)' },
      followup_self: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
      followup_all: { bg: 'rgba(124,58,237,0.18)', color: '#8b5cf6', border: 'rgba(124,58,237,0.4)' },
      unbilled_view: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
      unbilled_edit: { bg: 'rgba(5,150,105,0.18)', color: '#10b981', border: 'rgba(5,150,105,0.4)' },
      alljobs_view: { bg: 'rgba(2,132,199,0.12)', color: '#38bdf8', border: 'rgba(2,132,199,0.3)' },
    };
    const noneStyle = { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: 'rgba(100,116,139,0.15)' };

    let style = noneStyle;
    let icon = '🚫';
    let displayLabel = 'None';

    if (!isNone) {
      if (type === 'csc') {
        style = label === 'View' ? colors.csc_view : colors.csc_edit;
        icon = label === 'View' ? '👁️' : '✏️';
        displayLabel = label;
      } else if (type === 'followup') {
        style = label === 'Self' ? colors.followup_self : colors.followup_all;
        icon = label === 'Self' ? '👤' : '🌐';
        displayLabel = label;
      } else if (type === 'unbilled') {
        style = label === 'View' ? colors.unbilled_view : colors.unbilled_edit;
        icon = label === 'View' ? '👁️' : '✏️';
        displayLabel = label;
      } else if (type === 'alljobs') {
        style = colors.alljobs_view;
        icon = '👁️';
        displayLabel = label;
      }
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
        fontSize: '0.68rem', padding: '0.22rem 0.55rem', borderRadius: '20px',
        background: style.bg, color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap',
      }}>
        {icon} {displayLabel}
      </span>
    );
  };

  if (checkingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .usr-row { transition: background 0.15s; }
        .usr-row:hover { background: var(--surface-hover) !important; }
        .usr-add-btn:hover { box-shadow: 0 8px 24px rgba(79,70,229,0.4) !important; transform: translateY(-1px); }
        .usr-search:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; outline: none !important; }
        .usr-key-btn:hover { background: rgba(99,102,241,0.12) !important; color: #6366f1 !important; border-color: rgba(99,102,241,0.3) !important; }
        .usr-toggle:hover { opacity: 0.85; }
      `}</style>

      <div style={{ padding: isEmbedded ? '0' : '1.75rem', fontFamily: "'Outfit', sans-serif" }}>

        {/* ─── Page Header ─── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <h1 style={{
              fontSize: isEmbedded ? '1.3rem' : '1.8rem', fontWeight: 800,
              margin: 0, lineHeight: 1.1,
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}>
              👥 User Directory
            </h1>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} · Manage access &amp; profiles
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none', opacity: 0.5 }}>🔍</span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="usr-search"
                style={{
                  padding: '0.6rem 0.85rem 0.6rem 2.1rem',
                  borderRadius: '10px', width: '210px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)', fontSize: '0.85rem',
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.2s',
                }}
              />
            </div>
            {!isViewerMode && (
              <button
                className="usr-add-btn"
                onClick={() => setActiveModalUser({})}
                style={{
                  padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                  transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                ＋ Add New User
              </button>
            )}
          </div>
        </div>

        {/* ─── Users Table Card ─── */}
        <div style={{
          background: 'var(--surface-color)',
          borderRadius: '18px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(99,102,241,0.04)' }}>
                  {['User', 'Username / Email', 'Access', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '0.9rem 1.1rem',
                      color: 'var(--text-secondary)', fontWeight: 800,
                      fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                      textAlign: 'left', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSuperAdmin = u.username === 'ganesh' || u.name?.includes('Ganesaperumal');
                  const isApproved = u.is_approved !== false;

                  const getCscLabel = (r?: string): string => (!r || r === 'None') ? 'None' : (r === 'Viewer' || r === 'View' ? 'View' : 'Edit');
                  const getFollowupLabel = (r?: string): string => (!r || r === 'None') ? 'None' : (r === 'Executive' || r === 'Self' || r === 'Viewer' ? 'Self' : 'All');
                  const getUnbilledLabel = (r?: string): string => (!r || r === 'None') ? 'None' : (r === 'Viewer' || r === 'View' ? 'View' : 'Edit');

                  const cLabel = getCscLabel(u.csc_role);
                  const fLabel = getFollowupLabel(u.tracking_role);
                  const uLabel = getUnbilledLabel(u.unbilled_role);

                  const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
                  const avatarColor = avatarColors[(u.name || u.username || '').charCodeAt(0) % avatarColors.length];

                  return (
                    <tr
                      key={u.id}
                      className="usr-row"
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      {/* User Avatar + Name */}
                      <td
                        style={{ padding: '0.9rem 1.1rem' }}
                        onClick={() => !isViewerMode && setActiveModalUser(u)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: u.photo ? 'transparent' : `${avatarColor}20`,
                            border: `2px solid ${avatarColor}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', fontWeight: 800, color: avatarColor, flexShrink: 0,
                            fontSize: '1rem',
                          }}>
                            {u.photo
                              ? <img src={u.photo} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (u.name?.[0] || u.username?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.2 }}>
                              {u.name || u.username}
                              {isSuperAdmin && (
                                <span style={{
                                  marginLeft: '0.4rem', fontSize: '0.62rem', padding: '0.1rem 0.4rem',
                                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                                  borderRadius: '20px', border: '1px solid rgba(245,158,11,0.3)',
                                  fontWeight: 700, verticalAlign: 'middle',
                                }}>⭐ SUPER</span>
                              )}
                            </div>
                            {u.phone && <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Username / Email */}
                      <td
                        style={{ padding: '0.9rem 1.1rem' }}
                        onClick={() => !isViewerMode && setActiveModalUser(u)}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{u.username}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {u.email || `${u.username}@transworldintl.com`}
                        </div>
                      </td>

                      {/* Access Badges */}
                      <td
                        style={{ padding: '0.9rem 1.1rem' }}
                        onClick={() => !isViewerMode && setActiveModalUser(u)}
                      >
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, marginRight: '0.1rem', opacity: 0.7 }}>CSC</span>
                          {getAccessBadge(cLabel, 'csc')}

                          {cLabel !== 'None' && fLabel !== 'None' && (
                            <>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.25rem', opacity: 0.7 }}>Followups</span>
                              {getAccessBadge(fLabel, 'followup')}
                            </>
                          )}

                          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.25rem', opacity: 0.7 }}>Unbilled</span>
                          {getAccessBadge(uLabel, 'unbilled')}
                        </div>
                      </td>

                      {/* Approval Toggle */}
                      <td style={{ padding: '0.9rem 1.1rem' }}>
                        <div
                          className="usr-toggle"
                          title={isApproved ? 'Approved — click to disable' : 'Disabled — click to approve'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSuperAdmin && !isViewerMode) handleToggleApproval(u);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: isSuperAdmin || isViewerMode ? 'not-allowed' : 'pointer' }}
                        >
                          <div style={{
                            width: '40px', height: '22px', borderRadius: '11px',
                            background: isApproved ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(148,163,184,0.25)',
                            border: `1px solid ${isApproved ? '#10b981' : 'rgba(148,163,184,0.3)'}`,
                            position: 'relative', transition: 'all 0.25s ease',
                            boxShadow: isApproved ? '0 0 10px rgba(16,185,129,0.3)' : 'none',
                            flexShrink: 0,
                          }}>
                            <div style={{
                              position: 'absolute', top: '2px',
                              left: isApproved ? '20px' : '2px',
                              width: '16px', height: '16px', borderRadius: '50%',
                              background: 'white', transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700,
                            color: isApproved ? '#10b981' : '#94a3b8',
                          }}>
                            {isApproved ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.9rem 1.1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {!isViewerMode && (
                            <button
                              title="Reset Password & Copy Credentials"
                              onClick={(e) => { e.stopPropagation(); handleResetPassword(u); }}
                              className="usr-key-btn"
                              style={{
                                padding: '0.35rem 0.6rem', borderRadius: '8px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                color: 'var(--text-secondary)', fontSize: '0.9rem',
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}
                            >🔑</button>
                          )}
                          {!isViewerMode && (
                            <button
                              title="Edit Profile"
                              onClick={(e) => { e.stopPropagation(); setActiveModalUser(u); }}
                              style={{
                                padding: '0.3rem 0.55rem', borderRadius: '8px',
                                border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)',
                                color: '#6366f1', fontSize: '0.8rem',
                                cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s',
                              }}
                            >✏️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                      <div style={{ fontWeight: 600 }}>No users found</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.3rem', opacity: 0.7 }}>Try adjusting your search</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── Slide-over Drawer ─── */}
      {activeModalUser && (
        <UserDetailsModal
          user={activeModalUser}
          onClose={() => setActiveModalUser(null)}
          onSave={handleSaveModalUser}
          onDelete={async (userId: string) => {
            await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
            setActiveModalUser(null);
            fetchUsers();
          }}
        />
      )}
    </>
  );
}
