const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/role_permissions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 
      'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ category: 'test', section: 'test', role: 'test', access: 'test' })
  });
  const data = await res.json();
  console.log('section:', data);

  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 
      'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ category: 'test', page_name: 'test', role_name: 'test', access_level: 'test' })
  });
  const data2 = await res2.json();
  console.log('page_name:', data2);
}
check();
