'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CustomSelect from '../components/CustomSelect';
import { useRouter } from 'next/navigation';

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-color)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  boxShadow: 'var(--glass-shadow)',
  padding: '2rem',
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-color)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

export default function UsersPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile) {
              const role = profile.role;
              setUserRole(role);
              if (role !== 'Admin' && role !== 'Manager') {
                router.push('/dashboard');
              } else {
                setCheckingAuth(false);
                fetchUsers();
              }
            }
          });
      }
    });
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    if (!newUserRole) {
      setMessage({ type: 'error', text: 'Please select a role' });
      setLoading(false);
      return;
    }

    try {
      const formattedEmail = `${username}@transworldintl.com`.toLowerCase();
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formattedEmail, password, name, role: newUserRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setMessage({ type: 'success', text: `✅ User "${name || username}" created successfully!` });
      setName(''); setUsername(''); setPassword(''); setNewUserRole('');
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, role: string, chat_enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, chat_enabled })
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  if (checkingAuth) {
    return <div style={{ padding: '2rem' }}>Verifying permissions...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto', height: '100%', overflowY: 'auto', fontFamily: "'Outfit', 'Inter', sans-serif" }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          👥 User Management
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Manage team members, roles, and access.
        </p>
      </div>

      {/* Add New User Card */}
      <div style={{ ...cardStyle, borderTop: '3px solid #4f46e5', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(147,51,234,0.1))', borderRadius: '8px', padding: '0.3rem 0.5rem' }}>✨</span>
          Add New User
        </h2>

        {message && (
          <div style={{
            padding: '0.85rem 1.1rem',
            marginBottom: '1.25rem',
            borderRadius: '10px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            color: message.type === 'success' ? '#059669' : '#dc2626',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ganesh Perumal" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="e.g. ganesh" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <CustomSelect
              value={newUserRole}
              onChange={(val) => setNewUserRole(val)}
              placeholder="Select Role"
              options={
                userRole === 'Manager'
                ? [
                    { value: 'Viewer', label: 'Viewer' },
                    { value: 'Executive', label: 'Executive' },
                    { value: 'Manager', label: 'Manager' }
                  ]
                : [
                    { value: 'Viewer', label: 'Viewer' },
                    { value: 'Executive', label: 'Executive' },
                    { value: 'Manager', label: 'Manager' },
                    { value: 'Admin', label: 'Admin' }
                  ]
              }
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.62rem 1.3rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {loading ? 'Creating…' : '+ Create User'}
          </button>
        </form>
      </div>

      {/* Manage Team Card */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'rgba(14,165,233,0.1)', borderRadius: '8px', padding: '0.3rem 0.5rem' }}>🛠</span>
          Manage Team
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(148,163,184,0.2)' }}>
              {['Full Name', 'Username', 'Role', 'Actions'].map(col => (
                <th key={col} style={{ padding: '0.6rem 1rem 0.6rem 0', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.username !== 'admin' && !(userRole === 'Manager' && u.role === 'Admin')).map(u => {
              const role = u.role || 'Executive';
              const chat_access = u.chat_access !== false;
              const displayUsername = u.username || 'Unknown';
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0', color: 'var(--text-secondary)' }}>{displayUsername}</td>
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0' }}>
                    <CustomSelect
                      value={role}
                      onChange={(val) => updateUser(u.id, val, val !== 'Viewer')}
                      options={
                        userRole === 'Manager'
                        ? [
                            { value: 'Viewer', label: 'Viewer' },
                            { value: 'Executive', label: 'Executive' },
                            { value: 'Manager', label: 'Manager' }
                          ]
                        : [
                            { value: 'Viewer', label: 'Viewer' },
                            { value: 'Executive', label: 'Executive' },
                            { value: 'Manager', label: 'Manager' },
                            { value: 'Admin', label: 'Admin' }
                          ]
                      }
                      style={{ maxWidth: '140px' }}
                    />
                  </td>
                  <td style={{ padding: '0.85rem 0', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        const newPwd = prompt(`Enter new password for ${displayUsername}:`);
                        if (newPwd) {
                          fetch('/api/admin/users', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: u.id, role, chat_enabled: role !== 'Viewer', password: newPwd })
                          })
                          .then(async (res) => {
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to update password');
                            showToast('✅ Password updated successfully!', 'success');
                          })
                          .catch((err) => showToast(`❌ Error: ${err.message}`, 'error'));
                        }
                      }}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        background: 'var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      🔑 Reset
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={async () => {
                          if (await customConfirm(`🚨 Are you sure you want to delete user "${displayUsername}"? This will permanently remove their account.`)) {
                            try {
                              const res = await fetch(`/api/admin/users?userId=${u.id}`, {
                                method: 'DELETE'
                              });
                              if (res.ok) {
                                showToast('✅ User deleted successfully!', 'success');
                                fetchUsers();
                              } else {
                                const errData = await res.json();
                                showToast(`❌ Failed to delete user: ${errData.error || 'Unknown error'}`, 'error');
                              }
                            } catch (err: any) {
                              showToast(`❌ Error deleting user: ${err.message}`, 'error');
                            }
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontFamily: "'Outfit', sans-serif",
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
