const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/job/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. WhatsApp Updates modifications
// Hide the stageLabel
content = content.replace(
  /<span style={{ fontSize: '0.72rem', color: 'var\(--text-secondary\)', display: 'block', fontWeight: 500, marginTop: '2px' }}>\{stageLabel\}<\/span>/g,
  '{/* <span style={{ fontSize: \'0.72rem\', color: \'var(--text-secondary)\', display: \'block\', fontWeight: 500, marginTop: \'2px\' }}>{stageLabel}</span> */}'
);

// Hide the Show Message Preview button
content = content.replace(
  /<button \n\s*onClick=\{\(\) => setShowPreview\(!showPreview\)\}\n\s*style=\{\{\s*background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', \n\s*fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' \n\s*\}\}\n\s*>\n\s*\{showPreview \? 'Hide Message Preview ▲' : 'Show Message Preview ▼'\}\n\s*<\/button>/g,
  '{/* Preview button hidden per user request */}'
);

// 2. Hide empty fields for viewers
// We'll replace <div className={styles.inputGroup}>...</div> with a wrapped version
// But we need to be careful with multi-line inputGroups or nested ones.
// Most inputGroups are on a single line. Let's find them with regex.

const lines = content.split('\n');
const newLines = lines.map(line => {
  if (line.includes('<div className={styles.inputGroup}')) {
    // Extract the value being checked to see if it's empty
    // Most fields have value={job.something || ''} or value={job.something === true}
    
    // We can just wrap the whole div in a generic check.
    // Wait, the div might contain a `value={...}`. We can extract it.
    let valueMatch = line.match(/value=\{([^}]+)\}/);
    let checkExp = '';
    
    if (valueMatch) {
      let val = valueMatch[1];
      // val could be `job.car_delivery_date || ''` or `job.deviation === true`
      // We want to evaluate if val is truthy and not "NO" and not "FALSE" and not "No"
      
      // Let's create a helper function at the top of the render if it doesn't exist, or just inline it.
      // Inlining might be easier: `(!isViewer || (String(${val}).toUpperCase() !== 'NO' && String(${val}).toUpperCase() !== 'FALSE' && ${val} !== false && ${val} !== '' && ${val} !== null && ${val} !== undefined))`
      
      checkExp = `!isViewer || (String(${val}).toUpperCase() !== 'NO' && String(${val}).toUpperCase() !== 'FALSE' && ${val} !== false && ${val} !== '' && ${val} !== null && ${val} !== undefined && ${val} !== 'null' && ${val} !== 'undefined')`;
    } else {
      // If no value match, maybe it's a select without a value prop? Or a custom select?
      // For now, if no value prop, we just render it. Or we try to find it.
      // Wait, there are `ToggleSwitch` which use `value={job.foo === true}`.
      return line;
    }

    // Wrap the line in the check
    const leadingWhitespace = line.match(/^\s*/)[0];
    const restOfLine = line.trim();
    
    // Check if the line is self-contained (i.e., has matching div tags if it ends the div on the same line)
    // Most of them end with `</div>`
    if (restOfLine.endsWith('</div>')) {
      return `${leadingWhitespace}{(${checkExp}) && (\n${leadingWhitespace}  ${restOfLine}\n${leadingWhitespace})}`;
    }
  }
  return line;
});

content = newLines.join('\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done modifying page.tsx');
