import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testSelect() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,username,role,csc_role,tracking_role,unbilled_role,branch_user_role,branches,is_approved,photo,phone,chat_access,created_at&order=created_at.desc`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('❌ QUERY ERROR:', err);
  } else {
    const data = await res.json();
    console.log(`✅ SUCCESS! Returned ${data.length} profiles.`);
    const pending = data.filter((u: any) => u.is_approved === false);
    console.log(`   Pending Profiles count: ${pending.length}`);
    if (pending.length > 0) {
      console.log('   First 3 Pending Usernames:', pending.slice(0, 3).map((p: any) => p.username));
    }
  }
}

testSelect();
