async function run() {
  const r1 = await fetch('http://localhost:3000/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testdel2@transworldintl.com', password: 'testpassword', name: 'Test Del', role: 'SPOC' })
  });
  const data = await r1.json();
  console.log('Created:', data);
  if (!data.user) return;
  
  const r2 = await fetch('http://localhost:3000/api/admin/users?userId=' + data.user.id, {
    method: 'DELETE'
  });
  console.log('Deleted:', await r2.text());
}
run();
