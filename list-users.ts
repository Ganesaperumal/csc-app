import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (data.users) {
    data.users.forEach((u: any) => console.log(`- ${u.email}`));
  } else {
    console.error('Error fetching users:', data);
  }
}
run();
