'use client';
import { showToast } from '@/components/GlobalDialogs';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import CustomSelect from '@/app/home/components/CustomSelect';

interface Task {
  id: number;
  created_at: string;
  job_number: string;
  call_type: string;
  regarding: string;
  summary: string;
  agent_name: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  customerName?: string;
  spocName?: string;
  companyName?: string;
}

export default function FollowUpsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('All');
  const [allAgents, setAllAgents] = useState<string[]>([]);

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

      // Find list of all unique agent names for filtering
      const agents = Array.from(
        new Set(enrichedComms.map((c: any) => c.agent_name?.toLowerCase()).filter(Boolean))
      ).sort() as string[];
      setAllAgents(agents);

      setLoading(false);
    };

    initializePage();
  }, [router]);

  const toggleTaskCompletion = async (taskId: number, currentCompleted: boolean) => {
    if (isViewer) return;
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

  // Helper for dates and urgency
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No Date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Helper for agent badge colors
  const getUserColor = (name: string) => {
    if (!name) return { bg: 'rgba(0,0,0,0.05)', text: 'var(--text-primary)' };
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: 'rgba(79, 70, 229, 0.15)', text: '#4f46e5' },
      { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669' },
      { bg: 'rgba(217, 70, 239, 0.15)', text: '#c026d3' },
      { bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706' },
      { bg: 'rgba(14, 165, 233, 0.15)', text: '#0284c7' },
      { bg: 'rgba(236, 72, 153, 0.15)', text: '#db2777' },
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Filtering logic
  const filteredTasks = tasks.filter(task => {
    // Agent filtering when showAll is active
    if (isAdmin && selectedAgentFilter !== 'All' && task.agent_name?.toLowerCase() !== selectedAgentFilter.toLowerCase()) return false;
    
    // Search filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchJob = task.job_number?.toLowerCase().includes(q);
      const matchCustomer = task.customerName?.toLowerCase().includes(q);
      const matchCompany = task.companyName?.toLowerCase().includes(q);
      const matchRegarding = task.regarding?.toLowerCase().includes(q);
      const matchSummary = task.summary?.toLowerCase().includes(q);
      const matchAgent = task.agent_name?.toLowerCase().includes(q);
      if (!matchJob && !matchCustomer && !matchCompany && !matchRegarding && !matchSummary && !matchAgent) {
        return false;
      }
    }
    return true;
  });

  // Categorize tasks for Kanban columns
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pending = filteredTasks.filter(t => !t.follow_up_completed);
  const completedTasks = filteredTasks.filter(t => t.follow_up_completed);

  const overdueTasks: Task[] = [];
  const todayTasks: Task[] = [];
  const upcomingTasks: Task[] = [];

  pending.forEach(t => {
    if (!t.follow_up_date) {
      upcomingTasks.push(t);
      return;
    }
    const taskDate = new Date(t.follow_up_date);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate < today) {
      overdueTasks.push(t);
    } else if (taskDate.getTime() === today.getTime()) {
      todayTasks.push(t);
    } else {
      upcomingTasks.push(t);
    }
  });

  // Render a Kanban Column
  const renderTaskColumn = (title: string, list: Task[], theme: 'danger' | 'warning' | 'primary' | 'success') => {
    const themeStyles = {
      danger:  { border: '#fecaca', bg: '#fef2f2', headerText: '#dc2626', badgeBg: '#ef4444' },
      warning: { border: '#fde68a', bg: '#fffbeb', headerText: '#b45309', badgeBg: '#f59e0b' },
      primary: { border: '#c7d2fe', bg: '#e0e7ff', headerText: '#3730a3', badgeBg: '#4f46e5' },
      success: { border: '#bbf7d0', bg: '#f0fdf4', headerText: '#15803d', badgeBg: '#10b981' },
    }[theme];

    return (
      <div 
        style={{
          flex: 1,
          minWidth: '280px',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-color)',
          borderRadius: '12px',
          border: `1px solid ${themeStyles.border}`,
          height: 'calc(100vh - 12rem)',
          overflow: 'hidden'
        }}
      >
        {/* Column Header */}
        <div style={{
          padding: '0.85rem 1rem',
          background: themeStyles.bg,
          borderBottom: `1px solid ${themeStyles.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>
              {theme === 'danger' ? '🚨' : theme === 'warning' ? '⏰' : theme === 'primary' ? '📅' : '✅'}
            </span>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: themeStyles.headerText }}>
              {title}
            </h3>
          </div>
          <span style={{
            background: themeStyles.badgeBg,
            color: 'white',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {list.length}
          </span>
        </div>

        {/* Task Cards List */}
        <div style={{
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {list.length === 0 ? (
            <div style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontStyle: 'italic'
            }}>
              No tasks in this category
            </div>
          ) : (
            list.map(task => (
              <div 
                key={task.id} 
                className="glass" 
                style={{ 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--glass-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                }}
              >
                {/* Header: Checkbox & Job Reference */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="checkbox" 
                      checked={task.follow_up_completed} 
                      onChange={() => toggleTaskCompletion(task.id, task.follow_up_completed)}
                      disabled={isViewer}
                      style={{ width: '16px', height: '16px', cursor: isViewer ? 'not-allowed' : 'pointer', accentColor: '#10b981', opacity: isViewer ? 0.5 : 1 }} 
                    />
                    <Link 
                      href={`/home/job/${encodeURIComponent(task.job_number)}`}
                      style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', textDecoration: 'underline' }}
                    >
                      {task.job_number}
                    </Link>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                    {task.regarding}
                  </span>
                </div>

                {/* Customer & Company Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {task.customerName}
                  </strong>
                  {task.companyName && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {task.companyName}
                    </span>
                  )}
                </div>

                {/* Call summary comment */}
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', padding: '0.5rem', borderRadius: '6px', borderLeft: `3px solid ${themeStyles.badgeBg}`, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.summary}
                </p>

                {/* Footer: Date and Agent name */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Coordinator:{' '}
                    <span style={{ 
                      background: getUserColor(task.agent_name).bg, 
                      color: getUserColor(task.agent_name).text, 
                      padding: '1px 6px', 
                      borderRadius: '6px', 
                      fontWeight: 700,
                      fontSize: '0.65rem'
                    }}>
                      {task.agent_name}
                    </span>
                  </span>
                  <span style={{ fontWeight: 700, color: theme === 'danger' && !task.follow_up_completed ? '#ef4444' : 'var(--text-secondary)' }}>
                    📅 {formatDate(task.follow_up_date)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.5rem 0.25rem', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⏰</span>
            <span style={{ backgroundImage: 'linear-gradient(45deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Follow-up Tasks
            </span>
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

      {loading ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ border: '3px solid rgba(0,0,0,0.1)', borderLeftColor: '#4f46e5', borderRadius: '50%', width: '28px', height: '28px', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading follow-ups...</span>
          </div>
          <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
        </div>
      ) : (
        /* Board Columns Grid */
        <div style={{ display: 'flex', flex: 1, gap: '1.25rem', flexWrap: 'nowrap', overflowX: 'auto', minHeight: 0, paddingBottom: '0.5rem' }}>
          {renderTaskColumn('Overdue', overdueTasks, 'danger')}
          {renderTaskColumn('Due Today', todayTasks, 'warning')}
          {renderTaskColumn('Upcoming Reminders', upcomingTasks, 'primary')}
          {renderTaskColumn('Completed Tasks', completedTasks, 'success')}
        </div>
      )}
    </div>
  );
}
