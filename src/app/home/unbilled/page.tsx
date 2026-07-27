'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CustomSelect from '../components/CustomSelect';
import * as XLSX from 'xlsx';
import styles from './unbilled.module.css';

// Master Goods Track Options for Branch Users
const BRANCH_GOODS_STATUS_OPTIONS = [
  "00. Execution Pending",
  "22. Job Completed",
  "21. Storage",
  "17. Damages",
  "25. Job # to be Cancelled",
  "26. Free Job",
  "27. Billing Pending",
  "28. Month End Billing"
];

const PO_STATUS_OPTIONS = [
  "PO Pending",
  "PI Pending",
  "PO Received",
  "PI Received",
  "Mail Approval",
  "Not Required"
];

const SALES_BY_OPTIONS = [
  "TI",
  "HYBRID",
  "PIKKOL"
];

const getDisplayGoodsStatus = (status: string | null) => {
  if (!status) return status;
  if (BRANCH_GOODS_STATUS_OPTIONS.includes(status) && status !== "00. Execution Pending") return status;
  const match = status.match(/^(\d{2})\./);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 21) {
      return '00. Execution Pending';
    }
  }
  return status;
};

const ALL_UNBILLED_COLUMNS = [
  { id: 'remarks', label: 'Remarks' },
  { id: 'branch', label: 'BRN' },
  { id: 'job_date', label: 'Date' },
  { id: 'job_number', label: 'Job Number' },
  { id: 'enquiry_number', label: 'Enquiry #' },
  { id: 'customer_company', label: 'Client & Company' },
  { id: 'quote_value', label: '₹' },
  { id: 'packing_date', label: 'Packing' },
  { id: 'actual_delivery', label: 'Delivery' },
  { id: 'goods_track_status', label: 'Goods Status' },
  { id: 'bill_closure_date', label: 'Bill Closure Dt' },
  { id: 'po_status', label: 'PO Status' },
  { id: 'po_date', label: 'PO Rcvd Dt' },
  { id: 'inv_request_date', label: 'Inv Request Dt' },
  { id: 'sales_by', label: 'Sales By' }
];

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

