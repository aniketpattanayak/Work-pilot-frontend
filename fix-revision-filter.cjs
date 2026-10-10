const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/pages/ManageTasks.jsx');
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let c = raw.replace(/\r\n/g, '\n');

const flex = (s) => s.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
const from = '<option value="Verified">Verified</option>';
const m = c.match(new RegExp(flex(from), 'g'));
if (!m || m.length !== 1) { console.error('❌ expected exactly 1 match for the Verified option, found ' + (m ? m.length : 0) + ' — aborting, no files written.'); process.exit(1); }
if (c.includes('<option value="Revision Requested">')) { console.error('❌ Revision Requested option already exists — aborting, no files written.'); process.exit(1); }
c = c.replace(new RegExp(flex(from)), () => from + '\n            <option value="Revision Requested">Revision Requested</option>');

fs.writeFileSync(file, crlf ? c.replace(/\n/g, '\r\n') : c);
console.log('✅ Manage Tasks status filter now has "Revision Requested"');
