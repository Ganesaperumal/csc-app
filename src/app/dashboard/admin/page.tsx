'use client';

import { useState, useEffect } from 'react';
import styles from '../dashboard.module.css';

export default function AdminPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formattedEmail = `${username}@transworld.local`.toLowerCase();
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formattedEmail, password, name })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setMessage({ type: 'success', text: `User ${name || username} created successfully!` });
      setName('');
      setUsername('');
      setPassword('');
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
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

  const handleDeleteAllJobs = async () => {
    if (!window.confirm('🚨 DANGER! Are you absolutely sure you want to delete EVERY single job in the database? This cannot be undone! 🚨')) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/delete-jobs', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete jobs');
      alert('✅ All jobs have been wiped successfully! You can now run a fresh Sync.');
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ marginBottom: '2rem', color: 'var(--text-primary)', fontSize: '2rem' }}>User Management</h1>
      
      <div className="glass" style={{ padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Add New User</h2>
        
        {message && (
          <div style={{ 
            padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', 
            backgroundColor: message.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${message.type === 'success' ? '#34d399' : '#f87171'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ganesh Perumal" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. ganesh" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Temporary Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem', flex: '0 0 auto' }}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      <div className="glass" style={{ padding: '2rem', borderRadius: '12px' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Manage Team</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem 1rem 0.75rem 0' }}>Username</th>
              <th style={{ padding: '0.75rem 1rem 0.75rem 0' }}>Name</th>
              <th style={{ padding: '0.75rem 1rem 0.75rem 0' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem 0.75rem 0' }}>Chat Access</th>
              <th style={{ padding: '0.75rem 0' }}>Reset Password</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = u.role || 'Executive';
              const chat_access = u.chat_access !== false;
              const displayUsername = u.username || 'Unknown';
              
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-primary)' }}>{displayUsername}</td>
                  <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-secondary)' }}>{u.name || '-'}</td>
                  <td style={{ padding: '1rem 1rem 1rem 0' }}>
                    <select 
                      value={role} 
                      onChange={(e) => updateUser(u.id, e.target.value, chat_access)}
                      style={{ padding: '0.25rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', width: '100%', minWidth: '120px' }}
                    >
                      <option value="Executive">Executive</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem 1rem 1rem 0' }}>
                    <button 
                      onClick={() => updateUser(u.id, role, !chat_access)}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: chat_access ? '#34d399' : '#f87171', color: 'white', border: 'none', cursor: 'pointer', minWidth: '80px' }}
                    >
                      {chat_access ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td style={{ padding: '1rem 0' }}>
                    <button 
                      onClick={() => {
                        const newPwd = prompt(`Enter new password for ${displayUsername}:`);
                        if (newPwd) {
                          fetch('/api/admin/users', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: u.id, role, chat_enabled: chat_access, password: newPwd })
                          }).then(() => alert('Password updated!'));
                        }
                      }}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--surface-hover)', color: 'white', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass" style={{ padding: '2rem', borderRadius: '12px', marginTop: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ Danger Zone
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Clear the entire Jobs table. This is useful during development or if the table is filled with malformed data.
        </p>
        <button 
          onClick={handleDeleteAllJobs}
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            border: '1px solid rgba(239, 68, 68, 0.5)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (!loading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseOut={(e) => {
            if (!loading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          {loading ? 'Processing...' : '🗑️ Delete All Jobs'}
        </button>
      </div>
    </div>
  );
}
