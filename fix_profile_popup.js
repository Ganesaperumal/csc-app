const fs = require('fs');
const path = 'src/app/dashboard/components/ProfilePopup.tsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure createPortal is imported
if (!content.includes('createPortal')) {
  content = content.replace(
    /import React, { useState, useEffect, useRef } from 'react';/,
    "import React, { useState, useEffect, useRef } from 'react';\nimport { createPortal } from 'react-dom';"
  );
  if (!content.includes('createPortal')) {
     content = content.replace(
      /import { useEffect, useState, useRef } from 'react';/,
      "import { useEffect, useState, useRef } from 'react';\nimport { createPortal } from 'react-dom';"
    );
  }
}

// Add state for rect
const rectState = `
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    if (isOpen && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      let top = rect.bottom + window.scrollY + 8;
      let right = window.innerWidth - rect.right - window.scrollX;
      
      // Prevent offscreen rendering
      if (top + 450 > window.innerHeight) {
        top = rect.top + window.scrollY - 450 - 8;
      }
      
      setPopupStyle({
        position: 'absolute', 
        top: \`\${top}px\`, 
        right: \`\${right}px\`, 
        width: '240px', 
        zIndex: 99999,
        borderRadius: '16px', 
        padding: '1.5rem', 
        boxShadow: 'var(--glass-shadow)',
        backgroundColor: 'var(--surface-color)', 
        backdropFilter: 'var(--glass-blur)', 
        border: '1px solid var(--border-color)',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center'
      });
    }
  }, [isOpen]);
`;

// Insert the state hook
content = content.replace(/useEffect\(\(\) => \{\s*const handleClickOutside[\s\S]*?\}, \[\]\);/g, (match) => {
  return rectState + '\n' + match.replace(
    /if \(popupRef\.current && !popupRef\.current\.contains\(e\.target as Node\)\)/,
    "const target = e.target as HTMLElement;\n      if (popupRef.current && !popupRef.current.contains(target) && !target.closest('.profile-popup-portal'))"
  );
});

// Update the render
const renderTarget = /\{\/\* Popup Menu \*\/\}\s*\{isOpen && \(\s*<div style=\{\{([\s\S]*?)\}\}>/;

content = content.replace(renderTarget, `{/* Popup Menu */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="profile-popup-portal" style={popupStyle}>`);

// Update closing tag of the menu
content = content.replace(/<\/div>\s*\)\s*\}\s*<\/div>\s*\)\s*;\s*\}/, "</div>,\n        document.body\n      )}\n    </div>\n  );\n}");

fs.writeFileSync(path, content, 'utf8');
