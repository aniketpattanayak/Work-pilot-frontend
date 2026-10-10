// Run from the client folder:  node fix-onward-layout.cjs
const fs = require('fs'), path = require('path');
const p = path.join(process.cwd(), 'src/pages/DoerChecklist.jsx');
let s = fs.readFileSync(p, 'utf8');
const a = (s.match(/_120px\]/g) || []).length;
const b = (s.match(/className="flex justify-end gap-2 w-full lg:w-auto"/g) || []).length;
if (a !== 5 || b !== 3) { console.error(`ABORT: expected 5 grid columns and 3 action cells, found ${a} and ${b}. Nothing written.`); process.exit(1); }
s = s.replace(/_120px\]/g, '_170px]').replace(/className="flex justify-end gap-2 w-full lg:w-auto"/g, 'className="flex flex-wrap justify-end gap-2 w-full lg:w-auto"');
fs.writeFileSync(p, s);
console.log('patched DoerChecklist.jsx (action column 120px -> 170px, buttons wrap instead of overlapping)');
