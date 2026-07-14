'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import JobMap from '../../dashboard/components/JobMap';

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

const GOODS_STAGES = [
  { name: 'Packing', status: '03. Packing in Progress' },
  { name: 'Dispatched', status: '06. Despatched in TI Vehicle' },
  { name: 'In Transit', status: '09. In Transit' },
  { name: 'Out for Delivery', status: '13. Out for Delivery' },
  { name: 'Delivered', status: '14. Delivered' }
];

export default function PublicTrackingPage({ params }: { params: Promise<{ id: string | string[] }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const decodedId = Array.isArray(id)
    ? id.map(decodeURIComponent).join('/')
    : decodeURIComponent(id);

  const [job, setJob] = useState<any>(null);
  const [trackingLogs, setTrackingLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinatorPhone, setCoordinatorPhone] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Fire confetti when delivered
  useEffect(() => {
    if (job?.goods_track_status?.toLowerCase().includes('delivered')) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [job?.goods_track_status]);

  useEffect(() => {
    const fetchPublicTracking = async () => {
      try {
        setLoading(true);
        // Fetch Job Details
        const { data: jobData, error: jobErr } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_number', decodedId)
          .single();

        if (jobErr || !jobData) {
          setError('We couldn\'t find a shipment associated with this Tracking / Job Number.');
          return;
        }

        setJob(jobData);

        // Fetch Coordinator Phone
        const coordName = jobData.csc_coordinator;
        if (coordName) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone')
            .eq('name', coordName)
            .maybeSingle();
          if (profileData?.phone) {
            setCoordinatorPhone(profileData.phone);
          }
        }

        // Fetch Transit Checkpoints
        const { data: trackData } = await supabase
          .from('job_shipment_track')
          .select('*')
          .eq('job_number', decodedId)
          .order('date', { ascending: true });

        if (trackData) {
          setTrackingLogs(trackData);
        }
      } catch (err: any) {
        console.error('Tracking fetch error:', err);
        setError('An unexpected error occurred while loading tracking information.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTracking();
  }, [decodedId]);

  // Determine current active stage index
  const getCurrentStageIndex = () => {
    if (!job?.goods_track_status) return -1;
    const currentStatus = job.goods_track_status;
    
    // Find index of first stage matching or exceeded
    const statusNum = parseInt(currentStatus.substring(0, 2), 10);
    if (isNaN(statusNum)) return -1;

    if (statusNum >= 14) return 4; // Delivered
    if (statusNum >= 13) return 3; // Out for Delivery
    if (statusNum >= 9) return 2;  // In Transit
    if (statusNum >= 6) return 1;  // Dispatched
    if (statusNum >= 3) return 0;  // Packing
    return -1;
  };

  const activeStageIdx = getCurrentStageIndex();

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ border: '4px solid rgba(99, 102, 241, 0.1)', borderLeftColor: '#4f46e5', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Locating your shipment details...</span>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ display: 'flex', flex: 1, minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-color)' }}>
        <div className="glass" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📦</span>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 800 }}>Tracking Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>{error || 'Invalid Tracking Link.'}</p>
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: '1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
            Please verify the URL or contact your Transworld Single Point of Contact (SPOC) for assistance.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: '100vh', padding: '1.5rem', background: 'var(--bg-color)', overflowY: 'auto' }}>
      <style dangerouslySetInnerHTML={{__html: `
        html, body { overflow: auto !important; height: auto !important; }
        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
        }
        .timeline-bar {
          position: absolute;
          top: 15px;
          left: 50%;
          right: -50%;
          height: 3px;
          background: #e2e8f0;
          z-index: 1;
        }
        .timeline-step:last-child .timeline-bar {
          display: none;
        }
        @media (max-width: 640px) {
          .timeline-container {
            flex-direction: column;
            gap: 1.5rem;
            align-items: flex-start !important;
            padding-left: 2rem;
          }
          .timeline-step {
            flex-direction: row;
            width: 100%;
            gap: 1rem;
          }
          .timeline-bar {
            top: 20px;
            left: 10px;
            bottom: -25px;
            width: 3px;
            height: auto;
            right: auto;
          }
        }
      `}} />
      
      {/* Top Brand Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1100px', width: '100%', margin: '0 auto 2rem auto', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem' }}>📦</span>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, backgroundImage: 'linear-gradient(45deg, #059669, #10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Transworld International</h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Tracking Portal</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>JOB ID / REF</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4f46e5' }}>{job.job_number}</span>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', contentVisibility: 'auto' }}>
        
        {/* Customer & Job Info Banner */}
        <div className="glass" style={{ 
          padding: '1.25rem 1.75rem', 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)', 
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(243,244,246,0.5) 100%)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Valued Customer</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 850, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>👤</span> {job.customer_name || 'Valued Customer'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Company</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 750, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.35rem' }}>🏢</span> {job.company || 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Sales SPOC</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 750, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.35rem' }}>👔</span> {job.spoc_name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Status Timeline Card */}
        <section className="glass" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span> Shipment Status: <span style={{ color: '#4f46e5' }}>{job.goods_track_status || 'In Transit'}</span>
          </h2>

          {/* Graphical Progress Bar */}
          <div className="timeline-container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', overflow: 'visible', padding: '10px 0' }}>
            {GOODS_STAGES.map((stage, idx) => {
              const isCurrent = activeStageIdx === idx;
              const isPast = idx < activeStageIdx;
              
              let bubbleBg = '#f1f5f9';
              let borderCol = '#cbd5e1';
              let textCol = 'var(--text-secondary)';
              let dotDisplay = String(idx + 1);

              if (isCurrent) {
                bubbleBg = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                borderCol = '#4f46e5';
                textCol = '#4f46e5';
                dotDisplay = '🚚';
              } else if (isPast) {
                bubbleBg = '#10b981';
                borderCol = '#10b981';
                textCol = '#10b981';
                dotDisplay = '✓';
              }

              return (
                <div key={stage.name} className="timeline-step">
                  {/* Visual connector line */}
                  <div className="timeline-bar" style={{ background: isPast ? '#10b981' : '#e2e8f0' }} />
                  
                  {/* Step bubble */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: bubbleBg, border: `2px solid ${borderCol}`,
                    color: isPast || isCurrent ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isCurrent ? '1.1rem' : '0.85rem', fontWeight: 'bold', zIndex: 2,
                    boxShadow: isCurrent ? '0 0 12px rgba(79,70,229,0.4)' : 'none',
                    transition: 'all 0.4s ease'
                  }}
                  className={isCurrent ? 'stage-active-pulse' : ''}>
                    {dotDisplay}
                  </div>
                  
                  <span style={{ fontSize: '0.8rem', fontWeight: isCurrent || isPast ? 700 : 500, color: textCol, marginTop: '0.6rem', textAlign: 'center' }}>
                    {stage.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2 Column Details Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Tracking Details & Timeline table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Shipment details card */}
            <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📋 Relocation Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Origin</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{job.origin ? toProperCase(job.origin) : 'N/A'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Destination</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{job.destination ? toProperCase(job.destination) : 'N/A'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Dispatch Date</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{job.dispatch_date ? formatDate(job.dispatch_date) : 'Pending'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Delivery Schedule</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {job.actual_delivery ? `Delivered: ${formatDate(job.actual_delivery)}` : (job.planned_delivery ? `Planned: ${formatDate(job.planned_delivery)}` : 'Scheduling...')}
                  </span>
                </div>
                {job.car_included && (
                  <>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6', display: 'block', textTransform: 'uppercase' }}>🚗 Car Pickup</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{job.car_pickup_date ? formatDate(job.car_pickup_date) : 'Pending Pickup'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6', display: 'block', textTransform: 'uppercase' }}>🚗 Car Delivery</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{job.car_delivery_date ? formatDate(job.car_delivery_date) : 'Pending Delivery'}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Designated SPOC Contacts */}
            <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🤝 Support Contact
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white' }}>
                  👤
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>Your Assigned CSC Coordinator:</span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{job.csc_coordinator || 'Transworld CSC Coordinator'}</strong>
                  {coordinatorPhone && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      Phone: {coordinatorPhone}
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Email: customercare@transworldintl.com</span>
                </div>
              </div>
            </section>
          </div>

          {/* Timeline Checkpoints */}
          <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📍 Transit Timeline Checkpoints
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '220px', overflowY: 'auto' }}>
              {trackingLogs.length === 0 ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', padding: '2rem' }}>
                  No transit checkpoints registered yet. Your coordinator will log updates as the shipment progresses.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                  {/* Left Connector Line */}
                  <div style={{ position: 'absolute', left: '4px', top: '10px', bottom: '15px', width: '2px', background: '#3b82f6' }} />
                  
                  {trackingLogs.map((log, idx) => (
                    <div key={log.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                      {/* Node Bullet */}
                      <div style={{ position: 'absolute', left: '-1.5rem', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', border: '2px solid white', zIndex: 2 }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{toProperCase(log.location)}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>{formatDate(log.date)}</span>
                      </div>
                      {log.remark && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {log.remark}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Live Route Map Card */}
        <section style={{ width: '100%', marginBottom: '2rem' }}>
          <JobMap origin={job.origin} destination={job.destination} checkpoints={trackingLogs} />
        </section>

      </main>

      {/* Floating WhatsApp Button */}
      {coordinatorPhone && (
        <a
          href={`https://wa.me/${coordinatorPhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999,
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          title={`Chat with your coordinator on WhatsApp`}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,211,102,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,211,102,0.4)'; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.119 1.532 5.845L.063 23.5l5.834-1.53A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.844 0-3.587-.492-5.091-1.352l-.366-.214-3.773.99 1.01-3.684-.234-.38A9.934 9.934 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </a>
      )}

      {/* Confetti */}
      {showConfetti && (
        <>
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}vw`,
                top: '-20px',
                background: ['#4f46e5','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6'][i % 6],
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                animationDuration: `${2.5 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 1.5}s`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </>
      )}

      {/* Footer Branding */}
      <footer style={{ textAlign: 'center', padding: '2rem 1rem 1rem 1rem', borderTop: '1px solid rgba(148,163,184,0.1)', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} Transworld International Relocations. Customer Service Center Portal. All rights reserved.
      </footer>
    </div>
  );
}
