'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './jobDetails.module.css';
import { getUserColor } from '@/lib/colorUtils';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const DateInput = ({ name, value, onChange }: { name: string, value: string, onChange: (e: any) => void }) => {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = (!isFocused && value) ? formatDate(value) : value;

  return (
    <input
      type={isFocused || !value ? "date" : "text"}
      name={name}
      value={displayValue || ''}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={onChange}
      style={{ cursor: (!isFocused && value) ? 'pointer' : 'text' }}
    />
  );
};

const ToggleSwitch = ({ name, value, onChange }: { name: string, value: any, onChange: (val: boolean) => void }) => {
  const isOn = value === true || value === 'Yes' || value === 'yes';
  return (
    <div className={styles.toggleContainer} onClick={() => onChange(!isOn)}>
      <div className={`${styles.toggleTrack} ${isOn ? styles.toggleTrackActive : ''}`}>
        <div className={`${styles.toggleThumb} ${isOn ? styles.toggleThumbActive : ''}`} />
      </div>
      <span className={styles.toggleLabel}>{isOn ? 'Yes' : 'No'}</span>
    </div>
  );
};

const GOODS_TRACK_OPTIONS = [
  "01. Packing Not Scheduled",
  "02. Packing Scheduled",
  "03. Packing in Progress",
  "04. In Orgin TI WH",
  "05. In Origin Vendor WH",
  "06. Despatched in TI Vehicle",
  "07. Despatched in Market Vehicle",
  "08. Despatched in Market vehicle as Part Load",
  "09. In Transit",
  "10. In Destination TI WH",
  "11. In Destination Vendor  WH",
  "12. Planned for Delivery",
  "13. Out for Delivery",
  "14. Delivered",
  "15. JTR Collected",
  "16. Complaints",
  "17. Damages",
  "18. Customer Ratings",
  "19. POD Sent to branch",
  "20. Job # taken for Billing ",
  "21. Storage",
  "22. Job Completed",
  "23. Job # taken for Billing",
  "24. Damage solved",
  "25. Customer Cancelled",
  "26. Job # to be Cancelled",
  "27. Billing Pending",
  "28. Free Job"
];

const CAR_TRACK_OPTIONS = [
  "01. Car Pickup Not Scheduled",
  "02. Car Pickup Scheduled",
  "03. Car Picked",
  "04. Despatched in Market Vehicle (Exclusive)",
  "05. Despatched in Mareket Vehicle (Part Load)",
  "06. In Transit",
  "07. At Destination WH",
  "08. Planed for Delivery",
  "09. Out for Delivery",
  "10. Delivered",
  "11. VAR Collected",
  "12. Complaints",
  "13. Damages",
  "14. POD Sent to the branch",
  "15. Damage Resolved"
];

const StatusSlider = ({ name, options, value, onChange }: { name: string, options: string[], value: any, onChange: (e: any) => void }) => {
  const currentIndex = options.indexOf(value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  const handleSliderChange = (e: any) => {
    const idx = parseInt(e.target.value, 10);
    onChange({ target: { name, value: options[idx] } });
  };

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderValueDisplay}>{options[safeIndex]}</div>
      <input 
        type="range" 
        min="0" 
        max={options.length - 1} 
        value={safeIndex} 
        onChange={handleSliderChange} 
        className={styles.sliderInput} 
      />
    </div>
  );
};

