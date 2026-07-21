const fs = require('fs');

const files = [
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/all-jobs/page.tsx',
  'src/app/dashboard/closed-jobs/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace default button styles
  content = content.replace(
    /background:\s*'linear-gradient\(135deg, #e0e7ff 0%, #f3e8ff 100%\)',\s*color:\s*'#4f46e5'/g,
    "background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', color: '#ffffff'"
  );
  
  // Replace onMouseOut inline style fallback
  content = content.replace(
    /e\.currentTarget\.style\.background = 'linear-gradient\(135deg, #e0e7ff 0%, #f3e8ff 100%\)'; e\.currentTarget\.style\.color = '#4f46e5';/g,
    "e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)'; e.currentTarget.style.color = '#ffffff';"
  );
  
  // Update onMouseOver hover state to be slightly brighter/different
  content = content.replace(
    /e\.currentTarget\.style\.background = 'linear-gradient\(135deg, #4f46e5 0%, #d946ef 100%\)'; e\.currentTarget\.style\.color = '#fff';/g,
    "e.currentTarget.style.background = 'linear-gradient(135deg, #a78bfa 0%, #e879f9 100%)'; e.currentTarget.style.color = '#ffffff';"
  );
  
  // There is another one in closed-jobs that is a one-liner:
  content = content.replace(
    /background: 'linear-gradient\(135deg, #e0e7ff 0%, #f3e8ff 100%\)', color: '#4f46e5'/g,
    "background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', color: '#ffffff'"
  );

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed buttons');
