import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
  process.exit(1);
}

async function fetchSupabaseApi(endpoint: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
}

async function listUsers(query?: string) {
  console.log(`\n🔍 Fetching users ${query ? `matching "${query}"` : ''}...`);
  const data = await fetchSupabaseApi('/auth/v1/admin/users');
  if (data.users && Array.isArray(data.users)) {
    let users = data.users;
    if (query) {
      const q = query.toLowerCase();
      users = users.filter((u: any) => u.email?.toLowerCase().includes(q) || u.id.includes(q));
    }
    console.log(`\nFound ${users.length} user(s):`);
    console.table(
      users.map((u: any) => ({
        ID: u.id,
        Email: u.email,
        Created: u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
        LastSignIn: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never',
      }))
    );
  } else {
    console.error('❌ Failed to fetch users:', data);
  }
}

async function listTables() {
  console.log('\n📊 Fetching public table schema summary...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  if (res.ok) {
    const text = await res.text();
    console.log('✅ Supabase REST API connection verified.');
  } else {
    console.error('❌ REST API request failed:', res.status, res.statusText);
  }
}

function printHelp() {
  console.log(`
🛠️  Supabase Database & Admin CLI (db-cli)

Usage:
  npx tsx scripts/db-cli.ts <command> [options]

Commands:
  users [search_term]  List or search auth users
  tables               Verify REST API & table connections
  help                 Display this help menu
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ? args[0].toLowerCase() : 'help';

  switch (command) {
    case 'users':
      await listUsers(args[1]);
      break;
    case 'tables':
      await listTables();
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error('💥 Unexpected CLI Error:', err);
  process.exit(1);
});
