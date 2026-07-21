const urls = ['https://pub-some-r2.r2.dev/missing.pdf'];
fetch('http://localhost:3000/api/pod/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ urls })
}).then(res => res.json()).then(console.log);
