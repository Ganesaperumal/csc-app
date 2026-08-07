'use client';
import { isSuperAdmin } from '@/lib/authUtils';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface AuditEntry {
  id: number;
  job_number: string;
  name: string | null;
  username: string | null;
  field_change: string | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

const PAGE_SIZE = 50;

const formatTimestamp = (ts: string) => {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}-${month}-${year} ${time}`;
};

const friendlyField = (field: string | null) => {
  if (!field) return '—';
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const truncate = (val: string | null, max = 60) => {
  if (!val || val === '') return <span style={{ opacity: 0.35, fontStyle: 'italic' }}>empty</span>;
  return val.length > max ? val.slice(0, max) + '…' : val;
};

export default function ActivityLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Auth guard — Admin only
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const isSuper = isSuperAdmin(profile);
      if (!isSuper) {
        router.push('/home');
        return;
      }
      setIsAdmin(true);
    };
    checkAuth();
  }, [router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (appliedSearch.trim()) {
        const s = appliedSearch.trim();
        query = query.or(`job_number.ilike.%${s}%,username.ilike.%${s}%,name.ilike.%${s}%,field_change.ilike.%${s}%`);
      }
      if (dateFrom) {
        query = query.gte('timestamp', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('timestamp', `${dateTo}T23:59:59`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setEntries(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, dateFrom, dateTo]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs();
  }, [isAdmin, fetchLogs]);

  const handleSearch = () => {
    setPage(0);
    setAppliedSearch(search);
  };

  const handleClear = () => {
    setSearch('');
    setAppliedSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!isAdmin) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Checking access...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', gap: '1.25rem' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋</span>
            <span style={{ backgroundImage: 'linear-gradient(45deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Activity Log
            </span>
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Field-level audit trail of all job edits
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {totalCount.toLocaleString()} total entries
        </div>
      </div>

      {/* Filters */}
      <div className="glass" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px' }}>
          <input
            id="audit-search"
            type="text"
            placeholder="Search by job #, username, name, or field…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{
              width: '100%', padding: '0.5rem 2.2rem 0.5rem 0.75rem',
              borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem'
            }}
          />
          <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>From</label>
          <input
            id="audit-date-from"
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>To</label>
          <input
            id="audit-date-to"
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0); }}
            style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
          />
        </div>

        <button
          id="audit-search-btn"
          onClick={handleSearch}
          style={{
            padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Search
        </button>
        {(appliedSearch || dateFrom || dateTo) && (
          <button
            id="audit-clear-btn"
            onClick={handleClear}
            style={{
              padding: '0.5rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--surface-color)', color: 'var(--text-secondary)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass" style={{ flex: 1, borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-color)', borderBottom: '2px solid var(--border-color)' }}>
                {['Timestamp', 'Job #', 'Name', 'Username', 'Field Changed', 'Old Value', 'New Value'].map(col => (
                  <th key={col} style={{
                    padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: 'var(--text-secondary)', whiteSpace: 'nowrap'
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.1)', borderLeftColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Loading audit log…
                    </div>
                    <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}` }} />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.025)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.025)')}
                  >
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/home/job/${encodeURIComponent(entry.job_number)}`}
                        style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none', fontSize: '0.82rem' }}
                      >
                        {entry.job_number || '—'}
                      </Link>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {entry.name || '—'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      {entry.username ? (
                        <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                          {entry.username}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem' }}>
                        {friendlyField(entry.field_change)}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', maxWidth: '200px', color: 'var(--text-secondary)' }}>
                      {truncate(entry.old_value)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', maxWidth: '200px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {truncate(entry.new_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)',
            background: 'var(--surface-color)', gap: '1rem', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                id="audit-prev-btn"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)', color: page === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                  cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600, opacity: page === 0 ? 0.5 : 1
                }}
              >
                ← Prev
              </button>
              <span style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                id="audit-next-btn"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)', color: page >= totalPages - 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  opacity: page >= totalPages - 1 ? 0.5 : 1
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
