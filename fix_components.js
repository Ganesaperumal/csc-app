const fs = require('fs');
const path = 'src/app/dashboard/job/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix DateInput definition
content = content.replace(
  /const DateInput = \(\{ name, value, onChange \}: \{ name: string, value: string, onChange: \(e: any\) => void \}\) => \{/,
  "const DateInput = ({ name, value, onChange, disabled }: { name: string, value: string, onChange: (e: any) => void, disabled?: boolean }) => {"
);
content = content.replace(
  /<input disabled=\{isViewer\}/g,
  (match, offset) => {
    // Check if it's inside DateInput (before StatusSlider starts)
    if (offset < content.indexOf('const StatusSlider')) {
      return '<input disabled={disabled}';
    }
    return match; // Leave other inputs alone, or fix the one in StatusSlider
  }
);

// 2. Fix StatusSlider definition
content = content.replace(
  /const StatusSlider = \(\{ name, options, value, onChange \}: \{ name: string, options: string\[\], value: any, onChange: \(e: any\) => void \}\) => \{/,
  "const StatusSlider = ({ name, options, value, onChange, disabled }: { name: string, options: string[], value: any, onChange: (e: any) => void, disabled?: boolean }) => {"
);
content = content.replace(
  /<input disabled=\{isViewer\}/g,
  (match, offset) => {
    // Only replace the one in StatusSlider
    const statusSliderStart = content.indexOf('const StatusSlider');
    const exportsStart = content.indexOf('export default function JobDetailsPage');
    if (offset > statusSliderStart && offset < exportsStart) {
      return '<input disabled={disabled}';
    }
    return match;
  }
);

// 3. Fix ToggleSwitch definition
content = content.replace(
  /const ToggleSwitch = \(\{ name, value, onChange \}: \{ name: string, value: any, onChange: \(val: boolean\) => void \}\) => \{/,
  "const ToggleSwitch = ({ name, value, onChange, disabled }: { name: string, value: any, onChange: (val: boolean) => void, disabled?: boolean }) => {"
);
content = content.replace(
  /<div className=\{styles\.toggleContainer\} onClick=\{\(\) => onChange\(!isOn\)\}>/,
  "<div className={styles.toggleContainer} onClick={() => { if (!disabled) onChange(!isOn); }} style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>"
);

// 4. Update usages in JobDetailsPage
content = content.replace(/<DateInput /g, '<DateInput disabled={isViewer} ');
content = content.replace(/<StatusSlider /g, '<StatusSlider disabled={isViewer} ');
content = content.replace(/<ToggleSwitch /g, '<ToggleSwitch disabled={isViewer} ');

fs.writeFileSync(path, content, 'utf8');
