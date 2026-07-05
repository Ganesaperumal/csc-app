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
        const coordName = jobData.csc_coordinator || jobData.spoc_name;
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
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: bubbleBg, border: `2px solid ${borderCol}`,
                    color: isPast || isCurrent ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2,
                    boxShadow: isCurrent ? '0 0 12px rgba(79, 70, 229, 0.4)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
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
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{job.csc_coordinator || job.spoc_name || 'Transworld CSC SPOC'}</strong>
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

      {/* Footer Branding */}
      <footer style={{ textAlign: 'center', padding: '2rem 1rem 1rem 1rem', borderTop: '1px solid rgba(148,163,184,0.1)', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} Transworld International Relocations. Customer Service Center Portal. All rights reserved.
      </footer>
    </div>
  );
}
