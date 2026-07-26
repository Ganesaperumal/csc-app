import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function runMigration() {
  console.log('🚀 Running database schema update for Sequential Display IDs...');

  // Fetch all profiles from Supabase
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,username`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });

  const profiles = await res.json();
  console.log(`Fetched ${profiles?.length || 0} profiles.`);

  // Check if columns exist by attempting to fetch
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,user_id&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  
  const testData = await testRes.json();
  console.log('Test query response for user_id:', testData);
}

runMigration();
