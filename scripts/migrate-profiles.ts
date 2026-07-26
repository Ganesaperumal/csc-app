import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function migrateProfiles() {
  console.log('🔄 Migrating legacy profile records to set default approved status and active roles...\n');

  // 1. Fetch all profiles
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });

  const profiles = await res.json();
  console.log(`Found ${profiles.length} total profiles.`);

  for (const p of profiles) {
    const isSuperAdmin = p.username === 'ganesh' || p.name?.includes('Ganesaperumal') || p.role === 'Admin';
    
    // Legacy profiles need is_approved = true so they show in the main table and can log in!
    const updates = {
      is_approved: true,
      csc_role: isSuperAdmin ? 'Admin' : (p.csc_role && p.csc_role !== 'None' ? p.csc_role : (p.role || 'Executive')),
      tracking_role: isSuperAdmin ? 'Admin' : (p.tracking_role && p.tracking_role !== 'None' ? p.tracking_role : (p.role === 'SPOC' ? 'Viewer' : (p.role || 'Executive'))),
      unbilled_role: isSuperAdmin ? 'Admin' : (p.unbilled_role && p.unbilled_role !== 'None' ? p.unbilled_role : (p.role === 'Branch Manager' ? 'Manager' : p.role === 'Branch User' ? 'Executive' : (p.role || 'Executive'))),
      branches: p.branches && p.branches.length > 0 ? p.branches : ['ALL']
    };

    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (updateRes.ok) {
      console.log(`✅ Approved & Migrated: ${p.name || p.username} (${p.username})`);
    } else {
      console.error(`❌ Migration failed for ${p.username}`);
    }
  }

  console.log('\n🎉 Profile Migration Completed Successfully!');
}

migrateProfiles();
