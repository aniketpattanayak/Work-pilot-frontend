const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/pages/CreateTask.jsx');
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let c = raw.replace(/\r\n/g, '\n');

const flex = (s) => s.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
function replaceOnce(from, to, label) {
  const m = c.match(new RegExp(flex(from), 'g'));
  if (!m || m.length !== 1) { console.error('❌ [' + label + '] expected exactly 1 match, found ' + (m ? m.length : 0) + ' — aborting, no files written.'); process.exit(1); }
  c = c.replace(new RegExp(flex(from)), () => to);
}

replaceOnce(
`const handleFileChange = (e) => {
    setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
  };`,
`const handleFileChange = (e) => {
    const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'zip'];
    const MAX_MB = 10;
    const picked = Array.from(e.target.files || []);
    const ok = [];
    const problems = [];
    picked.forEach((f) => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) problems.push('"' + f.name + '" is not an allowed file type.');
      else if (f.size > MAX_MB * 1024 * 1024) problems.push('"' + f.name + '" is larger than ' + MAX_MB + ' MB.');
      else ok.push(f);
    });
    if (problems.length) alert(problems.join('\\n') + '\\n\\nAllowed: images, PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP (max ' + MAX_MB + ' MB each).');
    setSelectedFiles([...selectedFiles, ...ok]);
    e.target.value = '';
  };`, 'handleFileChange');

replaceOnce('<p className="text-xs text-slate-400">PDF, Images, Docs</p>',
  '<p className="text-xs text-slate-400">Images, PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP — max 10 MB each</p>', 'hint text');

fs.writeFileSync(file, crlf ? c.replace(/\n/g, '\r\n') : c);
console.log('✅ Create Task: files are checked (type and size) when picked, with a clear message');
