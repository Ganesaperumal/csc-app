'use server';

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration or key');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function fetchFollowupsServerAction(userId: string) {
  const supabase = getAdminClient();

  // 1. Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  const activeName = profile.name || profile.username || 'Agent';
  const activeUsername = profile.username || activeName;
  const fRole = (profile.followups_access || profile.followups_role || profile.tracking_role || '').toLowerCase();
  const cscRole = profile.csc_access || profile.csc_role || 'None';

  const hasFollowupsAccess = fRole !== 'none' && fRole !== '';

  if (!hasFollowupsAccess) {
    return {
      allowed: false,
      tasks: [],
      hasAllAccess: false,
      isViewer: false,
      agentName: activeName,
      allAgents: []
    };
  }

  const showAll = fRole === 'all' || fRole.includes('all');
  const isViewer = cscRole === 'View';

  // 2. Query ALL active (uncompleted) follow-up tasks
  let activeQuery = supabase
    .from('job_communications')
    .select('id, job_number, agent_name, call_type, regarding, summary, follow_up_required, follow_up_date, follow_up_completed, created_at')
    .eq('follow_up_required', true)
    .neq('follow_up_completed', true);

  // 3. Query COMPLETED follow-up tasks (limit 2000 so all historical completed tasks are retrieved)
  let completedQuery = supabase
    .from('job_communications')
    .select('id, job_number, agent_name, call_type, regarding, summary, follow_up_required, follow_up_date, follow_up_completed, created_at')
    .eq('follow_up_required', true)
    .eq('follow_up_completed', true)
    .limit(2000);

  if (!showAll) {
    const namesToMatch = Array.from(new Set([
      profile.name,
      profile.username,
      activeName,
      activeUsername
    ].filter(Boolean)));
    const orConditions = namesToMatch.map(n => `agent_name.ilike.%${n}%`).join(',');
    if (orConditions) {
      activeQuery = activeQuery.or(orConditions);
      completedQuery = completedQuery.or(orConditions);
    }
  }

  // Also query all profiles to populate complete operator dropdown list
  const [activeRes, completedRes, profilesRes] = await Promise.all([
    activeQuery.order('follow_up_date', { ascending: true }),
    completedQuery.order('created_at', { ascending: false }),
    supabase.from('profiles').select('name, username')
  ]);

  if (activeRes.error) {
    console.error('Error fetching active communications:', activeRes.error);
    throw new Error(activeRes.error.message);
  }

  const activeComms = activeRes.data || [];
  const completedComms = completedRes.data || [];
  const allComms = [...activeComms, ...completedComms];

  // 4. Fetch job details mapping for all follow-ups
  const jobMap: Record<string, { customer: string; spoc: string; company: string }> = {};
  const jobNumbers = Array.from(new Set(allComms.map(c => c.job_number)));

  if (jobNumbers.length > 0) {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('job_number, customer_name, spoc_name, company')
      .in('job_number', jobNumbers);

    if (jobs) {
      jobs.forEach(j => {
        jobMap[j.job_number] = {
          customer: j.customer_name || 'Unknown Client',
          spoc: j.spoc_name || 'Unassigned SPOC',
          company: j.company || ''
        };
      });
    }

    const unmappedJobNumbers = jobNumbers.filter(jn => !jobMap[jn]);
    if (unmappedJobNumbers.length > 0) {
      const { data: legacyJobs } = await supabase
        .from('legacy_jobs')
        .select('job_number, customer_name, spoc_name, company')
        .in('job_number', unmappedJobNumbers);

      if (legacyJobs) {
        legacyJobs.forEach(j => {
          jobMap[j.job_number] = {
            customer: j.customer_name || 'Unknown Client',
            spoc: j.spoc_name || 'Unassigned SPOC',
            company: j.company || ''
          };
        });
      }
    }
  }

  // 5. Enrich tasks
  const enrichedComms = allComms.map((c: any) => ({
    ...c,
    customerName: jobMap[c.job_number]?.customer || 'Unknown Client',
    spocName: jobMap[c.job_number]?.spoc || 'Unassigned SPOC',
    companyName: jobMap[c.job_number]?.company || ''
  }));

  // Build complete unique list of staff & operator names for dropdown
  const namesSet = new Set<string>();

  // Add names from job_communications
  allComms.forEach((c: any) => {
    if (c.agent_name) {
      const formatted = c.agent_name.charAt(0).toUpperCase() + c.agent_name.slice(1);
      namesSet.add(formatted);
    }
  });

  // Add names from profiles table
  (profilesRes.data || []).forEach((p: any) => {
    const displayName = p.name || p.username;
    if (displayName) {
      const formatted = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      namesSet.add(formatted);
    }
  });

  const allAgents = Array.from(namesSet).sort();

  return {
    allowed: true,
    tasks: enrichedComms,
    hasAllAccess: showAll,
    isViewer,
    agentName: activeName,
    allAgents
  };
}
