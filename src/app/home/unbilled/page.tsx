'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect, useRef, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  fetchLegacyJobsBypassingRLS,
  updateUnbilledJobFieldServerAction,
  addUnbilledFollowupServerAction,
  fetchUnbilledFollowupsServerAction,
  fetchAllUnbilledFollowupsMapServerAction
} from './actions';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CustomSelect from '../components/CustomSelect';
import MultiSelect from '../components/MultiSelect';
import * as XLSX from 'xlsx';
import styles from './unbilled.module.css';
import { usePermissions } from '@/components/PermissionsContext';

// Master Goods Track Options for Branch Users
const BRANCH_GOODS_STATUS_OPTIONS = [
  "Damages",
  "Storage",
  "Job Completed",
  "Job # taken for Billing",
  "Job # to be Cancelled",
  "Billing Pending",
  "Month End Billing",
  "Free Job"
];

const PO_STATUS_OPTIONS = [
  "PO Pending",
  "PI Pending",
  "PO Received",
  "PI Received",
  "Mail Approval",
  "Not Required"
];

const getDisplayGoodsStatus = (status: string | null) => {
  if (!status || status.trim() === '') return '';
  const clean = status.replace(/^\d+\.\s*/, '').trim();
  if (BRANCH_GOODS_STATUS_OPTIONS.includes(clean)) return clean;
  return 'Execution Pending';
};

const ALL_UNBILLED_COLUMNS = [
  { id: 'remarks', label: 'Remarks' },
  { id: 'job_date', label: 'Date' },
  { id: 'no_of_days', label: 'No of Days' },
  { id: 'job_number', label: 'Job Number' },
  { id: 'enquiry_number', label: 'Enquiry #' },
  { id: 'customer_company', label: 'Client & Company' },
  { id: 'quote_value', label: '₹' },
  { id: 'packing_date', label: '📦 Packing' },
  { id: 'actual_delivery', label: '🚚 Delivery' },
  { id: 'goods_track_status', label: 'Goods Status' },
  { id: 'spoc_name', label: 'SPOC' },
  { id: 'po_status', label: 'PO Status' },
  { id: 'bill_closure_date', label: 'Bill Closure Dt' },
  { id: 'po_date', label: 'PO Rcvd Dt' },
  { id: 'inv_request_date', label: 'Inv Request Dt' }
];

const formatDate = (dateStr: string | null) => {
  if (!dateStr || dateStr.trim() === '' || dateStr === '—') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const calculateNoOfDays = (jobDateStr: string | null | undefined): number | null => {
  if (!jobDateStr || typeof jobDateStr !== 'string' || jobDateStr.trim() === '' || jobDateStr === '—') return null;
  let jobDate: Date;
  const match = jobDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    jobDate = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  } else {
    jobDate = new Date(jobDateStr);
  }
  if (isNaN(jobDate.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfJobDate = new Date(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate());

  const diffTime = startOfToday.getTime() - startOfJobDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

function DateCellInput({ value, onChange, disabled }: { value: string | null; onChange: (val: string) => void; disabled?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value || '');
  const formatted = formatDate(value);

  const handleStartEditing = () => {
    if (disabled) return;
    setDraftValue(value || '');
    setIsEditing(true);
  };

  const handleCommit = (valToCommit: string) => {
    setIsEditing(false);
    if (valToCommit !== (value || '')) {
      onChange(valToCommit);
    }
  };

  if (isEditing && !disabled) {
    return (
      <input
        type="date"
        autoFocus
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        onBlur={(e) => handleCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleCommit(draftValue);
          } else if (e.key === 'Escape') {
            setIsEditing(false);
          }
        }}
        style={{
          padding: '0.2rem 0.4rem',
          width: '105px',
          height: '28px',
          borderRadius: '6px',
          border: '1px solid #4f46e5',
          background: 'var(--bg-color)',
          color: 'var(--text-primary)',
          fontSize: '0.75rem',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
      />
    );
  }

  return (
    <div
      onClick={handleStartEditing}
      style={{
        padding: '0.2rem 0.4rem',
        width: '105px',
        height: '28px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-color)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease'
      }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.borderColor = '#4f46e5'; }}
      onMouseOut={(e) => { if (!disabled) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      {formatted || <span style={{ opacity: 0.4, fontWeight: 400 }}>- Select -</span>}
    </div>
  );
}



function SpocCellInput({ value, onChange, disabled }: { value: string | null; onChange: (val: string) => void; disabled?: boolean }) {
  const [draftValue, setDraftValue] = useState(value || '');

  useEffect(() => {
    setDraftValue(value || '');
  }, [value]);

  const handleCommit = (valToCommit: string) => {
    if (valToCommit !== (value || '')) {
      onChange(valToCommit);
    }
  };

  const hasValue = Boolean(draftValue && draftValue.trim());

  if (disabled) {
    return (
      <div
        style={{
          padding: '0.4rem 0.6rem',
          width: '110px',
          height: '32px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-color)',
          fontSize: '0.78rem',
          fontWeight: hasValue ? 600 : 400,
          color: hasValue ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {hasValue ? draftValue : <span style={{ opacity: 0.4, fontWeight: 400 }}>- Select -</span>}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={draftValue}
      onChange={(e) => setDraftValue(e.target.value)}
      onBlur={(e) => handleCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommit(draftValue);
        }
      }}
      placeholder="SPOC Name"
      style={{
        width: '110px',
        padding: '0.4rem 0.6rem',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-color)',
        color: hasValue ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.78rem',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
      }}
    />
  );
}


function AnimatedNumber({ value, isCurrency = false }: { value: number; isCurrency?: boolean }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000;
    const startVal = displayVal;
    const endVal = value;

    if (startVal === endVal) return;

    let animationFrameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Petrol pump meter rolling effect: continuous linear motion with smooth start and finish ease
      const easeInOut = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const meterProgress = progress * 0.7 + easeInOut * 0.3;
      const current = Math.floor(startVal + (endVal - startVal) * meterProgress);
      setDisplayVal(current);
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayVal(endVal);
      }
    };
    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  if (isCurrency) {
    return <>₹{displayVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>;
  }
  return <>{displayVal.toLocaleString('en-IN')}</>;
}

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
      case 'no_of_days': {
        const days = calculateNoOfDays(job.job_date);
        return days !== null ? String(days) : '—';
      }
      case 'job_date': return formatDate(job.job_date);
      case 'job_number': return job.job_number || '—';
      case 'enquiry_number': return enqKey || '—';
      case 'customer_company': return `${job.customer_name || ''} ${job.company || ''}`.trim() || '—';
      case 'quote_value': return String(job.quote_value || 0);
      case 'packing_date': return formatDate(job.packing_date);
      case 'actual_delivery': return formatDate(job.actual_delivery);
      case 'goods_track_status': return getDisplayGoodsStatus(job.goods_track_status) || '—';
      case 'bill_closure_date': return formatDate(job.bill_closure_date);
      case 'po_status': return job.po_status || '—';
      case 'po_date': return formatDate(job.po_date);
      case 'inv_request_date': return formatDate(job.inv_request_date);
      case 'spoc_name': return job.spoc_name || job.unbilled_spoc || '—';
      default: return '—';
    }
  };

  const getRawValue = (job: any) => {
    const enqKey = job.enq_number || job.enquiry_number || '';
    switch (colId) {
      case 'no_of_days': {
        const days = calculateNoOfDays(job.job_date);
        return days !== null ? String(days) : '';
      }
      case 'job_date': return job.job_date || '';
      case 'job_number': return job.job_number || '';
      case 'enquiry_number': return enqKey;
      case 'customer_company': return `${job.customer_name || ''} ${job.company || ''}`.trim();
      case 'quote_value': return String(job.quote_value || 0);
      case 'packing_date': return job.packing_date || '';
      case 'actual_delivery': return job.actual_delivery || '';
      case 'goods_track_status': return getDisplayGoodsStatus(job.goods_track_status) || '';
      case 'bill_closure_date': return job.bill_closure_date || '';
      case 'po_status': return job.po_status || '';
      case 'po_date': return job.po_date || '';
      case 'inv_request_date': return job.inv_request_date || '';
      case 'spoc_name': return job.spoc_name || job.unbilled_spoc || '';
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

const getInitialFilter = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = sessionStorage.getItem('unbilled_filters');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[key] !== undefined && parsed[key] !== null) {
        return parsed[key];
      }
    }
  } catch (e) {}
  return fallback;
};

