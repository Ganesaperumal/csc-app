const fs = require('fs');
const path = 'src/app/dashboard/job/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Disable CustomSelect
content = content.replace(/<CustomSelect/g, '<CustomSelect disabled={isViewer}');

// Disable inputs (careful with existing disabled)
content = content.replace(/<input(?![^>]*disabled)/g, '<input disabled={isViewer}');

// Disable textareas
content = content.replace(/<textarea(?![^>]*disabled)/g, '<textarea disabled={isViewer}');

// For buttons, let's target specific action buttons.
// "Add Update"
content = content.replace(/>\+\s*Add Update<\/button>/g, ' disabled={isViewer}>+ Add Update</button>');
// "Add Note"
content = content.replace(/>\+\s*Add Note<\/button>/g, ' disabled={isViewer}>+ Add Note</button>');
// "Add Communication"
content = content.replace(/>\+\s*Add Communication<\/button>/g, ' disabled={isViewer}>+ Add Communication</button>');
// "Send & Log Message"
content = content.replace(/>Send & Log Message<\/button>/g, ' disabled={isViewer}>Send & Log Message</button>');

// What about the auto-update in fetchJobDetails for car_included?
// We should wrap it in `if (!isViewer)` wait, isViewer is a state, but fetchJobDetails is called inside useEffect where `userRole` might not be loaded yet?
// Wait, `isViewer` is derived from `userRole`. `userRole` is fetched in the main useEffect.
// Actually, `car_included` auto-toggle shouldn't happen for viewers.

fs.writeFileSync(path, content, 'utf8');
