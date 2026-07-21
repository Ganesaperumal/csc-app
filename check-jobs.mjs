import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?select=id,job_number,pod_url&pod_url=not.is.null`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
      }
    });
    
    if (!res.ok) {
      console.error('Error fetching:', res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log(`Found ${data.length} jobs with POD URLs.`);
    if (data.length > 0) {
      console.log('Sample URL:', data[0].pod_url);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
