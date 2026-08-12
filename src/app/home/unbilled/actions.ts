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

export async function fetchLegacyJobsBypassingRLS(branches: string[] | null) {
  const supabase = getAdminClient();

  let query = supabase.from('legacy_jobs').select('*');

  if (branches) {
    if (branches.includes('ALL')) {
      // Fetch all
    } else if (branches.length > 0) {
      query = query.in('branch', branches);
    } else {
      query = query.eq('branch', 'NONE');
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Server Action: Fetch latest followup notes map keyed by job_number
 * strictly from `unbilled_followups` table.
 */
export async function fetchAllUnbilledFollowupsMapServerAction(): Promise<Record<string, string>> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('unbilled_followups')
    .select('job_number, followup_notes, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchAllUnbilledFollowupsMapServerAction] error:', error);
    return {};
  }

  const map: Record<string, string> = {};
  if (data) {
    for (const item of data) {
      if (item.job_number && !map[item.job_number]) {
        map[item.job_number] = item.followup_notes;
      }
    }
  }
  return map;
}

/**
 * Server Action: Update job field (dates, SPOC, status, etc.)
 * in `jobs` or `legacy_jobs` bypassing RLS issues, and log change to `audit_logs`.
 */
export async function updateUnbilledJobFieldServerAction(params: {
  table: string;
  jobNumber: string;
  fieldToUpdate: string;
  value: any;
  auditName: string;
  auditUsername: string;
  oldStr: string;
  newStr: string;
}) {
  const supabase = getAdminClient();
  const targetTable = params.table === 'legacy_jobs' ? 'legacy_jobs' : 'jobs';

  const { error: updateErr } = await supabase
    .from(targetTable)
    .update({ [params.fieldToUpdate]: params.value })
    .eq('job_number', params.jobNumber);

  if (updateErr) {
    console.error(`[updateUnbilledJobFieldServerAction] Update failed on ${targetTable}:`, updateErr);
    throw new Error(updateErr.message);
  }

  // Audit log entry
  try {
    await supabase.from('audit_logs').insert({
      job_number: params.jobNumber,
      name: params.auditName,
      username: params.auditUsername,
      field_change: params.fieldToUpdate,
      old_value: params.oldStr,
      new_value: params.newStr,
    });
  } catch (auditErr: any) {
    console.error('[updateUnbilledJobFieldServerAction] audit_logs insert failed:', auditErr?.message || auditErr);
  }

  return { success: true };
}

/**
 * Server Action: Insert new follow-up note into `unbilled_followups` using job_number
 */
export async function addUnbilledFollowupServerAction(params: {
  jobNumber: string;
  updatedBy?: string | null;
  agentName: string;
  followupNotes: string;
  nextFollowupDate: string | null;
}) {
  const supabase = getAdminClient();

  const isValidUUID = (str?: string | null) =>
    Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

  const validUpdatedBy = isValidUUID(params.updatedBy) ? params.updatedBy : null;

  const { error } = await supabase.from('unbilled_followups').insert([
    {
      job_number: params.jobNumber,
      updated_by: validUpdatedBy,
      agent_name: params.agentName,
      followup_notes: params.followupNotes,
      next_followup_date: params.nextFollowupDate || null
    }
  ]);

  if (error) {
    console.error('[addUnbilledFollowupServerAction] insert error:', error);
    throw new Error(error.message);
  }

  return { success: true };
}

/**
 * Server Action: Fetch follow-up history or upcoming personal reminders
 */
export async function fetchUnbilledFollowupsServerAction(
  jobNumber?: string,
  agentName?: string,
  userId?: string
) {
  const supabase = getAdminClient();

  let query = supabase.from('unbilled_followups').select('id, job_number, updated_by, agent_name, followup_notes, next_followup_date, created_at');

  if (jobNumber) {
    query = query.eq('job_number', jobNumber).order('created_at', { ascending: false });
  } else {
    query = query.not('next_followup_date', 'is', null);

    if (userId && agentName) {
      query = query.or(`updated_by.eq.${userId},agent_name.ilike.%${agentName}%`);
    } else if (userId) {
      query = query.eq('updated_by', userId);
    } else if (agentName) {
      query = query.ilike('agent_name', `%${agentName}%`);
    }

    query = query.order('next_followup_date', { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    console.error('[fetchUnbilledFollowupsServerAction] select error:', error);
    return [];
  }

  return data || [];
}
