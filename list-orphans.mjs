import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const r1 = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=id', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
  const profiles = await r1.json();
  const profileIds = new Set(profiles.map(p => p.id));
  
  // We can't query auth.users from REST API easily without service role key, but wait, we have it!
  const r2 = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users', { 
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY } 
  });
  const authData = await r2.json();
  const authUsers = authData.users || [];
  
  const orphans = authUsers.filter(u => !profileIds.has(u.id));
  console.log('Orphaned auth users:', orphans.map(u => ({ id: u.id, email: u.email })));
}
run();
