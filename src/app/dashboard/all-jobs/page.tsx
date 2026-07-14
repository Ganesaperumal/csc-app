'use client';
import { showToast } from '@/components/GlobalDialogs';

import { useEffect, useState, Suspense, useRef } from 'react';
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
  { id: 'erp_status', label: 'ERP Status' },
  { id: 'origin', label: 'Origin' },
  { id: 'destination', label: 'Destination' },
  { id: 'customer_phone', label: 'Customer Phone' },
  { id: 'spoc_name', label: 'SPOC' },
  { id: 'goods_track_status', label: 'Goods Track Status' },
  { id: 'car_track_status', label: 'Car Track Status' },
  { id: 'deviation_reason', label: 'Deviation Reason' },
  { id: 'remarks', label: 'Remarks' },
  { id: 'jtr_percentage', label: 'JTR %' },
  { id: 'packing_team_supervisor', label: 'Packing Supervisor' },
  { id: 'handyman_origin', label: 'Handyman Origin' },
  { id: 'handyman_destination', label: 'Handyman Dest.' },
  { id: 'operation_by', label: 'Operation By' },
  { id: 'truck_type', label: 'Truck Type' },
  { id: 'follow_up_date', label: 'Follow Up Date' },
  { id: 'packing_date', label: 'Packing Date' },
  { id: 'committed_time', label: 'Committed Time' },
  { id: 'reported_time', label: 'Reported Time' },
  { id: 'dispatch_date', label: 'Dispatch Date' },
  { id: 'transit_days', label: 'Transit Days' },
  { id: 'expected_to_reach_dest', label: 'Expected Reach' },
  { id: 'reached_destination', label: 'Reached Dest.' },
  { id: 'planned_delivery', label: 'Planned Delivery' },
  { id: 'actual_delivery', label: 'Actual Delivery' },
  { id: 'car_included', label: 'Car Included' },
  { id: 'car_pickup_date', label: 'Car Pickup Date' },
  { id: 'car_delivery_date', label: 'Car Delivery Date' },
  { id: 'google_review_taken', label: 'Google Review' },
  { id: 'origin_floor', label: 'Origin Floor' },
  { id: 'origin_service_lift', label: 'Origin Service Lift' },
  { id: 'origin_parking', label: 'Origin Parking' },
  { id: 'origin_instructions', label: 'Origin Instructions' },
  { id: 'dest_supervisor', label: 'Dest Supervisor' },
  { id: 'dest_floor', label: 'Dest Floor' },
  { id: 'dest_service_lift', label: 'Dest Service Lift' },
  { id: 'dest_parking', label: 'Dest Parking' },
  { id: 'dest_instructions', label: 'Dest Instructions' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'deviation', label: 'Deviation' },
  { id: 'heavy_items', label: 'Heavy Items' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'pre_alert_status', label: 'Pre Alert Status' },
  { id: 'last_comm_by', label: 'Last Comm By' },
  { id: 'last_comm_date', label: 'Last Comm Date' },
  { id: 'invoice_number', label: 'Invoice Number' },
  { id: 'invoice_date', label: 'Invoice Date' },
  { id: 'csc_coordinator', label: 'CSC Coordinator' }
];

const DEFAULT_VISIBLE_COLUMNS = ['erp_job_id', 'job_number', 'job_date', 'customer_name', 'company', 'goods_type', 'erp_status', 'goods_track_status', 'spoc_name'];

