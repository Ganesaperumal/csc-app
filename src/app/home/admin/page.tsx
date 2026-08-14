'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import CustomSelect from '../components/CustomSelect';
import { useRouter } from 'next/navigation';
import BulkPodUploadModal from '../components/BulkPodUploadModal';
import { usePermissions } from '@/components/PermissionsContext';
import MissingDataSection from './MissingDataSection';

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-color)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '16px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.04), inset 0 1px 0 var(--surface-color)',
  padding: '2rem',
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
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'var(--surface-color)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'var(--surface-color)',
  color: 'var(--text-primary)',
  fontSize: '0.82rem',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  cursor: 'pointer',
  minWidth: '130px',
};

export default function AdminPage() {
  const { getAccessLevel } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingBulkUpdate, setLoadingBulkUpdate] = useState(false);
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState<{ current: number, total: number } | null>(null);
  const [loadingForceUpdate, setLoadingForceUpdate] = useState(false);
  const [forceUpdateProgress, setForceUpdateProgress] = useState<{ current: number, total: number } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [syncingPods, setSyncingPods] = useState(false);
  const [jobQuoteRows, setJobQuoteRows] = useState<{ job_number: string; quote_value: string }[]>([
    { job_number: '', quote_value: '' },
    { job_number: '', quote_value: '' }
  ]);
  const [loadingJobQuote, setLoadingJobQuote] = useState(false);
  const [csvUploadMode, setCsvUploadMode] = useState<'fill_empty' | 'force_overwrite'>('fill_empty');
  const [overwriteBlankWithNull, setOverwriteBlankWithNull] = useState(false);

  // Legacy jobs bulk delete states & handlers
  const [legacyDeleteMode, setLegacyDeleteMode] = useState<'rows' | 'textarea'>('rows');
  const [legacyTextareaInput, setLegacyTextareaInput] = useState('');
  const [legacyDeleteRows, setLegacyDeleteRows] = useState<{ job_number: string }[]>([
    { job_number: '' },
    { job_number: '' },
    { job_number: '' }
  ]);
  const [loadingDeleteLegacy, setLoadingDeleteLegacy] = useState(false);

  const handleAddLegacyDeleteRow = () => {
    setLegacyDeleteRows(prev => [...prev, { job_number: '' }]);
  };

  const handleRemoveLegacyDeleteRow = (index: number) => {
    if (legacyDeleteRows.length <= 1) return;
    setLegacyDeleteRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleLegacyDeleteRowChange = (index: number, value: string) => {
    setLegacyDeleteRows(prev => {
      const next = [...prev];
      next[index] = { job_number: value };
      return next;
    });
  };

  const handleBulkDeleteLegacyJobs = async () => {
    let rawInputs: string[] = [];

    if (legacyDeleteMode === 'rows') {
      rawInputs = legacyDeleteRows.map(r => r.job_number);
    } else {
      rawInputs = legacyTextareaInput.split(/[\r\n,\t;]+/);
    }

    // Split any row containing multiple values (newlines, commas, tabs, spaces)
    const validJobNumbers = Array.from(
      new Set(
        rawInputs
          .flatMap(item => item.split(/[\r\n,\t;]+/))
          .map(jn => jn.trim().replace(/^["']|["']$/g, ''))
          .filter(jn => jn.length > 0)
      )
    );

    if (validJobNumbers.length === 0) {
      showToast('Please enter at least one Legacy Job Number before deleting.', 'error');
      return;
    }

    const confirmed = await customConfirm(
      `🚨 WARNING: Are you sure you want to BULK DELETE up to ${validJobNumbers.length} job(s) strictly from the LEGACY_JOBS table?\n\n` +
      `Target Job Numbers (${validJobNumbers.length}):\n${validJobNumbers.join(', ')}\n\n` +
      `This operation is permanent and ONLY affects the legacy_jobs table.`
    );
    if (!confirmed) return;

    setLoadingDeleteLegacy(true);
    try {
      const res = await fetch('/api/admin/delete-legacy-jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobNumbers: validJobNumbers })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete legacy jobs');
      }

      if (data.deletedCount === 0) {
        showToast(`⚠️ No matching jobs found in legacy_jobs table for: ${validJobNumbers.join(', ')}`, 'info');
      } else if (data.deletedCount < validJobNumbers.length) {
        showToast(`✅ Deleted ${data.deletedCount} matching legacy job(s) from legacy_jobs table (${validJobNumbers.length - data.deletedCount} not found in DB).`, 'success');
      } else {
        showToast(`✅ Successfully deleted all ${data.deletedCount} legacy job(s) from legacy_jobs table!`, 'success');
      }

      setLegacyDeleteRows([
        { job_number: '' },
        { job_number: '' },
        { job_number: '' }
      ]);
      setLegacyTextareaInput('');
    } catch (err: any) {
      showToast(`❌ Delete failed: ${err.message}`, 'error');
    } finally {
      setLoadingDeleteLegacy(false);
    }
  };

  const router = useRouter();

  const handleConsolidatedCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (csvUploadMode === 'force_overwrite') {
      uploadForceUpdateCSV(e);
    } else {
      uploadBulkUpdateCSV(e);
    }
  };

  const handleAddJobQuoteRow = () => {
    setJobQuoteRows(prev => [...prev, { job_number: '', quote_value: '' }]);
  };

  const handleRemoveJobQuoteRow = (index: number) => {
    if (jobQuoteRows.length <= 1) return;
    setJobQuoteRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleJobQuoteRowChange = (index: number, field: 'job_number' | 'quote_value', value: string) => {
    setJobQuoteRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleUpdateJobQuoteValues = async () => {
    const validRows = jobQuoteRows.filter(r => r.job_number.trim() !== '');
    if (validRows.length === 0) {
      showToast('Please enter at least one Job Number before updating.', 'error');
      return;
    }

    const confirmed = await customConfirm(
      `Are you sure you want to forcibly update quote values for ${validRows.length} Job number(s)?`
    );
    if (!confirmed) return;

    setLoadingJobQuote(true);
    try {
      const res = await fetch('/api/admin/update-quote-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update quote values');
      }

      showToast(`Successfully updated ${data.updatedCount} Job quote value(s)!`, 'success');
      setJobQuoteRows([
        { job_number: '', quote_value: '' },
        { job_number: '', quote_value: '' }
      ]);
    } catch (err: any) {
      showToast(`Failed to update Job quote values: ${err.message}`, 'error');
    } finally {
      setLoadingJobQuote(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
        return;
      }
      setCurrentUser(data.user);
      supabase.from('profiles').select('*').eq('id', data.user.id).single()
        .then(({ data: profile }) => {
          const isSuperAdmin = profile?.is_super_admin === true;

          if (profile && isSuperAdmin) {
            setUserRole(profile.csc_access || profile.csc_role || 'View');
            setCheckingAuth(false);
          } else {
            showToast('⛔ Access Denied: Admin Center is restricted to Super Admin only.', 'error');
            router.push('/home/active-jobs');
          }
        });
    });
  }, [router]);

  const downloadCSV = async (table: string = 'jobs') => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${table}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to download ${table}: ${err.message}` });
    }
  };

  const uploadBulkUpdateCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingBulkUpdate(true);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          if (data.length === 0) throw new Error("CSV is empty");

          const headers = Object.keys(data[0]);
          if (headers.length < 2) {
             throw new Error("CSV must have at least 2 columns: Job_number and the columns to update.");
          }

          const jobNumberKey = headers.find(h => h.toLowerCase() === 'job_number' || h.toLowerCase() === 'job number' || h.toLowerCase() === 'jobnumber');
          if (!jobNumberKey) {
            throw new Error("Could not find a 'Job_number' column in the CSV.");
          }

          const updateColumns = headers.filter(h => h !== jobNumberKey);
          if (updateColumns.length === 0) {
            throw new Error("Could not find any columns to update in the CSV.");
          }

          let successCount = 0;
          let failCount = 0;
          let skipCount = 0;
          const totalRows = data.filter(r => r[jobNumberKey]).length;
          let currentRowIndex = 0;

          setBulkUpdateProgress({ current: 0, total: totalRows });

          // Process sequentially to avoid rate limits
          for (const row of data) {
            const jobNumber = row[jobNumberKey];
            if (!jobNumber) continue;
            
            currentRowIndex++;
            setBulkUpdateProgress({ current: currentRowIndex, total: totalRows });

            // Fetch current job
            const { data: existingJob, error: fetchError } = await supabase
              .from('jobs')
              .select(updateColumns.join(','))
              .eq('job_number', jobNumber)
              .single();

            if (fetchError) {
              console.error(`Failed to fetch ${jobNumber}:`, fetchError);
              failCount++;
              continue;
            }

            const updateData: any = {};
            let hasUpdates = false;

            const jobRecord = existingJob as Record<string, any>;
            for (const col of updateColumns) {
              const currentValue = jobRecord ? jobRecord[col] : null;
              let rawValue = row[col];
              const isExplicitNull = typeof rawValue === 'string' && ['null', 'empty', '#clear', '[null]', '<null>'].includes(rawValue.trim().toLowerCase());
              const isCellBlank = rawValue === null || rawValue === undefined || rawValue === '' || (typeof rawValue === 'string' && rawValue.trim() === '');

              // If the CSV cell is empty, skip updating this column
              if (isCellBlank && !isExplicitNull) {
                continue;
              }

              // Only update if current DB value is null or empty
              if (currentValue === null || currentValue === undefined || currentValue === '') {
                updateData[col] = isExplicitNull ? null : rawValue;
                hasUpdates = true;
              }
            }

            if (!hasUpdates) {
              skipCount++;
              continue;
            }

            const { error } = await supabase
              .from('jobs')
              .update(updateData)
              .eq('job_number', jobNumber);
              
            if (error) {
              console.error(`Failed to update ${jobNumber}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          
          setMessage({ type: 'success', text: `Successfully updated ${successCount} jobs! Skipped ${skipCount} jobs entirely (all provided columns already had data). ${failCount > 0 ? `Failed on ${failCount} jobs.` : ''}` });
          setBulkUpdateProgress(null);

        } catch (err: any) {
           setMessage({ type: 'error', text: `Failed to bulk update: ${err.message}` });
           setBulkUpdateProgress(null);
        } finally {
          setLoadingBulkUpdate(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        setMessage({ type: 'error', text: `CSV Parse Error: ${error.message}` });
        setLoadingBulkUpdate(false);
        e.target.value = '';
      }
    });
  };

  const uploadForceUpdateCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingForceUpdate(true);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          if (data.length === 0) throw new Error("CSV is empty");

          const headers = Object.keys(data[0]);
          if (headers.length < 2) {
             throw new Error("CSV must have at least 2 columns: Job_number and the columns to update.");
          }

          const jobNumberKey = headers.find(h => h.toLowerCase() === 'job_number' || h.toLowerCase() === 'job number' || h.toLowerCase() === 'jobnumber');
          if (!jobNumberKey) {
            throw new Error("Could not find a 'Job_number' column in the CSV.");
          }

          const updateColumns = headers.filter(h => h !== jobNumberKey);
          if (updateColumns.length === 0) {
            throw new Error("Could not find any columns to update in the CSV.");
          }

          let successCount = 0;
          let failCount = 0;
          let skipCount = 0;
          const totalRows = data.filter(r => r[jobNumberKey]).length;
          let currentRowIndex = 0;

          setForceUpdateProgress({ current: 0, total: totalRows });

          for (const row of data) {
            const jobNumber = row[jobNumberKey];
            if (!jobNumber) continue;
            
            currentRowIndex++;
            setForceUpdateProgress({ current: currentRowIndex, total: totalRows });

            const updateData: any = {};
            let hasUpdates = false;

            for (const col of updateColumns) {
              let rawValue = row[col];
              const isExplicitNull = typeof rawValue === 'string' && ['null', 'empty', '#clear', '[null]', '<null>'].includes(rawValue.trim().toLowerCase());
              const isCellBlank = rawValue === null || rawValue === undefined || rawValue === '' || (typeof rawValue === 'string' && rawValue.trim() === '');

              if (isExplicitNull) {
                updateData[col] = null;
                hasUpdates = true;
              } else if (isCellBlank) {
                if (overwriteBlankWithNull) {
                  updateData[col] = null;
                  hasUpdates = true;
                } else {
                  continue;
                }
              } else {
                updateData[col] = rawValue;
                hasUpdates = true;
              }
            }

            if (!hasUpdates) {
              skipCount++;
              continue;
            }

            const { error } = await supabase
              .from('jobs')
              .update(updateData)
              .eq('job_number', jobNumber);
              
            if (error) {
              console.error(`Failed to update ${jobNumber}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          
          setMessage({ type: 'success', text: `Successfully force-updated ${successCount} jobs! Skipped ${skipCount} jobs entirely (no values provided). ${failCount > 0 ? `Failed on ${failCount} jobs.` : ''}` });
          setForceUpdateProgress(null);

        } catch (err: any) {
           setMessage({ type: 'error', text: `Failed to force update: ${err.message}` });
           setForceUpdateProgress(null);
        } finally {
          setLoadingForceUpdate(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        setMessage({ type: 'error', text: `CSV Parse Error: ${error.message}` });
        setLoadingForceUpdate(false);
        e.target.value = '';
      }
    });
  };

  const uploadCSV = (e: React.ChangeEvent<HTMLInputElement>, table: 'jobs' | 'audit_logs') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (table === 'jobs') setLoadingJobs(true);
    if (table === 'audit_logs') setLoadingLogs(true);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          // Clean data: remove empty strings that should be null, handle ids
          const cleanedData = data.map(row => {
            const cleanRow: any = {};
            for (const key in row) {
              if (row[key] === '') {
                cleanRow[key] = null;
              } else {
                cleanRow[key] = row[key];
              }
            }
            if (!cleanRow.id) delete cleanRow.id;
            return cleanRow;
          });

          let res;
          if (table === 'jobs') {
            res = await supabase.from('jobs').upsert(cleanedData, { onConflict: 'job_number' });
          } else {
            res = await supabase.from('audit_logs').upsert(cleanedData);
          }

          if (res.error) throw res.error;

          setMessage({ type: 'success', text: `Successfully upserted ${cleanedData.length} records into ${table}!` });
        } catch (err: any) {
          setMessage({ type: 'error', text: `Failed to upload ${table}: ${err.message}` });
        } finally {
          if (table === 'jobs') setLoadingJobs(false);
          if (table === 'audit_logs') setLoadingLogs(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        setMessage({ type: 'error', text: `CSV Parse Error: ${error.message}` });
        if (table === 'jobs') setLoadingJobs(false);
        if (table === 'audit_logs') setLoadingLogs(false);
        e.target.value = '';
      }
    });
  };



  const handleDeleteAllJobs = async () => {
    if (!await customConfirm('🚨 DANGER! Are you absolutely sure you want to delete EVERY job? This cannot be undone!')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/delete-jobs', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete jobs');
      showToast('✅ All jobs wiped successfully!', 'success');
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPods = async () => {
    setSyncingPods(true);
    try {
      showToast('⏳ Fetching all jobs with documents...', 'info');
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('job_number, documents');
        
      if (error) throw error;
      
      const jobsWithDocs = jobs?.filter(j => j.documents && j.documents.length > 0) || [];
      if (jobsWithDocs.length === 0) {
        showToast('✅ No active documents found to sync.', 'success');
        setSyncingPods(false);
        return;
      }

      showToast(`⏳ Verifying ${jobsWithDocs.length} jobs' document links...`, 'info');
      let allUrls: string[] = [];
      jobsWithDocs.forEach(j => {
        j.documents.forEach((d: any) => {
          if (d.url) allUrls.push(d.url);
        });
      });
      
      const res = await fetch('/api/documents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: allUrls })
      });
      const verifyData = await res.json();
      
      if (!res.ok) throw new Error(verifyData.error || 'Verification failed');
      
      const missingUrls = verifyData.results.filter((r: any) => !r.ok).map((r: any) => r.url);
      
      if (missingUrls.length === 0) {
        showToast('✅ All document links are healthy!', 'success');
        setSyncingPods(false);
        return;
      }
      
      showToast(`⏳ Cleaning up ${missingUrls.length} broken document records...`, 'info');
      
      for (const job of jobsWithDocs) {
        const validDocs = job.documents.filter((d: any) => !missingUrls.includes(d.url));
        if (validDocs.length !== job.documents.length) {
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ documents: validDocs })
            .eq('job_number', job.job_number);
          if (updateError) throw updateError;
        }
      }
      
      showToast(`✅ Successfully cleaned up ${missingUrls.length} orphaned documents!`, 'success');
    } catch (err: any) {
      showToast(`❌ Error syncing PODs: ${err.message}`, 'error');
    } finally {
      setSyncingPods(false);
    }
  };

  if (checkingAuth) {
    return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Checking permissions...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1250px', margin: '0 auto', height: '100%', overflowY: 'auto', fontFamily: "'Outfit', 'Inter', sans-serif" }}>


      {/* 📦 Bulk Data Management Card */}
      <div style={{ ...cardStyle, marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>📦</span>
          Bulk Data Management
        </h2>
        
        {/* ⚠️ Missing Data Management: Missing Quote Value & Missing Unbilled SPOC */}
        <MissingDataSection />

        {/* 1. CSV Data Export & Import Center */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📊</span> 1. CSV Data Import &amp; Export
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Download or bulk update system tables using CSV files. Choose your target table and upload strategy below.
          </p>

          <div style={{ background: 'rgba(148, 163, 184, 0.05)', borderRadius: '12px', padding: '1.2rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            {/* Upload Strategy selector */}
            <div>
              <label style={labelStyle}>Upload Strategy</label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setCsvUploadMode('fill_empty')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: csvUploadMode === 'fill_empty' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    background: csvUploadMode === 'fill_empty' ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-color)',
                    color: csvUploadMode === 'fill_empty' ? '#d97706' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🛡️ Fill Empty Fields Only (Preserves existing data)
                </button>

                <button
                  type="button"
                  onClick={() => setCsvUploadMode('force_overwrite')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: csvUploadMode === 'force_overwrite' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    background: csvUploadMode === 'force_overwrite' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-color)',
                    color: csvUploadMode === 'force_overwrite' ? '#dc2626' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Force Overwrite (Replaces existing DB values)
                </button>
              </div>

              {csvUploadMode === 'force_overwrite' && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input 
                    type="checkbox"
                    id="overwriteBlankWithNull"
                    checked={overwriteBlankWithNull}
                    onChange={(e) => setOverwriteBlankWithNull(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }}
                  />
                  <label htmlFor="overwriteBlankWithNull" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    🗑️ <strong>Treat blank / empty CSV cells as NULL</strong> (Explicitly clear / wipe database fields if left blank in CSV)
                  </label>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => downloadCSV('jobs')}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                📥 Download Jobs CSV
              </button>
              
              <div style={{ position: 'relative' }}>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleConsolidatedCsvUpload}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  disabled={loadingJobs || loadingLogs || loadingBulkUpdate || loadingForceUpdate}
                />
                <button 
                  disabled={loadingJobs || loadingLogs || loadingBulkUpdate || loadingForceUpdate}
                  style={{ 
                    padding: '0.6rem 1.25rem', 
                    borderRadius: '8px', 
                    background: (loadingJobs || loadingLogs || loadingBulkUpdate || loadingForceUpdate)
                      ? (csvUploadMode === 'force_overwrite'
                          ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                          : 'linear-gradient(135deg, #d97706, #b45309)')
                      : (csvUploadMode === 'force_overwrite'
                          ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                          : csvUploadMode === 'fill_empty'
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : 'linear-gradient(135deg, #10b981, #059669)'), 
                    color: '#ffffff', 
                    border: 'none', 
                    pointerEvents: 'none', 
                    fontWeight: 700, 
                    fontSize: '0.875rem',
                    boxShadow: csvUploadMode === 'force_overwrite'
                      ? '0 4px 12px rgba(239,68,68,0.35)'
                      : '0 4px 12px rgba(245,158,11,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                    minWidth: '220px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loadingBulkUpdate ? (
                    bulkUpdateProgress ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                        <span>Uploading {bulkUpdateProgress.current} / {bulkUpdateProgress.total}</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                        <span>Uploading...</span>
                      </>
                    )
                  ) : loadingForceUpdate ? (
                    forceUpdateProgress ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                        <span>Overwriting {forceUpdateProgress.current} / {forceUpdateProgress.total}</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                        <span>Overwriting...</span>
                      </>
                    )
                  ) : loadingJobs || loadingLogs ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    '📤 Upload Jobs CSV'
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Job Quote Value Quick Editor */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>💰</span> 2. Job Quote Values Quick Editor
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                Add row(s) to enter Job Number and Quote Value. Click <strong>Update</strong> at top right to forcibly update database values (or set null if left empty).
              </p>
            </div>

            <button
              onClick={handleUpdateJobQuoteValues}
              disabled={loadingJobQuote}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                background: loadingJobQuote ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                cursor: loadingJobQuote ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexShrink: 0
              }}
            >
              {loadingJobQuote ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <span>Updating...</span>
                </>
              ) : '⚡ Update'}
            </button>
          </div>

          <div style={{ background: 'rgba(148, 163, 184, 0.05)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>
                <div>#</div>
                <div>Job Number / ENQ</div>
                <div>Quote Value (₹)</div>
                <div></div>
              </div>

              {jobQuoteRows.map((row, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', paddingLeft: '0.25rem' }}>
                    #{index + 1}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. TI-2024-001 or ENQ123"
                    value={row.job_number}
                    onChange={(e) => handleJobQuoteRowChange(index, 'job_number', e.target.value)}
                    style={{
                      padding: '0.55rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Quote value (or empty for null)"
                    value={row.quote_value}
                    onChange={(e) => handleJobQuoteRowChange(index, 'quote_value', e.target.value)}
                    style={{
                      padding: '0.55rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveJobQuoteRow(index)}
                    disabled={jobQuoteRows.length <= 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: jobQuoteRows.length <= 1 ? 'var(--border-color)' : '#ef4444',
                      cursor: jobQuoteRows.length <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.4rem'
                    }}
                    title="Remove Row"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleAddJobQuoteRow}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px dashed var(--primary-color)',
                    background: 'rgba(79, 70, 229, 0.05)',
                    color: '#4f46e5',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  ➕ Add Row
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bulk Document Upload (Cloudflare R2) */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📁</span> 3. Bulk Document &amp; POD Upload
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Upload PODs and job attachments directly to Cloudflare R2 cloud storage.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowBulkUpload(true)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              📄 Bulk Upload Documents
            </button>
          </div>
        </div>

        {/* 4. Bulk Delete Legacy Jobs (Legacy Table Only) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🗑️</span> 4. Bulk Delete Legacy Jobs (Legacy Table Only)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                Mention Job Numbers of legacy table in rows below or paste line-by-line. This operation strictly targets the <strong style={{ color: '#ef4444' }}>legacy_jobs</strong> table in Supabase and will not affect active jobs. Non-existent job numbers will be ignored safely.
              </p>
            </div>

            <button
              onClick={handleBulkDeleteLegacyJobs}
              disabled={loadingDeleteLegacy}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                background: loadingDeleteLegacy ? 'linear-gradient(135deg, #b91c1c, #991b1b)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                cursor: loadingDeleteLegacy ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexShrink: 0
              }}
            >
              {loadingDeleteLegacy ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : '🗑️ Delete Bulk Legacy Jobs'}
            </button>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setLegacyDeleteMode('rows')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: legacyDeleteMode === 'rows' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                background: legacyDeleteMode === 'rows' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-color)',
                color: legacyDeleteMode === 'rows' ? '#ef4444' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              📋 Row Input Mode
            </button>
            <button
              type="button"
              onClick={() => setLegacyDeleteMode('textarea')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: legacyDeleteMode === 'textarea' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                background: legacyDeleteMode === 'textarea' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-color)',
                color: legacyDeleteMode === 'textarea' ? '#ef4444' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              📝 Multi-Line Text Mode
            </button>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: '0.5rem' }}>
            {legacyDeleteMode === 'rows' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>
                  <div>#</div>
                  <div>Legacy Job Number / ENQ</div>
                  <div></div>
                </div>

                {legacyDeleteRows.map((row, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', paddingLeft: '0.25rem' }}>
                      #{index + 1}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. LEGACY-2023-001 (or paste multiple job numbers)"
                      value={row.job_number}
                      onChange={(e) => handleLegacyDeleteRowChange(index, e.target.value)}
                      onPaste={(e) => {
                        const pasteText = e.clipboardData.getData('text');
                        if (pasteText.includes('\n') || pasteText.includes(',')) {
                          e.preventDefault();
                          const items = pasteText
                            .split(/[\r\n,\t;]+/)
                            .map(s => s.trim())
                            .filter(Boolean);
                          if (items.length > 0) {
                            setLegacyDeleteRows(prev => {
                              const next = [...prev];
                              next.splice(index, 1, ...items.map(job_number => ({ job_number })));
                              return next;
                            });
                          }
                        }
                      }}
                      style={{
                        padding: '0.55rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLegacyDeleteRow(index)}
                      disabled={legacyDeleteRows.length <= 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: legacyDeleteRows.length <= 1 ? 'var(--border-color)' : '#ef4444',
                        cursor: legacyDeleteRows.length <= 1 ? 'not-allowed' : 'pointer',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.4rem'
                      }}
                      title="Remove Row"
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleAddLegacyDeleteRow}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px dashed #ef4444',
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    ➕ Add Row (Next Row)
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Tip: You can enter multiple numbers across rows, or paste multi-line lists into any row input!
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  rows={6}
                  placeholder="Paste Legacy Job Numbers here (one per line, or separated by commas)...&#10;e.g.&#10;LEGACY-2023-001&#10;LEGACY-2023-002&#10;LEGACY-2023-003"
                  value={legacyTextareaInput}
                  onChange={(e) => setLegacyTextareaInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

      </div>





      {showBulkUpload && (
        <BulkPodUploadModal 
          onClose={() => setShowBulkUpload(false)} 
          onUploadComplete={() => {}} 
        />
      )}

    </div>
  );
}
