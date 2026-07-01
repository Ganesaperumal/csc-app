'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from '../jobs.module.css';

const ALL_COLUMNS = [
  { id: 'erp_job_id', label: 'Job ID' },
  { id: 'job_number', label: 'Job Number' },
  { id: 'job_date', label: 'Date' },
  { id: 'branch', label: 'Branch' },
  { id: 'customer_name', label: 'Customer Name' },
  { id: 'company', label: 'Company' },
  { id: 'goods_type', label: 'Type' },
  { id: 'origin', label: 'Origin' },
  { id: 'destination', label: 'Destination' },
  { id: 'customer_phone', label: 'Customer Phone' },
  { id: 'spoc_name', label: 'SPOC' },
  { id: 'erp_status', label: 'Status' },
  { id: 'goods_track_status', label: 'Goods Track Status' },
  { id: 'car_track_status', label: 'Car Track Status' },
  { id: 'jtr_percentage', label: 'JTR %' },
  { id: 'google_review_taken', label: 'Google Review' },
  { id: 'packing_team_supervisor', label: 'Packing Supervisor' },
  { id: 'operation_by', label: 'Operation By' },
  { id: 'follow_up_date', label: 'Follow Up Date' },
  { id: 'packing_date', label: 'Packing Date' },
  { id: 'dispatch_date', label: 'Dispatch Date' },
  { id: 'transit_days', label: 'Transit Days' },
  { id: 'expected_to_reach_dest', label: 'Expected Reaching' },
  { id: 'reached_destination', label: 'Reached Dest.' },
  { id: 'planned_delivery', label: 'Planned Delivery' },
  { id: 'actual_delivery', label: 'Actual Delivery' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'last_comm_date', label: 'Last Comm Date' },
  { id: 'invoice_number', label: 'Invoice Number' },
  { id: 'invoice_date', label: 'Invoice Date' }
];

