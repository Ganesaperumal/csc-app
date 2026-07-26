import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function createPendingTestUser() {
  console.log('🧪 Creating a Test Pending Sign-Up User...\n');

  const formattedEmail = 'test_signup@transworldintl.com';

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

  if (authRes.ok) {
    const authData = await authRes.json();
    const userId = authData.id;

    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: userId,
        name: 'Suresh Patel (Pending Test)',
        username: 'suresh_test',
        role: 'Executive',
        csc_role: 'Executive',
        tracking_role: 'None',
        unbilled_role: 'Executive',
        branches: ['BANGALORE', 'CHENNAI'],
        is_approved: false // Pending approval!
      })
    });

    console.log('✅ Pending user "suresh_test" created successfully with is_approved = false!');
  } else {
    console.log('User already exists or failed.');
  }
}

createPendingTestUser();
