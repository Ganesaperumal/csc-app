import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// We use the Service Role Key here so the backend can bypass RLS for data ingestion
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