function ColumnFilterDropdown({ colId, jobs, currentFilters, onApply, onSort, currentSort }: {
  colId: string; jobs: any[]; currentFilters: string[];
  onApply: (f: string[]) => void; onSort: (d: 'asc' | 'desc') => void; currentSort: 'asc' | 'desc' | null;
}) {
  const allValues = Array.from(new Set(jobs.map(j => j[colId]).filter(v => v !== null && v !== undefined && v !== ''))).sort();
  const [q, setQ] = useState('');
  const displayed = allValues.filter(v => String(v).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className={styles.gsFilterDropdown}>
      <div className={styles.gsFilterHeader} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button onClick={() => onSort('asc')} style={{ flex: 1, padding: '0.3rem', background: currentSort === 'asc' ? 'rgba(244,114,182,0.2)' : 'transparent', color: currentSort === 'asc' ? '#f472b6' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>↑ A-Z</button>
          <button onClick={() => onSort('desc')} style={{ flex: 1, padding: '0.3rem', background: currentSort === 'desc' ? 'rgba(244,114,182,0.2)' : 'transparent', color: currentSort === 'desc' ? '#f472b6' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>↓ Z-A</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#f472b6' }}>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onApply(allValues as string[])}>Select all</span>
          <span>-</span>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onApply([])}>Clear</span>
        </div>
      </div>
      <div className={styles.gsSearchBox}>
        <input type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className={styles.gsFilterList}>
        {displayed.map(val => (
          <div key={val as string} className={styles.gsFilterItem} onClick={() => {
            if (currentFilters.includes(val as string)) onApply(currentFilters.filter(v => v !== val));
            else onApply([...currentFilters, val as string]);
          }}>
            <div className={styles.gsCheckbox}>
              {currentFilters.includes(val as string) && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
            <span>{val as string}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClosedJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>(() => { try { return localStorage.getItem('csc_closed_type_filter') || 'ALL'; } catch { return 'ALL'; } });
  const [statusFilter, setStatusFilter] = useState<'all' | 'billed' | 'cancelled'>(() => {
    try { return (localStorage.getItem('csc_closed_status_filter') as any) || 'billed'; } catch { return 'billed'; }
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try { const s = localStorage.getItem('csc_closed_visible_cols'); return s ? JSON.parse(s) : ['erp_job_id', 'job_number', 'job_date', 'customer_name', 'erp_status', 'goods_type', 'goods_track_status', 'spoc_name']; } catch { return ['erp_job_id', 'job_number', 'job_date', 'customer_name', 'erp_status', 'goods_type', 'goods_track_status', 'spoc_name']; }
  });
  const [orderedColumns, setOrderedColumns] = useState<string[]>(() => {
    try { const s = localStorage.getItem('csc_closed_ordered_cols'); if (s) { const p = JSON.parse(s); return Array.from(new Set([...p, ...ALL_COLUMNS.map(c => c.id)])); } return ALL_COLUMNS.map(c => c.id); } catch { return ALL_COLUMNS.map(c => c.id); }
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>(() => { try { const s = localStorage.getItem('csc_closed_filters'); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ colId: string; direction: 'asc' | 'desc' } | null>(() => { try { const s = localStorage.getItem('csc_closed_sort'); return s ? JSON.parse(s) : null; } catch { return null; } });
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const onMouseDown = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    resizingCol.current = colId;
    startX.current = e.clientX;
    const th = (e.target as HTMLElement).closest('th');
    startWidth.current = th ? th.getBoundingClientRect().width : 150;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const newWidth = Math.max(50, startWidth.current + (e.clientX - startX.current));
    setColumnWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }));
  };

  const onMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setActiveFilterColumn(null); };
    document.addEventListener('mousedown', handler);
    
    // Save current path to sessionStorage
    try {
      sessionStorage.setItem('csc_last_jobs_page', '/dashboard/closed-jobs');
    } catch {}

    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { try { localStorage.setItem('csc_closed_filters', JSON.stringify(filters)); } catch {} }, [filters]);
  useEffect(() => { try { if (sortConfig) localStorage.setItem('csc_closed_sort', JSON.stringify(sortConfig)); else localStorage.removeItem('csc_closed_sort'); } catch {} }, [sortConfig]);
  useEffect(() => { try { localStorage.setItem('csc_closed_type_filter', typeFilter); } catch {} }, [typeFilter]);
  useEffect(() => { try { localStorage.setItem('csc_closed_status_filter', statusFilter); } catch {} }, [statusFilter]);

  useEffect(() => { fetchJobs(); }, [typeFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('jobs').select('*').in('erp_status', ['Billed', 'Canceled', 'Cancelled']).order('erp_job_id', { ascending: true, nullsFirst: false });
      if (typeFilter === 'HHG') query = query.ilike('goods_type', '%Household%');
      else if (typeFilter === 'COM') query = query.ilike('goods_type', '%Commercial%');
      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);
    } catch (err: any) {
      console.error('Error fetching closed jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (colId: string) => {
    const newCols = visibleColumns.includes(colId)
      ? visibleColumns.filter(id => id !== colId)
      : ALL_COLUMNS.map(c => c.id).filter(id => visibleColumns.includes(id) || id === colId);
    setVisibleColumns(newCols);
    localStorage.setItem('csc_closed_visible_cols', JSON.stringify(newCols));
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const cols = [...orderedColumns];
    const dragged = cols.splice(dragItem.current, 1)[0];
    cols.splice(dragOverItem.current, 0, dragged);
    setOrderedColumns(cols);
    localStorage.setItem('csc_closed_ordered_cols', JSON.stringify(cols));
    dragItem.current = null; dragOverItem.current = null;
  };

  const getFilteredJobsForColumn = (targetColId: string) =>
    jobs.filter(job => {
      for (const colId of Object.keys(filters)) {
        if (colId === targetColId) continue;
        if (filters[colId]?.length > 0 && !filters[colId].includes(job[colId])) return false;
      }
      return true;
    });

  const filteredJobs = jobs.filter(job => {
    if (statusFilter === 'billed' && !['billed'].includes(job.erp_status?.toLowerCase())) return false;
    if (statusFilter === 'cancelled' && !['cancelled', 'canceled'].includes(job.erp_status?.toLowerCase())) return false;
    for (const colId of Object.keys(filters)) {
      if (filters[colId]?.length > 0 && !filters[colId].includes(job[colId])) return false;
    }
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!sortConfig) return 0;
    let aVal = a[sortConfig.colId] ?? ''; let bVal = b[sortConfig.colId] ?? '';
    const nA = Number(aVal); const nB = Number(bVal);
    if (!isNaN(nA) && !isNaN(nB) && aVal !== '' && bVal !== '') return sortConfig.direction === 'asc' ? nA - nB : nB - nA;
    const sA = String(aVal).toLowerCase(); const sB = String(bVal).toLowerCase();
    return sortConfig.direction === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
  });

  const billedCount = jobs.filter(j => j.erp_status?.toLowerCase() === 'billed').length;
  const cancelledCount = jobs.filter(j => ['cancelled', 'canceled'].includes(j.erp_status?.toLowerCase())).length;

  return (
    <div>
      <div className={styles.header}>
        <h1 style={{ 
            margin: 0, 
            fontSize: '2.4rem', 
            fontWeight: 800, 
            background: 'linear-gradient(135deg, #4f46e5 0%, #d946ef 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            filter: 'drop-shadow(0 2px 4px rgba(79, 70, 229, 0.1))'
          }}>
          Closed Jobs
        </h1>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status radio: All / Billed / Cancelled */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '10px', padding: '0.45rem 1rem', backdropFilter: 'blur(10px)' }}>
            {([
              { value: 'billed', label: `Billed (${billedCount})`, color: '#059669' },
              { value: 'cancelled', label: `Cancelled (${cancelledCount})`, color: '#dc2626' },
              { value: 'all', label: `All (${jobs.length})`, color: '#6366f1' },
            ] as const).map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: statusFilter === opt.value ? opt.color : '#64748b', userSelect: 'none', transition: 'color 0.15s' }}>
                <input
                  type="radio"
                  name="statusFilter"
                  value={opt.value}
                  checked={statusFilter === opt.value}
                  onChange={() => setStatusFilter(opt.value)}
                  style={{ accentColor: opt.color, width: '14px', height: '14px', cursor: 'pointer' }}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Type slider */}
          {(() => {
            const opts = ['HHG', 'COM', 'ALL'] as const;
            const labels = { HHG: 'Household', COM: 'Commercial', ALL: 'All' };
            const idx = opts.indexOf(typeFilter as any);
            return (
              <div style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '10px', padding: '4px', backdropFilter: 'blur(10px)', gap: 0 }}>
                {/* Sliding pill background */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: `calc(4px + ${idx} * (100% - 8px) / 3)`,
                  width: 'calc((100% - 8px) / 3)',
                  height: 'calc(100% - 8px)',
                  borderRadius: '7px',
                  background: typeFilter === 'HHG' ? 'linear-gradient(135deg, #10b981, #059669)' : typeFilter === 'COM' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 0,
                }} />
                {opts.map(opt => (
                  <button key={opt} onClick={() => setTypeFilter(opt)} style={{
                    position: 'relative', zIndex: 1,
                    padding: '0.38rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '7px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    color: typeFilter === opt ? 'white' : '#64748b',
                    transition: 'color 0.2s ease',
                    whiteSpace: 'nowrap',
                    fontFamily: "'Outfit', sans-serif",
                    minWidth: '90px',
                  }}>
                    {labels[opt]}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Columns selector */}
          <div className={styles.columnSelectorContainer}>
            <button className={styles.columnsBtn} onClick={() => setShowColumnSelector(!showColumnSelector)} style={{ padding: '0.6rem 1rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
              Columns
            </button>
            {showColumnSelector && (
              <div className={styles.dropdownMenu}>
                {orderedColumns.map((colId, index) => {
                  const col = ALL_COLUMNS.find(c => c.id === colId);
                  if (!col) return null;
                  return (
                    <label key={col.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()} style={{ cursor: 'grab' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                      <input type="checkbox" checked={visibleColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} />
                      {col.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <button className={styles.refreshBtn} onClick={fetchJobs}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      <div className={`glass ${styles.tableContainer}`}>
        {loading ? (
          <div className={styles.loading}>Loading closed jobs...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Action</th>
                {orderedColumns.filter(id => visibleColumns.includes(id) && ALL_COLUMNS.some(c => c.id === id)).map(colId => {
                  const col = ALL_COLUMNS.find(c => c.id === colId)!;
                  return (
                    <th key={col.id} style={{ 
                      width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : 'auto', 
                      minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : '100px',
                      maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : 'none',
                      position: 'relative' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingRight: '8px' }}>
                        {col.label}
                        <div style={{ position: 'relative' }} ref={activeFilterColumn === col.id ? filterRef : null}>
                          <button className={styles.filterBtn} onClick={() => setActiveFilterColumn(activeFilterColumn === col.id ? null : col.id)}>
                            {filters[col.id]?.length ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#a16207" strokeWidth="3"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                            )}
                          </button>
                          {activeFilterColumn === col.id && (
                            <ColumnFilterDropdown
                              colId={col.id} jobs={getFilteredJobsForColumn(col.id)} currentFilters={filters[col.id] || []}
                              onApply={newF => setFilters(prev => ({ ...prev, [col.id]: newF }))}
                              onSort={dir => setSortConfig({ colId: col.id, direction: dir })}
                              currentSort={sortConfig?.colId === col.id ? sortConfig.direction : null}
                            />
                          )}
                        </div>
                      </div>
                      <div 
                        onMouseDown={(e) => onMouseDown(e, col.id)}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', background: 'transparent', zIndex: 10 }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedJobs.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className={styles.noData}>No closed jobs found.</td></tr>
              ) : (
                sortedJobs.map(job => (
                  <tr key={job.job_number} style={{ opacity: job.erp_status?.toLowerCase() === 'canceled' || job.erp_status?.toLowerCase() === 'cancelled' ? 0.75 : 1 }}>
                    <td>
                      <button 
                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)', color: '#4f46e5', border: 'none', borderRadius: '99px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)', whiteSpace: 'nowrap' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #d946ef 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.15)'; }}
                        onClick={() => router.push(`/dashboard/job/${encodeURIComponent(job.job_number)}`)}
                      >
                        View
                      </button>
                    </td>
                    {orderedColumns.filter(id => visibleColumns.includes(id) && ALL_COLUMNS.some(c => c.id === id)).map(colId => {
                      let value: any = job[colId];
                      const dateColumns = ['job_date', 'packing_date', 'dispatch_date', 'expected_to_reach_dest', 'reached_destination', 'planned_delivery', 'actual_delivery', 'car_pickup_date', 'car_delivery_date', 'follow_up_date', 'last_comm_date', 'invoice_date'];
                      const timeColumns = ['committed_time', 'reported_time'];
                      if (colId === 'car_included') value = value === true ? 'Yes' : value === false ? 'No' : '';
                      else if (dateColumns.includes(colId) && value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          value = `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
                        }
                      } else if (timeColumns.includes(colId) && value) {
                        if (typeof value === 'string' && value.match(/^\d{1,2}:\d{2}/)) {
                          const [h, m] = value.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'PM' : 'AM';
                          hours = hours % 12 || 12;
                          value = `${String(hours).padStart(2, '0')}:${m} ${ampm}`;
                        } else {
                          const date = new Date(value);
                          if (!isNaN(date.getTime())) value = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                        }
                      }
                      
                      const tdStyle = { maxWidth: columnWidths[colId] ? `${columnWidths[colId]}px` : '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as any, paddingRight: '1rem' };
                      if (colId === 'erp_status') {
                        const s = value?.toLowerCase();
                        return (
                          <td key={colId} style={tdStyle}>
                            <span style={{
                              padding: '0.2rem 0.65rem', borderRadius: '99px', fontWeight: 700, fontSize: '0.72rem',
                              background: s === 'billed' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                              color: s === 'billed' ? '#059669' : '#dc2626',
                              border: `1px solid ${s === 'billed' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                            }} title={String(value)}>
                              {value}
                            </span>
                          </td>
                        );
                      }
                      else value = value || '';
                      return <td key={colId} style={tdStyle}><span className={colId === 'job_number' ? styles.jobNum : undefined} style={colId === 'customer_name' ? { fontWeight: 'bold' } : undefined} title={String(value)}>{value}</span></td>;
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
