'use client';
import { showToast } from '@/components/GlobalDialogs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import UserDetailsModal from './UserDetailsModal';
import MultiSelect from '../components/MultiSelect';

const BRANCH_OPTIONS = [
  { value: 'ALL', label: 'ALL (Super)' },
  { value: 'BLR', label: 'BLR' },
  { value: 'DEL', label: 'DEL' },
  { value: 'BOM', label: 'BOM' },
  { value: 'MAA', label: 'MAA' },
  { value: 'PNQ', label: 'PNQ' },
  { value: 'HYD', label: 'HYD' },
  { value: 'AMD', label: 'AMD' },
  { value: 'COK', label: 'COK' },
  { value: 'KOL', label: 'KOL' },
  { value: 'OSS', label: 'OSS' },
];

export default function UsersPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeModalUser, setActiveModalUser] = useState<any | null>(null);

  /* ── Filter & Search State ── */
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedRole, setSelectedRole]       = useState<string[]>(['All']);
  const [selectedDepartment, setSelectedDepartment] = useState<string[]>(['All']);
  const [selectedCsc, setSelectedCsc]         = useState<string[]>(['All']);
  const [selectedUnbilled, setSelectedUnbilled] = useState<string[]>(['All']);
  const [selectedAllJobs, setSelectedAllJobs] = useState<string[]>(['All']);
  const [selectedBranch, setSelectedBranch]   = useState<string[]>(['All']);

  /* ── Sorting State ── */
  const [sortField, setSortField]             = useState<'name' | 'role' | 'username' | 'status'>('name');
  const [sortDirection, setSortDirection]     = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_super_admin !== true) {
        showToast('⛔ Access Denied: User Directory is restricted to Super Admin only.', 'error');
        router.push('/home');
        return;
      }

      setCheckingAuth(false);
      fetchUsers();
    };

    checkAuth();
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
        await copyToClipboard(credText);
        showToast('📋 Password updated & credentials copied!', 'success');
      })
      .catch((err) => showToast(`❌ ${err.message}`, 'error'));
  };

  /* ── Computed Filtered & Sorted Users ── */
  const uniqueRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));
  const roleOptions = [{ value: 'All', label: 'All Roles' }, ...uniqueRoles.map(r => ({ value: r as string, label: r as string }))];

  const uniqueDepts = Array.from(new Set(users.map(u => u.department).filter(Boolean)));
  const departmentOptions = [{ value: 'All', label: 'All Depts' }, ...uniqueDepts.map(d => ({ value: d as string, label: d as string }))];

  const filteredUsers = users
    .filter(u => {
      // 1. Text Query
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        (u.designation && u.designation.toLowerCase().includes(q))
      );

      // 2. Role
      const uRole = u.role || '';
      const matchRole = selectedRole.includes('All') || selectedRole.includes(uRole);

      // 3. Department
      const uDept = u.department || u.designation || '';
      const matchDepartment = selectedDepartment.includes('All') || selectedDepartment.includes(uDept);

      // 4. CSC Access
      const cscVal = u.csc_access || u.csc_role || 'None';
      const matchCsc = selectedCsc.includes('All') || selectedCsc.includes(cscVal);

      // 5. Unbilled Access
      const unbilledVal = u.unbilled_access || u.unbilled_role || 'None';
      const matchUnbilled = selectedUnbilled.includes('All') || selectedUnbilled.includes(unbilledVal);

      // 6. All Jobs Access
      const allJobsVal = u.all_jobs_access || u.all_jobs_role || 'None';
      const matchAllJobs = selectedAllJobs.includes('All') || selectedAllJobs.includes(allJobsVal);

      // 7. Assigned Branches
      const uBranches: string[] = u.branches || [];
      const matchBranch = selectedBranch.includes('All') ||
        selectedBranch.some(b => uBranches.includes(b));

      return matchQuery && matchRole && matchDepartment && matchCsc && matchUnbilled && matchAllJobs && matchBranch;
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'name') {
        valA = (a.name || a.username || '').toLowerCase();
        valB = (b.name || b.username || '').toLowerCase();
      } else if (sortField === 'role') {
        valA = (a.role || a.department || '').toLowerCase();
        valB = (b.role || b.department || '').toLowerCase();
      } else if (sortField === 'username') {
        valA = (a.username || '').toLowerCase();
        valB = (b.username || '').toLowerCase();
      } else if (sortField === 'status') {
        valA = a.is_approved !== false ? 'Active' : 'Inactive';
        valB = b.is_approved !== false ? 'Active' : 'Inactive';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const isFiltered = searchQuery !== '' ||
    !selectedRole.includes('All') ||
    !selectedDepartment.includes('All') ||
    !selectedCsc.includes('All') ||
    !selectedUnbilled.includes('All') ||
    !selectedAllJobs.includes('All') ||
    !selectedBranch.includes('All');

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole(['All']);
    setSelectedDepartment(['All']);
    setSelectedCsc(['All']);
    setSelectedUnbilled(['All']);
    setSelectedAllJobs(['All']);
    setSelectedBranch(['All']);
  };

  const handleHeaderSort = (field: 'name' | 'role' | 'username' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

      {/* ─── Single Unified Search, Filters & Count Bar ─── */}
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        {/* Center: Search + Filters + Count inline in same line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', flex: 1, minWidth: 0, justifyContent: 'flex-start' }}>
          {/* Search Bar Input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '180px', flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: '0.65rem', fontSize: '0.8rem', color: 'var(--text-secondary)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.38rem 1.8rem 0.38rem 2rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: '0.4rem', background: 'none', border: 'none',
                  color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                ✕
              </button>
            )}
          </div>

          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0.1rem', whiteSpace: 'nowrap' }}>
            Filters:
          </span>

          {/* CSC Jobs Access Filter */}
          <MultiSelect
            value={selectedCsc}
            onChange={(val) => setSelectedCsc(val)}
            options={[
              { value: 'All', label: 'CSC: All' },
              { value: 'Edit', label: 'Edit ✏️' },
              { value: 'View', label: 'View 🔍' },
              { value: 'None', label: 'None ✖️' },
            ]}
            placeholder="CSC"
          />

          {/* Unbilled Access Filter */}
          <MultiSelect
            value={selectedUnbilled}
            onChange={(val) => setSelectedUnbilled(val)}
            options={[
              { value: 'All', label: 'Unbilled: All' },
              { value: 'Edit', label: 'Edit ✏️' },
              { value: 'View', label: 'View 🔍' },
              { value: 'None', label: 'None ✖️' },
            ]}
            placeholder="Unbilled"
          />

          {/* All Jobs Access Filter */}
          <MultiSelect
            value={selectedAllJobs}
            onChange={(val) => setSelectedAllJobs(val)}
            options={[
              { value: 'All', label: 'Jobs: All' },
              { value: 'View', label: 'View 🔍' },
              { value: 'None', label: 'None ✖️' },
            ]}
            placeholder="Jobs"
          />

          {/* Branch Filter */}
          <MultiSelect
            value={selectedBranch}
            onChange={(val) => setSelectedBranch(val)}
            options={[{ value: 'All', label: 'All Branches' }, ...BRANCH_OPTIONS]}
            placeholder="Branch"
          />

          {/* Department Filter */}
          {departmentOptions.length > 1 && (
            <MultiSelect
              value={selectedDepartment}
              onChange={(val) => setSelectedDepartment(val)}
              options={departmentOptions}
              placeholder="Dept"
            />
          )}

          {/* Role Filter */}
          {roleOptions.length > 1 && (
            <MultiSelect
              value={selectedRole}
              onChange={(val) => setSelectedRole(val)}
              options={roleOptions}
              placeholder="Role"
            />
          )}

          {/* Red Funnel Button to Reset Active Filters */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              title="Reset all active filters"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.35rem 0.6rem',
                borderRadius: '10px',
                border: '1px solid #ef4444',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                minHeight: '34px',
                boxSizing: 'border-box'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>
          )}

          {/* User Count Badge placed after filters */}
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem',
            borderRadius: '20px', background: 'rgba(79,70,229,0.1)', color: '#4f46e5',
            border: '1px solid rgba(79,70,229,0.2)', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', height: '34px', boxSizing: 'border-box'
          }}>
            {filteredUsers.length} / {users.length}
          </span>
        </div>

        {/* Right: Add New User button */}
        <button
          onClick={() => setActiveModalUser({})}
          style={{
            padding: '0.45rem 1rem', borderRadius: '20px', border: 'none',
            background: '#4f46e5',
            color: '#ffffff', fontWeight: 700, fontSize: '0.8rem',
            cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            flexShrink: 0
          }}
        >
          ＋ Add New User
        </button>
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
                
                {/* User Column (Sortable) */}
                <th
                  onClick={() => handleHeaderSort('name')}
                  style={{
                    padding: '0.85rem 1rem',
                    color: 'var(--text-secondary)', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none'
                  }}
                >
                  User {sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>

                {/* Designation / Role Column (Sortable) */}
                <th
                  onClick={() => handleHeaderSort('role')}
                  style={{
                    padding: '0.85rem 1rem',
                    color: 'var(--text-secondary)', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none'
                  }}
                >
                  Designation {sortField === 'role' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>

                {/* Username Column (Sortable) */}
                <th
                  onClick={() => handleHeaderSort('username')}
                  style={{
                    padding: '0.85rem 1rem',
                    color: 'var(--text-secondary)', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none'
                  }}
                >
                  Login {sortField === 'username' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>

                {/* Access Column */}
                <th style={{
                  padding: '0.85rem 1rem',
                  color: 'var(--text-secondary)', fontWeight: 700,
                  fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>
                  Access
                </th>

                {/* Actions / Status Column (Sortable) */}
                <th
                  onClick={() => handleHeaderSort('status')}
                  style={{
                    padding: '0.85rem 1rem',
                    color: 'var(--text-secondary)', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none'
                  }}
                >
                  Actions {sortField === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>

              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isApproved = u.is_approved !== false;

                const cscVal = u.csc_access || u.csc_role || 'None';
                const allJobsVal = u.all_jobs_access || u.all_jobs_role || 'None';
                const unbilledVal = u.unbilled_access || u.unbilled_role || 'None';
                const spocVal = u.spoc_access || 'None';
                const deptVal = u.department || u.designation || '';

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
                          </div>
                          {u.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{u.phone}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Role & Department */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#4f46e5', fontSize: '0.82rem' }}>
                        {u.role || 'User'}
                      </div>
                      {deptVal && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <span>{deptVal}</span>
                        </div>
                      )}
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

                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.2rem' }}>SPOC</span>
                        {getAccessBadge(spocVal, 'SPOC Master')}
                      </div>
                    </td>

                    {/* Merged Actions & Approval */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleApproval(u);
                          }}
                          title={isApproved ? "Click to set user Inactive" : "Click to set user Active"}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                        >
                          <div style={{
                            width: '36px', height: '19px', borderRadius: '10px',
                            background: isApproved ? '#16a34a' : '#cbd5e1',
                            border: `1px solid ${isApproved ? '#15803d' : '#94a3b8'}`,
                            position: 'relative', transition: 'all 0.2s ease',
                            flexShrink: 0,
                          }}>
                            <div style={{
                              position: 'absolute', top: '1.5px',
                              left: isApproved ? '18px' : '1.5px',
                              width: '14px', height: '14px', borderRadius: '50%',
                              background: '#ffffff', transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isApproved ? '#16a34a' : '#64748b' }}>
                            {isApproved ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <button
                          title="Reset Password & Copy Credentials"
                          onClick={(e) => { e.stopPropagation(); handleResetPassword(u); }}
                          style={{
                            padding: '0.3rem 0.55rem', borderRadius: '20px',
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
                    <div style={{ fontWeight: 600 }}>No users found matching current filters</div>
                    {isFiltered && (
                      <button
                        onClick={handleResetFilters}
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.45rem 1rem',
                          borderRadius: '20px',
                          border: 'none',
                          background: '#4f46e5',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Reset All Filters ✕
                      </button>
                    )}
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
