// Run from the client folder:  node fix-passed-on-visible-client.cjs
const fs = require('fs'), path = require('path');
const p = path.join(process.cwd(), 'src/pages/DoerChecklist.jsx');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const edits = [
  { name: 'fetch', re: /API\.get\(`\/tasks\/doer\/\$\{currentDoerId\}`\)/, fn: () => 'API.get(`/tasks/doer/${currentDoerId}?includePassedOn=1`)' },
  { name: 'helper', re: /(  const canForward = \(t\) =>)/,
    fn: (m) => "  // A task I handed to someone else: I can follow it here but not work on it" + nl +
      "  const isPassedOn = (t) =>" + nl +
      "    idOf(t.doerId) !== String(currentDoerId) &&" + nl +
      "    (t.forwardChain || []).some(c => idOf(c.employeeId) === String(currentDoerId));" + nl + m },
  { name: 'pending count', re: /delegatedTasks\.filter\(t => t\.status !== 'Completed' && t\.status !== 'Verified'\)/,
    fn: () => "delegatedTasks.filter(t => t.status !== 'Completed' && t.status !== 'Verified' && !isPassedOn(t))" },
  { name: 'consolidated complete', re: /\{item\.dataType === 'Delegation' && \(item\.status === "Pending" \|\| item\.status === "Accepted"\) && \(/,
    fn: () => `{item.dataType === 'Delegation' && (item.status === "Pending" || item.status === "Accepted") && !isPassedOn(item) && (` },
  { name: 'tab complete', re: /\{\(task\.status === "Pending" \|\| task\.status === "Accepted"\) && \(/,
    fn: () => `{(task.status === "Pending" || task.status === "Accepted") && !isPassedOn(task) && (` },
  { name: 'label consolidated', re: /(\{canForward\(item\) && \()/,
    fn: (m) => `{item.dataType === 'Delegation' && isPassedOn(item) && (<span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Passed to {item.doerId?.name || 'someone'}</span>)}` + nl + '                  ' + m },
  { name: 'label tab', re: /(\{canForward\(task\) && \()/,
    fn: (m) => `{isPassedOn(task) && (<span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Passed to {task.doerId?.name || 'someone'}</span>)}` + nl + '                  ' + m },
];
for (const e of edits) {
  const n = (s.match(new RegExp(e.re.source, 'g')) || []).length;
  if (n !== 1) { console.error(`ABORT: anchor "${e.name}" matched ${n} times (need 1). Nothing written.`); process.exit(1); }
  s = s.replace(e.re, (m) => e.fn(m));
}
fs.writeFileSync(p, s);
console.log('patched src/pages/DoerChecklist.jsx');
