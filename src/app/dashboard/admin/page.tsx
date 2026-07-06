'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import CustomSelect from '../components/CustomSelect';

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '16px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
  padding: '2rem',
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: '#64748b',
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(255,255,255,0.85)',
  color: '#0f172a',
  fontSize: '0.875rem',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(255,255,255,0.85)',
  color: '#0f172a',
  fontSize: '0.82rem',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  cursor: 'pointer',
  minWidth: '130px',
};

export default function AdminPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [savingAi, setSavingAi] = useState(false);

  const downloadCSV = async (table: 'jobs' | 'job_logs') => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${table}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to download ${table}: ${err.message}` });
    }
  };

  const uploadCSV = (e: React.ChangeEvent<HTMLInputElement>, table: 'jobs' | 'job_logs') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (table === 'jobs') setLoadingJobs(true);
    if (table === 'job_logs') setLoadingLogs(true);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          // Clean data: remove empty strings that should be null, handle ids
          const cleanedData = data.map(row => {
            const cleanRow: any = {};
            for (const key in row) {
              if (row[key] === '') {
                cleanRow[key] = null;
              } else {
                cleanRow[key] = row[key];
              }
            }
            if (!cleanRow.id) delete cleanRow.id;
            return cleanRow;
          });

          let res;
          if (table === 'jobs') {
            res = await supabase.from('jobs').upsert(cleanedData, { onConflict: 'job_number' });
          } else {
            res = await supabase.from('job_logs').upsert(cleanedData);
          }

          if (res.error) throw res.error;

          setMessage({ type: 'success', text: `Successfully upserted ${cleanedData.length} records into ${table}!` });
        } catch (err: any) {
          setMessage({ type: 'error', text: `Failed to upload ${table}: ${err.message}` });
        } finally {
          if (table === 'jobs') setLoadingJobs(false);
          if (table === 'job_logs') setLoadingLogs(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        setMessage({ type: 'error', text: `CSV Parse Error: ${error.message}` });
        if (table === 'jobs') setLoadingJobs(false);
        if (table === 'job_logs') setLoadingLogs(false);
        e.target.value = '';
      }
    });
  };

  useEffect(() => {
    fetchUsers();
    fetchAiSettings();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user);
    });
  }, []);

  const fetchAiSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json();
      if (data.system_prompt) setAiPrompt(data.system_prompt);
    } catch (err) {
      console.error('Failed to fetch AI settings', err);
    }
  };

  const handleSaveAiSettings = async () => {
    setSavingAi(true);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: aiPrompt })
      });
      if (res.ok) {
        alert('✅ AI System Instructions updated successfully!');
      } else {
        const data = await res.json();
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSavingAi(false);
    }
  };

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
    try {
      const formattedEmail = `${username}@transworldintl.com`.toLowerCase();
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formattedEmail, password, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setMessage({ type: 'success', text: `✅ User "${name || username}" created successfully!` });
      setName(''); setUsername(''); setPassword('');
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

  const handleDeleteAllJobs = async () => {
    if (!window.confirm('🚨 DANGER! Are you absolutely sure you want to delete EVERY job? This cannot be undone!')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/delete-jobs', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete jobs');
      alert('✅ All jobs wiped successfully!');
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto', height: '100%', overflowY: 'auto', fontFamily: "'Outfit', 'Inter', sans-serif" }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          ⚙️ Control Center
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Manage team members, roles, and bulk data operations.
        </p>
      </div>

      {/* Add New User Card */}
      <div style={{ ...cardStyle, borderTop: '3px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #4f46e5, #9333ea)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
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

        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ganesh Perumal" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. ganesh" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Temporary Password</label>
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
              {['Full Name', 'Username', 'Role', 'Chat Access', 'Actions'].map(col => (
                <th key={col} style={{ padding: '0.6rem 1rem 0.6rem 0', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.username !== 'admin').map(u => {
              const role = u.role || 'Executive';
              const chat_access = u.chat_access !== false;
              const displayUsername = u.username || 'Unknown';
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(241,245,249,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0', fontWeight: 600, color: '#0f172a' }}>{u.name || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0', color: '#475569' }}>{displayUsername}</td>
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0' }}>
                    <CustomSelect
                      value={role}
                      onChange={(val) => updateUser(u.id, val, chat_access)}
                      options={[
                        { value: 'Executive', label: 'Executive' },
                        { value: 'Manager', label: 'Manager' },
                        { value: 'Admin', label: 'Admin' }
                      ]}
                      style={{ maxWidth: '140px' }}
                    />
                  </td>
                  <td style={{ padding: '0.85rem 1rem 0.85rem 0' }}>
                    <button
                      onClick={() => updateUser(u.id, role, !chat_access)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '99px',
                        border: 'none',
                        background: chat_access
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #f87171, #dc2626)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        letterSpacing: '0.03em',
                        boxShadow: chat_access ? '0 2px 8px rgba(16,185,129,0.3)' : '0 2px 8px rgba(239,68,68,0.3)',
                        minWidth: '85px',
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {chat_access ? '✓ Enabled' : '✕ Disabled'}
                    </button>
                  </td>
                  <td style={{ padding: '0.85rem 0', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        const newPwd = prompt(`Enter new password for ${displayUsername}:`);
                        if (newPwd) {
                          fetch('/api/admin/users', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: u.id, role, chat_enabled: chat_access, password: newPwd })
                          })
                          .then(async (res) => {
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to update password');
                            alert('✅ Password updated successfully!');
                          })
                          .catch((err) => alert(`❌ Error: ${err.message}`));
                        }
                      }}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        background: 'rgba(241,245,249,0.8)',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(226,232,240,0.9)'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(241,245,249,0.8)'; e.currentTarget.style.color = '#475569'; }}
                    >
                      🔑 Reset
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`🚨 Are you sure you want to delete user "${displayUsername}"? This will permanently remove their account.`)) {
                            try {
                              const res = await fetch(`/api/admin/users?userId=${u.id}`, {
                                method: 'DELETE'
                              });
                              if (res.ok) {
                                alert('✅ User deleted successfully!');
                                fetchUsers();
                              } else {
                                const errData = await res.json();
                                alert(`❌ Failed to delete user: ${errData.error || 'Unknown error'}`);
                              }
                            } catch (err: any) {
                              alert(`❌ Error deleting user: ${err.message}`);
                            }
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(254, 242, 242, 0.8)',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontFamily: "'Outfit', sans-serif",
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(254, 226, 226, 0.9)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(254, 242, 242, 0.8)'; }}
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

      {/* AI Settings Card */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>🤖</span>
          AI System Instructions
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Edit the core behavioral guidelines, rules, and logic for the Transworld Intl AI Assistant. These rules apply globally to all AI features.
        </p>
        
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={12}
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5', resize: 'vertical', marginBottom: '1rem' }}
          placeholder="Loading AI instructions..."
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleSaveAiSettings}
            disabled={savingAi}
            style={{ 
              padding: '0.6rem 1.5rem', borderRadius: '8px', 
              background: savingAi ? '#cbd5e1' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)', 
              color: 'white', border: 'none', cursor: savingAi ? 'not-allowed' : 'pointer', 
              fontWeight: 700, boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
              transition: 'all 0.2s'
            }}
          >
            {savingAi ? 'Saving...' : '💾 Save AI Instructions'}
          </button>
        </div>
      </div>

      {/* Bulk Data Management Card */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>📦</span>
          Bulk Data Management:
        </h2>
        
        {/* Jobs Section */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Jobs Table</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Download the current jobs as a CSV file, edit it, and upload it back. Uses <strong>job_number</strong> as the unique identifier for updates (UPSERT).
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => downloadCSV('jobs')}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              Download Jobs CSV
            </button>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => uploadCSV(e, 'jobs')}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                disabled={loadingJobs}
              />
              <button 
                disabled={loadingJobs}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: loadingJobs ? '#cbd5e1' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', pointerEvents: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                {loadingJobs ? 'Uploading...' : 'Upload Jobs CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Job Logs Section */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Job Logs Table</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Download and bulk upload job logs. If you are adding new logs, leave the <strong>id</strong> column blank. Must include <strong>job_number</strong> to map correctly.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => downloadCSV('job_logs')}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              Download Logs CSV
            </button>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => uploadCSV(e, 'job_logs')}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                disabled={loadingLogs}
              />
              <button 
                disabled={loadingLogs}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: loadingLogs ? '#cbd5e1' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', pointerEvents: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                {loadingLogs ? 'Uploading...' : 'Upload Logs CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
