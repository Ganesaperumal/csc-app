import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchDistinct() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=packing_team_supervisor,dest_supervisor`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  });
  const data = await res.json();
  const sups = new Set<string>();
  for (const row of data) {
    if (row.packing_team_supervisor) sups.add(row.packing_team_supervisor);
    if (row.dest_supervisor) sups.add(row.dest_supervisor);
  }
  console.log(Array.from(sups));
}
fetchDistinct();
