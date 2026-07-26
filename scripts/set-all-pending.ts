import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function setAllProfilesPending() {
  console.log('🔄 Setting all existing non-admin profiles to Pending Approval (is_approved = false)...\n');

  // Fetch all profiles except Super Admin Ganesaperumal
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });

  const profiles = await res.json();
  let pendingCount = 0;

  for (const p of profiles) {
    const isSuperAdmin = p.username === 'ganesh' || p.name?.includes('Ganesaperumal');
    
    if (!isSuperAdmin) {
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${p.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_approved: false })
      });

      if (updateRes.ok) {
        pendingCount++;
        console.log(`⏳ Set to Pending Approval: ${p.name || p.username} (@${p.username})`);
      }
    } else {
      console.log(`👑 Super Admin Ganesaperumal kept Approved.`);
    }
  }

  console.log(`\n🎉 Done! Set ${pendingCount} existing profiles to Pending Approval!`);
}

setAllProfilesPending();
