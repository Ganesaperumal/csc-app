'use server';

import { createClient } from '@supabase/supabase-js';

export async function fetchLegacyJobsBypassingRLS(branches: string[] | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase Service Role Key');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

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
