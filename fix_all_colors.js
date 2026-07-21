const fs = require('fs');
const path = require('path');

const hexMap = {
  '#0f172a': 'var(--text-primary)',
  '#1e293b': 'var(--text-primary)',
  '#334155': 'var(--text-primary)',
  '#475569': 'var(--text-secondary)',
  '#64748b': 'var(--text-secondary)',
  '#94a3b8': 'var(--text-secondary)',
  '#cbd5e1': 'var(--border-color)',
  '#e2e8f0': 'var(--border-color)',
  '#f1f5f9': 'var(--surface-hover)',
  '#f8fafc': 'var(--bg-color)',
  '#ffffff': 'var(--bg-color)'
};

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.tsx') || dirFile.endsWith('.css')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
}

const files = walkSync('src/app/dashboard');

files.forEach(file => {
  let originalContent = fs.readFileSync(file, 'utf8');
  let content = originalContent;

  // Replace strict hex codes with variables (case-insensitive)
  Object.keys(hexMap).forEach(hex => {
    const regex = new RegExp(`'${hex}'|"${hex}"|${hex}`, 'gi');
    content = content.replace(regex, (match) => {
      // If it's wrapped in quotes, replace with quoted variable
      if (match.startsWith("'") && match.endsWith("'")) return `'${hexMap[hex]}'`;
      if (match.startsWith('"') && match.endsWith('"')) return `"${hexMap[hex]}"`;
      return hexMap[hex];
    });
  });
  
  // Replace white backgrounds
  content = content.replace(/background:\s*'white'/g, "background: 'var(--bg-color)'");
  content = content.replace(/backgroundColor:\s*'white'/g, "backgroundColor: 'var(--bg-color)'");

  // Replace common rgba backgrounds
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.[789]5?\)/g, "var(--surface-color)");
  content = content.replace(/rgba\(248,\s*250,\s*252,\s*0\.9[0-9]?\)/g, "var(--bg-color)");
  content = content.replace(/rgba\(241,\s*245,\s*249,\s*0\.9[0-9]?\)/g, "var(--surface-hover)");
  
  // Replace text colors that were black
  content = content.replace(/color:\s*'black'/g, "color: 'var(--text-primary)'");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
