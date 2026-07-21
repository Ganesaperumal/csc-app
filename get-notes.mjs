import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const r = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/job_notes?limit=1', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
  console.log(await r.json());
}
run();
