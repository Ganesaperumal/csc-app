'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './jobDetails.module.css';

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

  useEffect(() => {
    fetchJobDetails();
    fetchLogs();
  }, [decodedId]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_number', decodedId)
        .single();
        
      if (error) throw error;
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

    const newJob = { ...job, [name]: value };
    setJob(newJob);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('jobs')
          .update({ [name]: value })
          .eq('job_number', decodedId);
          
        if (error) throw error;
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
    
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const { error } = await supabase
        .from('job_logs')
        .insert({
          job_number: decodedId,
          agent_name: user?.email?.split('@')[0] || 'Agent',
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

  if (loading) return <div className={styles.container}>Loading job details...</div>;
  if (!job) return <div className={styles.container}>Job not found.</div>;

  const isHHG = job.goods_type?.toLowerCase().includes('household') || job.goods_type?.toLowerCase().includes('vehicle');
  const isCOM = job.goods_type?.toLowerCase().includes('commercial') || job.goods_type?.toLowerCase().includes('monitor') || job.goods_type?.toLowerCase().includes('vaults');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>&larr; Back</button>
          <h1>{job.job_date || ''} | {job.job_number} {job.enq_number ? `| ${job.enq_number}` : ''}</h1>
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
              <span className={styles.textPrimary}>Primary Details (Editable)</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>Branch</label><input value={job.branch || ''} disabled /></div>
              <div className={styles.inputGroup}><label>Customer Name</label><input name="customer_name" value={job.customer_name || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Company</label><input name="company" value={job.company || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Goods Type</label><input name="goods_type" value={job.goods_type || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Origin</label><input name="origin" value={job.origin || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Destination</label><input name="destination" value={job.destination || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Customer Phone</label><input name="customer_phone" value={job.customer_phone || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>SPOC Name</label><input name="spoc_name" value={job.spoc_name || ''} onChange={handleChange} /></div>
            </div>
          </div>

          <div className={`glass ${styles.section} ${styles.sectionTracking}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#trackGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#38bdf8" /></linearGradient></defs>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span className={styles.textTracking}>Tracking & Status</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}>
                <label>Goods Track Status</label>
                <select name="goods_track_status" value={job.goods_track_status || ''} onChange={handleChange}>
                  <option value="">Select Status...</option>
                  <option value="01. Packing Not Scheduled">01. Packing Not Scheduled</option>
                  <option value="02. Packing Scheduled">02. Packing Scheduled</option>
                  <option value="14. Delivered">14. Delivered</option>
                </select>
              </div>
              <div className={styles.inputGroup}><label>Deviation Reason</label><input name="deviation_reason" value={job.deviation_reason || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Remarks</label><input name="remarks" value={job.remarks || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>JTR %</label><input type="number" name="jtr_percentage" value={job.jtr_percentage || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Follow Up Date</label><input type="date" name="follow_up_date" value={job.follow_up_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Last Comm Date</label><input value={job.last_comm_date ? new Date(job.last_comm_date).toLocaleString() : 'N/A'} disabled /></div>
            </div>
          </div>

          <div className={`glass ${styles.section} ${styles.sectionLogistics}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#logGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="logGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f87171" /></linearGradient></defs>
                <rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span className={styles.textLogistics}>Common Logistics</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>Packing Date</label><input type="date" name="packing_date" value={job.packing_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Packing Supervisor</label><input name="packing_team_supervisor" value={job.packing_team_supervisor || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Operation By</label><input name="operation_by" value={job.operation_by || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Truck Type</label><input name="truck_type" value={job.truck_type || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Committed Time</label><input type="time" name="committed_time" value={job.committed_time || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Reported Time</label><input type="time" name="reported_time" value={job.reported_time || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Dispatch Date</label><input type="date" name="dispatch_date" value={job.dispatch_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Transit Days</label><input type="number" name="transit_days" value={job.transit_days || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Expected Reach</label><input type="date" name="expected_to_reach_dest" value={job.expected_to_reach_dest || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Reached Dest.</label><input type="date" name="reached_destination" value={job.reached_destination || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Planned Delivery</label><input type="date" name="planned_delivery" value={job.planned_delivery || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Actual Delivery</label><input type="date" name="actual_delivery" value={job.actual_delivery || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Handyman Origin</label><input name="handyman_origin" value={job.handyman_origin || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Handyman Dest.</label><input name="handyman_destination" value={job.handyman_destination || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Submission Date</label><input type="date" name="submission_date" value={job.submission_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Due Days</label><input type="number" name="due_days" value={job.due_days || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Referrals</label><input name="referrals" value={job.referrals || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>Pre Alert Status</label><input name="pre_alert_status" value={job.pre_alert_status || ''} onChange={handleChange} /></div>
            </div>
          </div>

          {isHHG && (
            <div className={`glass ${styles.section} ${styles.sectionHHG}`}>
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#hhgGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs><linearGradient id="hhgGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#e879f9" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className={styles.textHHG}>HHG Specific Fields</span>
              </h3>
              <div className={styles.grid}>
                <div className={styles.inputGroup}>
                  <label>Car Included?</label>
                  <select name="car_included" value={job.car_included === true ? 'true' : (job.car_included === false ? 'false' : '')} onChange={(e) => handleFieldChange('car_included', e.target.value === '' ? null : e.target.value === 'true')}>
                    <option value="">Select...</option>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className={styles.inputGroup}><label>Car Pickup Date</label><input type="date" name="car_pickup_date" value={job.car_pickup_date || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}><label>Car Delivery Date</label><input type="date" name="car_delivery_date" value={job.car_delivery_date || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}>
                  <label>Car Track Status</label>
                  <select name="car_track_status" value={job.car_track_status || ''} onChange={handleChange}>
                    <option value="">Select Status...</option>
                    <option value="01. Car Pickup Not Scheduled">01. Car Pickup Not Scheduled</option>
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Google Review Taken</label>
                  <select name="google_review_taken" value={job.google_review_taken || ''} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {isCOM && (
            <div className={`glass ${styles.section} ${styles.sectionCOM}`}>
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#comGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs><linearGradient id="comGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#fb923c" /></linearGradient></defs>
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path>
                </svg>
                <span className={styles.textCOM}>COM Specific Fields</span>
              </h3>
              <div className={styles.grid}>
                <div className={styles.inputGroup}><label>Commercial Status</label><input name="commercial_status" value={job.commercial_status || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}><label>Floor</label><input name="floor" value={job.floor || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}><label>Service Lift</label><input name="service_lift" value={job.service_lift || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}><label>Parking</label><input name="parking" value={job.parking || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}><label>Heavy Items</label><input name="heavy_items" value={job.heavy_items || ''} onChange={handleChange} /></div>
                <div className={styles.inputGroup}><label>Commercial Issues</label><textarea name="commercial_issues" value={job.commercial_issues || ''} onChange={handleChange} /></div>
              </div>
            </div>
          )}
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
                <button type="submit" className={styles.sendButton} title="Send Communication">
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
                    <span className={styles.logAgent}>{log.agent_name}</span>
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
                <button type="submit" className={styles.sendButton} title="Save Note" style={{ backgroundColor: 'var(--warning-color)' }}>
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
                    <span className={styles.logAgent}>{log.agent_name}</span>
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
