const fs = require('fs');
const path = 'src/app/dashboard/job/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The auto-update logic happens around line 565:
// if (data?.goods_type?.toLowerCase().includes('vehicle') && data.car_included !== true) {
content = content.replace(
  /if \(data\?\.goods_type\?\.toLowerCase\(\)\.includes\('vehicle'\) && data\.car_included !== true\) \{/,
  "if (!isViewer && data?.goods_type?.toLowerCase().includes('vehicle') && data.car_included !== true) {"
);

fs.writeFileSync(path, content, 'utf8');
