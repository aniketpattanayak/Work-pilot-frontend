const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'src');

const flex = (s) => s.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
function fail(msg) { console.error('❌ ' + msg + ' — aborting, no files written.'); process.exit(1); }
function replaceOnce(c, from, to, label) {
  const m = c.match(new RegExp(flex(from), 'g'));
  if (!m || m.length !== 1) fail('[' + label + '] expected exactly 1 match, found ' + (m ? m.length : 0));
  return c.replace(new RegExp(flex(from)), () => to);
}
const files = {};
const load = (rel) => {
  const raw = fs.readFileSync(path.join(root, rel), 'utf8');
  files[rel] = { crlf: raw.includes('\r\n'), c: raw.replace(/\r\n/g, '\n') };
  return files[rel];
};

let f = load('components/ScoreBadge.jsx');
f.c = replaceOnce(f.c, "import axios from 'axios';", "import API from '../api/axiosConfig';", 'scorebadge import');
f.c = replaceOnce(f.c, "const res = await axios.get(`/tasks/score/${employeeId}`);", "const res = await API.get(`/tasks/employee-score/${employeeId}`);", 'scorebadge url');

f = load('pages/RewardsLog.jsx');
f.c = replaceOnce(f.c, "isAdmin ? API.get(`/tasks/overview/${currentTenantId}`) : Promise.resolve({ data: null })", "Promise.resolve({ data: null })", 'rewards overview');

f = load('pages/ReviewMeeting.jsx');
f.c = replaceOnce(f.c, "`/tasks/task/${taskId}`", "`/tasks/${taskId}`", 'review delete url');

for (const [rel, { crlf, c }] of Object.entries(files)) fs.writeFileSync(path.join(root, rel), crlf ? c.replace(/\n/g, '\r\n') : c);
console.log('✅ Client batch 2a applied: score badge, rewards log, review-meeting delete');
