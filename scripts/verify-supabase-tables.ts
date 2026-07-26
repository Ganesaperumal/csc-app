import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function verifyTables() {
  console.log('🔍 Checking Supabase Tables and Columns...\n');

  const tables = ['enquiry_values', 'legacy_jobs', 'unbilled_followups', 'jobs', 'profiles'];

  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      console.log(`❌ Table "public.${table}": NOT CREATED OR HAS ERROR`);
      console.log(`   Status: ${res.status} | Details: ${err.message || res.statusText}\n`);
    } else {
      const data = await res.json();
      console.log(`✅ Table "public.${table}": SUCCESSFULLY CREATED`);
      if (data && data.length > 0) {
        console.log(`   Columns found: ${Object.keys(data[0]).join(', ')}\n`);
      } else {
        console.log(`   (Table exists, currently empty awaiting records)\n`);
      }
    }
  }
}

verifyTables();
