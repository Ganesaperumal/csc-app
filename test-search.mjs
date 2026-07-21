import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const q = '123';
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?select=job_number,customer_name&or=(job_number.ilike.*${q}*,customer_name.ilike.*${q}*,company_name.ilike.*${q}*,enq_number.ilike.*${q}*,erp_job_id.ilike.*${q}*)&limit=10`;
  
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
    }
  });
  
  console.log(res.status, await res.text());
}
run();
