'use client';
import { showToast } from '@/components/GlobalDialogs';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserColor } from '@/lib/colorUtils';
import CustomSelect from '../components/CustomSelect';
import { usePermissions } from '@/components/PermissionsContext';

interface Task {
  id: number;
  job_number: string;
  agent_name: string;
  call_type: string;
  regarding: string;
  summary: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  created_at: string;
  customerName?: string;
  spocName?: string;
  companyName?: string;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'No Date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

export default function FollowUpsPage() {
  const { getAccessLevel } = usePermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [allAgents, setAllAgents] = useState<string[]>([]);
  
  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, csc_role, tracking_role, followups_role, name, username')
        .eq('id', user.id)
        .single();

      let activeName = 'Agent';
      let adminRole = false;
      let showAll = false;

      if (profile) {
        activeName = profile.name || profile.username || user.email?.split('@')[0] || 'Agent';
        const fRole = (profile.followups_role || profile.tracking_role || '').toLowerCase();
        const cscRole = profile.csc_role || 'None';

        const hasCscAccess = cscRole !== 'None' && cscRole !== '';
        const hasFollowupsAccess = fRole !== 'none' && fRole !== '';

        if (!hasCscAccess || !hasFollowupsAccess) {
          router.push('/home');
          return;
        }

        const isViewerUser = cscRole === 'View';
        setIsViewer(isViewerUser);
        setAgentName(activeName);

        showAll = fRole === 'all' || fRole === 'admin' || fRole.includes('all');
        setIsAdmin(showAll);
      } else {
        activeName = user.email?.split('@')[0] || 'Agent';
        setAgentName(activeName);
      }

      let query = supabase
        .from('job_communications')
        .select('*')
        .eq('follow_up_required', true);

      if (!showAll) {
        query = query.ilike('agent_name', activeName);
      }

      const { data: comms, error } = await query.order('follow_up_date', { ascending: true });

      if (error) {
        console.error('Error fetching communications:', error);
        setLoading(false);
        return;
      }

      const activeComms = comms || [];

      const jobMap: Record<string, { customer: string; spoc: string; company: string }> = {};
      const jobNumbers = Array.from(new Set(activeComms.map(c => c.job_number)));

      if (jobNumbers.length > 0) {
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select('job_number, customer_name, spoc_name, company')
          .in('job_number', jobNumbers);

        if (!jobsError && jobs) {
          jobs.forEach(j => {
            jobMap[j.job_number] = {
              customer: j.customer_name || 'Unknown Client',
              spoc: j.spoc_name || 'Unassigned SPOC',
              company: j.company || ''
            };
          });
        }
      }

      const enrichedComms = activeComms.map((c: any) => ({
        ...c,
        customerName: jobMap[c.job_number]?.customer || 'Unknown Client',
        spocName: jobMap[c.job_number]?.spoc || 'Unassigned SPOC',
        companyName: jobMap[c.job_number]?.company || ''
      }));
      setTasks(enrichedComms);

      const agents = Array.from(
        new Set(enrichedComms.map((c: any) => c.agent_name?.toLowerCase()).filter(Boolean))
      ).sort() as string[];
      setAllAgents(agents);

      setLoading(false);
    };

