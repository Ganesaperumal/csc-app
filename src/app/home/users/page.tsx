'use client';
import { isSuperAdmin } from '@/lib/authUtils';
import { showToast } from '@/components/GlobalDialogs';
import { useState, useEffect } from 'react';
import UserDetailsModal from './UserDetailsModal';

export default function UsersPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalUser, setActiveModalUser] = useState<any | null>(null);

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
          body: JSON.stringify(formData)
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

  const getAccessBadge = (value: string, sectionName: string) => {
    const isNone = !value || value === 'None';
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      None: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
      View: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
      Edit: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
      Self: { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' },
      All:  { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
    };

    const icons: Record<string, string> = {
      None: '✖️',
      View: '🔍',
      Edit: '✏️',
      Self: '👤',
      All:  '🌐',
    };

    const style = colors[value] || colors.None;
    const icon = icons[value] || '✖️';

    return (
      <span
        title={`${sectionName}: ${value || 'None'}`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '20px',
          background: style.bg, color: style.color,
          border: `1px solid ${style.border}`,
          opacity: isNone ? 0.6 : 1,
          fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
        }}
      >
        {icon}
      </span>
    );
  };

  if (checkingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: isEmbedded ? '0' : '1.75rem' }}>

      {/* ─── Page Header ─── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h1 style={{
            fontSize: isEmbedded ? '1.25rem' : '1.5rem', fontWeight: 700,
            margin: 0, color: 'var(--text-primary)',
          }}>
            👥 User Directory
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} · Manage access &amp; profiles
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '20px', width: '220px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
              color: 'var(--text-primary)', fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setActiveModalUser({})}
            style={{
              padding: '0.55rem 1.15rem', borderRadius: '20px', border: 'none',
              background: '#4f46e5',
              color: '#ffffff', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}
          >
            ＋ Add New User
          </button>
        </div>
      </div>

      {/* ─── Users Directory Table Container ─── */}
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                {['User', 'Username / Email', 'Access', 'Approval', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '0.85rem 1rem',
                    color: 'var(--text-secondary)', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSuper = isSuperAdmin(u);
                const isApproved = u.is_approved !== false;

                const cscVal = u.csc_role || 'None';
                const allJobsVal = u.all_jobs_role || 'None';
                const unbilledVal = u.unbilled_role || 'None';

                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setActiveModalUser(u)}
                  >
                    {/* User Avatar + Name */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%',
                          background: '#e0e7ff', border: '1px solid #a5b4fc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', fontWeight: 700, color: '#3730a3', flexShrink: 0,
                          fontSize: '0.95rem',
                        }}>
                          {u.photo
                            ? <img src={u.photo} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (u.name?.[0] || u.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {u.name || u.username}
                            {isSuper && (
                              <span style={{
                                marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.12rem 0.45rem',
                                background: '#fef3c7', color: '#92400e', borderRadius: '12px',
                                border: '1px solid #fde68a', fontWeight: 700, verticalAlign: 'middle',
                              }}>SUPER</span>
                            )}
                          </div>
                          {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.phone}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Username / Email */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {u.email || `${u.username}@transworldintl.com`}
                      </div>
                    </td>

                    {/* Access Badges */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CSC</span>
                        {getAccessBadge(cscVal, 'CSC Jobs')}

                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.2rem' }}>Jobs</span>
                        {getAccessBadge(allJobsVal, 'All Jobs')}

                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.2rem' }}>Unbilled</span>
                        {getAccessBadge(unbilledVal, 'Unbilled')}
                      </div>
                    </td>

                    {/* Approval Toggle */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSuper) handleToggleApproval(u);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: isSuper ? 'not-allowed' : 'pointer' }}
                      >
                        <div style={{
                          width: '38px', height: '20px', borderRadius: '10px',
                          background: isApproved ? '#16a34a' : '#cbd5e1',
                          border: `1px solid ${isApproved ? '#15803d' : '#94a3b8'}`,
                          position: 'relative', transition: 'all 0.2s ease',
                          flexShrink: 0,
                        }}>
                          <div style={{
                            position: 'absolute', top: '1.5px',
                            left: isApproved ? '19px' : '1.5px',
                            width: '15px', height: '15px', borderRadius: '50%',
                            background: '#ffffff', transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isApproved ? '#16a34a' : '#64748b' }}>
                          {isApproved ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          title="Reset Password & Copy Credentials"
                          onClick={(e) => { e.stopPropagation(); handleResetPassword(u); }}
                          style={{
                            padding: '0.35rem 0.65rem', borderRadius: '20px',
                            border: '1px solid var(--border-color)', background: 'var(--surface-color)',
                            color: 'var(--text-primary)', fontSize: '0.85rem',
                            cursor: 'pointer', fontWeight: 700,
                          }}
                        >🔑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
                    <div style={{ fontWeight: 600 }}>No users found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
}
