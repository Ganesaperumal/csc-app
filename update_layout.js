const fs = require('fs');
const layoutPath = 'src/app/dashboard/layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
if (!layoutContent.includes('GlobalDialogs')) {
  layoutContent = layoutContent.replace(
    /import AIChatbot from '\.\.\/components\/AIChatbot';/,
    "import AIChatbot from '../components/AIChatbot';\nimport GlobalDialogs from '@/components/GlobalDialogs';"
  );
  layoutContent = layoutContent.replace(
    /<\/div>\s*<\/div>\s*<\/div>\s*\)\s*;\s*\}\s*$/,
    "        <GlobalDialogs />\n      </div>\n    </div>\n  </div>\n  );\n}\n"
  );
  fs.writeFileSync(layoutPath, layoutContent);
}
