const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/job/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add helper function if it doesn't exist
if (!content.includes('const isFieldVisible =')) {
  // Let's add it right before "export default function JobDetailsPage"
  const helper = `\nconst isFieldVisible = (isViewer: boolean, val: any) => {
  if (!isViewer) return true;
  if (val === null || val === undefined || val === '') return false;
  const strVal = String(val).toUpperCase();
  if (strVal === 'NO' || strVal === 'FALSE' || val === false || strVal === 'NULL' || strVal === 'UNDEFINED') return false;
  return true;
};\n\n`;
  content = content.replace('export default function JobDetailsPage', helper + 'export default function JobDetailsPage');
}

// Now replace the ugly inline checks with the helper
// The ugly checks start with `{(!isViewer || (String(` and end with `)) && (`
// Let's just restore the file first, removing the `{(...) && (` and `)}` wrappers.
// We can use a regex to strip them, or we can just git checkout. Let's see if git is available now, I doubt it.
