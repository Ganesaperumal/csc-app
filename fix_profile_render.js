const fs = require('fs');
const path = 'src/app/dashboard/components/ProfilePopup.tsx';
let content = fs.readFileSync(path, 'utf8');

const renderTarget = /\{\/\* Popup Menu \*\/\}\s*\{isOpen && \([\s\S]*?<div style=\{\{[\s\S]*?backgroundColor: 'var\(--surface-color\)', backdropFilter: 'var\(--glass-blur\)', border: '1px solid var\(--border-color\)',[\s\S]*?alignItems: 'center'\s*\}\}\s*>/;

content = content.replace(renderTarget, `{/* Popup Menu */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="profile-popup-portal" style={popupStyle}>`);

content = content.replace(/<\/div>\s*\)\s*\}\s*<\/div>\s*\)\s*;\s*\}/, "</div>,\n        document.body\n      )}\n    </div>\n  );\n}");

fs.writeFileSync(path, content, 'utf8');
