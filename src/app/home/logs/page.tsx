'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './logs.module.css';

interface LoginLog {
  id: string;
  user_id: string | null;
  username: string;
  name: string | null;
  role: string | null;
  department: string | null;
  branch: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface UserMatrixItem {
  id: string;
  name: string;
  username: string;
  role: string | null;
  department: string | null;
  branches: string[];
  is_approved: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  activity: {
    fieldEdits: number;
    jobUpdates: number;
    communications: number;
    whatsappSent: number;
    unbilledFollowups: number;
  };
  totalOperations: number;
}

interface TableStat {
  name: string;
  count: number;
  estRowSizeBytes: number;
  note: string;
}

interface UsageLog {
  id: string;
  username: string | null;
  action_type: string;
  resource: string | null;
  row_count: number;
  estimated_bytes: number;
  metadata: any;
  created_at: string;
}

export default function LogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'logins' | 'usage' | 'egress'>('logins');

  // Logs data
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [userMatrix, setUserMatrix] = useState<UserMatrixItem[]>([]);
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [timeRange, setTimeRange] = useState('30');

  // Auth & Admin check
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_super_admin) {
        router.push('/home');
        return;
      }

      setIsSuperAdmin(true);
      fetchLogsData(timeRange);
    };

    init();
  }, [router]);

  const fetchLogsData = async (days = '30') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?days=${days}&limit=200`);
      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();

      setLoginLogs(data.loginLogs || []);
      setUsageLogs(data.usageLogs || []);
      setUserMatrix(data.userMatrix || []);
      setTableStats(data.tableStats || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (days: string) => {
    setTimeRange(days);
    fetchLogsData(days);
  };

  // Helper date formatter
  const formatTimestamp = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${day}-${month}-${year} ${time}`;
  };

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'Never';
    const seconds = Math.floor((new Date().getTime() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filtered Login Logs
  const filteredLogins = useMemo(() => {
    return loginLogs.filter(log => {
      const matchesSearch =
        searchTerm === '' ||
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.name && log.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.ip_address && log.ip_address.includes(searchTerm)) ||
        (log.browser && log.browser.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.os && log.os.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      const matchesUser = selectedUser === 'ALL' || log.username === selectedUser;

      return matchesSearch && matchesStatus && matchesUser;
    });
  }, [loginLogs, searchTerm, statusFilter, selectedUser]);

  // Filtered User Matrix
  const filteredUsers = useMemo(() => {
    return userMatrix.filter(u => {
      return (
        searchTerm === '' ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [userMatrix, searchTerm]);

  // Unique usernames for dropdown
  const uniqueUsernames = useMemo(() => {
    const set = new Set<string>();
    loginLogs.forEach(l => set.add(l.username));
    userMatrix.forEach(u => set.add(u.username));
    return Array.from(set).sort();
  }, [loginLogs, userMatrix]);

  if (!isSuperAdmin || loading) {
    return (
      <div className={styles.logsContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading System & Egress Logs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.logsContainer}>
      {/* ── Page Header ── */}
      <div className={styles.header}>
        <div className={styles.headerTitles}>
          <h1>📊 System, User & Egress Logs</h1>
          <p>Super Admin central audit intelligence for user logins, platform activity, and data egress footprint.</p>
        </div>
        <div className={styles.headerControls}>
          <select
            className={styles.selectInput}
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
          >
            <option value="1">Today (Last 24h)</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <button className={styles.refreshBtn} onClick={() => fetchLogsData(timeRange)}>
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Logins Recorded</div>
          <div className={styles.kpiValue}>
            {summary?.totalLogins || loginLogs.length}
            <span style={{ fontSize: '0.85rem', color: '#10b981' }}>sessions</span>
          </div>
          <div className={styles.kpiSub}>In selected time window</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Active Users Today</div>
          <div className={styles.kpiValue} style={{ color: '#3b82f6' }}>
            {summary?.activeUsersToday ?? 0}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>active</span>
          </div>
          <div className={styles.kpiSub}>Distinct logins today</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Estimated Monthly Egress</div>
          <div className={styles.kpiValue} style={{ color: '#8b5cf6' }}>
            {summary?.estimatedMonthlyEgressMB ?? '0'}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MB / 5,120 MB</span>
          </div>
          <div className={styles.kpiSub}>
            ~{(((summary?.estimatedMonthlyEgressMB || 0) / 5120) * 100).toFixed(1)}% of Supabase 5GB Free Tier
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Est. DB Storage Used</div>
          <div className={styles.kpiValue} style={{ color: '#06b6d4' }}>
            {summary?.totalEstStorageMB ?? '0'}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MB</span>
          </div>
          <div className={styles.kpiSub}>Across all 9 core Postgres tables</div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'logins' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('logins')}
        >
          <span>🔐</span> Login History ({filteredLogins.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'usage' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          <span>👥</span> User In-App Operations ({userMatrix.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'egress' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('egress')}
        >
          <span>⚡</span> Data Egress & Storage Footprint
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: LOGIN HISTORY                                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'logins' && (
        <>
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search username, IP, browser, OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <select
                className={styles.selectInput}
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="ALL">All Users</option>
                {uniqueUsernames.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              <select
                className={styles.selectInput}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="success">Success ✅</option>
                <option value="failed">Failed ❌</option>
                <option value="deactivated">Deactivated ⛔</option>
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User & Role</th>
                  <th>Branch / Dept</th>
                  <th>IP Address</th>
                  <th>Device / Browser / OS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogins.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      No login records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogins.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{formatTimestamp(log.created_at)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{timeAgo(log.created_at)}</div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#e0e7ff', color: '#4f46e5',
                            fontWeight: 700, fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {(log.name?.[0] || log.username[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{log.name || log.username}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>@{log.username} • {log.role || 'User'}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500 }}>{log.branch || 'ALL'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{log.department || 'General'}</div>
                      </td>

                      <td>
                        <code style={{
                          background: 'rgba(148, 163, 184, 0.15)',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem'
                        }}>
                          {log.ip_address || '—'}
                        </code>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{log.device === 'Mobile' ? '📱' : log.device === 'Tablet' ? '📟' : '💻'}</span>
                          <span style={{ fontWeight: 600 }}>{log.browser || 'Browser'}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>on {log.os || 'OS'}</span>
                        </div>
                      </td>

                      <td>
                        {log.status === 'success' ? (
                          <span className={styles.badgeSuccess}>✅ Success</span>
                        ) : log.status === 'deactivated' ? (
                          <span className={styles.badgeDeactivated} title={log.error_message || 'Deactivated'}>
                            ⛔ Blocked
                          </span>
                        ) : (
                          <span className={styles.badgeFailed} title={log.error_message || 'Failed'}>
                            ❌ Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: USER IN-APP OPERATIONS MATRIX                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'usage' && (
        <>
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search staff name, role, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {filteredUsers.length} staff members ranked by total database mutations & operations.
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Rank & User</th>
                  <th>Role & Dept</th>
                  <th>Last Active</th>
                  <th style={{ textAlign: 'center' }}>Field Edits (Audit)</th>
                  <th style={{ textAlign: 'center' }}>Job State Updates</th>
                  <th style={{ textAlign: 'center' }}>Call Logs</th>
                  <th style={{ textAlign: 'center' }}>WhatsApp Logs</th>
                  <th style={{ textAlign: 'center' }}>Unbilled Followups</th>
                  <th style={{ textAlign: 'center' }}>Total Operations</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : 'rgba(148, 163, 184, 0.15)',
                          color: idx === 0 ? '#854d0e' : idx === 1 ? '#475569' : idx === 2 ? '#9a3412' : 'var(--text-secondary)',
                          fontSize: '0.75rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name || u.username}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#6366f1' }}>{u.role || 'User'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{u.department || 'General'}</div>
                    </td>

                    <td>
                      {u.last_login_at ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#10b981' }}>{timeAgo(u.last_login_at)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatTimestamp(u.last_login_at)}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>No recent login</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.activity.fieldEdits}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.activity.jobUpdates}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.activity.communications}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.activity.whatsappSent}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.activity.unbilledFollowups}</td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.15))',
                        color: '#6366f1',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.85rem'
                      }}>
                        {u.totalOperations}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: DATA EGRESS & STORAGE FOOTPRINT                     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'egress' && (
        <>
          {/* Egress Quota Card */}
          <div className={styles.egressCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Supabase Bandwidth & Egress Tracker
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Estimated outbound data transfer consumed by database queries, realtime websockets, and file exports.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1' }}>
                  {summary?.estimatedMonthlyEgressMB || 0} MB
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}> / 5,120 MB (Free Tier)</span>
              </div>
            </div>

            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{
                  width: `${Math.min(100, Math.max(2, (((summary?.estimatedMonthlyEgressMB || 0) / 5120) * 100)))}%`
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>0 MB</span>
              <span>2.5 GB (50%)</span>
              <span>5.0 GB Max (Free Tier Limit)</span>
            </div>
          </div>

          {/* Active Egress Protections in App */}
          <div style={{
            background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700 }}>
              🛡️ Active Egress Optimizations in `csc-app`
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span>✅</span>
                <div>
                  <strong>AWS S3 File Storage</strong>
                  <div style={{ color: 'var(--text-secondary)' }}>Documents (PODs, invoices) download directly from S3, consuming $0$ Supabase Storage egress.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span>✅</span>
                <div>
                  <strong>Selective Scalar Queries</strong>
                  <div style={{ color: 'var(--text-secondary)' }}>List pages omit heavy `documents` JSONB to reduce payload size by ~80% per query.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span>✅</span>
                <div>
                  <strong>3s Realtime Debounce</strong>
                  <div style={{ color: 'var(--text-secondary)' }}>Realtime change listeners buffer updates to prevent repetitive network query bursts.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span>✅</span>
                <div>
                  <strong>1000-Row Chunk Streaming</strong>
                  <div style={{ color: 'var(--text-secondary)' }}>Exports and full tables stream in bounded `.range()` blocks without socket timeouts.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Database Table Footprint */}
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800 }}>
            🗄️ PostgreSQL Database Tables & Record Volume
          </h4>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Live record count across all PostgreSQL tables in Supabase.
          </p>

          <div className={styles.storageGrid}>
            {tableStats.map(t => (
              <div key={t.name} className={styles.storageCard}>
                <div className={styles.storageInfo}>
                  <h4>{t.name}</h4>
                  <p>{t.note}</p>
                  <p style={{ fontSize: '0.7rem', opacity: 0.7 }}>Est. {((t.count * t.estRowSizeBytes) / 1024).toFixed(1)} KB footprint</p>
                </div>
                <div className={styles.storageCount}>
                  {t.count.toLocaleString()}
                  <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: 500 }}>records</span>
                </div>
              </div>
            ))}
          </div>

          {/* Heavy Exports / Operations Log */}
          {usageLogs.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800 }}>
                📤 Recent Heavy Operations & Export Footprint
              </h4>
              <div className={styles.tableWrapper} style={{ marginTop: '0.75rem' }}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Row Count</th>
                      <th>Estimated Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.map(l => (
                      <tr key={l.id}>
                        <td>{formatTimestamp(l.created_at)}</td>
                        <td>
                          <code style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                            {l.action_type}
                          </code>
                        </td>
                        <td>{l.resource || '—'}</td>
                        <td>{l.row_count.toLocaleString()} rows</td>
                        <td>{(l.estimated_bytes / 1024).toFixed(1)} KB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
