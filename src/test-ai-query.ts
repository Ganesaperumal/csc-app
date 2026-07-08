import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testQuery() {
  const searchQuery = 'JB/3214/26/MAA';
  
  let cleanQuery = searchQuery
    .replace(/(brig|col|gen|maj|capt|mr|mrs|ms|shipment|details|job|status|info)\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log('cleanQuery:', cleanQuery);

  const { data: jobs, error } = await supabaseAdmin
    .from('jobs')
    .select('job_number, customer_name')
    .or(`customer_name.ilike.%${cleanQuery}%,job_number.ilike.%${cleanQuery}%,shipper_name.ilike.%${cleanQuery}%`)
    .limit(5);
    
  console.log('jobs found:', jobs);
  if (error) {
    console.error('Error:', error);
  }
}

testQuery();
