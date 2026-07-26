'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CustomSelect from '../components/CustomSelect';
import UserDetailsModal from './UserDetailsModal';
import { useRouter } from 'next/navigation';

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-color)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  boxShadow: 'var(--glass-shadow)',
  padding: '1.75rem',
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
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Quick Create Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cscRole, setCscRole] = useState('None');
  const [trackingRole, setTrackingRole] = useState('None');
  const [unbilledRole, setUnbilledRole] = useState('None');
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['ALL']);
  const [loading, setLoading] = useState(false);

  // Table Filters & Modal
  const [filterRole, setFilterRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalUser, setActiveModalUser] = useState<any | null>(null);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
        supabase.from('profiles').select('*').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile && profile.role === 'Admin') {
              setUserRole(profile.role);
              setCheckingAuth(false);
              fetchUsers();
            } else {
              router.push('/home');
            }
          });
      } else {
        router.push('/home');
      }
    });
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleQuickCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedEmail = `${username}@transworldintl.com`.toLowerCase();
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formattedEmail,
          password,
          name,
          role: cscRole !== 'None' ? cscRole : 'Executive',
          csc_role: cscRole,
          tracking_role: trackingRole,
          unbilled_role: unbilledRole,
          branches: selectedBranches,
          is_approved: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      showToast(`✅ User "${name || username}" created successfully!`, 'success');
      setName(''); setUsername(''); setPassword('');
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModalUser = async (formData: any) => {
    try {
      if (!formData.userId) {
        // Create New User via API
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
            is_approved: formData.is_approved
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        showToast(`✅ User "${formData.name || formData.username}" created successfully!`, 'success');
      } else {
        // Update Existing User via API
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user profile');
        showToast('✅ User profile & permissions updated successfully!', 'success');
      }
      setActiveModalUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleToggleApproval = async (user: any) => {
    const newStatus = user.is_approved === false;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, is_approved: newStatus })
      });
      if (!res.ok) throw new Error('Failed to toggle approval status');
      showToast(`User ${user.username} is now ${newStatus ? 'Approved ✅' : 'Disabled ⏳'}`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleCopyCredentials = (user: any) => {
    const newPwd = prompt(`Enter new password for ${user.username}:`, 'csc@2026');
    if (!newPwd) return;

    fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, password: newPwd })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      
      const credText = `Hi ${user.name || user.username},\nYour Jobs Portal password has been updated.\nUsername: ${user.username}\nPassword: ${newPwd}\nLogin Link: ${window.location.origin}/login`;
      navigator.clipboard.writeText(credText);
      showToast('📋 Password updated and credentials copied to clipboard for WhatsApp!', 'success');
    })
    .catch((err) => showToast(`❌ Error: ${err.message}`, 'error'));
  };

  const pendingUsers = users.filter(u => u.is_approved === false);
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
    const matchRole = filterRole === 'All' || u.csc_role === filterRole || u.tracking_role === filterRole || u.unbilled_role === filterRole;
    return matchSearch && matchRole;
  });

  if (checkingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Verifying admin authorization...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          👥 Categorized User Management & Access Control
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          Manage user accounts, assign category permissions (CSC, Tracking, Unbilled), approve pending sign-ups, and control branch access.
        </p>
      </div>



      {/* 📊 Master Users Directory Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              Master User Directory ({filteredUsers.length})
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click any user row to open details modal and edit photo or category permissions.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by name, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: '220px' }}
            />
            <button
              onClick={() => setActiveModalUser({})}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ➕ Add New User
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Username / Email</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Access</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Approval</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSuperAdmin = u.username === 'ganesh' || u.name?.includes('Ganesaperumal');
                const isApproved = u.is_approved !== false;

                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Profile & Photo */}
                    <td style={{ padding: '0.85rem 1rem' }} onClick={() => setActiveModalUser(u)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #4f46e5', fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>
                          {u.photo ? <img src={u.photo} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name?.[0] || u.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name || u.username}</div>
                          {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{u.phone}</div>}
                          {isSuperAdmin && <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 800 }}>👑 SUPER ADMIN</span>}
                        </div>
                      </div>
                    </td>

                    {/* Username & Email */}
                    <td style={{ padding: '0.85rem 1rem' }} onClick={() => setActiveModalUser(u)}>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email || `${u.username}@transworldintl.com`}</div>
                    </td>

                    {/* Module Access Matrix Badges with Emojis */}
                    <td style={{ padding: '0.85rem 1rem' }} onClick={() => setActiveModalUser(u)}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {(() => {
                          const getRoleIcon = (role: string) => {
                            if (role === 'Viewer') return '👁️';
                            if (role === 'Executive') return '✏️';
                            if (role === 'Manager' || role === 'Branch Manager') return '💼';
                            if (role === 'Admin') return '🛡️';
                            return '';
                          };

                          const cRole = u.csc_role || u.role || 'Executive';
                          const tRole = u.tracking_role || 'Executive';
                          const uRole = u.unbilled_role || 'Executive';

                          return (
                            <>
                              {cRole !== 'None' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(79,70,229,0.12)', color: '#4f46e5', fontWeight: 700 }}>
                                  CSC: {getRoleIcon(cRole)}
                                </span>
                              )}
                              {tRole !== 'None' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontWeight: 700 }}>
                                  Track: {getRoleIcon(tRole)}
                                </span>
                              )}
                              {uRole !== 'None' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700 }}>
                                  Unbilled: {getRoleIcon(uRole)}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Approved Smooth Toggle Switch (No text label) */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSuperAdmin) handleToggleApproval(u);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                          opacity: isSuperAdmin ? 0.6 : 1
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '22px',
                            borderRadius: '11px',
                            background: isApproved ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(148, 163, 184, 0.3)',
                            border: `1px solid ${isApproved ? '#10b981' : 'rgba(148, 163, 184, 0.4)'}`,
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            boxShadow: isApproved ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none'
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: isApproved ? '20px' : '2px',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: 'white',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyCredentials(u); }}
                          title="Reset Password & Copy WhatsApp Credentials"
                          style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          🔑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over User Details Modal */}
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