export default function UnbilledManagementPage() {
  const { getAccessLevel, loading: permissionsLoading } = usePermissions();
  const [isViewer, setIsViewer] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [enquiryValues, setEnquiryValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Filters with synchronous lazy initializers from sessionStorage
  const [search, setSearch] = useState<string>(() => getInitialFilter('search', ''));
  const [selectedBranch, setSelectedBranch] = useState<string[]>(() => getInitialFilter('selectedBranch', ['All']));
  const [selectedGoodsStatus, setSelectedGoodsStatus] = useState<string[]>(() => getInitialFilter('selectedGoodsStatus', ['All']));
  const [selectedPoStatus, setSelectedPoStatus] = useState<string[]>(() => getInitialFilter('selectedPoStatus', ['All']));
  const [selectedSpoc, setSelectedSpoc] = useState<string[]>(() => getInitialFilter('selectedSpoc', ['All']));
  const [selectedYear, setSelectedYear] = useState<string[]>(() => getInitialFilter('selectedYear', ['All']));

  // ColumnFunnel filters
  const [showColumnFilters, setShowColumnFilters] = useState<boolean>(() => getInitialFilter('showColumnFilters', false));
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(() => getInitialFilter('columnFilters', {}));
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [columnSorts, setColumnSorts] = useState<Record<string, 'asc' | 'desc' | null>>(() => getInitialFilter('columnSorts', {}));

  // Follow-up Drawer & Reminder Modal States
  const [activeDrawerJob, setActiveDrawerJob] = useState<any | null>(null);
  const [followupHistory, setFollowupHistory] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);

  // Reminders Popup Modal State
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [followupsMap, setFollowupsMap] = useState<Record<string, string>>({});
  const [showRemindersPopup, setShowRemindersPopup] = useState(false);

  // Financial Year Reports Modal State
  const [showReportsPopup, setShowReportsPopup] = useState(false);

  // Feature-level permission flags
  const [canExportUnbilled, setCanExportUnbilled] = useState(false);
  const [canSeeReminders, setCanSeeReminders] = useState(false);

  // Show job counts only after 1.5-second value animation completes
  const [showJobCounts, setShowJobCounts] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowJobCounts(false);
      const timer = setTimeout(() => {
        setShowJobCounts(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Pagination / DOM slicing state for fast rendering
  const [visibleCount, setVisibleCount] = useState(80);

  const router = useRouter();

  // Persist filter changes to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csc_last_jobs_page', '/home/unbilled');
      try {
        const filterState = {
          search,
          selectedBranch,
          selectedGoodsStatus,
          selectedPoStatus,
          selectedSpoc,
          selectedYear,
          showColumnFilters,
          columnFilters,
          columnSorts
        };
        sessionStorage.setItem('unbilled_filters', JSON.stringify(filterState));
      } catch (e) {
        console.error('Failed to save unbilled filters:', e);
      }
    }
  }, [search, selectedBranch, selectedGoodsStatus, selectedPoStatus, selectedSpoc, selectedYear, showColumnFilters, columnFilters, columnSorts]);

  useEffect(() => {
    setVisibleCount(80);
  }, [search, selectedBranch, selectedGoodsStatus, selectedPoStatus, selectedSpoc, selectedYear, columnFilters, columnSorts]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight <= 500) {
      setVisibleCount(prev => (prev < filteredJobs.length ? prev + 60 : prev));
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Enforce access control once user profile has loaded
  useEffect(() => {
    if (!userProfile) return;
    const unbilledRole = userProfile.unbilled_access || userProfile.unbilled_role || 'None';
    const isUnbilledEdit = unbilledRole === 'Edit';
    const isUnbilledView = unbilledRole === 'View';

    if (!isUnbilledEdit && !isUnbilledView) {
      router.push('/home');
      return;
    }
    const isViewerUser = isUnbilledView;
    setIsViewer(isViewerUser);
    setCanExportUnbilled(true);
    setCanSeeReminders(true);
  }, [userProfile, currentUser]);

  // Handle ESC key to close drawer, reminders popup, or reports popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReportsPopup) {
          setShowReportsPopup(false);
        } else if (showRemindersPopup) {
          setShowRemindersPopup(false);
        } else if (activeDrawerJob) {
          setActiveDrawerJob(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawerJob, showRemindersPopup, showReportsPopup]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setCurrentUser(session.user);

    // Fetch user profile first
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) {
      setUserProfile(profile);
    }

    const userName = profile?.name || profile?.username || session.user.email?.split('@')[0];
    const userId = session.user.id;

    // Fetch personal upcoming followups via Server Action
    fetchUnbilledFollowupsServerAction(undefined, userName, userId)
      .then(remindersData => {
        setUpcomingReminders(remindersData || []);
      })
      .catch(err => {
        console.error('Error fetching personal reminders:', err);
      });

    let jobsQuery = supabase
      .from('jobs')
      .select('job_number, enq_number, erp_job_id, job_date, actual_delivery, planned_delivery, branch, customer_name, company, goods_type, origin, destination, customer_phone, erp_status, invoice_number, invoice_date, goods_track_status, car_track_status, po_status, po_date, inv_request_date, bill_closure_date, sales_by, spoc_name, quote_value, car_included, csc_coordinator, unbilled_spoc, packing_date, created_at, updated_at')
      .eq('erp_status', 'New Order')
      .order('job_date', { ascending: true })
      .order('job_number', { ascending: true });

    let legacyBranchesToFetch = null;

    // Enforce Branch Isolation based on user's assigned branches
    const requiresSlicing = true;

    if (requiresSlicing) {
      if (profile.branches && profile.branches.includes('ALL')) {
        legacyBranchesToFetch = ['ALL'];
      } else if (profile.branches && profile.branches.length > 0) {
        jobsQuery = jobsQuery.in('branch', profile.branches);
        legacyBranchesToFetch = profile.branches;
      } else {
        jobsQuery = jobsQuery.eq('branch', 'NONE');
        legacyBranchesToFetch = ['NONE'];
      }
    } else {
      legacyBranchesToFetch = ['ALL'];
    }

    const [jobsRes, legacyResData] = await Promise.all([
      jobsQuery, 
      fetchLegacyJobsBypassingRLS(legacyBranchesToFetch).catch(err => {
        console.error('Error fetching legacy jobs:', err);
        showToast('Error fetching legacy jobs: ' + err.message, 'error');
        return [];
      })
    ]);

    if (jobsRes.error) {
      console.error('Error fetching unbilled jobs:', jobsRes.error);
      showToast('Error fetching unbilled jobs: ' + jobsRes.error.message, 'error');
    }

    const erpJobsList = (jobsRes.data || []).map(j => ({ ...j, source_table: 'jobs' }));
    const legacyJobsList = legacyResData.map(j => ({
      ...j,
      job_date: j.job_date || null,
      actual_delivery: j.actual_delivery || null,
      source_table: 'legacy_jobs'
    }));

    const combinedList = [...erpJobsList, ...legacyJobsList];
    setJobs(combinedList);
    setLoading(false);

    // Fetch followups map asynchronously in background (non-blocking)
    fetchAllUnbilledFollowupsMapServerAction()
      .then(fMap => {
        setFollowupsMap(fMap || {});
      })
      .catch(err => {
        console.error('Error fetching followups map in background:', err);
      });
  };

  const fetchUpcomingReminders = async () => {
    try {
      const userName = userProfile?.name || userProfile?.username || currentUser?.email?.split('@')[0];
      const userId = currentUser?.id;
      const reminders = await fetchUnbilledFollowupsServerAction(undefined, userName, userId);
      setUpcomingReminders(reminders);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  };

  const handleUpdateJobField = async (job: any, field: string, value: any) => {
    try {
      const fieldToUpdate = field === 'unbilled_spoc' ? 'spoc_name' : field;
      const table = job.source_table || 'jobs';
      const oldV = job[fieldToUpdate] ?? job[field];

      const oldStr = oldV !== undefined && oldV !== null ? String(oldV) : '';
      const newStr = value !== undefined && value !== null ? String(value) : '';

      if (oldStr === newStr) return;

      const auditName = userProfile?.name || userProfile?.username || currentUser?.email?.split('@')[0] || 'User';
      const auditUsername = userProfile?.username || currentUser?.email?.split('@')[0] || 'User';

      await updateUnbilledJobFieldServerAction({
        table,
        jobNumber: job.job_number,
        fieldToUpdate,
        value,
        auditName,
        auditUsername,
        oldStr,
        newStr,
      });

      setJobs(prev => prev.map(j => j.job_number === job.job_number ? { ...j, [fieldToUpdate]: value, [field]: value } : j));
      showToast(`Updated ${fieldToUpdate.replace(/_/g, ' ')}`, 'success');
    } catch (err: any) {
      showToast(`Failed to update: ${err.message}`, 'error');
    }
  };

  const handleOpenFollowupDrawer = async (job: any) => {
    setActiveDrawerJob(job);
    setNewNote('');
    setNextFollowupDate('');

    try {
      const history = await fetchUnbilledFollowupsServerAction(job.job_number);
      setFollowupHistory(history);
    } catch (err) {
      console.error('Error fetching followup history:', err);
      setFollowupHistory([]);
    }
  };



  const handleSubmitFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeDrawerJob) return;

    setDrawerSubmitting(true);
    try {
      const userName = userProfile?.name || userProfile?.username || currentUser?.email?.split('@')[0] || 'Agent';

      // Add follow-up entry strictly to unbilled_followups using job_number
      await addUnbilledFollowupServerAction({
        jobNumber: activeDrawerJob.job_number,
        updatedBy: currentUser?.id || 'User',
        agentName: userName,
        followupNotes: newNote,
        nextFollowupDate: nextFollowupDate || null
      });

      // Update local followups map
      setFollowupsMap(prev => ({ ...prev, [activeDrawerJob.job_number]: newNote }));

      showToast('Follow-up note added ✅', 'success');
      setNewNote('');
      setNextFollowupDate('');

      handleOpenFollowupDrawer(activeDrawerJob);
      fetchUpcomingReminders();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
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

  const getJobFinancialYear = (j: any): string | null => {
    const dStr = j.job_date || j.packing_date || j.created_at;
    if (!dStr) return null;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return null;
    const month = d.getMonth();
    const year = d.getFullYear();
    const fy = month >= 3 ? year : year - 1;
    return String(fy);
  };

  const isThisYearJob = (jobNumber?: string | null): boolean => {
    if (!jobNumber) return false;
    return /\/26\//i.test(jobNumber) || /\/26-\d{2}\//i.test(jobNumber);
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

    const matchBranch = selectedBranch.includes('All') || selectedBranch.includes(j.branch || '');
    const matchGoods = selectedGoodsStatus.includes('All') || 
                       (selectedGoodsStatus.includes('No Status') && (!j.goods_track_status || j.goods_track_status.trim() === '')) ||
                       selectedGoodsStatus.includes(getDisplayGoodsStatus(j.goods_track_status) || '');
    const matchPo = selectedPoStatus.includes('All') || selectedPoStatus.includes(j.po_status || '');
    const matchSpoc = selectedSpoc.includes('All') || selectedSpoc.includes(j.spoc_name || j.unbilled_spoc || '');

    const matchYear = selectedYear.includes('All') || (() => {
      const fy = getJobFinancialYear(j);
      return fy ? selectedYear.includes(fy) : false;
    })();

    // Check Column Funnel Filters
    for (const [colId, allowedVals] of Object.entries(columnFilters)) {
      if (allowedVals && allowedVals.length > 0) {
        let val = '';
        if (colId === 'no_of_days') {
          const days = calculateNoOfDays(j.job_date);
          val = days !== null ? String(days) : '';
        }
        else if (colId === 'job_date') val = j.job_date || '';
        else if (colId === 'job_number') val = j.job_number || '';
        else if (colId === 'enquiry_number') val = j.enq_number || j.enquiry_number || '';
        else if (colId === 'customer_company') val = `${j.customer_name || ''} ${j.company || ''}`.trim();
        else if (colId === 'quote_value') val = String(j.quote_value || 0);
        else if (colId === 'packing_date') val = j.packing_date || '';
        else if (colId === 'actual_delivery') val = j.actual_delivery || '';
        else if (colId === 'goods_track_status') val = getDisplayGoodsStatus(j.goods_track_status) || '';
        else if (colId === 'bill_closure_date') val = j.bill_closure_date || '';
        else if (colId === 'po_status') val = j.po_status || '';
        else if (colId === 'po_date') val = j.po_date || '';
        else if (colId === 'inv_request_date') val = j.inv_request_date || '';
        else if (colId === 'spoc_name') val = j.spoc_name || j.unbilled_spoc || '';

        if (!allowedVals.includes(val)) return false;
      }
    }

    return matchSearch && matchBranch && matchGoods && matchPo && matchSpoc && matchYear;
  });

  // Apply column sorts if active; default to job_date descending
  const activeSortCol = Object.keys(columnSorts).find(key => columnSorts[key] !== null);
  if (activeSortCol && columnSorts[activeSortCol]) {
    const dir = columnSorts[activeSortCol] === 'asc' ? 1 : -1;
    filteredJobs.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (activeSortCol === 'no_of_days') {
        const daysA = calculateNoOfDays(a.job_date);
        const daysB = calculateNoOfDays(b.job_date);
        valA = daysA !== null ? daysA : -Infinity;
        valB = daysB !== null ? daysB : -Infinity;
      } else if (activeSortCol === 'quote_value') {
        valA = Number(a.quote_value || 0);
        valB = Number(b.quote_value || 0);
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
  } else {
    filteredJobs.sort((a, b) => {
      const dateA = a.job_date ? new Date(a.job_date).getTime() : 0;
      const dateB = b.job_date ? new Date(b.job_date).getTime() : 0;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      const numA = a.job_number || '';
      const numB = b.job_number || '';
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
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
      const val = j.quote_value || 0;
      return {
        'Job Date': formatDate(j.job_date),
        'No of Days': calculateNoOfDays(j.job_date) ?? '',
        'Job Number': j.job_number || '',
        'Enquiry #': enqKey,
        'Customer Name': j.customer_name || '',
        'Company': j.company || '',
        'Value (₹)': val,
        'Packing Date': formatDate(j.packing_date),
        'Delivery Date': formatDate(j.actual_delivery),
        'Goods Status': getDisplayGoodsStatus(j.goods_track_status) || '',
        'SPOC': j.spoc_name || j.unbilled_spoc || '',
        'PO Status': j.po_status || '',
        'PO Date': formatDate(j.po_date),
        'Inv Request Dt': formatDate(j.inv_request_date),
        'Bill Closure Date': formatDate(j.bill_closure_date)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unbilled_Jobs');
    XLSX.writeFile(workbook, `Unbilled_Jobs_View_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('XLSX exported successfully!', 'success');
  };

  // Helper for status colors
  const getGoodsStatusColor = (status: string | null) => {
    if (!status || status.trim() === '') return undefined;
    const s = getDisplayGoodsStatus(status) || '';
    if (s === 'Execution Pending') return '#64748b';
    if (s === 'Damages') return '#dc2626';
    if (s === 'Storage') return '#8b5cf6';
    if (s === 'Job Completed') return '#3b82f6';
    if (s === 'Billing Pending' || s === 'Month End Billing' || s === 'Job # taken for Billing') return '#10b981';
    if (s === 'Job # to be Cancelled' || s === 'Free Job') return '#991b1b';
    return '#64748b';
  };

  // Helper for computing category metrics (Job Count & Total Value)
  const calcKpi = (predicate: (j: any) => boolean) => {
    const list = filteredJobs.filter(predicate);
    const count = list.length;
    const value = list.reduce((sum, j) => {
      return sum + Number(j.quote_value || 0);
    }, 0);
    return { count, value };
  };

  // Helper checks for empty status
  const isPoEmpty = (j: any) => !j.po_status || j.po_status.trim() === '';
  const isGoodsEmpty = (j: any) => !j.goods_track_status || j.goods_track_status.trim() === '';

  const totalKpi = { count: filteredJobs.length, value: filteredJobs.reduce((sum, j) => sum + Number(j.quote_value || 0), 0) };

  // 1. No Details: isGoodsEmpty(j)
  const noDetailsKpi = calcKpi(j => isGoodsEmpty(j));

  // 2. PO&PI Pending: Jobs where po_status is PO Pending OR PI Pending
  const poPiPendingKpi = calcKpi(j => j.po_status === 'PO Pending' || j.po_status === 'PI Pending');

  // 3. Job Completed: goods_status === 'Job Completed'
  const jobCompletedKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === 'Job Completed');

  // 4. Damages: goods_status === 'Damages'
  const damagesKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === 'Damages');

  // 5. Storage: goods_status === 'Storage'
  const storageKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === 'Storage');

  // 6. Ready for Billing: ['Billing Pending', 'Month End Billing', 'Job # taken for Billing'].includes(goods_status)
  const readyForBillingKpi = calcKpi(j => {
    const s = getDisplayGoodsStatus(j.goods_track_status) || '';
    return s === 'Billing Pending' || s === 'Month End Billing' || s === 'Job # taken for Billing';
  });

  // 7. To Be Cancelled: ['Free Job', 'Job # to be Cancelled'].includes(goods_status)
  const toBeCancelledKpi = calcKpi(j => {
    const s = getDisplayGoodsStatus(j.goods_track_status) || '';
    return s === 'Free Job' || s === 'Job # to be Cancelled';
  });

  // 8. Execution Pending: goods_status === 'Execution Pending'
  const executionPendingKpi = calcKpi(j => getDisplayGoodsStatus(j.goods_track_status) === 'Execution Pending');

  // 9. Billable: ['', 'Storage', 'Job Completed', 'Job # taken for Billing', 'Billing Pending', 'Month End Billing'].includes(goods_status)
  const billableKpi = calcKpi(j => {
    const s = getDisplayGoodsStatus(j.goods_track_status) || '';
    return ['', 'Storage', 'Job Completed', 'Job # taken for Billing', 'Billing Pending', 'Month End Billing'].includes(s);
  });

  // --- Unbilled Financial Year Reports Matrix Logic ---
  const buildUnbilledMatrixData = (jobList: any[]) => {
    const isGoodsEmpty = (j: any) => !j.goods_track_status || j.goods_track_status.trim() === '';
    const getDisplayStatus = (status: string | null) => {
      if (!status) return '';
      return String(status).replace(/^\d+\.\s*/, '').trim();
    };

    const categories = [
      { id: 'Billable', line1: 'Billable', line2: '', color: '#047857' },
      { id: 'No Details', line1: 'No', line2: 'Details', color: '#ef4444' },
      { id: 'PO & PI Pending', line1: 'PO & PI', line2: 'Pending', color: '#be185d' },
      { id: 'Job Completed', line1: 'Job', line2: 'Completed', color: '#1d4ed8' },
      { id: 'Damages', line1: 'Damages', line2: '', color: '#b91c1c' },
      { id: 'Storage', line1: 'Storage', line2: '', color: '#c2410c' },
      { id: 'Ready for Billing', line1: 'Ready for', line2: 'Billing', color: '#059669' },
      { id: 'To Be Cancelled', line1: 'To Be', line2: 'Cancelled', color: '#991b1b' },
      { id: 'Execution Pending', line1: 'Execution', line2: 'Pending', color: '#6d28d9' }
    ];

    const branchSet = new Set(['BLR', 'DEL', 'BOM', 'MAA', 'HYD', 'PNQ', 'AMD', 'COK', 'KOL', 'OSS']);
    const matrix: Record<string, Record<string, number>> = {};

    const initBranch = (br: string) => {
      matrix[br] = { Total: 0 };
      categories.forEach(c => { matrix[br][c.id] = 0; });
    };

    Array.from(branchSet).forEach(initBranch);

    jobList.forEach(j => {
      const br = j.branch?.toUpperCase() || 'UNKNOWN';
      if (!matrix[br]) {
        branchSet.add(br);
        initBranch(br);
      }

      const val = Number(enquiryValues[j.enq_number || j.enquiry_number || ''] || j.quote_value || 0);
      matrix[br]['Total'] += val;

      const g = getDisplayStatus(j.goods_track_status);
      const p = j.po_status ? String(j.po_status).trim() : '';
      const goodsEmpty = isGoodsEmpty(j);

      // 1. Billable: ['', 'Storage', 'Job Completed', 'Job # taken for Billing', 'Billing Pending', 'Month End Billing'].includes(goods_status)
      if (['', 'Storage', 'Job Completed', 'Job # taken for Billing', 'Billing Pending', 'Month End Billing'].includes(g)) {
        matrix[br]['Billable'] += val;
      }

      // 2. No Details: isGoodsEmpty(j)
      if (goodsEmpty) {
        matrix[br]['No Details'] += val;
      }

      // 3. PO & PI Pending: po_status is 'PO Pending' OR 'PI Pending'
      if (p === 'PO Pending' || p === 'PI Pending') {
        matrix[br]['PO & PI Pending'] += val;
      }

      // 4. Job Completed: goods_track_status is 'Job Completed'
      if (g === 'Job Completed') {
        matrix[br]['Job Completed'] += val;
      }

      // 5. Damages: goods_track_status is 'Damages'
      if (g === 'Damages') {
        matrix[br]['Damages'] += val;
      }

      // 6. Storage: goods_track_status is 'Storage'
      if (g === 'Storage') {
        matrix[br]['Storage'] += val;
      }

      // 7. Ready for Billing: goods_track_status in [Billing Pending, Month End Billing, Job # taken for Billing]
      if (g === 'Billing Pending' || g === 'Month End Billing' || g === 'Job # taken for Billing') {
        matrix[br]['Ready for Billing'] += val;
      }

      // 8. To Be Cancelled: goods_track_status in [Free Job, Job # to be Cancelled]
      if (g === 'Free Job' || g === 'Job # to be Cancelled') {
        matrix[br]['To Be Cancelled'] += val;
      }

      // 9. Execution Pending: goods_track_status is 'Execution Pending'
      if (g === 'Execution Pending') {
        matrix[br]['Execution Pending'] += val;
      }
    });

    const branchList = Array.from(branchSet);
    const data: any[] = branchList.map(br => ({ branch: br, ...matrix[br] }));

    const totals: Record<string, number> = { Total: 0 };
    categories.forEach(c => {
      totals[c.id] = data.reduce((sum, row) => sum + ((row as any)[c.id] as number || 0), 0);
    });
    totals['Total'] = data.reduce((sum, row) => sum + ((row as any)['Total'] as number || 0), 0);

    return { data, totals, categories, grandTotal: totals['Total'], jobCount: jobList.length };
  };

  const currentFyUnbilledMatrix = useMemo(() => {
    const currentFyJobs = jobs.filter(j => {
      const dStr = j.job_date || j.packing_date || j.created_at;
      if (!dStr) return false;
      const d = new Date(dStr);
      return !isNaN(d.getTime()) && d >= new Date('2026-04-01T00:00:00');
    });
    return buildUnbilledMatrixData(currentFyJobs);
  }, [jobs, enquiryValues]);

  const previousFyUnbilledMatrix = useMemo(() => {
    const previousFyJobs = jobs.filter(j => {
      const dStr = j.job_date || j.packing_date || j.created_at;
      if (!dStr) return true; // Default undated jobs to previous FY
      const d = new Date(dStr);
      return isNaN(d.getTime()) || d < new Date('2026-04-01T00:00:00');
    });
    return buildUnbilledMatrixData(previousFyJobs);
  }, [jobs, enquiryValues]);

  const hasAppliedFilters = Object.keys(columnFilters).length > 0 || search.trim() !== '' || !selectedBranch.includes('All') || !selectedGoodsStatus.includes('All') || !selectedPoStatus.includes('All') || !selectedSpoc.includes('All') || !selectedYear.includes('All');

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<string>(['2026', '2025', '2024']);
    jobs.forEach(j => {
      const dStr = j.job_date || j.packing_date || j.created_at;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          const month = d.getMonth();
          const year = d.getFullYear();
          const fy = month >= 3 ? year : year - 1;
          yearsSet.add(String(fy));
        }
      }
    });
    const sortedYears = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    return [
      { value: 'All', label: 'All Years' },
      ...sortedYears.map(y => ({ value: y, label: y }))
    ];
  }, [jobs]);

  // Fixed 176px width during counter animation (showJobCounts = false), then content-fit width (width: auto) once animation finishes
  const kpiCardWidthStyle: React.CSSProperties = showJobCounts 
    ? { flex: '0 0 auto', width: 'auto', minWidth: 'max-content' } 
    : { flex: '0 0 176px', width: '176px' };

  return (
    <div className={styles.container} onClick={() => setActiveFilterColumn(null)}>
      
      {/* Line 1: Header Bar with Back Button, Title, Search, Clear Funnels, Export XLSX, Reminders */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 1, minWidth: 0, maxWidth: '100%' }}>
          <button
            onClick={() => router.push('/home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '99px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
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
              e.currentTarget.style.background = 'var(--surface-color)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <div style={{ flexShrink: 1, minWidth: 0 }}>
            <h1 className={styles.title} style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', margin: 0 }}>
              🧾 <span className={styles.titleText}>Unbilled<span className={styles.hideOnMobile}> Management</span></span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
          {/* Quick Filters Bar (Left of Toggle Column Filter) */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'nowrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', marginRight: '0.15rem', whiteSpace: 'nowrap' }}>Filters:</span>
            
            <MultiSelect
              value={selectedYear}
              onChange={(val) => setSelectedYear(val)}
              options={yearOptions}
              placeholder="All Years"
            />

            <MultiSelect
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
              options={[{ value: 'All', label: 'All Branches' }, ...Array.from(new Set(jobs.map(j => j.branch).filter(Boolean))).map(b => ({ value: b, label: b as string }))]}
              placeholder="All Branches"
            />

            <MultiSelect
              value={selectedGoodsStatus}
              onChange={(val) => setSelectedGoodsStatus(val)}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'No Status', label: 'No Status' },
                { value: 'Execution Pending', label: 'Execution Pending' },
                ...BRANCH_GOODS_STATUS_OPTIONS.map(s => ({ value: s, label: s }))
              ]}
              placeholder="All Status"
            />

            <MultiSelect
              value={selectedPoStatus}
              onChange={(val) => setSelectedPoStatus(val)}
              options={[{ value: 'All', label: 'All PO Status' }, ...PO_STATUS_OPTIONS.map(p => ({ value: p, label: p }))]}
              placeholder="All PO Status"
            />

            <MultiSelect
              value={selectedSpoc}
              onChange={(val) => setSelectedSpoc(val)}
              options={[{ value: 'All', label: 'All SPOC' }, ...Array.from(new Set(jobs.map(j => j.spoc_name || j.unbilled_spoc).filter(Boolean))).map(s => ({ value: s as string, label: s as string }))]}
              placeholder="All SPOC"
            />
          </div>

          <button 
            title="Toggle column filters"
            onClick={() => {
              if (showColumnFilters) {
                setShowColumnFilters(false);
                setColumnFilters({});
                setSearch('');
                setSelectedBranch(['All']);
                setSelectedGoodsStatus(['All']);
                setSelectedPoStatus(['All']);
                setSelectedSpoc(['All']);
                setSelectedYear(['All']);
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

          {/* Download XLSX Button — shown for users with Unbilled page access */}
          {canExportUnbilled && (
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
          )}

          {/* Unbilled FY Reports Modal Trigger Button */}
          <button
            onClick={() => setShowReportsPopup(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            📊 Report
          </button>

          {/* Reminders Bell — shown for users with Unbilled page access */}
          {canSeeReminders && (
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
          )}

          {/* Showing row count indicator */}
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-color)', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
            {Math.min(visibleCount, filteredJobs.length)}/{filteredJobs.length} Jobs
          </div>
        </div>
      </div>


      {/* Unbilled Data Table and Controls */}
      <div className={styles.tableCard}>
        
        <div className={styles.tableContainer} onScroll={handleTableScroll}>
          {/* KPI Metric Cards */}
          <div className={styles.kpiGrid}>
          {(totalKpi.count > 0 || totalKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.02))', borderColor: 'rgba(6,182,212,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#06b6d4' }}>Total</div>
              <div className={styles.kpiValue}><AnimatedNumber value={totalKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#06b6d4', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{totalKpi.count} Jobs</div>
            </div>
          )}

          {(billableKpi.count > 0 || billableKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.02))', borderColor: 'rgba(34,197,94,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#22c55e' }}>Billable</div>
              <div className={styles.kpiValue}><AnimatedNumber value={billableKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#22c55e', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{billableKpi.count} Jobs</div>
            </div>
          )}

          {(noDetailsKpi.count > 0 || noDetailsKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.02))', borderColor: 'rgba(239,68,68,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#ef4444' }}>No Details</div>
              <div className={styles.kpiValue}><AnimatedNumber value={noDetailsKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#ef4444', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{noDetailsKpi.count} Jobs</div>
            </div>
          )}

          {(poPiPendingKpi.count > 0 || poPiPendingKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.02))', borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#f59e0b' }}>PO&PI Pending</div>
              <div className={styles.kpiValue}><AnimatedNumber value={poPiPendingKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#f59e0b', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{poPiPendingKpi.count} Jobs</div>
            </div>
          )}

          {(jobCompletedKpi.count > 0 || jobCompletedKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.02))', borderColor: 'rgba(59,130,246,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#3b82f6' }}>Job Completed</div>
              <div className={styles.kpiValue}><AnimatedNumber value={jobCompletedKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#3b82f6', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{jobCompletedKpi.count} Jobs</div>
            </div>
          )}

          {(damagesKpi.count > 0 || damagesKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.02))', borderColor: 'rgba(220,38,38,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#dc2626' }}>Damages</div>
              <div className={styles.kpiValue}><AnimatedNumber value={damagesKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#dc2626', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{damagesKpi.count} Jobs</div>
            </div>
          )}

          {(storageKpi.count > 0 || storageKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.02))', borderColor: 'rgba(139,92,246,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#8b5cf6' }}>Storage</div>
              <div className={styles.kpiValue}><AnimatedNumber value={storageKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#8b5cf6', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{storageKpi.count} Jobs</div>
            </div>
          )}

          {(readyForBillingKpi.count > 0 || readyForBillingKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.02))', borderColor: 'rgba(16,185,129,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#10b981' }}>Ready for Billing</div>
              <div className={styles.kpiValue}><AnimatedNumber value={readyForBillingKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#10b981', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{readyForBillingKpi.count} Jobs</div>
            </div>
          )}

          {(toBeCancelledKpi.count > 0 || toBeCancelledKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(153,27,27,0.15), rgba(153,27,27,0.02))', borderColor: 'rgba(153,27,27,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#991b1b' }}>To Be Cancelled</div>
              <div className={styles.kpiValue}><AnimatedNumber value={toBeCancelledKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#991b1b', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{toBeCancelledKpi.count} Jobs</div>
            </div>
          )}

          {(executionPendingKpi.count > 0 || executionPendingKpi.value > 0) && (
            <div className={styles.kpiCard} style={{ ...kpiCardWidthStyle, background: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(100,116,139,0.02))', borderColor: 'rgba(100,116,139,0.3)' }}>
              <div className={styles.kpiLabel} style={{ color: '#64748b' }}>Execution Pending</div>
              <div className={styles.kpiValue}><AnimatedNumber value={executionPendingKpi.value} isCurrency /></div>
              <div className={styles.kpiCount} style={{ color: '#64748b', opacity: showJobCounts ? 1 : 0, transition: 'opacity 0.4s ease' }}>{executionPendingKpi.count} Jobs</div>
            </div>
          )}
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                {ALL_UNBILLED_COLUMNS.map(col => {
                  const isFiltered = (columnFilters[col.id] && columnFilters[col.id].length > 0);
                  const isSorted = columnSorts[col.id];
                  return (
                    <th key={col.id} style={{ textAlign: (col.id === 'quote_value' || col.id === 'no_of_days') ? 'right' : 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: (col.id === 'quote_value' || col.id === 'no_of_days') ? 'flex-end' : 'space-between' }}>
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
              {loading ? (
                <tr>
                  <td colSpan={ALL_UNBILLED_COLUMNS.length} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Loading unbilled jobs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={ALL_UNBILLED_COLUMNS.length} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    No matching unbilled jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.slice(0, visibleCount).map((j, idx) => {
                const enqKey = j.enq_number || j.enquiry_number || '';
                const quoteVal = enquiryValues[enqKey] || j.quote_value || 0;
                const uniqueKey = j.id ? `${j.source_table || 'job'}-${j.id}` : `job-${j.job_number}-${idx}`;
                return (
                  <tr key={uniqueKey}>
                    {/* 1. Remarks (First Column) */}
                    <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleOpenFollowupDrawer(j)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: followupsMap[j.job_number] ? 'rgba(16,185,129,0.1)' : 'rgba(79,70,229,0.08)',
                          color: followupsMap[j.job_number] ? '#059669' : '#4f46e5',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {followupsMap[j.job_number] ? 'View Remark' : 'Add Remark'}
                      </button>
                    </td>

                    {/* 2. Date (job_date) */}
                    <td>{formatDate(j.job_date)}</td>

                    {/* 3. No of Days */}
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {(() => {
                        const days = calculateNoOfDays(j.job_date);
                        return days !== null ? days : '—';
                      })()}
                    </td>

                    {/* 4. Job Number (Clickable link only for current year jobs e.g. JB/XXXX/26/YYY) */}
                    <td style={{ fontWeight: 800 }}>
                      {isThisYearJob(j.job_number) ? (
                        <span
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              sessionStorage.setItem('csc_last_jobs_page', '/home/unbilled');
                            }
                            router.push(`/home/job/${encodeURIComponent(j.job_number)}`);
                          }}
                          style={{
                            cursor: 'pointer',
                            color: '#4f46e5',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#3730a3')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#4f46e5')}
                          title={`View Job Details: ${j.job_number}`}
                        >
                          {j.job_number}
                        </span>
                      ) : (
                        <span style={{ color: '#6d28d9' }}>
                          {j.job_number || '—'}
                        </span>
                      )}
                    </td>

                    {/* 5. Enquiry # */}
                    <td>{j.enq_number || j.enquiry_number || '—'}</td>

                    {/* 6. Client & Company */}
                    <td style={{ maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ fontWeight: 700, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.customer_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9f1239', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' }}>{j.company || '—'}</div>
                    </td>

                    {/* 7. Value */}
                    <td style={{ fontWeight: 700, color: '#3b82f6', textAlign: 'right' }}>
                      ₹{Number(quoteVal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    {/* 8. Packing Dt */}
                    <td>
                      <DateCellInput
                        value={j.packing_date}
                        onChange={(val) => handleUpdateJobField(j, 'packing_date', val)}
                        disabled={isViewer}
                      />
                    </td>

                    {/* 9. Delivery Dt */}
                    <td>
                      <DateCellInput
                        value={j.actual_delivery}
                        onChange={(val) => handleUpdateJobField(j, 'actual_delivery', val)}
                        disabled={isViewer}
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
                        disabled={isViewer}
                        textColor={getGoodsStatusColor(j.goods_track_status)}
                      />
                    </td>

                    {/* 11. SPOC */}
                    <td>
                      <SpocCellInput
                        value={j.spoc_name || j.unbilled_spoc}
                        onChange={(val) => handleUpdateJobField(j, 'spoc_name', val)}
                        disabled={isViewer}
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
                        disabled={isViewer}
                      />
                    </td>

                    {/* 13. Bill Closure Dt */}
                    <td>
                      <DateCellInput
                        value={j.bill_closure_date}
                        onChange={(val) => handleUpdateJobField(j, 'bill_closure_date', val)}
                        disabled={isViewer}
                      />
                    </td>

                    {/* 14. PO Rcvd Dt (po_date) */}
                    <td>
                      <DateCellInput
                        value={j.po_date}
                        onChange={(val) => handleUpdateJobField(j, 'po_date', val)}
                        disabled={isViewer}
                      />
                    </td>

                    {/* 15. Inv Request Dt */}
                    <td>
                      <DateCellInput
                        value={j.inv_request_date}
                        onChange={(val) => handleUpdateJobField(j, 'inv_request_date', val)}
                        disabled={isViewer}
                      />
                    </td>
                  </tr>
                );
              })
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
                <h3 className={styles.drawerTitle}>Remarks & Follow-ups</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Job: {activeDrawerJob.job_number} | Branch: {activeDrawerJob.branch}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setActiveDrawerJob(null)}>✕</button>
            </div>

            {!isViewer && (
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
            )}

            <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Previous Follow-up Logs</h4>
            <div className={styles.historyList}>
              {followupHistory.map((item) => (
                <div key={item.id} className={styles.historyCard}>
                  <div className={styles.historyMeta}>
                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>
                      {item.agent_name}{item.branch ? ` (${item.branch})` : ''}
                    </span>
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
                    {isThisYearJob(rem.job_number) ? (
                      <span
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem('csc_last_jobs_page', '/home/unbilled');
                          }
                          router.push(`/home/job/${encodeURIComponent(rem.job_number)}`);
                        }}
                        style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}
                        title={`View Job Details: ${rem.job_number}`}
                      >
                        Job: {rem.job_number}
                      </span>
                    ) : (
                      <span style={{ color: '#4f46e5' }}>
                        Job: {rem.job_number}
                      </span>
                    )}
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

      {/* Scrollable Unbilled Financial Year Reports Modal */}
      {showReportsPopup && (
        <div 
          className={styles.drawerOverlay} 
          onClick={() => setShowReportsPopup(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '1440px', 
              maxHeight: '92vh', 
              background: 'var(--surface-color)', 
              color: 'var(--text-primary)', 
              borderRadius: '20px', 
              padding: '1.25rem', 
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              overflowY: 'auto',
              overflowX: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Table 1: Current FY */}
            <div className="glass" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                  Unbilled Reports Current FY
                </h3>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem', border: '1px solid var(--table-border-color)' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem', border: '1px solid var(--table-border-color)', background: 'var(--table-header-bg)', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 800, position: 'sticky', left: 0, zIndex: 10 }}>
                      Branch
                    </th>
                    {currentFyUnbilledMatrix.categories.map(c => (
                      <th key={c.id} style={{ padding: '0.65rem 0.4rem', border: '1px solid var(--table-border-color)', background: 'var(--table-header-bg)', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'normal', lineHeight: 1.2 }}>
                        <div style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '8px',
                          background: `${c.color}15`,
                          color: c.color,
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          boxShadow: `0 1px 2px ${c.color}15`
                        }}>
                          <span>{c.line1}</span>
                          {c.line2 ? <span style={{ fontSize: '0.76rem', opacity: 0.95 }}>{c.line2}</span> : null}
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: '0.65rem 0.5rem', border: '1px solid var(--table-border-color)', background: 'var(--table-header-bg)', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', padding: '0.35rem 0.65rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', fontWeight: 800, fontSize: '0.82rem' }}>
                        Total
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentFyUnbilledMatrix.data.map((row: any) => (
                    <tr key={row.branch} style={{ background: 'var(--bg-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-color)'}>
                      <td style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 800, textAlign: 'center', position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 5 }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', fontSize: '0.84rem', letterSpacing: '0.03em', fontWeight: 800 }}>
                          {row.branch}
                        </span>
                      </td>
                      {currentFyUnbilledMatrix.categories.map(c => (
                        <td key={c.id} style={{ padding: '0.65rem 0.8rem', border: '1px solid var(--table-border-color)', color: row[c.id] ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row[c.id] ? 700 : 400, fontFamily: row[c.id] ? 'var(--font-mono)' : 'inherit', fontSize: '0.86rem' }}>
                          {row[c.id] ? row[c.id].toLocaleString('en-IN', { maximumFractionDigits: 0 }) : <span style={{ opacity: 0.25 }}>—</span>}
                        </td>
                      ))}
                      <td style={{ padding: '0.65rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 800, color: row.Total ? '#d97706' : 'var(--text-secondary)', background: 'rgba(245, 158, 11, 0.04)', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
                        {row.Total ? row.Total.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : <span style={{ opacity: 0.25 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(245, 158, 11, 0.06))' }}>
                    <td style={{ padding: '0.85rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 900, textAlign: 'center', position: 'sticky', left: 0, background: 'var(--surface-color)', zIndex: 5, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>TOTAL</td>
                    {currentFyUnbilledMatrix.categories.map(c => (
                      <td key={c.id} style={{ padding: '0.85rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 800, color: currentFyUnbilledMatrix.totals[c.id] ? c.color : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                        {currentFyUnbilledMatrix.totals[c.id] ? currentFyUnbilledMatrix.totals[c.id].toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                      </td>
                    ))}
                    <td style={{ padding: '0.85rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 900, background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', fontSize: '0.98rem', fontFamily: 'var(--font-mono)' }}>
                      {currentFyUnbilledMatrix.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: Previous FY */}
            <div className="glass" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                  Unbilled Reports Previous FY
                </h3>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem', border: '1px solid var(--table-border-color)' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem', border: '1px solid var(--table-border-color)', background: 'var(--table-header-bg)', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 800, position: 'sticky', left: 0, zIndex: 10 }}>
                      Branch
                    </th>
                    {previousFyUnbilledMatrix.categories.map(c => (
                      <th key={c.id} style={{ padding: '0.65rem 0.4rem', border: '1px solid var(--table-border-color)', background: 'var(--table-header-bg)', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'normal', lineHeight: 1.2 }}>
                        <div style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '8px',
                          background: `${c.color}15`,
                          color: c.color,
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          boxShadow: `0 1px 2px ${c.color}15`
                        }}>
                          <span>{c.line1}</span>
                          {c.line2 ? <span style={{ fontSize: '0.76rem', opacity: 0.95 }}>{c.line2}</span> : null}
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: '0.65rem 0.5rem', border: '1px solid var(--table-border-color)', background: 'var(--table-header-bg)', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', padding: '0.35rem 0.65rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', fontWeight: 800, fontSize: '0.82rem' }}>
                        Total
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previousFyUnbilledMatrix.data.map((row: any) => (
                    <tr key={row.branch} style={{ background: 'var(--bg-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-color)'}>
                      <td style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 800, textAlign: 'center', position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 5 }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', fontSize: '0.84rem', letterSpacing: '0.03em', fontWeight: 800 }}>
                          {row.branch}
                        </span>
                      </td>
                      {previousFyUnbilledMatrix.categories.map(c => (
                        <td key={c.id} style={{ padding: '0.65rem 0.8rem', border: '1px solid var(--table-border-color)', color: row[c.id] ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row[c.id] ? 700 : 400, fontFamily: row[c.id] ? 'var(--font-mono)' : 'inherit', fontSize: '0.86rem' }}>
                          {row[c.id] ? row[c.id].toLocaleString('en-IN', { maximumFractionDigits: 0 }) : <span style={{ opacity: 0.25 }}>—</span>}
                        </td>
                      ))}
                      <td style={{ padding: '0.65rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 800, color: row.Total ? '#d97706' : 'var(--text-secondary)', background: 'rgba(245, 158, 11, 0.04)', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
                        {row.Total ? row.Total.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : <span style={{ opacity: 0.25 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(245, 158, 11, 0.06))' }}>
                    <td style={{ padding: '0.85rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 900, textAlign: 'center', position: 'sticky', left: 0, background: 'var(--surface-color)', zIndex: 5, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>TOTAL</td>
                    {previousFyUnbilledMatrix.categories.map(c => (
                      <td key={c.id} style={{ padding: '0.85rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 800, color: previousFyUnbilledMatrix.totals[c.id] ? c.color : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                        {previousFyUnbilledMatrix.totals[c.id] ? previousFyUnbilledMatrix.totals[c.id].toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                      </td>
                    ))}
                    <td style={{ padding: '0.85rem 0.8rem', border: '1px solid var(--table-border-color)', fontWeight: 900, background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', fontSize: '0.98rem', fontFamily: 'var(--font-mono)' }}>
                      {previousFyUnbilledMatrix.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
