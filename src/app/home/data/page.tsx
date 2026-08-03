'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/GlobalDialogs';

interface MissingQuoteJob {
  job_number: string;
  enq_number?: string;
  enquiry_number?: string;
  company: string;
  customer_name: string;
  quote_value: string | number | null;
}

interface MissingSpocJob {
  job_number: string;
  enq_number?: string;
  enquiry_number?: string;
  company: string;
  customer_name: string;
  sales_by: string | null;
  spoc_name: string | null;
  unbilled_spoc?: string | null;
}

export default function MissingDataPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quoteJobs, setQuoteJobs] = useState<MissingQuoteJob[]>([]);
  const [spocJobs, setSpocJobs] = useState<MissingSpocJob[]>([]);

  // Local editable state maps: job_number → value
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});
  const [salesInputs, setSalesInputs] = useState<Record<string, string>>({});
  const [spocInputs, setSpocInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, csc_role')
        .eq('id', session.user.id)
        .single();

      const isAdmin = profile?.role === 'Admin' || profile?.csc_role === 'Admin';
      if (!isAdmin) { router.push('/home/active-jobs'); return; }

      await fetchData();
    };
    init();
  }, []);

  const isQuoteMissing = (val: any) => {
    if (val === null || val === undefined) return true;
    const str = String(val).replace(/[^0-9.]/g, '').trim();
    return str === '' || str === '0' || Number(str) === 0;
  };

  const isSpocMissing = (val: any) => {
    if (!val) return true;
    const str = String(val).trim().toLowerCase();
    return (
      str === '' ||
      str === 'unassigned spoc' ||
      str === 'select' ||
      str === '- select -' ||
      str === 'n/a' ||
      str === 'spoc name' ||
      str === 'null' ||
      str === 'undefined'
    );
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch all jobs to evaluate missing values accurately
    const { data: allJobs, error } = await supabase
      .from('jobs')
      .select('job_number, enq_number, company, customer_name, quote_value, sales_by, spoc_name, unbilled_spoc')
      .order('job_number', { ascending: false });

    if (error) {
      showToast(`Error loading jobs: ${error.message}`, 'error');
      setLoading(false);
      return;
    }

    const jobs = allJobs || [];

    // Filter jobs missing quote_value (null, empty, 0, ₹0, etc.)
    const qJobs = jobs.filter(j => isQuoteMissing(j.quote_value));

    // Filter jobs missing sales_by OR spoc_name/unbilled_spoc
    const sJobs = jobs.filter(j => isSpocMissing(j.sales_by) || isSpocMissing(j.spoc_name || j.unbilled_spoc));

    setQuoteJobs(qJobs);
    setSpocJobs(sJobs);

    // Init input maps
    const qi: Record<string, string> = {};
    qJobs.forEach(j => { qi[j.job_number] = ''; });
    setQuoteInputs(qi);

    const si: Record<string, string> = {};
    const spi: Record<string, string> = {};
    sJobs.forEach(j => {
      si[j.job_number] = isSpocMissing(j.sales_by) ? '' : (j.sales_by || '');
      const currentSpoc = j.spoc_name || j.unbilled_spoc;
      spi[j.job_number] = isSpocMissing(currentSpoc) ? '' : (currentSpoc || '');
    });
    setSalesInputs(si);
    setSpocInputs(spi);

    setLoading(false);
  };

  const saveQuote = async (job: MissingQuoteJob) => {
    const val = quoteInputs[job.job_number]?.trim();
    if (!val || Number(val) === 0) { showToast('Please enter a valid non-zero quote value', 'error'); return; }
    setSaving(s => ({ ...s, [`q_${job.job_number}`]: true }));
    const { error } = await supabase
      .from('jobs')
      .update({ quote_value: val })
      .eq('job_number', job.job_number);
    setSaving(s => ({ ...s, [`q_${job.job_number}`]: false }));
    if (error) { showToast(`Error: ${error.message}`, 'error'); return; }
    showToast(`✅ Quote value saved for ${job.enq_number || job.enquiry_number || job.job_number}`, 'success');
    setQuoteJobs(prev => prev.filter(j => j.job_number !== job.job_number));
  };

  const saveSpoc = async (job: MissingSpocJob) => {
    const sales = salesInputs[job.job_number]?.trim();
    const spoc = spocInputs[job.job_number]?.trim();
    if (isSpocMissing(sales) && isSpocMissing(spoc)) {
      showToast('Enter at least one SPOC value', 'error');
      return;
    }
    setSaving(s => ({ ...s, [`s_${job.job_number}`]: true }));
    const updates: any = {};
    if (!isSpocMissing(sales)) updates.sales_by = sales;
    if (!isSpocMissing(spoc)) {
      updates.spoc_name = spoc;
      updates.unbilled_spoc = spoc;
    }
    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('job_number', job.job_number);
    setSaving(s => ({ ...s, [`s_${job.job_number}`]: false }));
    if (error) { showToast(`Error: ${error.message}`, 'error'); return; }
    showToast(`✅ SPOC saved for ${job.enq_number || job.enquiry_number || job.job_number}`, 'success');

    // Re-check remaining status
    const currentSpoc = job.spoc_name || job.unbilled_spoc;
    const newSales = !isSpocMissing(sales) ? sales : job.sales_by;
    const newSpoc = !isSpocMissing(spoc) ? spoc : currentSpoc;
    const safeSpoc = newSpoc || null;
    if (!isSpocMissing(newSales) && !isSpocMissing(newSpoc)) {
      setSpocJobs(prev => prev.filter(j => j.job_number !== job.job_number));
    } else {
      setSpocJobs(prev => prev.map(j =>
        j.job_number === job.job_number
          ? { ...j, sales_by: newSales || null, spoc_name: safeSpoc, unbilled_spoc: safeSpoc }
          : j
      ));
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    width: '100%',
    outline: 'none',
  };

  const saveBtn = (loading: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '0.38rem 0.85rem',
        borderRadius: '6px',
        border: 'none',
        background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: 'white',
        fontWeight: 700,
        fontSize: '0.78rem',
        cursor: loading ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'Saving…' : '💾 Save'}
    </button>
  );

  const sectionHeader = (title: string, subtitle: string, count: number, color: string) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color }}>{title}</h2>
        <span style={{
          padding: '0.15rem 0.55rem', borderRadius: '20px',
          background: `${color}20`, color, fontSize: '0.75rem', fontWeight: 800
        }}>{count} jobs</span>
      </div>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{subtitle}</p>
    </div>
  );

  const thStyle: React.CSSProperties = {
    padding: '0.55rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.7rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.55rem 0.75rem',
    fontSize: '0.82rem',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-color)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{
      padding: '1.75rem',
      fontFamily: "'Outfit', sans-serif",
      maxWidth: '1100px',
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem',
    }}>
      {/* Page header */}
      <div>
        <h1 style={{
          margin: 0,
          fontSize: '1.8rem',
          fontWeight: 'bold',
          backgroundImage: 'linear-gradient(45deg, #f59e0b, #ef4444)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>⚠️</span> Missing Data
        </h1>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Jobs with incomplete fields — fill in missing values and save row by row.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <div style={{ width: '20px', height: '20px', border: '3px solid var(--border-color)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Loading missing data…
        </div>
      ) : (
        <>
          {/* ── Section 1: Missing Quote Value ── */}
          <section>
            {sectionHeader('Missing Quote Value', 'Enter the quote/contract value for each enquiry number.', quoteJobs.length, '#f59e0b')}
            {quoteJobs.length === 0 ? (
              <div style={{ padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
                ✅ All jobs have a quote value — nothing to fill in!
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--surface-color)' }}>
                    <tr>
                      <th style={thStyle}>Enquiry No.</th>
                      <th style={thStyle}>Company</th>
                      <th style={thStyle}>Customer</th>
                      <th style={{ ...thStyle, width: '180px' }}>Quote Value (₹)</th>
                      <th style={{ ...thStyle, width: '90px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteJobs.map((job, i) => (
                      <tr
                        key={job.job_number}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-color)' }}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {job.enq_number || job.enquiry_number || job.job_number}
                          </span>
                        </td>
                        <td style={tdStyle}>{job.company || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{job.customer_name || '—'}</td>
                        <td style={tdStyle}>
                          <input
                            type="text"
                            placeholder="e.g. 45000"
                            value={quoteInputs[job.job_number] ?? ''}
                            onChange={e => setQuoteInputs(prev => ({ ...prev, [job.job_number]: e.target.value }))}
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          {saveBtn(!!saving[`q_${job.job_number}`], () => saveQuote(job))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Section 2: Missing Sales SPOC / Unbilled SPOC ── */}
          <section>
            {sectionHeader('Missing Sales & Unbilled SPOC', 'Enter the Sales SPOC and/or Unbilled SPOC for each company.', spocJobs.length, '#6366f1')}
            {spocJobs.length === 0 ? (
              <div style={{ padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
                ✅ All jobs have SPOC values assigned — nothing to fill in!
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--surface-color)' }}>
                    <tr>
                      <th style={thStyle}>Enquiry No.</th>
                      <th style={thStyle}>Company</th>
                      <th style={{ ...thStyle, width: '190px' }}>Sales SPOC</th>
                      <th style={{ ...thStyle, width: '190px' }}>Unbilled SPOC</th>
                      <th style={{ ...thStyle, width: '90px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spocJobs.map((job, i) => (
                      <tr
                        key={job.job_number}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-color)' }}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {job.enq_number || job.enquiry_number || job.job_number}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{job.company || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{job.customer_name}</div>
                        </td>
                        <td style={tdStyle}>
                          {!isSpocMissing(job.sales_by) ? (
                            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>✓ {job.sales_by}</span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Sales SPOC name"
                              value={salesInputs[job.job_number] ?? ''}
                              onChange={e => setSalesInputs(prev => ({ ...prev, [job.job_number]: e.target.value }))}
                              style={inputStyle}
                            />
                          )}
                        </td>
                        <td style={tdStyle}>
                          {!isSpocMissing(job.spoc_name || job.unbilled_spoc) ? (
                            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>✓ {job.spoc_name || job.unbilled_spoc}</span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Unbilled SPOC name"
                              value={spocInputs[job.job_number] ?? ''}
                              onChange={e => setSpocInputs(prev => ({ ...prev, [job.job_number]: e.target.value }))}
                              style={inputStyle}
                            />
                          )}
                        </td>
                        <td style={tdStyle}>
                          {saveBtn(!!saving[`s_${job.job_number}`], () => saveSpoc(job))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
