'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getUserColor } from '@/lib/colorUtils';

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '16px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
  padding: '1.5rem 2rem',
};

const FIELD_LABELS: Record<string, string> = {
  goods_track_status: 'Goods Track Status',
  car_track_status: 'Car Track Status',
  follow_up_date: 'Follow-Up Date',
  dispatch_date: 'Dispatch Date',
  expected_to_reach_dest: 'Expected Reaching Date',
  reached_destination: 'Reached Destination Date',
  transit_days: 'Transit Days',
  deviation: 'Deviation',
  deviation_reason: 'Deviation Reason',
  planned_delivery: 'Planned Delivery Date',
  actual_delivery: 'Actual Delivery Date',
  dest_supervisor: 'Destination Supervisor',
  dest_floor: 'Destination Floor',
  dest_service_lift: 'Dest Service Lift',
  dest_parking: 'Dest Parking',
  dest_instructions: 'Dest Instructions',
  incidents: 'Incidents',
  jtr_percentage: 'JTR %',
  google_review_taken: 'Google Review',
  referrals: 'Referrals',
  packing_date: 'Packing Date',
  packing_team_supervisor: 'Packing Supervisor',
  heavy_items: 'Heavy Items',
  car_included: 'Car Included',
  car_pickup_date: 'Car Pickup Date',
  car_delivery_date: 'Car Delivery Date',
  spoc_name: 'SPOC',
  operation_by: 'Operation By',
  customer_name: 'Customer Name',
  customer_phone: 'Contact',
  origin: 'Origin',
  destination: 'Destination',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [agents, setAgents] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const router = useRouter();

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!profile || profile.role !== 'Admin') {
        router.push('/dashboard');
        return;
      }
      fetchLogs();
    };
    checkAdmin();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Fetch profiles to map usernames/names to full names
      const { data: profileData } = await supabase.from('profiles').select('username, name');
      const map: Record<string, string> = {};
      if (profileData) {
        profileData.forEach(p => {
          if (p.username) map[p.username.toLowerCase()] = p.name || p.username;
          if (p.name) map[p.name.toLowerCase()] = p.name;
        });
      }
      map['agent'] = 'Rijish';
      setUserMap(map);

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Supabase error:', JSON.stringify(error));
        setFetchError(`Database error: ${error.message || error.code || JSON.stringify(error)}`);
        return;
      }

      // Filter out database trigger logs (identified by having >3 decimal places of fractional seconds and field 'goods_track_status')
      const filteredData = (data || []).filter((log: any) => {
        if (log.field_changed === 'goods_track_status') {
          const match = log.changed_at?.match(/\.(\d+)/);
          if (match && match[1].length > 3) {
            return false; // Skip trigger logs
          }
        }
        return true;
      });

      setLogs(filteredData);

      // Extract unique agents and fields for filter dropdowns
      const uniqueAgents = Array.from(new Set(filteredData.map((l: any) => l.agent_name).filter(Boolean)));
      const uniqueFields = Array.from(new Set(filteredData.map((l: any) => l.field_changed).filter(Boolean)));
      setAgents(uniqueAgents as string[]);
      setFields(uniqueFields as string[]);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setFetchError(err?.message || 'Unknown error fetching activity log.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = !search ||
      log.job_number?.toLowerCase().includes(search.toLowerCase()) ||
      log.agent_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.field_changed?.toLowerCase().includes(search.toLowerCase()) ||
      log.new_value?.toLowerCase().includes(search.toLowerCase());
    const matchAgent = !agentFilter || log.agent_name === agentFilter;
    const matchField = !fieldFilter || log.field_changed === fieldFilter;
    let matchDate = true;
    if (dateFilter && log.changed_at) {
      const logDate = new Date(log.changed_at).toISOString().split('T')[0];
      matchDate = logDate === dateFilter;
    }
    return matchSearch && matchAgent && matchField && matchDate;
  });

  const formatDateTime = (ts: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(148,163,184,0.3)',
    background: 'rgba(255,255,255,0.7)',
    color: '#0f172a',
    fontSize: '0.875rem',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    outline: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02) inset',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', height: '100%', overflowY: 'auto', fontFamily: "'Outfit', 'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2.4rem' }}>📋</span>
            <h1 style={{ 
              fontSize: '2.4rem', 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #4f46e5 0%, #d946ef 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              margin: 0,
              filter: 'drop-shadow(0 2px 4px rgba(79, 70, 229, 0.1))'
            }}>
              Activity Log
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            Full audit trail of all field changes across jobs · Showing last 500 records
          </p>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '99px',
            border: 'none',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
            color: '#4f46e5',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #d946ef 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.15)'; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, marginBottom: '1.25rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Top Row: Search */}
          <div style={{ display: 'flex', width: '100%' }}>
            <input
              type="text"
              placeholder="🔍 Search job, agent, field, value..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          {/* Bottom Row: Two Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Left Column: Users & Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                <option value="">All Users</option>
                {agents.map(a => <option key={a} value={a}>{userMap[a.toLowerCase()] || a}</option>)}
              </select>
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            {/* Right Column: Fields & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                <option value="">All Fields</option>
                {fields.map(f => <option key={f} value={f}>{FIELD_LABELS[f] || f}</option>)}
              </select>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                {(search || agentFilter || fieldFilter || dateFilter) ? (
                  <button onClick={() => { setSearch(''); setAgentFilter(''); setFieldFilter(''); setDateFilter(''); }}
                    style={{ ...inputStyle, color: '#dc2626', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontWeight: 600, padding: '0.4rem 1rem' }}>
                    ✕ Clear
                  </button>
                ) : (
                  <div></div>
                )}
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                  {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        {fetchError ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1.5rem', color: '#dc2626', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>⚠️ Could not load Activity Log</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{fetchError}</div>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.7 }}>
              The <code style={{ background: 'rgba(148,163,184,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>audit_logs</code> table may not exist yet in your Supabase project.<br />
              Please create it with the following SQL in the Supabase SQL editor:
            </p>
            <pre style={{ background: 'rgba(15,23,42,0.05)', borderRadius: '10px', padding: '1rem', textAlign: 'left', fontSize: '0.78rem', color: '#0f172a', overflowX: 'auto', marginTop: '1rem' }}>
{`CREATE TABLE public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  job_number text,
  agent_name text,
  field_changed text,
  old_value text,
  new_value text
);

-- Enable RLS and allow all authenticated users to read/insert
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');`}
            </pre>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading activity log...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(148,163,184,0.2)' }}>
                  {['Time', 'Job Number', 'User', 'Field Changed', 'Old Value', 'New Value'].map(col => (
                    <th key={col} style={{ padding: '0.6rem 0.9rem 0.6rem 0', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.1)', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(241,245,249,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => log.job_number && router.push(`/dashboard/job/${encodeURIComponent(log.job_number)}`)}
                  >
                    <td style={{ padding: '0.7rem 0.9rem 0.7rem 0', color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {formatDateTime(log.changed_at)}
                    </td>
                    <td style={{ padding: '0.7rem 0.9rem 0.7rem 0', fontWeight: 700, color: '#4f46e5' }}>
                      {log.job_number || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 0.9rem 0.7rem 0' }}>
                      <span style={{
                        background: getUserColor(userMap[log.agent_name?.toLowerCase()] || log.agent_name).bg,
                        color: getUserColor(userMap[log.agent_name?.toLowerCase()] || log.agent_name).text,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '99px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}>
                        {userMap[log.agent_name?.toLowerCase()] || log.agent_name || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 0.9rem 0.7rem 0', color: '#0f172a', fontWeight: 600 }}>
                      {FIELD_LABELS[log.field_changed] || log.field_changed || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 0.9rem 0.7rem 0', color: '#dc2626', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.old_value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>empty</span>}
                    </td>
                    <td style={{ padding: '0.7rem 0 0.7rem 0', color: '#059669', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.new_value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>empty</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
