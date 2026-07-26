import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkCounts() {
  const [jobsRes, legacyRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/jobs?select=count`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Prefer': 'count=exact' }
    }),
    fetch(`${SUPABASE_URL}/rest/v1/legacy_jobs?select=count`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Prefer': 'count=exact' }
    })
  ]);

  const jobsCount = jobsRes.headers.get('content-range');
  const legacyCount = legacyRes.headers.get('content-range');

  console.log('Main jobs table count-range:', jobsCount);
  console.log('Legacy jobs table count-range:', legacyCount);
}

checkCounts();