    initializePage();
  }, [router]);

  const toggleTaskCompletion = async (taskId: number, currentCompleted: boolean) => {
    const updatedStatus = !currentCompleted;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, follow_up_completed: updatedStatus } : t));

    try {
      const { error } = await supabase
        .from('job_communications')
        .update({ follow_up_completed: updatedStatus })
        .eq('id', taskId);

      if (error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, follow_up_completed: currentCompleted } : t));
        showToast('Failed to update follow-up status', 'error');
      } else {
        showToast(updatedStatus ? 'Follow-up marked as completed ✅' : 'Follow-up reopened ⏰', 'success');
      }
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, follow_up_completed: currentCompleted } : t));
      showToast('Error updating status', 'error');
    }
  };

  const pendingTasks = tasks.filter(t => !t.follow_up_completed);
  const completedTasks = tasks.filter(t => t.follow_up_completed);

  const filterTask = (t: Task) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      t.job_number.toLowerCase().includes(q) ||
      t.regarding.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.companyName && t.companyName.toLowerCase().includes(q));

    const matchesAgent = selectedAgentFilter === 'All' || t.agent_name.toLowerCase() === selectedAgentFilter.toLowerCase();

    return matchesSearch && matchesAgent;
  };

  const filteredPending = pendingTasks.filter(filterTask);
  const filteredCompleted = completedTasks.filter(filterTask);

  const getUrgency = (dateStr: string | null) => {
    if (!dateStr) return 'normal';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - today.getTime()) / (86400000));
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    return 'normal';
  };

  if (loading) {
    return <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading follow-ups...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ─── Header & Filters Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⏰</span> Follow-up Tasks
          </h1>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap' }}>
          {/* Admin Agent filter dropdown — left of search */}
          {isAdmin && (
            <CustomSelect
              placeholder="All Operators"
              value={selectedAgentFilter}
              onChange={(val) => setSelectedAgentFilter(val)}
              options={[
                { value: 'All', label: 'All Operators' },
                ...allAgents.map(name => ({ value: name, label: name }))
              ]}
              style={{ width: '180px', minWidth: '180px', flexGrow: 0 }}
            />
          )}

          {/* Search bar — always right of dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem', minWidth: '200px' }}
            />
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>🔍</span>
          </div>
        </div>
      </div>

      {/* ─── Summary Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass" style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Pending</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>{filteredPending.length}</div>
        </div>
        <div className="glass" style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Overdue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>
            {filteredPending.filter(t => getUrgency(t.follow_up_date) === 'overdue').length}
          </div>
        </div>
        <div className="glass" style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>{filteredCompleted.length}</div>
        </div>
      </div>

      {/* ─── Pending Tasks Section ─── */}
      <div className="glass" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🔔 Pending Tasks ({filteredPending.length})
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.01)' }}>
                {['Done', 'Job #', 'Client / Company', 'Regarding', 'Summary', 'Follow-up Date', 'Agent'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPending.map(t => {
                const urgency = getUrgency(t.follow_up_date);
                const isOverdue = urgency === 'overdue';
                const isToday = urgency === 'today';

                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', background: isOverdue ? 'rgba(239,68,68,0.03)' : (isToday ? 'rgba(245,158,11,0.03)' : 'transparent') }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <input
                        type="checkbox"
                        checked={t.follow_up_completed}
                        onChange={() => toggleTaskCompletion(t.id, t.follow_up_completed)}
                        disabled={isViewer}
                        style={{ width: '16px', height: '16px', cursor: isViewer ? 'not-allowed' : 'pointer', accentColor: '#10b981', opacity: isViewer ? 0.5 : 1 }} 
                      />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                      <Link href={`/home/job/${encodeURIComponent(t.job_number)}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                        {t.job_number}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.customerName}</div>
                      {t.companyName && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.companyName}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.regarding}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.summary}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        background: isOverdue ? '#fef2f2' : (isToday ? '#fffbeb' : '#f1f5f9'),
                        color: isOverdue ? '#dc2626' : (isToday ? '#b45309' : '#475569'),
                        border: `1px solid ${isOverdue ? '#fecaca' : (isToday ? '#fde68a' : '#cbd5e1')}`
                      }}>
                        {formatDate(t.follow_up_date)} {isOverdue ? '⚠️ Overdue' : (isToday ? '⏰ Today' : '')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: getUserColor(t.agent_name).bg, color: getUserColor(t.agent_name).text, border: '1px solid rgba(0,0,0,0.1)'
                      }}>
                        👤 {t.agent_name}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredPending.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    🎉 No pending follow-up tasks!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Completed Tasks Section ─── */}
      {filteredCompleted.length > 0 && (
        <div className="glass" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', opacity: 0.85 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              ✅ Completed Tasks ({filteredCompleted.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.01)' }}>
                  {['Done', 'Job #', 'Client / Company', 'Regarding', 'Summary', 'Completed Date', 'Agent'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCompleted.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.7 }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <input
                        type="checkbox"
                        checked={t.follow_up_completed}
                        onChange={() => toggleTaskCompletion(t.id, t.follow_up_completed)}
                        disabled={isViewer}
                        style={{ width: '16px', height: '16px', cursor: isViewer ? 'not-allowed' : 'pointer', accentColor: '#10b981', opacity: isViewer ? 0.5 : 1 }} 
                      />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      <Link href={`/home/job/${encodeURIComponent(t.job_number)}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                        {t.job_number}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{t.customerName}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {t.regarding}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.summary}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {formatDate(t.follow_up_date)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        👤 {t.agent_name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