function ColumnFilterDropdown({
  colId,
  jobs,
  enquiryValues,
  currentFilters,
  onApply,
  onSort,
  currentSort
}: {
  colId: string,
  jobs: any[],
  enquiryValues: Record<string, number>,
  currentFilters: string[],
  onApply: (filters: string[]) => void,
  onSort: (direction: 'asc' | 'desc') => void,
  currentSort: 'asc' | 'desc' | null
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const getDisplayValue = (job: any) => {
    const enqKey = job.enq_number || job.enquiry_number || '';
    switch (colId) {
      case 'branch': return job.branch || '—';
      case 'job_date': return formatDate(job.job_date);
      case 'job_number': return job.job_number || '—';
      case 'enquiry_number': return enqKey || '—';
      case 'customer_company': return `${job.customer_name || ''} ${job.company || ''}`.trim() || '—';
      case 'quote_value': return String(enquiryValues[enqKey] || job.quote_value || 0);
      case 'packing_date': return formatDate(job.packing_date);
      case 'actual_delivery': return formatDate(job.actual_delivery);
      case 'goods_track_status': return getDisplayGoodsStatus(job.goods_track_status) || '—';
      case 'bill_closure_date': return formatDate(job.bill_closure_date);
      case 'po_status': return job.po_status || '—';
      case 'po_date': return formatDate(job.po_date);
      case 'inv_request_date': return formatDate(job.inv_request_date);
      case 'sales_by': return job.sales_by || '—';
      default: return '—';
    }
  };

  const getRawValue = (job: any) => {
    const enqKey = job.enq_number || job.enquiry_number || '';
    switch (colId) {
      case 'branch': return job.branch || '';
      case 'job_date': return job.job_date || '';
      case 'job_number': return job.job_number || '';
      case 'enquiry_number': return enqKey;
      case 'customer_company': return `${job.customer_name || ''} ${job.company || ''}`.trim();
      case 'quote_value': return String(enquiryValues[enqKey] || job.quote_value || 0);
      case 'packing_date': return job.packing_date || '';
      case 'actual_delivery': return job.actual_delivery || '';
      case 'goods_track_status': return getDisplayGoodsStatus(job.goods_track_status) || '';
      case 'bill_closure_date': return job.bill_closure_date || '';
      case 'po_status': return job.po_status || '';
      case 'po_date': return job.po_date || '';
      case 'inv_request_date': return job.inv_request_date || '';
      case 'sales_by': return job.sales_by || '';
      default: return '';
    }
  };

  const allUniqueValues = Array.from(new Set(jobs.map(getRawValue))).filter(Boolean);
  const displayedValues = allUniqueValues.filter(val => val.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelectAll = () => onApply(Array.from(new Set([...currentFilters, ...displayedValues])));
  const handleClear = () => onApply([]);

  const toggleValue = (val: string) => {
    if (currentFilters.includes(val)) {
      onApply(currentFilters.filter(v => v !== val));
    } else {
      onApply([...currentFilters, val]);
    }
  };

  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.4rem', width: '220px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 1000, padding: '0.75rem', fontFamily: "'Outfit', sans-serif" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button onClick={() => onSort('asc')} style={{ flex: 1, padding: '0.3rem', background: currentSort === 'asc' ? 'rgba(79, 70, 229, 0.2)' : 'transparent', color: currentSort === 'asc' ? '#4f46e5' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
          Sort A-Z
        </button>
        <button onClick={() => onSort('desc')} style={{ flex: 1, padding: '0.3rem', background: currentSort === 'desc' ? 'rgba(79, 70, 229, 0.2)' : 'transparent', color: currentSort === 'desc' ? '#4f46e5' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
          Sort Z-A
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#4f46e5', marginBottom: '0.5rem' }}>
        <span style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }} onClick={handleSelectAll}>Select all</span>
        <span>-</span>
        <span style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }} onClick={handleClear}>Clear</span>
      </div>

      <input
        type="text"
        placeholder="Search values..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.78rem', marginBottom: '0.5rem' }}
      />

      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {displayedValues.length === 0 ? (
          <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No matches</div>
        ) : (
          displayedValues.map(val => {
            const isChecked = currentFilters.includes(val);
            return (
              <div key={val} onClick={() => toggleValue(val)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-primary)', padding: '0.2rem 0.3rem', borderRadius: '4px' }}>
                <input type="checkbox" checked={isChecked} readOnly style={{ accentColor: '#4f46e5', width: '14px', height: '14px' }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function UnbilledManagementPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [enquiryValues, setEnquiryValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedGoodsStatus, setSelectedGoodsStatus] = useState<string>('All');
  const [selectedPoStatus, setSelectedPoStatus] = useState<string>('All');
  const [selectedSalesBy, setSelectedSalesBy] = useState<string>('All');

  // ColumnFunnel filters
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [columnSorts, setColumnSorts] = useState<Record<string, 'asc' | 'desc' | null>>({});

  // Follow-up Drawer & Reminder Modal States
  const [activeDrawerJob, setActiveDrawerJob] = useState<any | null>(null);
  const [followupHistory, setFollowupHistory] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);

  // Reminders Popup Modal State
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [showRemindersPopup, setShowRemindersPopup] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDrawerJob) {
        setActiveDrawerJob(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawerJob]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setCurrentUser(session.user);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
    }

    // 1. Fetch Enquiry Values mapping from public.enquiry_values
    const { data: enqData } = await supabase
      .from('enquiry_values')
      .select('enquiry_number, quote_value');

    const enqMap: Record<string, number> = {};
    if (enqData) {
      enqData.forEach(item => {
        if (item.enquiry_number) {
          enqMap[item.enquiry_number] = Number(item.quote_value) || 0;
        }
      });
    }
    setEnquiryValues(enqMap);

    // 2. Fetch Unbilled Jobs strictly from public.jobs (where erp_status = 'New Order')
    let jobsQuery = supabase
      .from('jobs')
      .select('*')
      .eq('erp_status', 'New Order');

    // Enforce Branch Isolation for specific roles
    const restrictedRoles = ['Viewer', 'Executive', 'Manager'];
    const requiresSlicing = profile && (
      restrictedRoles.includes(profile.role) || 
      restrictedRoles.includes(profile.branch_user_role) || 
      restrictedRoles.includes(profile.unbilled_role)
    );

    if (requiresSlicing) {
      if (profile.branches && profile.branches.includes('ALL')) {
        // Has 'ALL' branches permission, no filtering needed
      } else if (profile.branches && profile.branches.length > 0) {
        jobsQuery = jobsQuery.in('branch', profile.branches);
      } else {
        jobsQuery = jobsQuery.eq('branch', 'NONE');
      }
    }

    const { data: jobsData, error } = await jobsQuery;
    if (error) {
      console.error('Error fetching unbilled jobs:', error);
    }

    const erpJobsList = (jobsData || []).map(j => ({ ...j, source_table: 'jobs' }));
    setJobs(erpJobsList);

    // Fetch upcoming reminders across unbilled jobs
    fetchUpcomingReminders();

    setLoading(false);
  };

  const fetchUpcomingReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('unbilled_followups')
        .select('*')
        .not('next_followup_date', 'is', null)
        .order('next_followup_date', { ascending: true });

      if (!error && data) {
        setUpcomingReminders(data);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  };

  const handleUpdateJobField = async (job: any, field: string, value: any) => {
    try {
      const table = job.source_table || 'jobs';
      const { error } = await supabase
        .from(table)
        .update({ [field]: value })
        .eq('job_number', job.job_number);

      if (error) throw error;

      setJobs(prev => prev.map(j => j.job_number === job.job_number ? { ...j, [field]: value } : j));
      showToast(`Updated ${field.replace(/_/g, ' ')}`, 'success');
    } catch (err: any) {
      showToast(`Failed to update: ${err.message}`, 'error');
    }
  };

  const handleOpenFollowupDrawer = async (job: any) => {
    setActiveDrawerJob(job);
    setNewNote('');
    setNextFollowupDate('');

    const { data: history } = await supabase
      .from('unbilled_followups')
      .select('*')
      .eq('job_number', job.job_number)
      .order('created_at', { ascending: false });

    setFollowupHistory(history || []);
  };

  const handleSubmitFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeDrawerJob) return;

    setDrawerSubmitting(true);
    try {
      const userName = userProfile?.name || userProfile?.username || currentUser?.email?.split('@')[0] || 'Executive';

      const { error } = await supabase.from('unbilled_followups').insert([
        {
          job_id: activeDrawerJob.id,
          job_number: activeDrawerJob.job_number,
          updated_by: currentUser.id,
          agent_name: userName,
          followup_notes: newNote,
          next_followup_date: nextFollowupDate || null
        }
      ]);

      if (error) throw error;

      showToast('Daily follow-up note logged successfully!', 'success');
      setNewNote('');
      setNextFollowupDate('');

      handleOpenFollowupDrawer(activeDrawerJob);
      fetchUpcomingReminders();
    } catch (err: any) {
      showToast(`Error saving follow-up note: ${err.message}`, 'error');
    } finally {
      setDrawerSubmitting(false);
    }
  };

  const handleColumnFilterApply = (colId: string, selected: string[]) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (selected.length === 0) {
        delete next[colId];
      } else {
        next[colId] = selected;
      }
      return next;
    });
  };

  const handleColumnSort = (colId: string, direction: 'asc' | 'desc') => {
    setColumnSorts(prev => ({
      ...prev,
      [colId]: prev[colId] === direction ? null : direction
    }));
  };

  // Filtered jobs logic
  let filteredJobs = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      (j.job_number && j.job_number.toLowerCase().includes(q)) ||
      (j.enquiry_number && j.enquiry_number.toLowerCase().includes(q)) ||
      (j.customer_name && j.customer_name.toLowerCase().includes(q)) ||
      (j.company && j.company.toLowerCase().includes(q))
    );

    const matchBranch = selectedBranch === 'All' || j.branch === selectedBranch;
    const matchGoods = selectedGoodsStatus === 'All' || 
                       (selectedGoodsStatus === 'No Status' ? (!j.goods_track_status || j.goods_track_status.trim() === '') : getDisplayGoodsStatus(j.goods_track_status) === selectedGoodsStatus);
    const matchPo = selectedPoStatus === 'All' || j.po_status === selectedPoStatus;
    const matchSales = selectedSalesBy === 'All' || j.sales_by === selectedSalesBy;

    // Check Column Funnel Filters
    for (const [colId, allowedVals] of Object.entries(columnFilters)) {
      if (allowedVals && allowedVals.length > 0) {
        let val = '';
        if (colId === 'branch') val = j.branch || '';
        else if (colId === 'job_date') val = j.job_date || '';
        else if (colId === 'job_number') val = j.job_number || '';
        else if (colId === 'enquiry_number') val = j.enq_number || j.enquiry_number || '';
        else if (colId === 'customer_company') val = `${j.customer_name || ''} ${j.company || ''}`.trim();
        else if (colId === 'quote_value') val = String(enquiryValues[j.enq_number || j.enquiry_number || ''] || j.quote_value || 0);
        else if (colId === 'packing_date') val = j.packing_date || '';
        else if (colId === 'actual_delivery') val = j.actual_delivery || '';
        else if (colId === 'goods_track_status') val = getDisplayGoodsStatus(j.goods_track_status) || '';
        else if (colId === 'bill_closure_date') val = j.bill_closure_date || '';
        else if (colId === 'po_status') val = j.po_status || '';
        else if (colId === 'po_date') val = j.po_date || '';
        else if (colId === 'inv_request_date') val = j.inv_request_date || '';
        else if (colId === 'sales_by') val = j.sales_by || '';

        if (!allowedVals.includes(val)) return false;
      }
    }

    return matchSearch && matchBranch && matchGoods && matchPo && matchSales;
  });

  // Apply column sorts if active
  const activeSortCol = Object.keys(columnSorts).find(key => columnSorts[key] !== null);
  if (activeSortCol && columnSorts[activeSortCol]) {
    const dir = columnSorts[activeSortCol] === 'asc' ? 1 : -1;
    filteredJobs.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (activeSortCol === 'quote_value') {
        valA = Number(enquiryValues[a.enq_number || a.enquiry_number || ''] || a.quote_value || 0);
        valB = Number(enquiryValues[b.enq_number || b.enquiry_number || ''] || b.quote_value || 0);
      } else if (activeSortCol === 'enquiry_number') {
        valA = a.enq_number || a.enquiry_number || '';
        valB = b.enq_number || b.enquiry_number || '';
      } else if (activeSortCol === 'customer_company') {
        valA = `${a.customer_name || ''} ${a.company || ''}`.trim();
        valB = `${b.customer_name || ''} ${b.company || ''}`.trim();
      } else {
        valA = a[activeSortCol] || '';
        valB = b[activeSortCol] || '';
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }

  // 📊 Excel Export Function
  const handleExportXlsx = () => {
    if (filteredJobs.length === 0) {
      showToast('No rows available in present view to export', 'error');
      return;
    }

    const exportData = filteredJobs.map(j => {
      const enqKey = j.enq_number || j.enquiry_number || '';
      const val = enquiryValues[enqKey] || j.quote_value || 0;
      return {
        'Branch': j.branch || '',
        'Job Date': formatDate(j.job_date),
        'Job Number': j.job_number || '',
        'Enquiry #': enqKey,
        'Customer Name': j.customer_name || '',
        'Company': j.company || '',
        'Value (₹)': val,
        'Packing Date': formatDate(j.packing_date),
        'Delivery Date': formatDate(j.actual_delivery),
        'Goods Status': getDisplayGoodsStatus(j.goods_track_status) || '',
        'PO Status': j.po_status || '',
        'PO Date': formatDate(j.po_date),
        'Inv Request Date': formatDate(j.inv_request_date),
        'Bill Closure Date': formatDate(j.bill_closure_date),
        'Sales By': j.sales_by || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unbilled_Jobs');
    XLSX.writeFile(workbook, `Unbilled_Jobs_View_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('XLSX exported successfully!', 'success');
  };

  // Helper for computing category metrics (Job Count & Total Value)
  const calcKpi = (predicate: (j: any) => boolean) => {
    const list = filteredJobs.filter(predicate);
    const count = list.length;
    const value = list.reduce((sum, j) => {
      const key = j.enq_number || j.enquiry_number || '';
      return sum + Number(enquiryValues[key] || j.quote_value || 0);
    }, 0);
    return { count, value };
  };

  const totalKpi = { count: filteredJobs.length, value: filteredJobs.reduce((sum, j) => sum + Number(enquiryValues[j.enq_number || j.enquiry_number || ''] || j.quote_value || 0), 0) };
  const noDetailsKpi = calcKpi(j => !j.goods_track_status || getDisplayGoodsStatus(j.goods_track_status) === '00. Execution Pending');
  const poPiPendingKpi = calcKpi(j => j.po_status === 'PO Pending' || j.po_status === 'PI Pending');
  const jobCompletedKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === '22. Job Completed');
  const damagesKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === '17. Damages');
  const storageKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === '21. Storage');
  const readyForBillingKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === '27. Billing Pending');
  const toBeCancelledKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === '25. Job # to be Cancelled');
  const executionPendingKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === '00. Execution Pending');

  const hasAppliedFilters = Object.keys(columnFilters).length > 0 || search.trim() !== '' || selectedBranch !== 'All' || selectedGoodsStatus !== 'All' || selectedPoStatus !== 'All' || selectedSalesBy !== 'All';

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading Unbilled Management Dashboard...</div>;
  }

  return (
    <div className={styles.container} onClick={() => setActiveFilterColumn(null)}>
      
      {/* Line 1: Header Bar with Back Button, Title, Search, Clear Funnels, Export XLSX, Reminders */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 1, minWidth: 0, maxWidth: '100%' }}>
          {((userProfile?.role === 'Admin' || userProfile?.csc_role === 'Admin') || (userProfile?.csc_role && userProfile.csc_role !== 'None') || (userProfile?.tracking_role && userProfile.tracking_role !== 'None')) && (
          <button
            onClick={() => router.push('/home')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            ← Back
          </button>
        )}
          <div style={{ flexShrink: 1, minWidth: 0 }}>
            <h1 className={styles.title} style={{ fontSize: '1.5rem', whiteSpace: 'nowrap', margin: 0 }}>🧾 Unbilled<span className={styles.hideOnMobile}> Management</span></h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
          {/* Quick Filters Bar (Left of Toggle Column Filter) */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'nowrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', marginRight: '0.15rem', whiteSpace: 'nowrap' }}>Filters:</span>
            
            <CustomSelect
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
              options={[{ value: 'All', label: 'Branches' }, ...Array.from(new Set(jobs.map(j => j.branch).filter(Boolean))).map(b => ({ value: b, label: b }))]}
              style={{ width: '115px' }}
            />

            <CustomSelect
              value={selectedGoodsStatus}
              onChange={(val) => setSelectedGoodsStatus(val)}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'No Status', label: 'No Status' },
                ...BRANCH_GOODS_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
              ]}
              style={{ width: '135px' }}
            />

            <CustomSelect
              value={selectedPoStatus}
              onChange={(val) => setSelectedPoStatus(val)}
              options={[{ value: 'All', label: 'PO Status' }, ...PO_STATUS_OPTIONS.map(p => ({ value: p, label: p }))]}
              style={{ width: '125px' }}
            />

            <CustomSelect
              value={selectedSalesBy}
              onChange={(val) => setSelectedSalesBy(val)}
              options={[{ value: 'All', label: 'Sales By' }, ...SALES_BY_OPTIONS.map(s => ({ value: s, label: s }))]}
              style={{ width: '115px' }}
            />
          </div>

          <button 
            title="Toggle column filters"
            onClick={() => {
              if (showColumnFilters) {
                setShowColumnFilters(false);
                setColumnFilters({});
                setSearch('');
                setSelectedBranch('All');
                setSelectedGoodsStatus('All');
                setSelectedPoStatus('All');
                setSelectedSalesBy('All');
                setActiveFilterColumn(null);
              } else {
                setShowColumnFilters(true);
              }
            }}
            style={{
              background: showColumnFilters || hasAppliedFilters ? '#ffe5e5' : 'none',
              border: 'none',
              cursor: 'pointer',
              color: showColumnFilters || hasAppliedFilters ? '#ff3b30' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '50%',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = '#ffe5e5'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = showColumnFilters || hasAppliedFilters ? '#ff3b30' : 'var(--text-secondary)'; e.currentTarget.style.background = showColumnFilters || hasAppliedFilters ? '#ffe5e5' : 'none'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill={showColumnFilters || hasAppliedFilters ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>

          {/* Search Bar */}
          <div className={styles.searchBox} style={{ maxWidth: '350px', minWidth: '150px', width: '100%' }}>
            <input
              type="text"
              placeholder="Search job, enquiry, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>

          {/* Download XLSX Button */}
          <button
            onClick={handleExportXlsx}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
            }}
          >
            📥 XL
          </button>

          {/* Reminders Bell Notification Icon */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRemindersPopup(true)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem'
              }}
            >
              🔔
              {upcomingReminders.length > 0 && (
                <span style={{ padding: '0.1rem 0.45rem', borderRadius: '12px', background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 800 }}>
                  {upcomingReminders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>


      {/* Unbilled Data Table and Controls */}
      <div className={styles.tableCard} style={{ minWidth: '100%', width: 'max-content', overflowX: 'visible', overflowY: 'visible', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Line 1: KPI Metric Cards (Single Line, don't stretch) */}
        <div 
          style={{ 
            display: 'flex', 
            flexWrap: 'nowrap', 
            gap: '0.75rem', 
            width: 'max-content'
          }}
        >
          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#ef4444' }}>No Details</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{noDetailsKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ef4444', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{noDetailsKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#f59e0b' }}>PO&PI Pending</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{poPiPendingKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{poPiPendingKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#3b82f6' }}>Job Completed</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{jobCompletedKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{jobCompletedKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))', border: '1px solid rgba(220,38,38,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#dc2626' }}>Damages</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{damagesKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{damagesKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#8b5cf6' }}>Storage</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{storageKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{storageKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#10b981' }}>Ready for Billing</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{readyForBillingKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{readyForBillingKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(153,27,27,0.15), rgba(153,27,27,0.05))', border: '1px solid rgba(153,27,27,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#991b1b' }}>To Be Cancelled</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{toBeCancelledKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{toBeCancelledKpi.value.toLocaleString('en-IN')}</div>
          </div>

          <div className={styles.kpiCard} style={{ padding: '0.75rem 0.85rem', flex: '0 0 auto', minWidth: '140px', background: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(100,116,139,0.05))', border: '1px solid rgba(100,116,139,0.3)' }}>
            <div className={styles.kpiLabel} style={{ fontSize: '0.68rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', color: '#64748b' }}>Execution Pending</div>
            <div className={styles.kpiValue} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{executionPendingKpi.count} Jobs</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>₹{executionPendingKpi.value.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', height: 'calc(100vh - 260px)', marginTop: '0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <table className={styles.table} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {ALL_UNBILLED_COLUMNS.map(col => {
                  const isFiltered = (columnFilters[col.id] && columnFilters[col.id].length > 0);
                  const isSorted = columnSorts[col.id];
                  return (
                    <th key={col.id} style={{ position: 'sticky', top: 0, zIndex: 100, padding: '1rem 0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                        <span>{col.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          {isSorted && (
                            <span style={{ fontSize: '0.7rem', color: '#4f46e5' }}>{isSorted === 'asc' ? '▲' : '▼'}</span>
                          )}
                          {showColumnFilters && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilterColumn(activeFilterColumn === col.id ? null : col.id);
                              }}
                              style={{
                                background: isFiltered ? 'rgba(79,70,229,0.15)' : 'transparent',
                                border: 'none',
                                color: isFiltered ? '#4f46e5' : 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '4px'
                              }}
                              title="Filter column"
                            >
                              🔻
                            </button>
                          )}
                        </div>
                      </div>

                      {activeFilterColumn === col.id && (
                        <ColumnFilterDropdown
                          colId={col.id}
                          jobs={jobs}
                          enquiryValues={enquiryValues}
                          currentFilters={columnFilters[col.id] || []}
                          onApply={(selected) => handleColumnFilterApply(col.id, selected)}
                          onSort={(dir) => handleColumnSort(col.id, dir)}
                          currentSort={columnSorts[col.id] || null}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j, idx) => {
                const enqKey = j.enq_number || j.enquiry_number || '';
                const quoteVal = enquiryValues[enqKey] || j.quote_value || 0;
                const uniqueKey = j.id ? `${j.source_table || 'job'}-${j.id}` : `job-${j.job_number}-${idx}`;
                return (
                  <tr key={uniqueKey}>
                    {/* 1. Remarks (First Column) */}
                    <td>
                      <button
                        onClick={() => handleOpenFollowupDrawer(j)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Follow-up
                      </button>
                    </td>

                    {/* 2. Branch */}
                    <td>{j.branch || '—'}</td>

                    {/* 3. Date (job_date) */}
                    <td>{formatDate(j.job_date)}</td>

                    {/* 4. Job Number (Plain text display, no navigation) */}
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {j.job_number}
                    </td>

                    {/* 5. Enquiry # */}
                    <td>{j.enq_number || j.enquiry_number || '—'}</td>

                    {/* 6. Client & Company */}
                    <td style={{ maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.customer_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.company || '—'}</div>
                    </td>

                    {/* 7. Value */}
                    <td style={{ fontWeight: 700, color: '#3b82f6' }}>
                      ₹{Number(quoteVal).toLocaleString('en-IN')}
                    </td>

                    {/* 8. Packing Dt */}
                    <td>
                      <input
                        type="date"
                        value={j.packing_date || ''}
                        onChange={(e) => handleUpdateJobField(j, 'packing_date', e.target.value)}
                        style={{ padding: '0.1rem 0.2rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.7rem' }}
                      />
                    </td>

                    {/* 9. Delivery Dt */}
                    <td>
                      <input
                        type="date"
                        value={j.actual_delivery || ''}
                        onChange={(e) => handleUpdateJobField(j, 'actual_delivery', e.target.value)}
                        style={{ padding: '0.1rem 0.2rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.7rem' }}
                      />
                    </td>

                    {/* 10. Goods Status */}
                    <td>
                      <CustomSelect
                        value={getDisplayGoodsStatus(j.goods_track_status) || ''}
                        placeholder="- Select -"
                        onChange={(val) => handleUpdateJobField(j, 'goods_track_status', val)}
                        options={BRANCH_GOODS_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
                        style={{ minWidth: '160px' }}
                      />
                    </td>

                    {/* 11. Bill Closure Dt */}
                    <td>
                      <input
                        type="date"
                        value={j.bill_closure_date || ''}
                        onChange={(e) => handleUpdateJobField(j, 'bill_closure_date', e.target.value)}
                        style={{ padding: '0.1rem 0.2rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.7rem' }}
                      />
                    </td>

                    {/* 12. PO Status */}
                    <td>
                      <CustomSelect
                        value={j.po_status || ''}
                        placeholder="- Select -"
                        onChange={(val) => handleUpdateJobField(j, 'po_status', val)}
                        options={PO_STATUS_OPTIONS.map(p => ({ value: p, label: p }))}
                        style={{ minWidth: '140px' }}
                      />
                    </td>

                    {/* 13. PO Rcvd Dt (po_date) */}
                    <td>
                      <input
                        type="date"
                        value={j.po_date || ''}
                        onChange={(e) => handleUpdateJobField(j, 'po_date', e.target.value)}
                        style={{ padding: '0.1rem 0.2rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.7rem' }}
                      />
                    </td>

                    {/* 14. Inv Request Dt */}
                    <td>
                      <input
                        type="date"
                        value={j.inv_request_date || ''}
                        onChange={(e) => handleUpdateJobField(j, 'inv_request_date', e.target.value)}
                        style={{ padding: '0.1rem 0.2rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.7rem' }}
                      />
                    </td>

                    {/* 15. Sales By */}
                    <td>
                      <CustomSelect
                        value={j.sales_by || ''}
                        placeholder="- Select -"
                        onChange={(val) => handleUpdateJobField(j, 'sales_by', val)}
                        options={SALES_BY_OPTIONS.map(s => ({ value: s, label: s }))}
                        style={{ minWidth: '110px' }}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No unbilled jobs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Follow-up Slide-Over Drawer */}
      {activeDrawerJob && (
        <div className={styles.drawerOverlay} onClick={() => setActiveDrawerJob(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>Daily Follow-up</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Job: {activeDrawerJob.job_number} | Branch: {activeDrawerJob.branch}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setActiveDrawerJob(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmitFollowup} style={{ marginBottom: '1.5rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Today's Follow-up Update</label>
                <textarea
                  required
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter detailed update from client/SPOC call..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={drawerSubmitting}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: drawerSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {drawerSubmitting ? 'Saving Update...' : 'Post Follow-up Note'}
              </button>
            </form>

            <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Previous Follow-up Logs</h4>
            <div className={styles.historyList}>
              {followupHistory.map((item) => (
                <div key={item.id} className={styles.historyCard}>
                  <div className={styles.historyMeta}>
                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>{item.agent_name} ({item.branch})</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <div className={styles.historyNotes}>{item.followup_notes}</div>
                  {item.next_followup_date && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                      ⏰ Next Follow-up: {formatDate(item.next_followup_date)}
                    </div>
                  )}
                </div>
              ))}
              {followupHistory.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.85rem' }}>No previous follow-up notes logged for this job.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Reminders Modal */}
      {showRemindersPopup && (
        <div className={styles.drawerOverlay} onClick={() => setShowRemindersPopup(false)}>
          <div style={{ width: '520px', maxWidth: '95vw', background: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>🔔 Next Follow-up Reminders</h3>
              <button onClick={() => setShowRemindersPopup(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingReminders.map(rem => (
                <div key={rem.id} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#4f46e5' }}>Job: {rem.job_number}</span>
                    <span style={{ color: '#10b981' }}>Date: {formatDate(rem.next_followup_date)}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>{rem.followup_notes}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Updated by: {rem.agent_name}</div>
                </div>
              ))}
              {upcomingReminders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.88rem' }}>No upcoming follow-up reminders scheduled.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
