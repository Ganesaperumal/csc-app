'use client';

import { showToast } from '@/components/GlobalDialogs';
import { useState, useEffect } from 'react';
import UserDetailsModal from './UserDetailsModal';
import { usePermissions } from '@/components/PermissionsContext';

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-color)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  overflow: 'hidden',
};

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--surface-color)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  outline: 'none',
};

export default function UsersPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const { getAccessLevel } = usePermissions();
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
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            username: formData.username,
            phone: formData.phone,
            csc_role: formData.csc_role,
            tracking_role: formData.tracking_role,
            unbilled_role: formData.unbilled_role,
            branches: formData.branches,
            photo: formData.photo,
            is_approved: formData.is_approved,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        showToast(`User "${formData.name || formData.username}" created!`, 'success');
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        showToast('User profile & permissions updated!', 'success');
      }
      setActiveModalUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleToggleApproval = async (user: any) => {
    const newStatus = user.is_approved === false;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, is_approved: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to toggle approval status');
      showToast(`User ${user.username} is now ${newStatus ? 'Approved' : 'Disabled'}`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleResetPassword = (user: any) => {
    const newPwd = prompt(`Enter new password for ${user.username}:`, 'csc@2026');
    if (!newPwd) return;
    fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, password: newPwd }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');
        const credText = `Hi ${user.name || user.username},\nYour Jobs Portal password has been updated.\nUsername: ${user.username}\nPassword: ${newPwd}\nLogin: ${window.location.origin}/login`;
        navigator.clipboard.writeText(credText);
        showToast('Password updated & credentials copied to clipboard!', 'success');
      })
      .catch((err) => showToast(`Error: ${err.message}`, 'error'));
  };

  const filteredUsers = users
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      return !q || u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.name || a.username || '').localeCompare(b.name || b.username || ''));

  const renderBadge = (label: string, value: string) => {
    if (value === 'None') return null;
    return (
      <span
        style={{
          fontSize: '0.72rem',
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontWeight: 600,
        }}
      >
        {label}: {value}
      </span>
    );
  };

  if (checkingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading user directory...</div>;
  }

  return (
    <div style={{ padding: isEmbedded ? '0' : '1.5rem 2rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            User Directory
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Manage user accounts, permissions, and status
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: '220px' }}
          />
          <button
            onClick={() => setActiveModalUser({})}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Add New User
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  User
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Username / Email
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Access Level
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSuperAdmin = u.username === 'ganesh' || u.name?.includes('Ganesaperumal');
                const isApproved = u.is_approved !== false;

                const cscVal = !u.csc_role || u.csc_role === 'None' ? 'None' : u.csc_role === 'Viewer' || u.csc_role === 'View' ? 'View' : 'Edit';
                const folVal = !u.tracking_role || u.tracking_role === 'None' ? 'None' : u.tracking_role === 'Executive' || u.tracking_role === 'Self' || u.tracking_role === 'Viewer' ? 'Self' : 'All';
                const unbVal = !u.unbilled_role || u.unbilled_role === 'None' ? 'None' : u.unbilled_role === 'Viewer' || u.unbilled_role === 'View' ? 'View' : 'Edit';

                return (
                  <tr
                    key={u.id}
                    onClick={() => setActiveModalUser(u)}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            overflow: 'hidden',
                          }}
                        >
                          {u.photo ? (
                            <img src={u.photo} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (u.name?.[0] || u.username?.[0] || 'U').toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name || u.username}</div>
                          {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email || `${u.username}@transworldintl.com`}</div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {renderBadge('CSC', cscVal)}
                        {cscVal !== 'None' && renderBadge('Followup', folVal)}
                        {renderBadge('Unbilled', unbVal)}
                        {cscVal === 'None' && unbVal === 'None' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>No Access</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={isSuperAdmin}
                          checked={isApproved}
                          onChange={() => handleToggleApproval(u)}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: isApproved ? '#059669' : '#dc2626' }}>
                          {isApproved ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Reset Password & Copy WhatsApp Credentials"
                          style={{
                            padding: '0.3rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--surface-color)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          🔑 Reset Pwd
                        </button>
                        <button
                          onClick={() => setActiveModalUser(u)}
                          title="Edit User Details"
                          style={{
                            padding: '0.3rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--surface-color)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No users match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
