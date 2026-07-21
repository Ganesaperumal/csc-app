'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './spoc.module.css';

const GOODS_TRACK_OPTIONS = [
  "01. Packing Not Scheduled", "02. Packing Scheduled", "03. Packing in Progress",
  "04. In Orgin TI WH", "05. In Origin Vendor WH", "06. Despatched in TI Vehicle",
  "07. Despatched in Market Vehicle", "08. Despatched in Market vehicle as Part Load",
  "09. In Transit", "10. In Destination TI WH", "11. In Destination Vendor  WH",
  "12. Planned for Delivery", "13. Out for Delivery", "14. Delivered",
  "15. JTR Collected", "16. Complaints", "17. Damages", "18. Issues Resolved",
  "19. Customer Ratings", "20. POD Sent to branch", "21. Storage",
  "22. Job Completed", "23. Job # taken for Billing", "24. Customer Cancelled",
  "25. Job # to be Cancelled", "26. Billing Pending"
];

const CAR_TRACK_OPTIONS = [
  "01. Car Pickup Not Scheduled", "02. Car Pickup Scheduled", "03. Car Picked",
  "04. Despatched in Market Vehicle (Exclusive)", "05. Despatched in Mareket Vehicle (Part Load)",
  "06. In Transit", "07. At Destination WH", "08. Planed for Delivery",
  "09. Out for Delivery", "10. Delivered", "11. VAR Collected",
  "12. Complaints", "13. Damages", "14. POD Sent to the branch",
  "15. Damage Resolved", "16. Job Completed"
];

