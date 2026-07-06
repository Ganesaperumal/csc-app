'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './jobDetails.module.css';
import { getUserColor } from '@/lib/colorUtils';
import JobMap from '../../components/JobMap';
import CustomSelect from '../../components/CustomSelect';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const toProperCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
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
  "18. Issues Resolved",
  "19. Customer Ratings",
  "20. POD Sent to branch",
  "21. Storage",
  "22. Job Completed",
  "23. Job # taken for Billing",
  "24. Customer Cancelled",
  "25. Job # to be Cancelled",
  "26. Billing Pending"
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
  "15. Damage Resolved",
  "16. Job Completed"
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



const WhatsAppStageRow = ({
  stageName,
  stageLabel,
  messageText,
  sentInfo,
  customerPhone,
  isLast,
  onSend
}: {
  stageName: string;
  stageLabel: string;
  messageText: string;
  sentInfo?: { sent_at: string; sent_by: string };
  customerPhone?: string;
  isLast?: boolean;
  onSend: () => void;
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const formatSentDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      return `${day}-${month}`;
    } catch {
      return '';
    }
  };

  return (
    <div style={{
      padding: '0.85rem 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(148, 163, 184, 0.12)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem'
    }}>
      {/* Row 1: Title/Subtitle and Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 805, color: 'var(--text-primary)' }}>{stageName}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500, marginTop: '2px' }}>{stageLabel}</span>
        </div>
        
        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sentInfo ? (
            <span style={{ 
              fontSize: '0.72rem', fontWeight: 700, color: '#10b981', 
              background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '12px' 
            }}>
              ✓ Sent on {formatSentDate(sentInfo.sent_at)}
            </span>
          ) : (
            <span style={{ 
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', 
              background: 'rgba(148, 163, 184, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '12px' 
            }}>
              🔘 Not Sent
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Preview and Action Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '1rem' }}>
        <button 
          onClick={() => setShowPreview(!showPreview)}
          style={{ 
            background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', 
            fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' 
          }}
        >
          {showPreview ? 'Hide Message Preview ▲' : 'Show Message Preview ▼'}
        </button>

        <button
          onClick={onSend}
          style={{
            padding: '0.4rem 0.9rem', borderRadius: '8px', border: 'none',
            background: sentInfo ? '#3b82f6' : '#10b981', color: 'white',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: sentInfo ? '0 2px 6px rgba(59,130,246,0.15)' : '0 2px 6px rgba(16,185,129,0.15)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {sentInfo ? 'Resend Update' : 'Send Update'}
        </button>
      </div>

      {showPreview && (
        <div style={{ 
          padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(148, 163, 184, 0.1)', 
          borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4',
          whiteSpace: 'pre-wrap', fontStyle: 'italic'
        }}>
          {messageText}
        </div>
      )}
    </div>
  );
};

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const decodedId = decodeURIComponent(id);
  const router = useRouter();
  
  const [job, setJob] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [trackingLogs, setTrackingLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [comms, setComms] = useState<any[]>([]);
  const [commForm, setCommForm] = useState({
    call_type: '' as '' | 'Customer' | 'Internal',
    regarding: '',
    summary: '',
    follow_up_required: false,
    follow_up_date: ''
  });
  const [commFormOpen, setCommFormOpen] = useState(false);
  const [commFilter, setCommFilter] = useState<string>('All');
  const [newShipmentDate, setNewShipmentDate] = useState('');
  const [newShipmentLocation, setNewShipmentLocation] = useState('');
  const [agentName, setAgentName] = useState('Agent');
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [viewingAgents, setViewingAgents] = useState<string[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const handleGenerateAISummary = async () => {
    if (!job) return;
    setAiLoading(true);
    setAiSummary('');
    try {
      const commHistory = comms.map(c => `[${c.call_type} / ${c.regarding}] ${c.summary}`).join('\n');
      const trackHistory = trackingLogs.map(t => `[${t.date}] ${t.location}: ${t.remark}`).join('\n');
      
      const context = `Job Number: ${job.job_number}\nStatus: ${job.goods_track_status}\n\nTracking History:\n${trackHistory}\n\nCommunication History:\n${commHistory}`;
      
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: "Write a short 2-3 sentence summary of the current status and health of this job based on its tracking and communication history.",
          context
        })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setAiSummary(data.result);
      } else if (res.status === 429) {
        setAiSummary(data.message || 'I am currently processing a high volume of requests. Please give me a minute and try again!');
      } else {
        setAiSummary('Failed to generate AI summary.');
      }
    } catch (err) {
      setAiSummary('Network error during AI generation.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDraftAIReply = async () => {
    if (comms.length === 0) return;
    setAiLoading(true);
    try {
      const lastComm = comms[0];
      const context = `Last communication:\nType: ${lastComm.call_type}\nRegarding: ${lastComm.regarding}\nSummary: ${lastComm.summary}`;
      
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: "Draft a polite, professional reply or follow-up to this communication. Return ONLY the drafted message.",
          context
        })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setCommForm(f => ({ ...f, summary: data.result }));
      } else if (res.status === 429) {
        alert(data.message || 'Rate limit hit. Wait a minute.');
      } else {
        alert('Failed to draft reply.');
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setAiLoading(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    if (!job) return;
    const url = `${window.location.origin}/track/${job.job_number}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const getWhatsAppMessageText = (stage: string) => {
    if (!job) return '';
    const custName = job.customer_name || 'Customer';
    const originCity = job.origin || '';
    const destCity = job.destination || '';
    const coordinator = currentCoordinator || agentName;
    const trackingLink = `${window.location.origin}/track/${job.job_number}`;
    
    switch (stage) {
      case 'Pre-Packing':
        return `Hi ${custName}, thank you for choosing Transworld International for your relocation from ${originCity} to ${destCity}. Our assigned CSC coordinator is ${coordinator}. We are preparing your relocation schedule and will keep you updated every step of the way!`;
      case 'Packing Day':
        return `Hi ${custName}, this is a reminder that your packing is scheduled for today. The Transworld packing team must report by 9:00 a.m. sharp in complete uniform. Please contact your coordinator ${coordinator} for any immediate assistance.`;
      case 'Post-Packing':
        return `Hi ${custName}, we are pleased to inform you that the packing for your shipment to ${destCity} has been successfully completed today. Your goods are secure and prepared for dispatch.`;
      case 'Despatch / In Transit':
        return `Hi ${custName}, your shipment from ${originCity} to ${destCity} has been successfully dispatched and is now in transit. You can track your shipment status, vehicle checkpoints, and timeline in real-time here: ${trackingLink} - Transworld International.`;
      case 'Delivery Scheduled':
        return `Hi ${custName}, your delivery schedule to ${destCity} is confirmed. Our delivery team will contact you shortly.`;
      case 'Delivery Day':
        return `Hi ${custName}, your delivery is scheduled for today. The reporting team is on their way. Please contact your coordinator ${coordinator} if you need any support.`;
      case 'Delivered & Feedback':
        return `Hi ${custName}, your relocation has been successfully completed and delivered! We hope you had a smooth experience. Please take a moment to leave a review here: https://g.page/r/transworld-review/review. Thank you for choosing Transworld!`;
      default:
        return '';
    }
  };

  const fetchWhatsAppLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('job_number', decodedId)
        .order('sent_at', { ascending: false });
      if (!error && data) {
        setWhatsappLogs(data);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp logs:', err);
    }
  };

  const handleMarkWhatsAppStageSent = async (stageName: string, messageText: string) => {
    try {
      const cleanPhone = (job?.customer_phone || '').replace(/[^0-9]/g, '');
      const { error } = await supabase
        .from('whatsapp_logs')
        .insert({
          job_number: decodedId,
          stage_name: stageName,
          sent_by: agentName,
          phone_number: cleanPhone,
          message_text: messageText
        });

      if (error) throw error;

      await fetchWhatsAppLogs();
    } catch (err) {
      console.error('Error logging WhatsApp sent stage:', err);
      alert('Error updating WhatsApp sent status: ' + (err as any).message);
    }
  };

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
    if (!decodedId || !agentName) return;

    const channel = supabase.channel(`presence-job-${decodedId}`, {
      config: { presence: { key: agentName } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers = Object.keys(state);
        setViewingAgents(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [decodedId, agentName]);

  useEffect(() => {
    fetchJobDetails();
    fetchNotes();
    fetchTrackingLogs();
    fetchComms();
    fetchSupervisors();
    fetchWhatsAppLogs();
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

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('job_notes')
      .select('*')
      .eq('job_number', decodedId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotes(data.filter(n => n.log_type === 'Note' || !n.log_type));
    }
  };

  const fetchTrackingLogs = async () => {
    const { data, error } = await supabase
      .from('job_shipment_track')
      .select('*')
      .eq('job_number', decodedId)
      .order('date', { ascending: true });
    if (!error && data) {
      setTrackingLogs(data);
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    try {
      const { error } = await supabase
        .from('job_notes')
        .insert({
          job_number: decodedId,
          agent_name: agentName,
          log_type: 'Note',
          message: newNote
        });
        
      if (error) throw error;
      
      setNewNote('');
      fetchNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const fetchComms = async () => {
    const { data, error } = await supabase
      .from('job_communications')
      .select('*')
      .eq('job_number', decodedId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setComms(data.filter((c: any) => !c.summary?.startsWith('[WhatsApp Sent]')));
    }
  };

  const handleAddComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commForm.call_type) return alert('Please select a Call Type (Customer or Internal)');
    if (!commForm.summary.trim()) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('job_communications')
        .insert({
          job_number: decodedId,
          agent_name: agentName,
          call_type: commForm.call_type,
          regarding: commForm.regarding,
          summary: commForm.summary,
          follow_up_required: commForm.follow_up_required,
          follow_up_date: commForm.follow_up_required && commForm.follow_up_date ? commForm.follow_up_date : null
        });
      if (error) throw error;

      // Update the jobs table with the last comm date and agent only if it is a Customer communication
      if (commForm.call_type === 'Customer') {
        const updates: any = {
          last_comm_date: now,
          last_comm_by: agentName
        };
        // Only write csc_coordinator if it is currently empty
        if (!job.csc_coordinator) {
          updates.csc_coordinator = agentName;
        }
        await supabase
          .from('jobs')
          .update(updates)
          .eq('job_number', decodedId);
      }

      setCommForm({ call_type: '', regarding: '', summary: '', follow_up_required: false, follow_up_date: '' });
      setCommFormOpen(false);
      fetchComms();
      fetchJobDetails();
    } catch (err) {
      console.error('Error adding communication:', err);
    }
  };

  const handleToggleFollowUp = async (id: number, currentStatus: boolean) => {
    try {
      setComms(prev => prev.map(c => c.id === id ? { ...c, follow_up_completed: !currentStatus } : c));
      
      const { error } = await supabase
        .from('job_communications')
        .update({ follow_up_completed: !currentStatus })
        .eq('id', id);
        
      if (error) {
        setComms(prev => prev.map(c => c.id === id ? { ...c, follow_up_completed: currentStatus } : c));
        throw error;
      }
    } catch (err) {
      console.error('Error updating follow-up:', err);
      alert('Failed to update follow-up status.');
    }
  };

  const handleAddShipmentLog = async (e?: React.FormEvent, date?: string, location?: string, remark?: string) => {
    if (e) e.preventDefault();
    const d = date || newShipmentDate;
    const l = location || newShipmentLocation;
    if (!d || !l.trim()) return;
    
    try {
      const { error } = await supabase.from('job_shipment_track').insert({
        job_number: decodedId,
        agent_name: agentName,
        date: d,
        location: l,
        remark: remark || null
      });
      if (error) throw error;
      setNewShipmentDate('');
      setNewShipmentLocation('');
      fetchTrackingLogs();
    } catch (err: any) {
      console.error(err);
      alert(`Error saving shipment update: ${err.message || 'Check browser console'}`);
    }
  };

  if (loading) return <div className={styles.container}>Loading job details...</div>;
  if (!job) return <div className={styles.container}>Job not found.</div>;

  const isHHG = job.goods_type?.toLowerCase().includes('household') || job.goods_type?.toLowerCase().includes('vehicle');
  const isCOM = job.goods_type?.toLowerCase().includes('commercial') || job.goods_type?.toLowerCase().includes('monitor') || job.goods_type?.toLowerCase().includes('vaults');

  const latestCustomerComm = comms.find(c => c.call_type === 'Customer');
  const lastCommDate = job.last_comm_date || (latestCustomerComm ? latestCustomerComm.created_at : null);
  const currentCoordinator = job.csc_coordinator || job.last_comm_by || (latestCustomerComm ? latestCustomerComm.agent_name : '');

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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
        @keyframes wiggle-bell {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(5deg); }
          40% { transform: rotate(-5deg); }
          50% { transform: rotate(0deg); }
        }
        .animate-wiggle {
          display: inline-block;
          animation: wiggle-bell 3s infinite ease-in-out;
        }
      `}} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ display: 'flex', gap: '2rem', alignItems: 'baseline', margin: 0 }}>
              {job.job_date && <span style={{ color: '#ec4899' }}>{formatDate(job.job_date)}</span>}
              <span style={{ color: '#10b981' }}>{job.job_number}</span>
              {job.enq_number && <span style={{ color: '#3b82f6' }}>{job.enq_number}</span>}
              {job.customer_name && <span style={{ color: '#8b5cf6', fontSize: '1.6rem', fontWeight: 600 }}>{job.customer_name}</span>}
            </h1>
            <button 
              onClick={handleGenerateAISummary}
              disabled={aiLoading}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', border: 'none', borderRadius: '20px', padding: '0.4rem 0.8rem',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: '0 2px 10px rgba(16,185,129,0.3)', opacity: aiLoading ? 0.6 : 1
              }}
            >
              {aiLoading ? '✨ Thinking...' : '✨ AI Summary'}
            </button>
          </div>
        </div>
        
        {aiSummary && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.15))',
            borderLeft: '4px solid #10b981',
            borderRadius: '0 8px 8px 0', padding: '1rem', marginTop: '0.5rem', marginBottom: '1rem',
            color: '#1e293b', fontSize: '0.9rem', lineHeight: '1.5'
          }}>
            <div style={{ fontWeight: 700, color: '#059669', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>✨</span> Ti AI Summary
            </div>
            {aiSummary}
          </div>
        )}
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Live Viewing Agents */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Viewing:</span>
            {viewingAgents.map((agent, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600 }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                {agent} {agent === agentName ? '(You)' : ''}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid rgba(148, 163, 184, 0.3)', paddingLeft: '1rem' }}>
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
      </div>



      <div className={styles.layout}>
        <div className={styles.mainForm}>
          
          <div className={`glass ${styles.section} ${styles.sectionPrimary}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#primaryGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <span className={styles.textPrimary}>Customer Details</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>👤 NAME</label><input name="customer_name" value={job.customer_name || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🏢 COMPANY</label><input name="company" value={job.company || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>📞 CONTACT</label><input name="customer_phone" value={job.customer_phone || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>📦 TYPE OF GOODS</label><input name="goods_type" value={job.goods_type || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🛫 ORIGIN</label><input name="origin" value={job.origin || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🛬 DESTINATION</label><input name="destination" value={job.destination || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🎯 SPOC</label><input name="spoc_name" value={job.spoc_name || ''} onChange={handleChange} /></div>
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

          <div className={`glass ${styles.section} ${styles.sectionPrimary}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#operationGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="operationGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              <span style={{ background: 'linear-gradient(90deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600 }}>Operation Site Details</span>
            </h3>
            <div className={styles.grid}>
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
                <label style={job.operation_by !== 'Outsourced' ? { opacity: 0.6 } : undefined}>🤝 OUTSOURCING PARTNER</label>
                <input 
                  name="outsourcing_partner" 
                  value={job.operation_by === 'Outsourced' ? (job.outsourcing_partner || '') : ''} 
                  onChange={handleChange} 
                  disabled={job.operation_by !== 'Outsourced'} 
                  placeholder={job.operation_by === 'Outsourced' ? "Partner name" : "N/A"} 
                  style={job.operation_by !== 'Outsourced' ? { opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.3)' } : undefined}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>🚗 CAR INCLUDED?</label>
                <ToggleSwitch name="car_included" value={job.car_included === true} onChange={(val) => handleFieldChange('car_included', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🏋️‍♂️ HEAVY ITEMS</label>
                <ToggleSwitch name="heavy_items" value={job.heavy_items === true || job.heavy_items === 'Yes'} onChange={(val) => handleFieldChange('heavy_items', val)} />
              </div>

              {/* Subheadings for site details */}
              <div style={{ gridColumn: '1', fontWeight: 'bold', fontSize: '0.9rem', color: '#8b5cf6', textTransform: 'uppercase', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: '0.3rem', marginTop: '0.6rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛫 ORIGIN SITE:
              </div>
              <div style={{ gridColumn: '2', fontWeight: 'bold', fontSize: '0.9rem', color: '#ec4899', textTransform: 'uppercase', borderBottom: '1px solid rgba(236, 72, 153, 0.2)', paddingBottom: '0.3rem', marginTop: '0.6rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛬 DESTINATION SITE:
              </div>

              <div className={styles.inputGroup}><label>🏢 FLOOR</label><input type="number" name="origin_floor" value={job.origin_floor || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🏢 FLOOR</label><input type="number" name="dest_floor" value={job.dest_floor || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>🛗 SERVICE LIFT</label>
                <ToggleSwitch name="origin_service_lift" value={job.origin_service_lift === true || job.origin_service_lift === 'Yes'} onChange={(val) => handleFieldChange('origin_service_lift', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🛗 SERVICE LIFT</label>
                <ToggleSwitch name="dest_service_lift" value={job.dest_service_lift === true || job.dest_service_lift === 'Yes'} onChange={(val) => handleFieldChange('dest_service_lift', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🅿️ PARKING</label>
                <ToggleSwitch name="origin_parking" value={job.origin_parking === true || job.origin_parking === 'Yes'} onChange={(val) => handleFieldChange('origin_parking', val)} />
              </div>
              <div className={styles.inputGroup}>
                <label>🅿️ PARKING</label>
                <ToggleSwitch name="dest_parking" value={job.dest_parking === true || job.dest_parking === 'Yes'} onChange={(val) => handleFieldChange('dest_parking', val)} />
              </div>
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
              <div className={styles.inputGroup}>
                <label>👤 CSC Coordinator</label>
                <CustomSelect
                  placeholder="- Select CSC Coordinator-"
                  value={currentCoordinator}
                  onChange={(val) => handleFieldChange('csc_coordinator', val)}
                  options={[
                    { value: '', label: '- Select CSC Coordinator-' },
                    { value: 'Shruti', label: 'Shruti' },
                    { value: 'Rabecca', label: 'Rabecca' },
                    { value: 'Chandrama', label: 'Chandrama' }
                  ]}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>📅 FOLLOW-UP DATE</label>
                <DateInput name="follow_up_date" value={job.follow_up_date || ''} onChange={handleChange} />
              </div>

              <div className={styles.inputGroup}>
                <label>🔗 Tracking Link</label>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    flexGrow: 1,
                    width: '62%',
                    background: copied ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                    border: copied ? 'none' : '1px solid rgba(148, 163, 184, 0.25)',
                    color: copied ? '#fff' : '#4f46e5',
                    borderRadius: '10px',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    boxShadow: copied ? '0 2px 6px rgba(16, 185, 129, 0.2)' : 'inset 0 2px 5px rgba(0,0,0,0.015), 0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onMouseOver={(e) => {
                    if (!copied) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!copied) {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.25)';
                    }
                  }}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Tracking Link'}
                </button>
              </div>
              <div className={styles.inputGroup}>
                <label>🕒 LAST COMM DATE</label>
                <input value={lastCommDate ? formatDate(lastCommDate) : 'N/A'} disabled />
              </div>

              <div className={styles.inputGroupFullWidth} style={{ gridColumn: 'span 2' }}>
                <label>💬 LAST COMMUNICATION DETAILS WITH CUSTOMERS</label>
                <textarea value={latestCustomerComm ? latestCustomerComm.summary : 'N/A'} disabled rows={3} style={{ opacity: 0.8 }} />
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
                  <div className={styles.inputGroup}><label>🏁 CAR DELIVERY</label><DateInput name="car_delivery_date" value={job.car_delivery_date || ''} onChange={handleChange} /></div>
                  <div className={styles.inputGroup}><label>🚛 CAR TRANSPORTER</label><input type="text" name="car_transporter" value={job.car_transporter || ''} onChange={handleChange} placeholder="Transporter name" /></div>
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
              <div className={styles.inputGroup}><label>📝 REMARKS ON HANDYMAN</label><input name="handyman_origin_remarks" value={job.handyman_origin_remarks || ''} onChange={handleChange} placeholder="Remarks on handyman" /></div>
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
              <div className={styles.inputGroup}><label>🚀 DISPATCH DATE</label><DateInput name="dispatch_date" value={job.dispatch_date || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>⏳ TRANSIT DAYS</label><input type="number" name="transit_days" value={job.transit_days || ''} onChange={handleChange} /></div>

              <div className={styles.inputGroup}><label>🚗 VEHICLE TYPE</label><input type="text" name="vehicle_type" value={job.vehicle_type || ''} onChange={handleChange} placeholder="e.g. 20ft, 40ft, Trailer" /></div>
              <div className={styles.inputGroup}><label>🚚 SHIPMENT TYPE</label><input type="text" name="shipment_type" value={job.shipment_type || ''} onChange={handleChange} /></div>

              <div className={styles.inputGroup}><label>🚛 TRUCK NUMBER</label><input type="text" name="truck_number" value={job.truck_number || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>👨‍✈️ DRIVER DETAILS</label><input type="text" name="driver_details" value={job.driver_details || ''} onChange={handleChange} placeholder="e.g. Ram - 9876543210" /></div>

              <div className={styles.inputGroup}><label>🎯 EXPECTED REACHING DATE</label><DateInput name="expected_to_reach_dest" value={job.expected_to_reach_dest || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>🏁 ACTUAL REACHED DATE</label><DateInput name="reached_destination" value={job.reached_destination || ''} onChange={handleChange} /></div>

              <div className={styles.inputGroup}>
                <label>⚠️ DEVIATION</label>
                <ToggleSwitch name="deviation" value={job.deviation === true} onChange={(val) => handleFieldChange('deviation', val)} />
              </div>
              <div className={styles.inputGroup}><label>✍️ REASON</label><input name="deviation_reason" value={job.deviation_reason || ''} onChange={handleChange} /></div>

              <div className={styles.inputGroup}><label>🔔 PRE-ALERT</label><input type="text" name="pre_alert_status" value={job.pre_alert_status || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}><label>💬 REMARKS</label><input type="text" name="remarks" value={job.remarks || ''} onChange={handleChange} placeholder="Remarks" /></div>
            </div>


          </div>

          <div className={`glass ${styles.section} ${styles.sectionPrimary}`}>
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
              <div className={styles.inputGroup}><label>📝 REMARKS ON HANDYMAN</label><input name="handyman_dest_remarks" value={job.handyman_dest_remarks || ''} onChange={handleChange} placeholder="Remarks on handyman" /></div>
              
              <div className={styles.inputGroup}>
                <label>🚨 INCIDENTS</label>
                <CustomSelect
                  placeholder="None"
                  value={job.incidents || ''}
                  onChange={(val) => handleFieldChange('incidents', val)}
                  options={[
                    { value: '', label: 'None' },
                    { value: 'Damages', label: 'Damages' },
                    { value: 'Complaints', label: 'Complaints' }
                  ]}
                />
              </div>
              <div className={styles.inputGroup}><label>📝 INSTRUCTIONS</label><textarea name="dest_instructions" value={job.dest_instructions || ''} onChange={handleChange} /></div>
            </div>
          </div>

          <div className={`glass ${styles.section} ${styles.sectionPrimary}`}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#feedbackGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="feedbackGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#eab308" /></linearGradient></defs>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span style={{ background: 'linear-gradient(90deg, #f43f5e, #eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600 }}>Customer Service</span>
            </h3>
            <div className={styles.grid}>
              <div className={styles.inputGroup}><label>💯 JTR %</label><input type="number" name="jtr_percentage" value={job.jtr_percentage || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>⭐ GOOGLE REVIEW</label>
                <ToggleSwitch name="google_review_taken" value={job.google_review_taken === true || job.google_review_taken === 'Yes'} onChange={(val) => handleFieldChange('google_review_taken', val)} />
              </div>
              
              <div className={styles.inputGroup}><label>📢 REFERRALS</label><textarea name="referrals" value={job.referrals || ''} onChange={handleChange} /></div>
              <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}><label>💬 CUSTOMER FEEDBACK</label><textarea name="customer_feedback" value={job.customer_feedback || ''} onChange={handleChange} rows={4} style={{ resize: 'vertical', minHeight: '90px' }} placeholder="Customer feedback and comments..." /></div>
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
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
            {/* Visual Tracking Timeline */}
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Shipment Tracking
              </h4>
              
              <div style={{ position: 'relative', paddingLeft: '2.5rem', margin: '0 auto', maxWidth: '300px' }}>
                {/* Vertical Line */}
                <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '20px', width: '2px', background: 'linear-gradient(to bottom, #f59e0b, #3b82f6)' }}></div>
                
                {/* Origin Point */}
                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                  <div style={{ position: 'absolute', left: '-2.5rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#f59e0b', border: '3px solid white', boxShadow: '0 0 0 1px #f59e0b', zIndex: 2 }}></div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Origin (Dispatch)</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {job.dispatch_date ? formatDate(job.dispatch_date) : 'Pending Date'} • {job.origin ? toProperCase(job.origin) : 'Pending Origin'}
                  </div>
                </div>

                {/* Tracking Updates (Middle Points) */}
                {trackingLogs.map((track: any) => (
                  <div key={track.id} style={{ position: 'relative', marginBottom: '2rem' }}>
                    <div style={{ position: 'absolute', left: '-2.5rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6', border: '3px solid white', boxShadow: '0 0 0 1px #3b82f6', zIndex: 2 }}></div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{track.location ? toProperCase(track.location) : ''}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{track.date ? formatDate(track.date) : ''}</div>
                    {track.remark && <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.4rem', padding: '0.5rem 0.7rem', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>{track.remark}</div>}
                  </div>
                ))}
                
                <div style={{ position: 'relative', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.6)', padding: '1.2rem', borderRadius: '12px', border: '1px dashed rgba(148, 163, 184, 0.5)', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ position: 'absolute', left: '-3.7rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', borderRadius: '50%', background: 'transparent', border: '2px dashed #94a3b8', zIndex: 2 }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <input type="date" id="new_track_date" style={{ padding: '0.6rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)' }} />
                    <input type="text" id="new_track_location" placeholder="Current Location" style={{ padding: '0.6rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)' }} />
                    <input type="text" id="new_track_remarks" placeholder="Remarks (Optional)" style={{ padding: '0.6rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)' }} />
                    <button type="button" onClick={async () => {
                      const d = (document.getElementById('new_track_date') as HTMLInputElement).value;
                      const l = (document.getElementById('new_track_location') as HTMLInputElement).value;
                      const r = (document.getElementById('new_track_remarks') as HTMLInputElement).value;
                      if (!d || !l) return alert('Date and Location are required to add an update');
                      
                      await handleAddShipmentLog(undefined, d, l, r);
                      
                      (document.getElementById('new_track_date') as HTMLInputElement).value = '';
                      (document.getElementById('new_track_location') as HTMLInputElement).value = '';
                      (document.getElementById('new_track_remarks') as HTMLInputElement).value = '';
                    }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.3)', marginTop: '0.5rem' }}>+ Add Update</button>
                  </div>
                </div>

                {/* Destination Point */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-2.5rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: job.reached_destination ? '#10b981' : '#cbd5e1', border: '3px solid white', boxShadow: `0 0 0 1px ${job.reached_destination ? '#10b981' : '#cbd5e1'}`, zIndex: 2 }}></div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Destination {job.reached_destination ? '(Reached)' : '(Expected)'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {job.reached_destination ? `Reached: ${formatDate(job.reached_destination)}` : (job.expected_to_reach_dest ? `Expected: ${formatDate(job.expected_to_reach_dest)}` : 'Pending Date')} • {job.destination ? toProperCase(job.destination) : 'Pending Destination'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interactive transit map */}
            <JobMap origin={job.origin} destination={job.destination} checkpoints={trackingLogs} title="Route" />
          </div>
        </div>

        <div className={styles.sidePanel}>
          {/* Communications Section */}
          <div className={`glass ${styles.logsSection}`} style={{ height: 'auto', display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>📞 Communications</h3>
              <button
                type="button"
                onClick={() => setCommFormOpen(!commFormOpen)}
                style={{
                  background: commFormOpen ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: commFormOpen ? '0 3px 12px rgba(239,68,68,0.3)' : '0 3px 12px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                {commFormOpen ? '✕ Cancel' : '+ Log Call'}
              </button>
            </div>

            {commFormOpen && (
              <form onSubmit={handleAddComm} style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.04), rgba(124,58,237,0.06))',
                border: '1px solid rgba(99,102,241,0.15)', borderRadius: '14px', padding: '1.1rem',
                marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem'
              }}>
                {/* Row 1: Call Type & Regarding */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'block' }}>Call Type</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {(['Customer', 'Internal'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setCommForm(f => ({ ...f, call_type: t }))}
                          style={{
                            flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                            background: commForm.call_type === t
                              ? (t === 'Customer' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)')
                              : 'rgba(255,255,255,0.7)',
                            color: commForm.call_type === t ? '#fff' : 'var(--text-secondary)',
                            border: commForm.call_type === t ? 'none' : '1px solid rgba(148,163,184,0.3)',
                            boxShadow: commForm.call_type === t ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                          }}
                        >
                          {t === 'Customer' ? '👤 Customer' : '🏢 Internal'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1.5, minWidth: '180px', display: 'flex', alignItems: 'flex-end' }}>
                    <CustomSelect
                      placeholder="- Regarding -"
                      value={commForm.regarding}
                      onChange={(val) => setCommForm(f => ({ ...f, regarding: val }))}
                      options={[
                        { value: 'Pre-Packing', label: 'Pre-Packing' },
                        { value: 'Packing', label: 'Packing' },
                        { value: 'In Transit', label: 'In Transit' },
                        { value: 'Delivery', label: 'Delivery' },
                        { value: 'Feedback', label: 'Feedback' },
                        { value: 'Damages', label: 'Damages' },
                        { value: 'Complaints', label: 'Complaints' },
                        { value: 'Billing', label: 'Billing' },
                        { value: 'Storage', label: 'Storage' }
                      ]}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Row 3: Summary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Call Summary *</label>
                    <button 
                      type="button" 
                      onClick={handleDraftAIReply}
                      disabled={aiLoading || comms.length === 0}
                      style={{
                        background: 'none', border: '1px solid #10b981', color: '#10b981',
                        borderRadius: '12px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                        opacity: (aiLoading || comms.length === 0) ? 0.5 : 1
                      }}
                    >
                      ✨ Draft AI Reply
                    </button>
                  </div>
                  <textarea required value={commForm.summary} onChange={e => setCommForm(f => ({ ...f, summary: e.target.value }))} rows={3}
                    placeholder="Describe what was discussed..."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.9)', resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {/* Row 4: Follow-up */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, 
                    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' 
                  }}>
                    🔔 REMINDER ON
                  </label>
                  <input type="date" value={commForm.follow_up_date}
                    onChange={e => setCommForm(f => ({ ...f, follow_up_date: e.target.value, follow_up_required: !!e.target.value }))}
                    style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.9)', outline: 'none' }}
                  />
                  {commForm.follow_up_date && (
                    <button type="button" onClick={() => setCommForm(f => ({ ...f, follow_up_date: '', follow_up_required: false }))} 
                      style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Clear
                    </button>
                  )}
                </div>
                {/* Submit */}
                <button type="submit" style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '0.65rem 1.2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s ease', alignSelf: 'flex-end'
                }}>📞 Save Communication</button>
              </form>
            )}

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {['All', 'Customer', 'Internal'].map(f => (
                <button key={f} type="button" onClick={() => setCommFilter(f)}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                    background: commFilter === f ? '#4f46e5' : 'rgba(255,255,255,0.7)',
                    color: commFilter === f ? '#fff' : 'var(--text-secondary)',
                    border: commFilter === f ? '1px solid #4f46e5' : '1px solid rgba(148,163,184,0.3)'
                  }}
                >{f === 'All' ? `All (${comms.length})` : f === 'Customer' ? `👤 Customer (${comms.filter(c => c.call_type === 'Customer').length})` : `🏢 Internal (${comms.filter(c => c.call_type === 'Internal').length})`}</button>
              ))}
            </div>

            {/* Communications List */}
            <div className={styles.logsList}>
              {comms
                .filter(c => commFilter === 'All' || c.call_type === commFilter)
                .map(c => {
                  const regardingColors: Record<string, string> = {
                    'Pre-Packing': '#8b5cf6', 'Packing': '#6366f1', 'In Transit': '#3b82f6',
                    'Delivery': '#10b981', 'Feedback': '#14b8a6', 'Damages': '#ef4444',
                    'Complaints': '#f97316', 'Billing': '#eab308', 'Storage': '#64748b'
                  };
                  const tagColor = regardingColors[c.regarding] || '#6366f1';
                  return (
                    <div key={c.id} className={`${styles.logItem} ${styles.logComm}`} style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
                            background: c.call_type === 'Customer' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                            color: c.call_type === 'Customer' ? '#d97706' : '#2563eb',
                            border: `1px solid ${c.call_type === 'Customer' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)'}`
                          }}>{c.call_type === 'Customer' ? '👤 Customer' : '🏢 Internal'}</span>
                          <span style={{
                            padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
                            background: `${tagColor}14`, color: tagColor, border: `1px solid ${tagColor}30`
                          }}>{c.regarding}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(c.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>

                      <div className={styles.logMessage}>{c.summary}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <span className={styles.logAgent} style={{ color: getUserColor(c.agent_name).text }}>{c.agent_name}</span>
                        {c.follow_up_required && (() => {
                          const isCompleted = c.follow_up_completed;
                          let isUrgent = false;
                          let isFuture = false;
                          
                          if (!isCompleted && c.follow_up_date) {
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            if (c.follow_up_date <= todayStr) isUrgent = true;
                            else isFuture = true;
                          } else if (!isCompleted && !c.follow_up_date) {
                            isUrgent = true;
                          }

                          let bg = 'rgba(239,68,68,0.1)';
                          let text = '#dc2626';
                          let icon = '🔔';
                          let textDec = 'none';

                          if (isCompleted) {
                            bg = 'rgba(16,185,129,0.12)';
                            text = '#10b981';
                            icon = '✅';
                            textDec = 'line-through';
                          } else if (isFuture) {
                            bg = 'rgba(59,130,246,0.12)';
                            text = '#3b82f6';
                            icon = '📅';
                          }

                          return (
                            <span 
                              onClick={() => handleToggleFollowUp(c.id, c.follow_up_completed)}
                              className={isUrgent ? 'animate-pulse-ring' : ''}
                              style={{
                                padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
                                background: bg, color: text, border: `1px solid ${text}30`,
                                display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer',
                                transition: 'all 0.2s ease', textDecoration: textDec
                              }}
                              title={isCompleted ? "Mark as pending" : "Mark as completed"}
                            >
                              <span className={isUrgent ? 'animate-wiggle' : ''}>{icon}</span> 
                              Follow-up{c.follow_up_date ? `: ${formatDate(c.follow_up_date)}` : ''}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
              })}
              {comms.filter(c => commFilter === 'All' || c.call_type === commFilter).length === 0 && (
                <div className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
                  {comms.length === 0 ? 'No communications recorded yet. Click "+ Log Call" to add one.' : 'No communications match this filter.'}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Status Updates Section */}
          <div className={`glass ${styles.logsSection}`} style={{ height: 'auto', display: 'flex', flexDirection: 'column', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(148, 163, 184, 0.12)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20" style={{ flexShrink: 0 }}>
                <path fill="#25D366" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
              WhatsApp Updates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '4px' }}>
              {[
                { name: 'Pre-Packing', label: 'Onboarding & Coordinator Info' },
                { name: 'Packing Day', label: 'Packing Day Reminder' },
                { name: 'Post-Packing', label: 'Post-Packing Completion' },
                { name: 'Despatch / In Transit', label: 'Shipment Dispatch & Tracking' },
                { name: 'Delivery Scheduled', label: 'Delivery Schedule Confirmation' },
                { name: 'Delivery Day', label: 'Delivery Day Alert' },
                { name: 'Delivered & Feedback', label: 'Relocation Completed & Review' }
              ].map((stageItem, idx, arr) => {
                const messageText = getWhatsAppMessageText(stageItem.name);
                const sentInfo = whatsappLogs.find((log: any) => log.stage_name === stageItem.name);
                
                return (
                  <WhatsAppStageRow
                    key={stageItem.name}
                    stageName={stageItem.name}
                    stageLabel={stageItem.label}
                    messageText={messageText}
                    sentInfo={sentInfo}
                    customerPhone={job.customer_phone}
                    isLast={idx === arr.length - 1}
                    onSend={async () => {
                      const cleanPhone = (job.customer_phone || '').replace(/[^0-9]/g, '');
                      if (!cleanPhone) {
                        alert('Customer phone number is missing or invalid.');
                        return;
                      }
                      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
                      window.open(whatsappUrl, '_blank');
                      await handleMarkWhatsAppStageSent(stageItem.name, messageText);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Notes Section */}
          <div className={`glass ${styles.logsSection}`} style={{ height: 'auto', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: 0, marginBottom: '0.75rem' }}>Notes</h3>
            
            <form onSubmit={handleAddNote} className={styles.addLogForm}>
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
              {notes.map((log) => (
                <div key={log.id} className={`${styles.logItem} ${styles.logNote}`}>
                  <div className={styles.logHeader}>
                    <span className={styles.logAgent} style={{ color: getUserColor(log.agent_name).text }}>{log.agent_name}</span>
                    <span className={styles.logDate}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.logMessage}>{log.message}</div>
                </div>
              ))}
              {notes.length === 0 && <div className="text-muted">No notes recorded yet.</div>}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
