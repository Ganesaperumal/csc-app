'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import CustomSelect from '../components/CustomSelect';
import { useRouter } from 'next/navigation';
import BulkPodUploadModal from '../components/BulkPodUploadModal';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [savingAi, setSavingAi] = useState(false);
  const [loadingBulkUpdate, setLoadingBulkUpdate] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [syncingPods, setSyncingPods] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile) {
              const role = profile.role;
              setUserRole(role);
              if (role !== 'Admin') {
                router.push('/dashboard');
              } else {
                setCheckingAuth(false);
                fetchAiSettings();
              }
            }
          });
      }
    });
  }, [router]);

  const downloadCSV = async (table: 'jobs' | 'job_logs') => {
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
             throw new Error("CSV must have at least 2 columns: Job_number and the column to update.");
          }

          const jobNumberKey = headers.find(h => h.toLowerCase() === 'job_number' || h.toLowerCase() === 'job number' || h.toLowerCase() === 'jobnumber');
          if (!jobNumberKey) {
            throw new Error("Could not find a 'Job_number' column in the CSV.");
          }

          const updateColumnKey = headers.find(h => h !== jobNumberKey);
          if (!updateColumnKey) {
            throw new Error("Could not find a column to update in the CSV.");
          }

          let successCount = 0;
          let failCount = 0;

          // Process sequentially to avoid rate limits
          for (const row of data) {
            const jobNumber = row[jobNumberKey];
            let updateValue = row[updateColumnKey];
            
            if (!jobNumber) continue;
            if (updateValue === '') updateValue = null;

            const { error } = await supabase
              .from('jobs')
              .update({ [updateColumnKey]: updateValue })
              .eq('job_number', jobNumber);
              
            if (error) {
              console.error(`Failed to update ${jobNumber}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          
          setMessage({ type: 'success', text: `Successfully updated ${successCount} jobs! ${failCount > 0 ? `Failed to update ${failCount} jobs.` : ''}` });

        } catch (err: any) {
          setMessage({ type: 'error', text: `Failed to bulk update: ${err.message}` });
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

  const uploadCSV = (e: React.ChangeEvent<HTMLInputElement>, table: 'jobs' | 'job_logs') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (table === 'jobs') setLoadingJobs(true);
    if (table === 'job_logs') setLoadingLogs(true);
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
            res = await supabase.from('job_logs').upsert(cleanedData);
          }

          if (res.error) throw res.error;

          setMessage({ type: 'success', text: `Successfully upserted ${cleanedData.length} records into ${table}!` });
        } catch (err: any) {
          setMessage({ type: 'error', text: `Failed to upload ${table}: ${err.message}` });
        } finally {
          if (table === 'jobs') setLoadingJobs(false);
          if (table === 'job_logs') setLoadingLogs(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        setMessage({ type: 'error', text: `CSV Parse Error: ${error.message}` });
        if (table === 'jobs') setLoadingJobs(false);
        if (table === 'job_logs') setLoadingLogs(false);
        e.target.value = '';
      }
    });
  };

  const fetchAiSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json();
      if (data.system_prompt) setAiPrompt(data.system_prompt);
    } catch (err) {
      console.error('Failed to fetch AI settings', err);
    }
  };

  const handleSaveAiSettings = async () => {
    setSavingAi(true);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: aiPrompt })
      });
      if (res.ok) {
        showToast('✅ AI System Instructions updated successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(`❌ Failed: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setSavingAi(false);
    }
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
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto', height: '100%', overflowY: 'auto', fontFamily: "'Outfit', 'Inter', sans-serif" }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          ⚙️ Control Center
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Manage team members, roles, and bulk data operations.
        </p>
      </div>

      {/* AI Settings Card */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>🤖</span>
          AI System Instructions
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Edit the core behavioral guidelines, rules, and logic for the Transworld Intl AI Assistant. These rules apply globally to all AI features.
        </p>
        
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={12}
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5', resize: 'vertical', marginBottom: '1rem' }}
          placeholder="Loading AI instructions..."
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleSaveAiSettings}
            disabled={savingAi}
            style={{ 
              padding: '0.6rem 1.5rem', borderRadius: '8px', 
              background: savingAi ? 'var(--border-color)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)', 
              color: 'white', border: 'none', cursor: savingAi ? 'not-allowed' : 'pointer', 
              fontWeight: 700, boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
              transition: 'all 0.2s'
            }}
          >
            {savingAi ? 'Saving...' : '💾 Save AI Instructions'}
          </button>
        </div>
      </div>

      {/* Bulk Data Management Card */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>📦</span>
          Bulk Data Management:
        </h2>
        
        {/* Jobs Section */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Jobs Table</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Download the current jobs as a CSV file, edit it, and upload it back. Uses <strong>job_number</strong> as the unique identifier for updates (UPSERT).
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => downloadCSV('jobs')}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              Download Jobs CSV
            </button>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => uploadCSV(e, 'jobs')}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                disabled={loadingJobs}
              />
              <button 
                disabled={loadingJobs}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: loadingJobs ? 'var(--border-color)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', pointerEvents: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                {loadingJobs ? 'Uploading...' : 'Upload Jobs CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Update Section */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Bulk Update Jobs (Single Column)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Upload a CSV with exactly 2 columns: <strong>Job_number</strong> and the <strong>Exact Column Title</strong> to update. This will ONLY update existing jobs, it will NOT create new ones.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".csv"
                onChange={uploadBulkUpdateCSV}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                disabled={loadingBulkUpdate}
              />
              <button 
                disabled={loadingBulkUpdate}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: loadingBulkUpdate ? 'var(--border-color)' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', pointerEvents: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}
              >
                {loadingBulkUpdate ? 'Updating...' : 'Upload Bulk Update CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Document Upload Section */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Bulk Upload Documents</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Bulk upload Documents to Cloudflare R2.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowBulkUpload(true)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              📄 Bulk Upload Documents
            </button>
          </div>
        </div>

        {/* Sync POD Storage Section */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Sync POD Storage</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Verify all POD links against Cloudflare storage. If any files were deleted from Cloudflare, this tool will automatically clean up the orphaned database records.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={handleSyncPods}
              disabled={syncingPods}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: syncingPods ? 'var(--border-color)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none', cursor: syncingPods ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
            >
              {syncingPods ? '🔄 Syncing...' : '🧹 Clean up Missing PODs'}
            </button>
          </div>
        </div>

        {/* Job Logs Section */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Job Logs Table</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Download and bulk upload job logs. If you are adding new logs, leave the <strong>id</strong> column blank. Must include <strong>job_number</strong> to map correctly.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => downloadCSV('job_logs')}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              Download Logs CSV
            </button>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => uploadCSV(e, 'job_logs')}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                disabled={loadingLogs}
              />
              <button 
                disabled={loadingLogs}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: loadingLogs ? 'var(--border-color)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', pointerEvents: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                {loadingLogs ? 'Uploading...' : 'Upload Logs CSV'}
              </button>
            </div>
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
