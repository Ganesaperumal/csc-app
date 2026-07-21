const fs = require('fs');

const filesToFix = [
  {
    path: 'src/app/dashboard/job/[id]/page.tsx',
    replacements: [
      { from: /background:\s*'rgba\(255,\s*255,\s*255,\s*0\.3\)'/g, to: "background: 'var(--surface-color)'" }
    ]
  },
  {
    path: 'src/app/dashboard/page.tsx',
    replacements: [
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(255,\s*255,\s*255,\s*0\.6\)'/g, to: "e.currentTarget.style.background = 'var(--surface-hover)'" }
    ]
  },
  {
    path: 'src/app/dashboard/all-jobs/page.tsx',
    replacements: [
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(255,\s*255,\s*255,\s*0\.6\)'/g, to: "e.currentTarget.style.background = 'var(--surface-hover)'" }
    ]
  },
  {
    path: 'src/app/dashboard/activity-log/page.tsx',
    replacements: [
      { from: /background:\s*'rgba\(255,\s*255,\s*255,\s*0\.6\)'/g, to: "background: 'var(--surface-color)'" },
      { from: /background:\s*'linear-gradient\(135deg,\s*#e0e7ff\s*0%,\s*#f3e8ff\s*100%\)'/g, to: "background: 'linear-gradient(135deg, var(--surface-color), var(--surface-hover))'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'linear-gradient\(135deg,\s*#4f46e5\s*0%,\s*#d946ef\s*100%\)'/g, to: "e.currentTarget.style.background = 'linear-gradient(135deg, var(--surface-hover), var(--surface-color))'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'linear-gradient\(135deg,\s*#e0e7ff\s*0%,\s*#f3e8ff\s*100%\)'/g, to: "e.currentTarget.style.background = 'linear-gradient(135deg, var(--surface-color), var(--surface-hover))'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(241,245,249,0\.7\)'/g, to: "e.currentTarget.style.background = 'var(--surface-hover)'" },
      { from: /background:\s*'rgba\(148,163,184,0\.15\)'/g, to: "background: 'var(--border-color)'" },
      { from: /background:\s*'rgba\(15,23,42,0\.05\)'/g, to: "background: 'rgba(0,0,0,0.2)'" },
    ]
  },
  {
    path: 'src/app/dashboard/users/page.tsx',
    replacements: [
      { from: /background:\s*'rgba\(241,245,249,0\.8\)'/g, to: "background: 'var(--border-color)'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(226,232,240,0\.9\)'/g, to: "e.currentTarget.style.background = 'var(--surface-hover)'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(241,245,249,0\.8\)'/g, to: "e.currentTarget.style.background = 'var(--border-color)'" },
      { from: /background:\s*'rgba\(254,\s*242,\s*242,\s*0\.8\)'/g, to: "background: 'rgba(239,68,68,0.1)'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(254,\s*226,\s*226,\s*0\.9\)'/g, to: "e.currentTarget.style.background = 'rgba(239,68,68,0.2)'" },
      { from: /e\.currentTarget\.style\.background\s*=\s*'rgba\(254,\s*242,\s*242,\s*0\.8\)'/g, to: "e.currentTarget.style.background = 'rgba(239,68,68,0.1)'" }
    ]
  },
  {
    path: 'src/app/dashboard/spocs/page.tsx',
    replacements: [
      { from: /rgba\(241,\s*245,\s*249,\s*0\.8\)/g, to: "var(--border-color)" }
    ]
  },
  {
    path: 'src/app/dashboard/components/ProfilePopup.tsx',
    replacements: [
      { from: /background:\s*'linear-gradient\(135deg,\s*var\(--text-primary\),\s*var\(--text-primary\)\)'/g, to: "background: 'linear-gradient(135deg, #475569, #334155)'" }
    ]
  }
];

filesToFix.forEach(fileDef => {
  if (fs.existsSync(fileDef.path)) {
    let content = fs.readFileSync(fileDef.path, 'utf8');
    let original = content;
    fileDef.replacements.forEach(repl => {
      content = content.replace(repl.from, repl.to);
    });
    if (content !== original) {
      fs.writeFileSync(fileDef.path, content, 'utf8');
      console.log(`Updated ${fileDef.path}`);
    } else {
      console.log(`No changes made to ${fileDef.path}`);
    }
  } else {
    console.log(`File not found: ${fileDef.path}`);
  }
});