function ColumnFilterDropdown({ 
  colId, 
  jobs, 
  currentFilters, 
  onApply,
  onSort,
  currentSort
}: { 
  colId: string, 
  jobs: any[], 
  currentFilters: string[], 
  onApply: (filters: string[]) => void,
  onSort: (direction: 'asc' | 'desc') => void,
  currentSort: 'asc' | 'desc' | null
}) {
  const dateColumns = ['job_date', 'packing_date', 'dispatch_date', 'expected_to_reach_dest', 'reached_destination', 'planned_delivery', 'actual_delivery', 'car_pickup_date', 'car_delivery_date', 'follow_up_date', 'last_comm_date', 'invoice_date'];

  const getDisplayValue = (val: any) => {
    if (dateColumns.includes(colId) && val) {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dd = String(date.getDate()).padStart(2, '0');
        const mmm = months[date.getMonth()];
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}-${mmm}-${yy}`;
      }
    }
    return String(val);
  };

  const hasBlanks = jobs.some(j => j[colId] === null || j[colId] === undefined || j[colId] === '');
  const allUniqueValues = Array.from(new Set(jobs.map(j => j[colId]).filter(v => v !== null && v !== undefined && v !== ''))).sort();
  if (hasBlanks) {
    allUniqueValues.unshift('(Blank)');
  }
  
  const [searchQuery, setSearchQuery] = useState('');

  const displayedValues = allUniqueValues.filter(val => getDisplayValue(val).toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelectAll = () => onApply(allUniqueValues as string[]);
  const handleClear = () => onApply([]);
  
  const toggleValue = (val: string) => {
    if (currentFilters.includes(val)) {
      onApply(currentFilters.filter(v => v !== val));
    } else {
      onApply([...currentFilters, val]);
    }
  };

  return (
    <div className={styles.gsFilterDropdown}>
      <div className={styles.gsFilterHeader} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button onClick={() => onSort('asc')} style={{ flex: 1, padding: '0.3rem', background: currentSort === 'asc' ? 'rgba(244, 114, 182, 0.2)' : 'transparent', color: currentSort === 'asc' ? '#f472b6' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg> Sort A-Z
          </button>
          <button onClick={() => onSort('desc')} style={{ flex: 1, padding: '0.3rem', background: currentSort === 'desc' ? 'rgba(244, 114, 182, 0.2)' : 'transparent', color: currentSort === 'desc' ? '#f472b6' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg> Sort Z-A
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#f472b6' }}>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={handleSelectAll}>Select all</span>
          <span>-</span>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={handleClear}>Clear</span>
        </div>
      </div>
      
      <div className={styles.gsSearchBox}>
        <input 
          type="text" 
          placeholder="Search..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </div>
      
      <div className={styles.gsFilterList}>
        {displayedValues.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No matches</div>
        ) : (
          displayedValues.map(val => {
            const isChecked = currentFilters.includes(val as string);
            return (
              <div key={val as string} className={styles.gsFilterItem} onClick={() => toggleValue(val as string)}>
                <div className={styles.gsCheckbox}>
                  {isChecked && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
                <span>{getDisplayValue(val)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AllJobsContent() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [orderedColumns, setOrderedColumns] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('csc_all_column_filters');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ colId: string, direction: 'asc' | 'desc' } | null>(() => {
    try {
      const saved = localStorage.getItem('csc_all_sort_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [visibleCount, setVisibleCount] = useState(50);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const loaderRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const [isExportingSheets, setIsExportingSheets] = useState(false);

  const exportToSheets = async () => {
    setIsExportingSheets(true);
    try {
      const res = await fetch('/api/export-sheets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export');
      showToast(`Successfully exported ${data.count} jobs to Google Sheets!`, 'success');
    } catch (err: any) {
      showToast('Error exporting to Google Sheets: ' + err.message, 'error');
    } finally {
      setIsExportingSheets(false);
    }
  };
  
  const filterRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('csc_all_visible_cols');
    if (saved) {
      try { setVisibleColumns(JSON.parse(saved)); } catch (e) {}
    }
    const savedOrder = localStorage.getItem('csc_all_ordered_cols');
    if (savedOrder) {
      try { 
        const parsed = JSON.parse(savedOrder);
        const finalOrder = Array.from(new Set([...parsed, ...ALL_COLUMNS.map(c => c.id)]));
        setOrderedColumns(finalOrder as string[]); 
      } catch (e) {}
    }
    fetchJobs();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('all-jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchJobs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('erp_job_id', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setJobs(data || []);
    } catch (err: any) {
      console.error('Error fetching jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let _orderedColumns = [...orderedColumns];
    const draggedItemContent = _orderedColumns.splice(dragItem.current, 1)[0];
    _orderedColumns.splice(dragOverItem.current, 0, draggedItemContent);
    setOrderedColumns(_orderedColumns);
    localStorage.setItem('csc_all_ordered_cols', JSON.stringify(_orderedColumns));
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleColumn = (colId: string) => {
    let newCols;
    if (visibleColumns.includes(colId)) {
      newCols = visibleColumns.filter(id => id !== colId);
    } else {
      newCols = ALL_COLUMNS.map(c => c.id).filter(id => visibleColumns.includes(id) || id === colId);
    }
    setVisibleColumns(newCols);
    localStorage.setItem('csc_all_visible_cols', JSON.stringify(newCols));
  };

  useEffect(() => {
    try { localStorage.setItem('csc_all_column_filters', JSON.stringify(filters)); } catch {}
  }, [filters]);

  useEffect(() => {
    try {
      if (sortConfig) localStorage.setItem('csc_all_sort_config', JSON.stringify(sortConfig));
      else localStorage.removeItem('csc_all_sort_config');
    } catch {}
  }, [sortConfig]);

  useEffect(() => {
    setVisibleCount(50);
  }, [filters, searchQuery, sortConfig]);

  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting) {
        setVisibleCount(prev => prev + 50);
      }
    }, {
      root: document.querySelector('.main-content'),
      rootMargin: '200px',
      threshold: 0.1
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loading, visibleCount]);

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    localStorage.removeItem('csc_all_column_filters');
  };

  const getFilteredJobsForColumn = (targetColId: string) => {
    return filteredJobs.filter(job => {
      for (const colId of Object.keys(filters)) {
        if (colId === targetColId) continue;
        if (filters[colId].length > 0) {
          const val = job[colId] === null || job[colId] === undefined || job[colId] === '' ? '(Blank)' : job[colId];
          if (!filters[colId].includes(val)) {
            return false;
          }
        }
      }
      return true;
    });
  };

  const filteredJobs = jobs.filter(job => {
    // 1. Global Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        String(job.customer_name || '').toLowerCase().includes(q) ||
        String(job.job_number || '').toLowerCase().includes(q) ||
        String(job.erp_job_id || '').toLowerCase().includes(q) ||
        String(job.company || '').toLowerCase().includes(q) ||
        String(job.goods_type || '').toLowerCase().includes(q) ||
        String(job.goods_track_status || '').toLowerCase().includes(q) ||
        String(job.spoc_name || '').toLowerCase().includes(q) ||
        String(job.branch || '').toLowerCase().includes(q) ||
        String(job.erp_status || '').toLowerCase().includes(q);
      
      if (!matchesSearch) return false;
    }

    // 2. Column Filters
    for (const colId of Object.keys(filters)) {
      if (filters[colId].length > 0) {
        const val = job[colId] === null || job[colId] === undefined || job[colId] === '' ? '(Blank)' : job[colId];
        if (!filters[colId].includes(val)) {
          return false;
        }
      }
    }
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!sortConfig) return 0;
    let aVal = a[sortConfig.colId];
    let bVal = b[sortConfig.colId];
    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';
    
    const numA = Number(aVal);
    const numB = Number(bVal);
    if (!isNaN(numA) && !isNaN(numB) && aVal !== '' && bVal !== '') {
      if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    
    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();
    if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const hasAppliedFilters = Object.values(filters).some(arr => arr && arr.length > 0) || searchQuery.trim() !== '';

  const currentItems = sortedJobs.slice(0, visibleCount);

  return (
    <div className="page-enter" style={{ width: '100%', padding: '1rem 0' }}>
      <div style={{ position: 'sticky', left: 0, width: 'calc(100vw - 5.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '99px',
              border: '1px solid var(--border-color)',
              background: 'var(--glass-bg)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: 'var(--glass-shadow)',
              transition: 'all 0.3s ease',
              fontFamily: "'Outfit', sans-serif"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--surface-hover)';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <h1 style={{ 
              margin: 0, 
              fontSize: '2.4rem', 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.1))'
            }}>
            All Jobs Portal
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div className={styles.gsSearchBox} style={{ width: '320px', margin: 0, height: '42px', display: 'flex', alignItems: 'center', background: 'var(--glass-bg)', borderRadius: '99px', border: '1px solid var(--border-color)', padding: '0 1.2rem' }}>
            <input 
              type="text" 
              placeholder="Search customer, job#, branch, SPOC, status..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.85rem' }}
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>

          <button 
            title="Clear all filters"
            onClick={clearAllFilters}
            style={{
              background: hasAppliedFilters ? '#ffe5e5' : 'none',
              border: 'none',
              cursor: 'pointer',
              color: hasAppliedFilters ? '#ff3b30' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '50%',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = '#ffe5e5'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = hasAppliedFilters ? '#ff3b30' : 'var(--text-secondary)'; e.currentTarget.style.background = hasAppliedFilters ? '#ffe5e5' : 'none'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill={hasAppliedFilters ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
          <button
            onClick={exportToSheets}
            disabled={isExportingSheets}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '99px',
              border: '1px solid #10b981',
              background: isExportingSheets ? '#d1fae5' : '#10b981',
              color: isExportingSheets ? '#047857' : 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isExportingSheets ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
            }}
          >
            {isExportingSheets ? (
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            )}
            {isExportingSheets ? 'Exporting...' : 'Export to Sheets'}
          </button>

          <div className={styles.columnSelectorContainer}>
            <button className={styles.columnsBtn} onClick={() => setShowColumnSelector(!showColumnSelector)} style={{ padding: '0.6rem 1.2rem', borderRadius: '99px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              Columns
            </button>
            {showColumnSelector && (
              <div className={styles.dropdownMenu} style={{ top: '120%' }}>
                {orderedColumns.map((colId, index) => {
                  const col = ALL_COLUMNS.find(c => c.id === colId);
                  if (!col) return null;
                  return (
                    <label 
                      key={col.id}
                      draggable
                      onDragStart={() => (dragItem.current = index)}
                      onDragEnter={() => (dragOverItem.current = index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.includes(col.id)} 
                        onChange={() => toggleColumn(col.id)} 
                      />
                      {col.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={tableContainerRef} className={`glass ${styles.tableContainer}`} style={{ minWidth: '100%', width: 'max-content', overflowX: 'visible', overflowY: 'visible' }}>
        {loading ? (
          <div style={{ padding: '1rem' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" style={{ opacity: 1 - i * 0.08 }} />
            ))}
          </div>
        ) : (
          <table className={styles.table} style={{ '--header-top': '-2rem' } as React.CSSProperties}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 30 }}>Action</th>
                {orderedColumns.filter(id => visibleColumns.includes(id) && ALL_COLUMNS.some(c => c.id === id)).map(colId => {
                  const col = ALL_COLUMNS.find(c => c.id === colId)!;
                  return (
                    <th key={col.id} style={{ 
                      width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : 'auto', 
                      minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : '100px',
                      maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingRight: '8px' }}>
                        {col.label}
                        <div style={{ position: 'relative' }} ref={activeFilterColumn === col.id ? filterRef : null}>
                          <button 
                            className={styles.filterBtn} 
                            onClick={() => setActiveFilterColumn(activeFilterColumn === col.id ? null : col.id)}
                          >
                            {filters[col.id]?.length ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#a16207" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            )}
                          </button>
                          {activeFilterColumn === col.id && (
                            <ColumnFilterDropdown 
                              colId={col.id}
                              jobs={getFilteredJobsForColumn(col.id)}
                              currentFilters={filters[col.id] || []}
                              onApply={(newFilters) => setFilters(prev => ({...prev, [col.id]: newFilters}))}
                              onSort={(direction) => setSortConfig({ colId: col.id, direction })}
                              currentSort={sortConfig?.colId === col.id ? sortConfig.direction : null}
                            />
                          )}
                        </div>
                      </div>
                      <div 
                        onMouseDown={(e) => onMouseDown(e, col.id)}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: '8px',
                          cursor: 'col-resize',
                          background: 'transparent',
                          zIndex: 10
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1}>
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
                      <h3>No jobs found</h3>
                      <p>No jobs match your current filters. Try adjusting or clearing your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((job) => (
                  <tr key={job.job_number}>
                    <td>
                      <button 
                        style={{ 
                          padding: '0.5rem 1.25rem', 
                          fontSize: '0.85rem',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', color: '#ffffff',
                          border: 'none',
                          borderRadius: '99px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #a78bfa 0%, #e879f9 100%)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.15)'; }}
                        onClick={() => router.push(`/dashboard/job/${encodeURIComponent(job.job_number)}`)}
                      >
                        View
                      </button>
                    </td>
                    {orderedColumns.filter(id => visibleColumns.includes(id) && ALL_COLUMNS.some(c => c.id === id)).map(colId => {
                      let value: any = job[colId];
                      
                      const dateColumns = ['job_date', 'packing_date', 'dispatch_date', 'expected_to_reach_dest', 'reached_destination', 'planned_delivery', 'actual_delivery', 'car_pickup_date', 'car_delivery_date', 'follow_up_date', 'last_comm_date', 'invoice_date'];
                      const timeColumns = ['committed_time', 'reported_time'];
                      
                      if (colId === 'car_included') {
                        value = value === true ? 'Yes' : (value === false ? 'No' : '');
                      } else if (dateColumns.includes(colId) && value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const dd = String(date.getDate()).padStart(2, '0');
                          const mmm = months[date.getMonth()];
                          const yy = String(date.getFullYear()).slice(-2);
                          value = `${dd}-${mmm}-${yy}`;
                        }
                      } else if (timeColumns.includes(colId) && value) {
                        if (typeof value === 'string' && value.match(/^\d{1,2}:\d{2}/)) {
                          const [h, m] = value.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'PM' : 'AM';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          value = `${String(hours).padStart(2, '0')}:${m} ${ampm}`;
                        } else {
                          const date = new Date(value);
                          if (!isNaN(date.getTime())) {
                            value = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          }
                        }
                      } else if (colId === 'goods_track_status') {
                        value = value || 'Pending';
                      } else if (colId === 'spoc_name') {
                        value = value || '-';
                      } else {
                        value = value || '';
                      }

                      return (
                        <td key={colId} style={{ 
                          maxWidth: columnWidths[colId] ? `${columnWidths[colId]}px` : '350px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          paddingRight: '1rem'
                        }}>
                          <span 
                            className={colId === 'job_number' ? styles.jobNum : undefined}
                            style={colId === 'customer_name' ? { fontWeight: 'bold' } : undefined}
                            title={String(value)}
                          >
                            {value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Infinite Scroll Trigger */}
      {!loading && visibleCount < sortedJobs.length && (
        <div ref={loaderRef} style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ⏳ Loading more jobs...
          </span>
        </div>
      )}

      {/* Footer Info bar */}
      {!loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '1rem', 
          padding: '0.75rem 1.5rem', 
          background: 'var(--surface-color)', 
          borderRadius: '12px', 
          border: '1px solid var(--border-color)',
          backdropFilter: 'var(--glass-blur)'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {Math.min(visibleCount, sortedJobs.length)} of {sortedJobs.length} jobs
          </span>
        </div>
      )}
    </div>
  );
}

export default function AllJobsPage() {
  return (
    <Suspense fallback={<div>Loading All Jobs Portal...</div>}>
      <AllJobsContent />
    </Suspense>
  );
}
