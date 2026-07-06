'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  job_number: string;
  customer_name: string;
  company: string;
  goods_track_status: string;
  erp_job_id: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Open/Close with Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setResults([]);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced search against Supabase
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query;
    const timer = setTimeout(async () => {
      setSearching(true);
      const orFilter = [
        'job_number.ilike.%' + q + '%',
        'customer_name.ilike.%' + q + '%',
        'company.ilike.%' + q + '%',
        'erp_job_id.ilike.%' + q + '%',
      ].join(',');
      const { data } = await supabase
        .from('jobs')
        .select('job_number, customer_name, company, goods_track_status, erp_job_id')
        .or(orFilter)
        .limit(8);
      setResults(data || []);
      setSelectedIdx(0);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback((jobNumber: string) => {
    router.push('/dashboard/job/' + encodeURIComponent(jobNumber));
    setOpen(false);
    setQuery('');
  }, [router]);

  // Arrow-key + Enter navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIdx]) navigate(results[selectedIdx].job_number);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIdx, navigate]);

  if (!open) return null;

  const statusDot = (s: string) => {
    if (!s) return '⚪';
    const sl = s.toLowerCase();
    if (sl.includes('delivered') || sl.includes('completed')) return '🟢';
    if (sl.includes('transit')) return '🔵';
    if (sl.includes('dispatch')) return '🟣';
    if (sl.includes('packing')) return '🟡';
    return '⚪';
  };

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>

        {/* Search input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.2rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: '1.05rem' }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search jobs, customers, companies..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {searching && (
            <div style={{
              width: '14px', height: '14px',
              border: '2px solid var(--primary-color)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'cmdSpin 0.6s linear infinite',
              flexShrink: 0,
              marginTop: '1.05rem'
            }} />
          )}
        </div>

        {/* Results list */}
        <div className="cmd-results">
          {!query.trim() ? (
            <div className="cmd-empty">Type to search across all jobs, customers and companies</div>
          ) : results.length === 0 && !searching ? (
            <div className="cmd-empty">No jobs found for &ldquo;{query}&rdquo;</div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.job_number}
                className={'cmd-result-item' + (i === selectedIdx ? ' selected' : '')}
                onClick={() => navigate(r.job_number)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{statusDot(r.goods_track_status)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="cmd-name">{r.customer_name || 'Unknown'}</span>
                    <span className="cmd-job-num">{r.job_number}</span>
                    {r.erp_job_id && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>#{r.erp_job_id}</span>
                    )}
                  </div>
                  {r.company && <div className="cmd-company">{r.company}</div>}
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            ))
          )}
        </div>

        {/* Keyboard hints bar */}
        <div className="cmd-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
          <span><kbd>Ctrl</kbd><kbd>K</kbd> Toggle</span>
        </div>
      </div>
      <style>{'@keyframes cmdSpin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
