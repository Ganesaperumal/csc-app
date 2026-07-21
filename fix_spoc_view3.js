const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/job/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The ugly check we inserted starts with `{(!isViewer || (String(`
// and looks like:
// {(!isViewer || (String(job.jtr_percentage || '').toUpperCase() !== 'NO' && String(job.jtr_percentage || '').toUpperCase() !== 'FALSE' && job.jtr_percentage || '' !== false && job.jtr_percentage || '' !== '' && job.jtr_percentage || '' !== null && job.jtr_percentage || '' !== undefined && job.jtr_percentage || '' !== 'null' && job.jtr_percentage || '' !== 'undefined')) && (
//   <div className={styles.inputGroup}>...</div>
// )}

// To remove them entirely:
// Let's use a regex that matches the opening `{(!isViewer || (String(...)) && (` 
// and the trailing `)}`
const badWrapperRegex = /\{\(!isViewer \|\| \(String\([^)]+\)\.toUpperCase\(\) !== 'NO'.*?\)\) && \(\n(\s*)(<div className=\{styles\.inputGroup\}>.*?<\/div>)\n\s*\)\}/g;

content = content.replace(badWrapperRegex, '$1$2');

// Now let's apply the better wrapper with `isFieldVisible`
if (!content.includes('const isFieldVisible =')) {
  const helper = `\nconst isFieldVisible = (isViewer: boolean, val: any) => {
  if (!isViewer) return true;
  if (val === null || val === undefined || val === '') return false;
  const strVal = String(val).toUpperCase();
  if (strVal === 'NO' || strVal === 'FALSE' || val === false || strVal === 'NULL' || strVal === 'UNDEFINED') return false;
  return true;
};\n\n`;
  content = content.replace('export default function JobDetailsPage', helper + 'export default function JobDetailsPage');
}

const lines = content.split('\n');
const newLines = lines.map(line => {
  // Now we re-wrap them correctly.
  // We only do this if it hasn't been wrapped yet, which we just unwrapped above.
  if (line.includes('<div className={styles.inputGroup}')) {
    let valueMatch = line.match(/value=\{([^}]+)\}/);
    if (valueMatch) {
      let val = valueMatch[1];
      const leadingWhitespace = line.match(/^\s*/)[0];
      const restOfLine = line.trim();
      if (restOfLine.endsWith('</div>')) {
        return `${leadingWhitespace}{isFieldVisible(isViewer, ${val}) && (\n${leadingWhitespace}  ${restOfLine}\n${leadingWhitespace})}`;
      }
    }
  }
  return line;
});

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Fixed file.');
