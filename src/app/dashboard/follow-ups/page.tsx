'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserColor } from '@/lib/colorUtils';
import CustomSelect from '../components/CustomSelect';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [allAgents, setAllAgents] = useState<string[]>([]);
  
  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      // 1. Get logged-in user profile details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, username')
        .eq('id', user.id)
        .single();

      let activeName = 'Agent';
      let adminRole = false;

      if (profile) {
        activeName = profile.name || profile.username || user.email?.split('@')[0] || 'Agent';
        adminRole = profile.role === 'Admin';
        setIsAdmin(adminRole);
        setAgentName(activeName);
      } else {
        activeName = user.email?.split('@')[0] || 'Agent';
        setAgentName(activeName);
      }

      // 2. Query follow-up tasks first
      let query = supabase
        .from('job_communications')
        .select('*')
        .eq('follow_up_required', true);

      // If not admin, restrict to owner agent
      if (!adminRole) {
        query = query.eq('agent_name', activeName);
      }

      const { data: comms, error } = await query.order('follow_up_date', { ascending: true });

      if (error) {
        console.error('Error fetching communications:', error);
        setLoading(false);
        return;
      }

      const activeComms = comms || [];

      // 3. Fetch job details mapping for only those jobs that have active follow-ups
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

      // 4. Enrich and set tasks
      const enrichedComms = activeComms.map((c: any) => ({
        ...c,
        customerName: jobMap[c.job_number]?.customer || 'Unknown Client',
        spocName: jobMap[c.job_number]?.spoc || 'Unassigned SPOC',
        companyName: jobMap[c.job_number]?.company || ''
      }));
      setTasks(enrichedComms);

      // Find list of all unique agent names for filtering (if admin)
      const agents = Array.from(new Set(enrichedComms.map(c => c.agent_name))).sort();
      setAllAgents(agents);

      setLoading(false);
    };

    initializePage();
  }, [router]);

  // Handle task status update
  const toggleTaskCompletion = async (taskId: number, currentCompleted: boolean) => {
    const updatedStatus = !currentCompleted;
    
    // Update local state first (optimistic UI change)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, follow_up_completed: updatedStatus } : t));

    try {
      const { error } = await supabase
        .from('job_communications')
        .update({ follow_up_completed: updatedStatus })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling follow-up:', err);
      // Revert state on error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, follow_up_completed: currentCompleted } : t));
      alert('Failed to update task status in database.');
    }
  };

  // Date constants for column categorisation
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering logic
  const filteredTasks = tasks.filter(task => {
    // Admin filtering
    if (isAdmin && selectedAgentFilter !== 'All' && task.agent_name !== selectedAgentFilter) return false;
    
    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchJobNum = task.job_number.toLowerCase().includes(query);
      const matchCustomer = (task.customerName || '').toLowerCase().includes(query);
      const matchSummary = task.summary.toLowerCase().includes(query);
      return matchJobNum || matchCustomer || matchSummary;
    }
    return true;
  });

  // Category splits
  const overdueTasks = filteredTasks.filter(t => !t.follow_up_completed && (t.follow_up_date === null || t.follow_up_date <= todayStr));
  const upcomingTasks = filteredTasks.filter(t => !t.follow_up_completed && t.follow_up_date !== null && t.follow_up_date > todayStr);
  const completedTasks = filteredTasks.filter(t => t.follow_up_completed);

  const renderTaskColumn = (title: string, list: Task[], theme: 'danger' | 'primary' | 'success') => {
    let headerBg = 'rgba(239, 68, 68, 0.1)';
    let headerBorder = 'rgba(239, 68, 68, 0.2)';
    let badgeBg = '#ef4444';
    let icon = '🚨';

    if (theme === 'primary') {
      headerBg = 'rgba(59, 130, 246, 0.1)';
      headerBorder = 'rgba(59, 130, 246, 0.2)';
      badgeBg = '#3b82f6';
      icon = '📅';
    } else if (theme === 'success') {
      headerBg = 'rgba(16, 185, 129, 0.1)';
      headerBorder = 'rgba(16, 185, 129, 0.2)';
      badgeBg = '#10b981';
      icon = '✅';
    }

    return (
      <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', backdropFilter: 'blur(8px)', contentVisibility: 'auto' }}>
        
        {/* Column Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: headerBg, border: `1px solid ${headerBorder}`, padding: '0.6rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            <span>{icon}</span>
            <span>{title}</span>
          </div>
          <span style={{ background: badgeBg, color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '20px' }}>
            {list.length}
          </span>
        </div>

        {/* Column Card List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 280px)', paddingRight: '4px' }}>
          {list.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', padding: '2rem 1rem', textAlign: 'center' }}>
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
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }} 
                    />
                    <Link 
                      href={`/dashboard/job/${encodeURIComponent(task.job_number)}`}
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
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.4)', padding: '0.5rem', borderRadius: '6px', borderLeft: `3px solid ${badgeBg}`, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(45deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            ⏰ Follow-up Tasks
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isAdmin ? `Admin Dashboard — Managing follow-ups for all active coordinators` : `Coordinator Portal — Managing follow-up reminders for ${agentName}`}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.4)', color: 'var(--text-primary)', fontSize: '0.85rem', minWidth: '200px' }}
            />
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>🔍</span>
          </div>

          {/* Admin Agent filter dropdown */}
          {isAdmin && (
            <CustomSelect
              placeholder="All Operators"
              value={selectedAgentFilter}
              onChange={(val) => setSelectedAgentFilter(val)}
              options={[
                { value: 'All', label: 'All Operators' },
                ...allAgents.map(name => ({ value: name, label: name }))
              ]}
              style={{ minWidth: '160px' }}
            />
          )}
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
        <div style={{ display: 'flex', flex: 1, gap: '1.25rem', flexWrap: 'wrap', overflowX: 'auto', minHeight: 0 }}>
          {renderTaskColumn('Overdue / Due Today', overdueTasks, 'danger')}
          {renderTaskColumn('Upcoming Reminders', upcomingTasks, 'primary')}
          {renderTaskColumn('Completed Tasks', completedTasks, 'success')}
        </div>
      )}
    </div>
  );
}
