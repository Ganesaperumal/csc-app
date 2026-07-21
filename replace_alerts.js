const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (fullPath.includes('GlobalDialogs')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Ensure imports
      const needsToast = /\balert\(/.test(content);
      const needsConfirm = /\bwindow\.confirm\(|\bconfirm\(/.test(content);

      if (needsToast || needsConfirm) {
        if (!content.includes('from \'@/components/GlobalDialogs\'')) {
          const importStr = `import { ${[needsToast ? 'showToast' : '', needsConfirm ? 'customConfirm' : ''].filter(Boolean).join(', ')} } from '@/components/GlobalDialogs';\n`;
          // insert after the last import, or at the top after 'use client'
          const useClientMatch = content.match(/['"]use client['"];?\n/);
          if (useClientMatch) {
            content = content.substring(0, useClientMatch.index + useClientMatch[0].length) + importStr + content.substring(useClientMatch.index + useClientMatch[0].length);
          } else {
            content = importStr + content;
          }
        }
      }

      // Replace alert()
      if (needsToast) {
        content = content.replace(/\balert\((.*?)\)/g, (match, msg) => {
          modified = true;
          const isError = msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail') || msg.includes('❌') || msg.toLowerCase().includes('missing');
          const isSuccess = msg.toLowerCase().includes('success') || msg.includes('✅');
          const type = isError ? "'error'" : (isSuccess ? "'success'" : "'info'");
          return `showToast(${msg}, ${type})`;
        });
      }

      // Replace window.confirm() and confirm()
      // This is trickier because of async/await. 
      // Luckily, we can just replace `window.confirm(` with `await customConfirm(`
      // and rely on us manually fixing the `async` keyword if the compiler complains, OR we try to inject async.
      if (needsConfirm) {
        content = content.replace(/\bwindow\.confirm\(/g, 'await customConfirm(');
        content = content.replace(/[^.]\bconfirm\(/g, ' await customConfirm(');
        
        // Let's try to automatically add `async` to the nearest function if it's an inline onClick
        content = content.replace(/onClick=\{?\(\) => \{?\s*if \(await/g, 'onClick={async () => { if (await');
        content = content.replace(/onClick=\{?\(e\) => \{?\s*if \(await/g, 'onClick={async (e) => { if (await');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir('src/app');
