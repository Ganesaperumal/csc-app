import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const email = 'testrecreate@transworldintl.com';
  console.log('1. Creating...');
  let r = await fetch('http://localhost:3000/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpassword', name: 'Test Del', role: 'SPOC' })
  });
  let data = await r.json();
  console.log(data);
  if (!data.user) return;
  const uid = data.user.id;
  
  console.log('2. Deleting...');
  r = await fetch('http://localhost:3000/api/admin/users?userId=' + uid, { method: 'DELETE' });
  console.log(await r.text());
  
  console.log('3. Recreating immediately...');
  r = await fetch('http://localhost:3000/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpassword', name: 'Test Del', role: 'SPOC' })
  });
  console.log(await r.json());
}
run();
