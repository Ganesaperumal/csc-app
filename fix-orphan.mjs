import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const r = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users/f70b1fc2-c00d-4e1b-b73a-a6c17769405f', { 
    method: 'DELETE',
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY } 
  });
  console.log(r.status, await r.text());
}
run();
