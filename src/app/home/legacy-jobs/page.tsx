'use client';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import CustomSelect from '../components/CustomSelect';
import styles from './legacy.module.css';

const BRANCH_OPTIONS = [
  'BANGALORE', 'CHENNAI', 'HYDERABAD', 'MUMBAI', 'DELHI', 'PUNE', 'KOLKATA', 'AHMEDABAD', 'COCHIN', 'COIMBATORE'
];

export default function LegacyJobsPage() {
  const [legacyJobs, setLegacyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Single Entry Form state
  const [enquiryNumber, setEnquiryNumber] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [quoteValue, setQuoteValue] = useState('');
  const [spocName, setSpocName] = useState('');
  const [branch, setBranch] = useState('');
  const [packingDate, setPackingDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Bulk Upload state
  const [parsing, setParsing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile && profile.role === 'Admin') {
              fetchLegacyJobs();
            } else {
              router.push('/home');
            }
          });
      } else {
        router.push('/home');
      }
    });
  }, [router]);

  const fetchLegacyJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('legacy_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching legacy jobs:', error);
    } else {
      setLegacyJobs(data || []);
    }
    setLoading(false);
  };

  const handleCreateSingleLegacyJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumber || !branch) {
      showToast('Job Number and Branch are required!', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      // 1. Insert into public.legacy_jobs
      const { data, error } = await supabase.from('legacy_jobs').insert([
        {
          job_number: jobNumber.trim(),
          enquiry_number: enquiryNumber || null,
          branch: branch,
          customer_name: customerName || null,
          company: company || null,
          spoc_name: spocName || null,
          packing_date: packingDate || null,
          delivery_date: deliveryDate || null,
          goods_track_status: null,
          po_status: null,
          sales_by: null
        }
      ]).select().single();

      if (error) throw error;

      // 2. If quoteValue provided, insert/upsert into public.enquiry_values
      if (enquiryNumber && quoteValue) {
        await supabase.from('enquiry_values').upsert([
          {
            enquiry_number: enquiryNumber.trim(),
            quote_value: Number(quoteValue),
            source: 'Manual_Input'
          }
        ], { onConflict: 'enquiry_number' });
      }

      showToast(`✅ Legacy job "${jobNumber}" created successfully!`, 'success');

      // Reset form
      setEnquiryNumber('');
      setJobNumber('');
      setCustomerName('');
      setCompany('');
      setQuoteValue('');
      setSpocName('');
      setBranch('');
      setPackingDate('');
      setDeliveryDate('');

      fetchLegacyJobs();
    } catch (err: any) {
      showToast(`❌ Error creating legacy job: ${err.message}`, 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // CSV Drag and Drop Parser
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          if (!rows || rows.length === 0) {
            showToast('CSV file is empty!', 'error');
            setParsing(false);
            return;
          }

          const legacyRecords: any[] = [];
          const enquiryRecords: any[] = [];

          rows.forEach(row => {
            const jobNo = row['Job Number'] || row['job_number'] || row['Job No'] || row['Job#'];
            const br = row['Branch'] || row['branch'] || 'BANGALORE';
            const enqNo = row['Enquiry Number'] || row['enquiry_number'] || row['Enquiry No'] || row['Enquiry#'];
            const val = row['Quote Value'] || row['quote_value'] || row['Value'] || row['Enquiry Value'] || 0;

            if (jobNo) {
              legacyRecords.push({
                enquiry_number: enqNo ? String(enqNo).trim() : null,
                job_number: String(jobNo).trim(),
                customer_name: row['Customer Name'] || row['customer_name'] || row['Client Name'] || null,
                company: row['Company'] || row['company'] || null,
                spoc_name: row['SPOC'] || row['spoc_name'] || null,
                branch: String(br).trim().toUpperCase(),
                packing_date: row['Packing Date'] || row['packing_date'] || null,
                delivery_date: row['Delivery Date'] || row['delivery_date'] || null,
                goods_track_status: row['Goods Status'] || '22. Job Completed',
                po_status: row['PO Status'] || 'PO Pending',
                sales_by: row['Sales By'] || 'TI'
              });

              if (enqNo && val) {
                enquiryRecords.push({
                  enquiry_number: String(enqNo).trim(),
                  quote_value: Number(val),
                  source: 'Manual_CSV'
                });
              }
            }
          });

          if (legacyRecords.length === 0) {
            showToast('No valid job rows found in CSV. Required column: "Job Number"', 'error');
            setParsing(false);
            return;
          }

          // Insert into legacy_jobs in chunks
          const chunkSize = 100;
          for (let i = 0; i < legacyRecords.length; i += chunkSize) {
            const chunk = legacyRecords.slice(i, i + chunkSize);
            await supabase.from('legacy_jobs').insert(chunk);
          }

          // Upsert into enquiry_values in chunks
          if (enquiryRecords.length > 0) {
            for (let i = 0; i < enquiryRecords.length; i += chunkSize) {
              const chunk = enquiryRecords.slice(i, i + chunkSize);
              await supabase.from('enquiry_values').upsert(chunk, { onConflict: 'enquiry_number' });
            }
          }

          showToast(`🎉 Bulk upload complete! Imported ${legacyRecords.length} legacy jobs.`, 'success');
          fetchLegacyJobs();
        } catch (err: any) {
          showToast(`Error importing CSV: ${err.message}`, 'error');
        } finally {
          setParsing(false);
        }
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const handleDeleteSingle = async (id: string, jobNumber: string) => {
    if (!await customConfirm(`🚨 Are you sure you want to delete legacy job "${jobNumber}"?`)) return;
    try {
      const { error } = await supabase.from('legacy_jobs').delete().eq('id', id);
      if (error) throw error;
      showToast('✅ Legacy job deleted successfully', 'success');
      fetchLegacyJobs();
    } catch (err: any) {
      showToast(`Error deleting job: ${err.message}`, 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!await customConfirm(`🚨 Are you sure you want to delete ${selectedIds.length} selected legacy jobs?`)) return;

    try {
      const { error } = await supabase.from('legacy_jobs').delete().in('id', selectedIds);
      if (error) throw error;

      showToast(`✅ ${selectedIds.length} legacy jobs deleted successfully!`, 'success');
      setSelectedIds([]);
      fetchLegacyJobs();
    } catch (err: any) {
      showToast(`Error executing batch delete: ${err.message}`, 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === legacyJobs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(legacyJobs.map(j => j.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📦 Legacy Jobs Management (Pre-01-Apr-2026)</h1>
        <p className={styles.subtitle}>Add, bulk import, and manage old unbilled jobs prior to April 1, 2026.</p>
      </div>

      {/* Single Entry Form */}
      <div className={styles.card} style={{ borderTop: '3px solid #4f46e5' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ➕ Add Single Legacy Unbilled Job
        </h3>
        <form onSubmit={handleCreateSingleLegacyJob} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className={styles.label}>Job Number *</label>
            <input required type="text" className={styles.input} placeholder="e.g. JB/463/25/BLR" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Enquiry Number</label>
            <input type="text" className={styles.input} placeholder="e.g. EN/0/25/123" value={enquiryNumber} onChange={(e) => setEnquiryNumber(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Branch *</label>
            <CustomSelect
              value={branch}
              onChange={(val) => setBranch(val)}
              placeholder="Select Branch"
              options={BRANCH_OPTIONS.map(b => ({ value: b, label: b }))}
            />
          </div>

          <div>
            <label className={styles.label}>Client Name</label>
            <input type="text" className={styles.input} placeholder="e.g. Rahul Sharma" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Company</label>
            <input type="text" className={styles.input} placeholder="e.g. Infosys" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Quote Value (₹)</label>
            <input type="number" className={styles.input} placeholder="e.g. 45000" value={quoteValue} onChange={(e) => setQuoteValue(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>SPOC Name</label>
            <input type="text" className={styles.input} placeholder="e.g. Vikram" value={spocName} onChange={(e) => setSpocName(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Packing Date</label>
            <input type="date" className={styles.input} value={packingDate} onChange={(e) => setPackingDate(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Delivery Date</label>
            <input type="date" className={styles.input} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>

          <button
            type="submit"
            disabled={formSubmitting}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              fontWeight: 700,
              cursor: formSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {formSubmitting ? 'Creating...' : '+ Create Job'}
          </button>
        </form>
      </div>

      {/* Legacy Jobs Table & Batch Delete Toolbar */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            Existing Legacy Jobs ({legacyJobs.length})
          </h3>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🗑 Batch Delete ({selectedIds.length} selected)
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={legacyJobs.length > 0 && selectedIds.length === legacyJobs.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Job Number</th>
                <th>Enquiry Number</th>
                <th>Branch</th>
                <th>Client / Company</th>
                <th>SPOC</th>
                <th>Goods Status</th>
                <th>PO Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {legacyJobs.map((j) => {
                const isChecked = selectedIds.includes(j.id);
                return (
                  <tr key={j.id} style={{ background: isChecked ? 'rgba(79, 70, 229, 0.08)' : 'transparent' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectRow(j.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{j.job_number}</td>
                    <td>{j.enquiry_number || '—'}</td>
                    <td>{j.branch}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{j.customer_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{j.company || '—'}</div>
                    </td>
                    <td>{j.spoc_name || '—'}</td>
                    <td>{j.goods_track_status || '22. Job Completed'}</td>
                    <td>{j.po_status || 'PO Pending'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteSingle(j.id, j.job_number)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {legacyJobs.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No legacy jobs added yet. Use the CSV bulk upload box or form above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