const CarStatusSlider = ({ name, options, value, onChange }: { name: string, options: string[], value: any, onChange: (e: any) => void }) => {
  const currentIndex = options.indexOf(value || options[0]);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getStageColor = (idx: number) => {
    const hues = [220, 240, 260, 280, 300, 320, 340, 0, 20, 40, 80, 120, 150, 180, 200];
    const hue = hues[idx % hues.length];
    return `hsl(${hue}, 70%, 45%)`;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const innerWidth = rect.width - 46; // inner track is offset by 23px on each side
      let x = e.clientX - rect.left - 23;
      x = Math.max(0, Math.min(innerWidth, x));
      let percentage = x / innerWidth;
      if (isNaN(percentage)) percentage = 0;
      const newIndex = Math.round(percentage * (options.length - 1));
      if (newIndex >= 0 && newIndex < options.length) {
        onChange({ target: { name, value: options[newIndex] } });
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    
    // Check if clicked inside a tooltip to prevent dragging it
    if ((e.target as HTMLElement).closest('.car-tooltip')) return;
    
    e.preventDefault();
    handlePointerMove(e);

    const onMove = (moveEvt: PointerEvent) => handlePointerMove(moveEvt);
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const currentColor = getStageColor(safeIndex);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0 1.5rem 0' }}>
      <div 
        ref={trackRef}
        onPointerDown={handlePointerDown}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', padding: '0 10px', touchAction: 'none', cursor: 'pointer' }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '23px', right: '23px', height: '4px', background: '#e2e8f0', zIndex: 0, transform: 'translateY(-50%)' }}>
          <div style={{ width: `${(safeIndex / (options.length - 1)) * 100}%`, height: '100%', background: '#a78bfa', transition: 'width 0.1s ease' }}></div>
        </div>
        
        {options.map((opt, i) => (
          <div 
            key={i} 
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ 
              width: i === safeIndex ? '36px' : '26px', 
              height: i === safeIndex ? '36px' : '26px', 
              borderRadius: i === safeIndex ? '0' : '50%', 
              background: i === safeIndex ? 'transparent' : (i < safeIndex ? '#a78bfa' : '#f8fafc'),
              border: i === safeIndex ? 'none' : `2px solid ${i < safeIndex ? '#a78bfa' : '#cbd5e1'}`,
              color: i < safeIndex ? '#fff' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', 
              fontWeight: 'bold', zIndex: 2,
              transition: 'all 0.1s ease',
              position: 'relative'
            }}
          >
            {i === safeIndex ? (
              <span style={{ transform: 'scaleX(-1) translateY(-10px)', display: 'inline-block', fontSize: '2.68rem', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.4))' }}>
                🚗
              </span>
            ) : (
              i + 1
            )}
            
            {hoveredIndex === i && (
              <div className="car-tooltip" style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                marginBottom: '8px', padding: '4px 8px', background: '#1e293b', color: '#fff',
                fontSize: '0.75rem', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10
              }}>
                {opt}
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #1e293b' }}></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontWeight: '700', color: currentColor, marginTop: '0.75rem', fontSize: '0.95rem', transition: 'color 0.3s ease' }}>
        {options[safeIndex]}
      </div>
    </div>
  );
};

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const decodedId = decodeURIComponent(id);
  const router = useRouter();
  
  const [job, setJob] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newComm, setNewComm] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newShipmentDate, setNewShipmentDate] = useState('');
  const [newShipmentLocation, setNewShipmentLocation] = useState('');
  const [agentName, setAgentName] = useState('Agent');
  const [supervisors, setSupervisors] = useState<string[]>([]);

  useEffect(() => {
    // Fetch the real username from profiles table
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const fetchProfile = async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, name')
            .eq('id', data.user.id)
            .single();
            
          if (profile) {
            setAgentName(profile.name || profile.username || data.user.email?.split('@')[0] || 'Agent');
          } else {
            setAgentName(data.user.email?.split('@')[0] || 'Agent');
          }
        };
        fetchProfile();
      }
    });
  }, []);

  useEffect(() => {
    fetchJobDetails();
    fetchLogs();
    fetchSupervisors();
  }, [decodedId]);

  const fetchSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('packing_team_supervisor, dest_supervisor');
      if (data && !error) {
        const sups = new Set<string>();
        data.forEach(row => {
          if (row.packing_team_supervisor && row.packing_team_supervisor.trim() !== '') sups.add(row.packing_team_supervisor.trim());
          if (row.dest_supervisor && row.dest_supervisor.trim() !== '') sups.add(row.dest_supervisor.trim());
        });
        setSupervisors(Array.from(sups).sort());
      }
    } catch(e) {}
  };

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_number', decodedId)
        .single();
        
      if (error) throw error;
      
      // Auto-toggle CAR (INCLUDED?) if goods_type contains "vehicle"
      if (data?.goods_type?.toLowerCase().includes('vehicle') && data.car_included !== true) {
        data.car_included = true;
        supabase.from('jobs').update({ car_included: true }).eq('job_number', decodedId).then(() => {});
      }

      setJob(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('job_logs')
      .select('*')
      .eq('job_number', decodedId)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setLogs(data);
    }
  };

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleFieldChange = (name: string, value: any) => {
    if (name === 'jtr_percentage' || name === 'transit_days' || name === 'due_days') {
      value = value === '' ? null : Number(value);
    }

    const updates: any = { [name]: value };
    
    // If goods_type is changed and includes "vehicle", automatically toggle car on
    if (name === 'goods_type' && typeof value === 'string' && value.toLowerCase().includes('vehicle')) {
      updates.car_included = true;
    }

    const newJob = { ...job, ...updates };
    setJob(newJob);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      try {
        // Save the new values to jobs table
        const { error } = await supabase
          .from('jobs')
          .update(updates)
          .eq('job_number', decodedId);
          
        if (error) throw error;

        // Write to audit_logs for every field change
        for (const [key, val] of Object.entries(updates)) {
          const oldV = job?.[key];
          const oldStr = oldV === null || oldV === undefined ? '' : String(oldV);
          const newStr = val === null || val === undefined ? '' : String(val);
          if (oldStr !== newStr) {
            await supabase.from('audit_logs').insert({
              job_number: decodedId,
              agent_name: agentName,
              field_changed: key,
              old_value: oldStr || null,
              new_value: newStr || null,
              changed_at: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.error('Failed to auto-save job:', err);
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    handleFieldChange(e.target.name, e.target.value);
  };

  const handleAddLog = async (type: string, message: string, clearInput: () => void) => {
    if (!message.trim()) return;
    
    try {
      const { error } = await supabase
        .from('job_logs')
        .insert({
          job_number: decodedId,
          agent_name: agentName,
          log_type: type,
          message: message
        });
        
      if (error) throw error;
      
      clearInput();
      fetchLogs();
      if (type === 'Communication') {
        fetchJobDetails(); // Refresh to show new last comm date
      }
    } catch (err) {
      console.error('Error adding log:', err);
    }
  };

  const handleAddShipmentLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipmentDate || !newShipmentLocation.trim()) return;
    const message = `Date: ${newShipmentDate} | Location: ${newShipmentLocation}`;
    handleAddLog('Shipment Tracking', message, () => {
      setNewShipmentDate('');
      setNewShipmentLocation('');
    });
  };

  if (loading) return <div className={styles.container}>Loading job details...</div>;
  if (!job) return <div className={styles.container}>Job not found.</div>;

  const isHHG = job.goods_type?.toLowerCase().includes('household') || job.goods_type?.toLowerCase().includes('vehicle');
  const isCOM = job.goods_type?.toLowerCase().includes('commercial') || job.goods_type?.toLowerCase().includes('monitor') || job.goods_type?.toLowerCase().includes('vaults');

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const lastPage = sessionStorage.getItem('csc_last_jobs_page');
      if (lastPage) {
        router.push(lastPage);
        return;
      }
    }
    router.push('/dashboard');
  };

  return (
    <div className={styles.container}>
      <datalist id="supervisors-list">
        {supervisors.map(sup => (
          <option key={sup} value={sup} />
        ))}
      </datalist>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <button 
            onClick={handleBack} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              padding: '0.5rem 1.25rem', borderRadius: '99px', border: 'none', 
              background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)', 
              color: '#4f46e5', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', 
              transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #d946ef 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.15)'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <h1 style={{ display: 'flex', gap: '2rem', alignItems: 'baseline', margin: 0 }}>
            {job.job_date && <span style={{ color: '#ec4899' }}>{formatDate(job.job_date)}</span>}
            <span style={{ color: '#10b981' }}>{job.job_number}</span>
            {job.enq_number && <span style={{ color: '#3b82f6' }}>{job.enq_number}</span>}
            {job.customer_name && <span style={{ color: '#8b5cf6', fontSize: '1.6rem', fontWeight: 600 }}>{job.customer_name}</span>}
          </h1>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saving ? (
            <>
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
              Saving...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Saved
            </>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainForm}>
          
          <div className={`glass ${styles.section} ${styles.sectionPrimary}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#primaryGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <span className={styles.textPrimary}>Primary Details</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>👤 NAME</label><input name="customer_name" value={job.customer_name || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🏢 COMPANY</label><input name="company" value={job.company || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>📞 CONTACT</label><input name="customer_phone" value={job.customer_phone || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>📦 TYPE OF GOODS</label><input name="goods_type" value={job.goods_type || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🛫 ORIGIN</label><input name="origin" value={job.origin || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🛬 DESTINATION</label><input name="destination" value={job.destination || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🎯 SPOC</label><input name="spoc_name" value={job.spoc_name || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>🤝 OPERATION BY</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexGrow: 1, alignItems: 'center' }}>
                  <label style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400 }}>
                    <input type="radio" name="operation_by" value="TI" checked={job.operation_by === 'TI'} onChange={handleChange} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', accentColor: '#4f46e5' }} /> 
                    TI
                  </label>
                  <label style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 400 }}>
                    <input type="radio" name="operation_by" value="Outsourced" checked={job.operation_by === 'Outsourced'} onChange={handleChange} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', accentColor: '#4f46e5' }} /> 
                    Outsourced
                  </label>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>🚗 CAR INCLUDED?</label>
                <ToggleSwitch name="car_included" value={job.car_included === true} onChange={(val) => handleFieldChange('car_included', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🏋️‍♂️ HEAVY ITEMS</label>
                <ToggleSwitch name="heavy_items" value={job.heavy_items === true || job.heavy_items === 'Yes'} onChange={(val) => handleFieldChange('heavy_items', val)} />
              </div>
              {/* ERP-synced invoice fields — read-only, shown only when erp_status is Billed */}
              {job.erp_status?.toLowerCase() === 'billed' && (
                <>
                  <div className={styles.inputGroup}>
                    <label>📅 INVOICE DATE <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>(ERP Synced)</span></label>
                    <input value={job.invoice_date ? formatDate(job.invoice_date) : ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>🧾 INVOICE NUMBER <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>(ERP Synced)</span></label>
                    <input value={job.invoice_number || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`glass ${styles.section} ${styles.sectionTracking}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#trackGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#38bdf8" /></linearGradient></defs>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span className={styles.textTracking}>Tracking Details</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>🕒 LAST COMM DATE</label><input value={job.last_comm_date ? new Date(job.last_comm_date).toLocaleString() : 'N/A'} disabled /></div>
              <div className={styles.inputGroup}><label>📅 FOLLOW-UP DATE</label><DateInput name="follow_up_date" value={job.follow_up_date || ''} onChange={handleChange} /></div>


              <div className={styles.inputGroupFullWidth} style={{ gridColumn: 'span 2' }}>
                <label>💬 LAST COMMUNICATION DETAILS WITH CUSTOMERS</label>
                <textarea value={logs.find(l => l.log_type === 'Communication')?.message || 'N/A'} disabled rows={3} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>

          {job.car_included === true && (
            <div className={`glass ${styles.section} ${styles.sectionHHG}`}>
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#hhgGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs><linearGradient id="hhgGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#e879f9" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className={styles.textHHG}>Car Move Service</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>📍 CAR TRACK</label>
                  <CarStatusSlider name="car_track_status" options={CAR_TRACK_OPTIONS} value={job.car_track_status} onChange={handleChange} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}><label>🏎️ CAR PICKUP DATE</label><DateInput name="car_pickup_date" value={job.car_pickup_date || ''} onChange={handleChange} /></div>
                  <div className={styles.inputGroup}><label>🏁 CAR DELIVERY DATE</label><DateInput name="car_delivery_date" value={job.car_delivery_date || ''} onChange={handleChange} /></div>
                </div>
              </div>
            </div>
          )}

          <div className={`glass ${styles.section} ${styles.sectionCOM}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#comGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="comGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#fb923c" /></linearGradient></defs>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span className={styles.textCOM}>Origin Service</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>📆 PACKING DATE</label><DateInput name="packing_date" value={job.packing_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>👔 SUPERVISOR</label><input name="packing_team_supervisor" value={job.packing_team_supervisor || ''} onChange={handleChange} list="supervisors-list" /></div>
              <div className={styles.inputGroup}><label>👷‍♂️ HANDYMAN</label><input name="handyman_origin" value={job.handyman_origin || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🏢 FLOOR</label><input type="number" name="origin_floor" value={job.origin_floor || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>🛗 SERVICE LIFT</label>
                <ToggleSwitch name="origin_service_lift" value={job.origin_service_lift === true || job.origin_service_lift === 'Yes'} onChange={(val) => handleFieldChange('origin_service_lift', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🅿️ PARKING</label>
                <ToggleSwitch name="origin_parking" value={job.origin_parking === true || job.origin_parking === 'Yes'} onChange={(val) => handleFieldChange('origin_parking', val)} />
              </div>
              <div className={styles.inputGroup}><label>⌚ COMMITTED TIME</label><input type="time" name="committed_time" value={job.committed_time || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>⏱️ REPORTED TIME</label><input type="time" name="reported_time" value={job.reported_time || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>📝 INSTRUCTIONS</label><textarea name="origin_instructions" value={job.origin_instructions || ''} onChange={handleChange} /></div>
            </div>
          </div>

          <div className={`glass ${styles.section} ${styles.sectionLogistics}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#logGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="logGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f87171" /></linearGradient></defs>
                <rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span className={styles.textLogistics}>Cargo Service</span>
            </h3>
            <div className={styles.grid}>
              {/* Row 1: Dispatch Date | Transit Days */}
              <div className={styles.inputGroup}><label>🚀 DISPATCH DATE</label><DateInput name="dispatch_date" value={job.dispatch_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>⏳ TRANSIT DAYS</label><input type="number" name="transit_days" value={job.transit_days || ''} onChange={handleChange} /></div>

              {/* Row 2: Shipment Type | Pre-Alert Status */}
              <div className={styles.inputGroup}><label>🚚 SHIPMENT TYPE</label><input type="text" name="shipment_type" value={job.shipment_type || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🔔 PRE-ALERT STATUS</label><input type="text" name="pre_alert_status" value={job.pre_alert_status || ''} onChange={handleChange} /></div>

              {/* Row 3: Truck Number | Driver Details */}
              <div className={styles.inputGroup}><label>🚛 TRUCK NUMBER</label><input type="text" name="truck_number" value={job.truck_number || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>👨‍✈️ DRIVER DETAILS</label><input type="text" name="driver_details" value={job.driver_details || ''} onChange={handleChange} placeholder="e.g. Ram - 9876543210" /></div>

              {/* Row 4: Expected Reaching Date | Actual Reached Date */}
              <div className={styles.inputGroup}><label>🎯 EXPECTED REACHING DATE</label><DateInput name="expected_to_reach_dest" value={job.expected_to_reach_dest || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🏁 ACTUAL REACHED DATE</label><DateInput name="reached_destination" value={job.reached_destination || ''} onChange={handleChange} /></div>

              {/* Row 5: Deviation | Reason */}
              <div className={styles.inputGroup}>
                <label>⚠️ DEVIATION</label>
                <ToggleSwitch name="deviation" value={job.deviation === true} onChange={(val) => handleFieldChange('deviation', val)} />
              </div>
              <div className={styles.inputGroup}><label>✍️ REASON</label><input name="deviation_reason" value={job.deviation_reason || ''} onChange={handleChange} /></div>

              {/* Row 6: Remarks full-width */}
              <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                <label>💬 REMARKS</label>
                <textarea name="remarks" value={job.remarks || ''} onChange={handleChange} rows={3} style={{ resize: 'vertical', minHeight: '72px' }} />
              </div>
            </div>

          </div>

          <div className={`glass ${styles.section} ${styles.sectionPrimary}`} style={{ borderLeftColor: '#34d399' }}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#destGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="destGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#0ea5e9" /></linearGradient></defs>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span style={{ background: '-webkit-linear-gradient(45deg, #10b981, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>Destination Service</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>📅 PLANNED DELIVERY DATE</label><DateInput name="planned_delivery" value={job.planned_delivery || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>✅ ACTUAL DELIVERY DATE</label><DateInput name="actual_delivery" value={job.actual_delivery || ''} onChange={handleChange} /></div>
              
              <div className={styles.inputGroup}><label>👔 SUPERVISOR</label><input name="dest_supervisor" value={job.dest_supervisor || ''} onChange={handleChange} list="supervisors-list" /></div>
              <div className={styles.inputGroup}><label>👷‍♂️ HANDYMAN</label><input name="handyman_destination" value={job.handyman_destination || ''} onChange={handleChange} /></div>
              
              <div className={styles.inputGroup}>
                <label>🛗 SERVICE LIFT</label>
                <ToggleSwitch name="dest_service_lift" value={job.dest_service_lift === true || job.dest_service_lift === 'Yes'} onChange={(val) => handleFieldChange('dest_service_lift', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🅿️ PARKING</label>
                <ToggleSwitch name="dest_parking" value={job.dest_parking === true || job.dest_parking === 'Yes'} onChange={(val) => handleFieldChange('dest_parking', val)} />
              </div>
              
              <div className={styles.inputGroup}><label>🏢 FLOOR</label><input type="number" name="dest_floor" value={job.dest_floor || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>🚨 INCIDENTS</label>
                <select name="incidents" value={job.incidents || ''} onChange={handleChange}>
                  <option value="">None</option>
                  <option value="Damages">Damages</option>
                  <option value="Complaints">Complaints</option>
                </select>
              </div>
              
              <div className={styles.inputGroup}><label>💯 JTR %</label><input type="number" name="jtr_percentage" value={job.jtr_percentage || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>⭐ GOOGLE REVIEW</label>
                <ToggleSwitch name="google_review_taken" value={job.google_review_taken === true || job.google_review_taken === 'Yes'} onChange={(val) => handleFieldChange('google_review_taken', val)} />
              </div>
              
              <div className={styles.inputGroup}><label>📝 INSTRUCTIONS</label><textarea name="dest_instructions" value={job.dest_instructions || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>📢 REFERRALS</label><textarea name="referrals" value={job.referrals || ''} onChange={handleChange} /></div>
            </div>
          </div>

        </div>

        {/* Vertical Stepper Slider for Goods Track */}
        <div className={styles.verticalTrackContainer}>
          <h3 className={styles.stepperHeader}>🚚 Goods Track Status</h3>
          <div className={styles.verticalSteps}>
            {GOODS_TRACK_OPTIONS.map((option, idx) => {
              const isActive = job.goods_track_status === option;
              const currentIndex = GOODS_TRACK_OPTIONS.indexOf(job.goods_track_status || '01. Packing Not Scheduled');
              const isCompleted = idx <= currentIndex;
              return (
                <div 
                  key={option} 
                  className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isCompleted ? styles.stepCompleted : ''}`}
                  onClick={() => handleFieldChange('goods_track_status', option)}
                >
                  <div className={styles.stepIndicator}>
                    {isActive ? '' : (isCompleted ? '✓' : idx + 1)}
                  </div>
                  <span className={styles.stepLabel}>{option}</span>
                </div>
              );
            })}
          </div>

          {/* Shipment Tracking Section */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#f59e0b', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>🚚</span>
              Shipment Tracking
            </h3>
            
            <form onSubmit={handleAddShipmentLog} className={styles.addLogForm}>
              <div className={styles.inputWrapper} style={{ flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="date" 
                  value={newShipmentDate} 
                  onChange={(e) => setNewShipmentDate(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.5)', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text"
                    value={newShipmentLocation} 
                    onChange={(e) => setNewShipmentLocation(e.target.value)} 
                    placeholder="Enter location/status update..."
                    required
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.5)', fontFamily: 'inherit' }}
                  />
                  <button type="submit" className={`${styles.sendButton} ${styles.sendButtonShipment}`} title="Save Shipment Update" style={{ position: 'static', borderRadius: '4px', width: '36px', height: '36px', flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            <div className={styles.logsList} style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '1rem', paddingRight: '4px' }}>
              {logs
                .filter(log => log.log_type === 'Shipment Tracking' || log.log_type === 'Truck Tracking')
                .sort((a, b) => {
                  const getTimestamp = (log: any) => {
                    const match = log.message.match(/Date:\s*(.*?)\s*\|/i);
                    if (match) {
                      const d = new Date(match[1]);
                      if (!isNaN(d.getTime())) return d.getTime();
                    }
                    return new Date(log.created_at).getTime();
                  };
                  return getTimestamp(b) - getTimestamp(a);
                })
                .map((log) => {
                let displayDate = '';
                let displayLoc = log.message;
                
                const match = log.message.match(/Date:\s*(.*?)\s*\|\s*Location:\s*(.*)/i);
                if (match) {
                  const d = new Date(match[1]);
                  if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const mon = d.toLocaleString('en-US', { month: 'short' });
                    const yr = String(d.getFullYear()).slice(-2);
                    displayDate = `${day}-${mon}-${yr}`;
                  } else {
                    displayDate = match[1];
                  }
                  displayLoc = match[2];
                } else {
                  const d = new Date(log.created_at);
                  const day = String(d.getDate()).padStart(2, '0');
                  const mon = d.toLocaleString('en-US', { month: 'short' });
                  const yr = String(d.getFullYear()).slice(-2);
                  displayDate = `${day}-${mon}-${yr}`;
                }

                return (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{displayDate}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{displayLoc}</span>
                  </div>
                );
              })}
              {logs.filter(log => log.log_type === 'Shipment Tracking' || log.log_type === 'Truck Tracking').length === 0 && <div className="text-muted" style={{ fontSize: '0.85rem' }}>No shipment tracking records yet.</div>}
            </div>
          </div>
        </div>

        <div className={styles.sidePanel}>
          {/* Communications Section */}
          <div className={`glass ${styles.logsSection}`} style={{ marginBottom: '1.5rem' }}>
            <h3>Communications</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleAddLog('Communication', newComm, () => setNewComm('')); }} className={styles.addLogForm}>
              <div className={styles.inputWrapper}>
                <textarea 
                  value={newComm} 
                  onChange={(e) => setNewComm(e.target.value)} 
                  placeholder="Type a communication update..."
                  required
                  rows={2}
                />
                <button type="submit" className={`${styles.sendButton} ${styles.sendButtonComm}`} title="Send Communication">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </form>

            <div className={styles.logsList}>
              {logs.filter(log => log.log_type === 'Communication').map((log) => (
                <div key={log.id} className={`${styles.logItem} ${styles.logComm}`}>
                  <div className={styles.logHeader}>
                    <span className={styles.logAgent} style={{ color: getUserColor(log.agent_name).text }}>{log.agent_name}</span>
                    <span className={styles.logDate}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.logMessage}>{log.message}</div>
                </div>
              ))}
              {logs.filter(log => log.log_type === 'Communication').length === 0 && <div className="text-muted">No communications recorded yet.</div>}
            </div>
          </div>



          {/* Notes Section */}
          <div className={`glass ${styles.logsSection}`}>
            <h3>Notes</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleAddLog('Note', newNote, () => setNewNote('')); }} className={styles.addLogForm}>
              <div className={styles.inputWrapper}>
                <textarea 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)} 
                  placeholder="Type an internal note..."
                  required
                  rows={2}
                />
                <button type="submit" className={`${styles.sendButton} ${styles.sendButtonNote}`} title="Save Note">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </form>

            <div className={styles.logsList}>
              {logs.filter(log => log.log_type === 'Note').map((log) => (
                <div key={log.id} className={`${styles.logItem} ${styles.logNote}`}>
                  <div className={styles.logHeader}>
                    <span className={styles.logAgent} style={{ color: getUserColor(log.agent_name).text }}>{log.agent_name}</span>
                    <span className={styles.logDate}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.logMessage}>{log.message}</div>
                </div>
              ))}
              {logs.filter(log => log.log_type === 'Note').length === 0 && <div className="text-muted">No notes recorded yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
