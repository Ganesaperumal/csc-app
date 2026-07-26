import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const mockBranchUsers = [
  { name: 'Ramesh Kumar', username: 'ramesh_blr', role: 'Branch User', branch_user_role: 'Branch User', branches: ['BANGALORE'] },
  { name: 'Priya Sundaram', username: 'priya_chn', role: 'Branch User', branch_user_role: 'Branch User', branches: ['CHENNAI', 'COIMBATORE'] },
  { name: 'Karthik Rao', username: 'karthik_hyd', role: 'Branch Manager', branch_user_role: 'Branch Manager', branches: ['HYDERABAD'] },
  { name: 'Siddharth Patel', username: 'siddharth_mum', role: 'Branch User', branch_user_role: 'Branch User', branches: ['MUMBAI', 'PUNE'] },
  { name: 'Amit Sharma', username: 'amit_delhi', role: 'Branch Manager', branch_user_role: 'Branch Manager', branches: ['DELHI'] },
  { name: 'Deepa Nair', username: 'deepa_cochin', role: 'Branch User', branch_user_role: 'Branch User', branches: ['COCHIN'] },
  { name: 'Subhash Roy', username: 'subhash_kol', role: 'Branch User', branch_user_role: 'Branch User', branches: ['KOLKATA'] },
  { name: 'Jitendra Shah', username: 'jitendra_ahm', role: 'Branch Manager', branch_user_role: 'Branch Manager', branches: ['AHMEDABAD'] }
];

const mockSPOCs = [
  { name: 'Infosys SPOC - Anand', username: '9876543210', role: 'SPOC', phone: '9876543210' },
  { name: 'Wipro SPOC - Meera', username: '9876543211', role: 'SPOC', phone: '9876543211' },
  { name: 'TCS SPOC - Rajesh', username: '9876543212', role: 'SPOC', phone: '9876543212' },
  { name: 'Accenture SPOC - Swati', username: '9876543213', role: 'SPOC', phone: '9876543213' }
];

const mockInternalTeam = [
  { name: 'Ganesh Perumal', username: 'ganesh', role: 'Admin' },
  { name: 'Vikram Seth', username: 'vikram', role: 'Manager' },
  { name: 'Sunil Kumar', username: 'sunil', role: 'Executive' },
  { name: 'Ananya Roy', username: 'ananya', role: 'Viewer' }
];

async function seedSandboxUsers() {
  console.log('🌱 Seeding Sandbox Users into Supabase Profiles...\n');

  const allMockUsers = [...mockBranchUsers, ...mockSPOCs, ...mockInternalTeam];

  for (const u of allMockUsers as any[]) {
    const formattedEmail = `${u.username}@transworldintl.com`.toLowerCase();

    // 1. Create or get user in Supabase Auth via REST
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: formattedEmail,
        password: 'Password@123',
        email_confirm: true
      })
    });

    let userId = '';
    if (authRes.ok) {
      const authData = await authRes.json();
      userId = authData.id;
      console.log(`✅ Created Auth User: ${formattedEmail} (${userId})`);
    } else {
      // If user already exists, fetch ID via REST
      const listRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${u.username}`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      });
      const existing = await listRes.json();
      if (existing && existing.length > 0) {
        userId = existing[0].id;
        console.log(`ℹ️ Auth User already exists for ${u.username}, updating profile...`);
      }
    }

    if (userId) {
      // 2. Upsert profile into public.profiles
      const profilePayload = {
        id: userId,
        name: u.name,
        username: u.username,
        role: u.role,
        branch_user_role: u.branch_user_role || null,
        branches: u.branches || [],
        phone: u.phone || null,
        chat_access: u.role !== 'Viewer'
      };

      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(profilePayload)
      });

      if (profRes.ok) {
        console.log(`   └─ Profile updated for ${u.name} [Role: ${u.role}]`);
      } else {
        const err = await profRes.json();
        console.error(`   └─ Profile update failed: ${err.message}`);
      }
    }
  }

  console.log('\n🎉 Sandbox User Seeding Completed Successfully!');
}

seedSandboxUsers();
