'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './jobs.module.css';

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
  { id: 'invoice_date', label: 'Invoice Date' }
];

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
  const allUniqueValues = Array.from(new Set(jobs.map(j => j[colId]).filter(v => v !== null && v !== undefined && v !== ''))).sort();
  
  const [searchQuery, setSearchQuery] = useState('');

  const displayedValues = allUniqueValues.filter(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()));

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
                <span>{val as string}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function JobsTable() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>(() => {
    try { return localStorage.getItem('csc_type_filter') || 'HHG'; } catch { return 'HHG'; }
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['erp_job_id', 'job_number', 'job_date', 'customer_name', 'company', 'goods_type', 'goods_track_status', 'spoc_name']);
  const [orderedColumns, setOrderedColumns] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('csc_column_filters');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

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
  const [sortConfig, setSortConfig] = useState<{ colId: string, direction: 'asc' | 'desc' } | null>(() => {
    try {
      const saved = localStorage.getItem('csc_sort_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'active';

  useEffect(() => {
    const saved = localStorage.getItem('csc_visible_columns');
    if (saved) {
      try { setVisibleColumns(JSON.parse(saved)); } catch (e) {}
    }
    const savedOrder = localStorage.getItem('csc_ordered_columns');
    if (savedOrder) {
      try { 
        const parsed = JSON.parse(savedOrder);
        const finalOrder = Array.from(new Set([...parsed, ...ALL_COLUMNS.map(c => c.id)]));
        setOrderedColumns(finalOrder as string[]); 
      } catch (e) {}
    }
    
    // Check if user is admin
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('role').eq('id', data.user.id).single().then(({ data: profileData }) => {
          if (profileData && profileData.role === 'Admin') {
            setIsAdmin(true);
          }
        });
      }
    });

    // Save current path to sessionStorage
    try {
      sessionStorage.setItem('csc_last_jobs_page', '/dashboard');
    } catch {}
  }, []);

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    let _orderedColumns = [...orderedColumns];
    const draggedItemContent = _orderedColumns.splice(dragItem.current, 1)[0];
    _orderedColumns.splice(dragOverItem.current, 0, draggedItemContent);
    
    setOrderedColumns(_orderedColumns);
    localStorage.setItem('csc_ordered_columns', JSON.stringify(_orderedColumns));
    
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
    localStorage.setItem('csc_visible_columns', JSON.stringify(newCols));
  };

  // Persist filters whenever they change
  useEffect(() => {
    try { localStorage.setItem('csc_column_filters', JSON.stringify(filters)); } catch {}
  }, [filters]);

  // Persist sortConfig whenever it changes
  useEffect(() => {
    try {
      if (sortConfig) localStorage.setItem('csc_sort_config', JSON.stringify(sortConfig));
      else localStorage.removeItem('csc_sort_config');
    } catch {}
  }, [sortConfig]);

  // Persist typeFilter whenever it changes
  useEffect(() => {
    try { localStorage.setItem('csc_type_filter', typeFilter); } catch {}
  }, [typeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [currentView, typeFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('erp_job_id', { ascending: false, nullsFirst: false });
        
      if (currentView === 'billed') {
        query = query.ilike('erp_status', 'Billed');
      } else if (currentView === 'cancelled') {
        query = query.ilike('erp_status', 'Canceled');
      } else if (currentView === 'active') {
        query = query.not('erp_status', 'in', '("Billed","Canceled")');
      }

      if (typeFilter === 'HHG') {
        query = query.ilike('goods_type', '%Household%');
      } else if (typeFilter === 'COM') {
        query = query.ilike('goods_type', '%Commercial%');
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredJobsForColumn = (targetColId: string) => {
    return jobs.filter(job => {
      for (const colId of Object.keys(filters)) {
        if (colId === targetColId) continue;
        if (filters[colId].length > 0) {
          if (!filters[colId].includes(job[colId])) {
            return false;
          }
        }
      }
      return true;
    });
  };

  const filteredJobs = jobs.filter(job => {
    for (const colId of Object.keys(filters)) {
      if (filters[colId].length > 0) {
        if (!filters[colId].includes(job[colId])) {
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
    
    // Convert to numbers if possible for correct numeric sorting (like for ID)
    const numA = Number(aVal);
    const numB = Number(bVal);
    if (!isNaN(numA) && !isNaN(numB) && aVal !== '' && bVal !== '') {
      if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    
    // Otherwise fallback to string compare
    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();
    if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadgeClass = (status: string) => {
    if (status?.toLowerCase() === 'billed') return 'badge billed';
    if (status?.toLowerCase() === 'cancelled' || status?.toLowerCase() === 'canceled') return 'badge cancelled';
    return 'badge active';
  };

  const clearAllFilters = () => {
    setFilters({});
    localStorage.removeItem('csc_column_filters');
  };

  const getTitle = () => {
    if (currentView === 'billed') return 'Billed Jobs Dashboard';
    if (currentView === 'cancelled') return 'Cancelled Jobs Dashboard';
    return 'Active Jobs Dashboard';
  };
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
          {getTitle()}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            title="Clear all filters"
            onClick={clearAllFilters}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '50%',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              <line x1="4" y1="4" x2="20" y2="20"></line>
            </svg>
          </button>
          <div className={styles.toggleContainer}>
            <button 
              className={`${styles.toggleBtn} ${typeFilter === 'HHG' ? styles.activeHHG : ''}`}
              onClick={() => setTypeFilter('HHG')}
            >
              Household
            </button>
            <button 
              className={`${styles.toggleBtn} ${typeFilter === 'COM' ? styles.activeCOM : ''}`}
              onClick={() => setTypeFilter('COM')}
            >
              Commercial
            </button>
            <button 
              className={`${styles.toggleBtn} ${typeFilter === 'ALL' ? styles.activeALL : ''}`}
              onClick={() => setTypeFilter('ALL')}
            >
              All
            </button>
          </div>
          <div className={styles.columnSelectorContainer}>
            <button className={styles.columnsBtn} onClick={() => setShowColumnSelector(!showColumnSelector)} style={{ padding: '0.6rem 1rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              Columns
            </button>
            {showColumnSelector && (
              <div className={styles.dropdownMenu}>
                {orderedColumns.map((colId, index) => {
                  const col = ALL_COLUMNS.find(c => c.id === colId);
                  if (!col) return null;
                  return (
                    <label 
                      key={col.id}
                      draggable
                      onDragStart={() => (dragItem.current = index)}
                      onDragEnter={() => (dragOverItem.current = index)}
                      onDragEnd={handleSort}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: 'grab' }}
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
          <button className={styles.refreshBtn} onClick={fetchJobs}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Refresh
          </button>
        </div>
      </div>

      <div className={`glass ${styles.tableContainer}`}>
        {loading ? (
          <div className={styles.loading}>Loading jobs...</div>
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
              {sortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className={styles.noData}>No jobs found matching criteria.</td>
                </tr>
              ) : (
                sortedJobs.map((job) => (
                  <tr key={job.job_number}>
                    <td>
                      <button 
                        style={{ 
                          padding: '0.5rem 1.25rem', 
                          fontSize: '0.85rem',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
                          color: '#4f46e5',
                          border: 'none',
                          borderRadius: '99px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
                          whiteSpace: 'nowrap'
                        }}
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
                            title={String(value)} // Show full value on hover
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
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <JobsTable />
    </Suspense>
  );
}
