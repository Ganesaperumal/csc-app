const fs = require('fs');

const files = [
  'src/app/dashboard/spocs/page.tsx',
  'src/app/dashboard/activity/page.tsx',
  'src/app/dashboard/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Replace common light hardcoded colors with CSS variables
  
  // SPOCs & Activity page specific:
  content = content.replace(/background: 'linear-gradient\(145deg, rgba\(255, 255, 255, 0\.95\), rgba\(255, 255, 255, 0\.8\)\)'/g, "background: 'var(--surface-color)'");
  content = content.replace(/background: 'linear-gradient\(135deg, #ffffff 0%, #f8fafc 100%\)'/g, "background: 'var(--surface-color)'");
  content = content.replace(/backgroundColor: '#ffffff'/g, "backgroundColor: 'var(--bg-color)'");
  content = content.replace(/background: '#ffffff'/g, "background: 'var(--bg-color)'");
  content = content.replace(/background: '#f8fafc'/g, "background: 'var(--bg-color)'");
  content = content.replace(/background: 'rgba\(255, 255, 255, 0\.95\)'/g, "background: 'var(--bg-color)'");
  content = content.replace(/background: 'rgba\(241, 245, 249, 0\.7\)'/g, "background: 'var(--surface-hover)'");
  content = content.replace(/background: 'rgba\(255,255,255,0\.9\)'/g, "background: 'var(--bg-color)'");
  content = content.replace(/backgroundColor = '#f1f5f9'/g, "backgroundColor = 'var(--surface-hover)'");
  content = content.replace(/background: '#f1f5f9'/g, "background: 'var(--surface-hover)'");
  
  // Text colors
  content = content.replace(/color: '#0f172a'/g, "color: 'var(--text-primary)'");
  content = content.replace(/color: '#1e293b'/g, "color: 'var(--text-primary)'");
  content = content.replace(/color: '#475569'/g, "color: 'var(--text-secondary)'");
  content = content.replace(/color: '#64748b'/g, "color: 'var(--text-secondary)'");
  content = content.replace(/color = '#1e293b'/g, "color = 'var(--text-primary)'");

  // Borders
  content = content.replace(/border: '1px solid #cbd5e1'/g, "border: '1px solid var(--border-color)'");
  content = content.replace(/border: '1px solid #e2e8f0'/g, "border: '1px solid var(--border-color)'");
  content = content.replace(/borderBottom: '1px solid #e2e8f0'/g, "borderBottom: '1px solid var(--border-color)'");
  content = content.replace(/borderBottom: '2px solid #f1f5f9'/g, "borderBottom: '2px solid var(--border-color)'");
  content = content.replace(/borderColor = '#cbd5e1'/g, "borderColor = 'var(--border-color)'");
  content = content.replace(/borderColor: '#cbd5e1'/g, "borderColor: 'var(--border-color)'");
  content = content.replace(/border: '1px solid rgba\(148, 163, 184, 0\.3\)'/g, "border: '1px solid var(--border-color)'");
  content = content.replace(/border: '1px solid rgba\(255, 255, 255, 0\.6\)'/g, "border: '1px solid var(--border-color)'");

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
