import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const r = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=id,name,role', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
  console.log(await r.json());
}
run();