export default function SpocPortalPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    // Force light mode for SPOC portal
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('csc_theme', 'light');
    }
    
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        checkAccess(data.session.user.id);
      }
    });
  }, []);

  const checkAccess = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (profile && (profile.role === 'SPOC' || profile.role === 'Admin')) {
      setIsLoggedIn(true);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    const formattedEmail = `${phone.trim()}@transworldintl.com`.toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: phone.trim(),
    });

    if (error) {
      setLoginError('Invalid Name or Phone Number. Please check with an Admin if you are authorized.');
      setLoading(false);
    } else if (data.user) {
      checkAccess(data.user.id);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const cleanQ = q.trim();
      let orQuery = `job_number.ilike.%${cleanQ}%,customer_name.ilike.%${cleanQ}%,company.ilike.%${cleanQ}%,enq_number.ilike.%${cleanQ}%`;
      
      if (/^\d+$/.test(cleanQ)) {
        orQuery += `,erp_job_id.eq.${cleanQ}`;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('job_number, customer_name, company, enq_number, erp_job_id, goods_type, goods_track_status, car_track_status')
        .or(orQuery)
        .limit(15);
        
      if (!error && data) {
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const generateAISummary = async (job: any) => {
    setAiLoading(true);
    setAiSummary('');
    try {
      const { data: trackData } = await supabase.from('job_shipment_track').select('*').eq('job_number', job.job_number);
      const { data: commsData } = await supabase.from('job_communications').select('*').eq('job_number', job.job_number);
      
      const commHistory = (commsData || []).map((c: any) => `[${c.call_type} / ${c.regarding}] ${c.summary}`).join('\n');
      const trackHistory = (trackData || []).map((t: any) => `[${t.date}] ${t.location}: ${t.remark}`).join('\n');
      
      const context = `Job Number: ${job.job_number}\nStatus: ${job.goods_track_status}\n\nTracking History:\n${trackHistory}\n\nCommunication History:\n${commHistory}`;
      
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: "Write a short 2-3 sentence summary of the current status and health of this job based on its tracking and communication history. Make it friendly for a SPOC user.",
          context
        })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setAiSummary(data.result);
      } else {
        setAiSummary('Failed to generate AI summary at this time.');
      }
    } catch (err) {
      setAiSummary('Network error during AI generation.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectJob = (job: any) => {
    window.location.href = `/dashboard/job/${encodeURIComponent(job.job_number)}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setSelectedJob(null);
    window.location.href = '/login';
  };

  const renderGoodsSlider = (status: string) => {
    const currentIndex = GOODS_TRACK_OPTIONS.indexOf(status);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const progress = (safeIndex / (GOODS_TRACK_OPTIONS.length - 1)) * 100;
    
    return (
      <div className={styles.sliderBox}>
        <h4>Goods Tracking Status</h4>
        <div className={styles.sliderValueDisplay}>{GOODS_TRACK_OPTIONS[safeIndex]}</div>
        <div className={styles.progressBarBg}>
          <div className={styles.progressBarFill} style={{ width: `${progress}%`, background: '#3b82f6' }}></div>
        </div>
      </div>
    );
  };

  const renderCarSlider = (status: string) => {
    const currentIndex = CAR_TRACK_OPTIONS.indexOf(status);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const progress = (safeIndex / (CAR_TRACK_OPTIONS.length - 1)) * 100;
    
    return (
      <div className={styles.sliderBox}>
        <h4>Car Tracking Status</h4>
        <div className={styles.sliderValueDisplay}>{CAR_TRACK_OPTIONS[safeIndex]}</div>
        <div className={styles.progressBarBg}>
          <div className={styles.progressBarFill} style={{ width: `${progress}%`, background: '#a78bfa' }}></div>
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <span className={styles.icon}>📦</span>
            <h1>Job Tracking Portal</h1>
            <p>Access your authorized shipments</p>
          </div>

          {loginError && <div className={styles.error}>{loginError}</div>}

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Full Name</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. John Doe"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Phone Number (10 Digits)</label>
              <input 
                type="password" 
                required 
                value={phone} 
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} 
                placeholder="e.g. 9876543210"
              />
            </div>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Verifying...' : 'Access Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.portalContainer}>
      <header className={styles.portalHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>📦</span>
          <h2>Job Tracking Portal</h2>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>Sign Out</button>
      </header>

      <main className={styles.portalMain}>
        <div className={styles.searchSection}>
          <h3>Track a Job</h3>
          <p>Search by Job Number, Customer Name, Company, Enquiry Number, or ERP ID</p>
          
          <div className={styles.searchWrapper}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Start typing to search..."
              className={styles.searchInput}
            />
            {searching && <span className={styles.searchSpinner}>Searching...</span>}
            
            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((job) => (
                  <div 
                    key={job.job_number} 
                    className={styles.searchItem} 
                    onClick={() => handleSelectJob(job)} 
                    style={{ 
                      display: 'flex', flexDirection: 'column', gap: '0.4rem', 
                      padding: '0.85rem 1.15rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' 
                    }}
                  >
                    {/* Line 1: Job Number (Left) & Enq Number (Right) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                        📋 {job.job_number}
                      </span>
                      {job.enq_number ? (
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9333ea', background: 'rgba(147, 51, 234, 0.1)', padding: '0.18rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
                          🔍 {job.enq_number}
                        </span>
                      ) : <span />}
                    </div>

                    {/* Line 2: Client Name | Company Name (Truncated if long) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', width: '100%', overflow: 'hidden' }}>
                      <span style={{ fontWeight: 700, color: '#16a34a', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        👤 {job.customer_name || 'No Name'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.4, flexShrink: 0 }}>|</span>
                      <span style={{ 
                        fontWeight: 700, color: '#ea580c', background: 'rgba(234, 88, 12, 0.08)', 
                        padding: '0.15rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap', 
                        overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 
                      }}>
                        🏢 {job.company || 'Individual'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
              <div className={styles.searchResults}>
                <div className={styles.noResults} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No matching jobs found.</div>
              </div>
            )}
          </div>
        </div>

        {selectedJob && (
          <div className={styles.jobDetailsCard}>
            <div className={styles.jobHeader}>
              <div>
                <h2>{selectedJob.customer_name}</h2>
                <p className={styles.jobSub}>Job No: {selectedJob.job_number} • {selectedJob.company || 'Individual'}</p>
              </div>
            </div>

            <div className={styles.statusSection}>
              {renderGoodsSlider(selectedJob.goods_track_status)}
              
              {selectedJob.goods_type?.toLowerCase().includes('vehicle') && (
                renderCarSlider(selectedJob.car_track_status)
              )}
            </div>

            <div className={styles.aiSummarySection}>
              <h3 className={styles.aiSummaryTitle}>✨ AI Job Summary</h3>
              {aiLoading ? (
                <div className={styles.aiLoading}>
                  <div className={styles.pulseDot}></div> Analyzing recent updates and communications...
                </div>
              ) : (
                <div className={styles.aiContent}>
                  {aiSummary}
                </div>
              )}
            </div>
            
            <div className={styles.restrictedNote}>
              <span className={styles.lockIcon}>🔒</span>
              Detailed logs, pricing, and documents are restricted for this view.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
