const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'src');

const flex = (s) => s.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
function fail(msg) { console.error('❌ ' + msg + ' — aborting, no files written.'); process.exit(1); }
function replaceN(c, from, to, expected, label) {
  const m = c.match(new RegExp(flex(from), 'g'));
  if (!m || m.length !== expected) fail('[' + label + '] expected ' + expected + ' match(es), found ' + (m ? m.length : 0));
  return c.replace(new RegExp(flex(from), 'g'), () => to);
}
const files = {};
const load = (rel) => {
  const raw = fs.readFileSync(path.join(root, rel), 'utf8');
  files[rel] = { crlf: raw.includes('\r\n'), c: raw.replace(/\r\n/g, '\n') };
  return files[rel];
};

// ───────────── Create Checklist: past dates cannot be picked ─────────────
let f = load('pages/CreateChecklist.jsx');

f.c = replaceN(f.c, 'const CustomDateInput = forwardRef(',
`// Calendar-date helpers (local time). The old code used the UTC date, which is "yesterday" early in the morning in India.
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayYmd = () => ymd(new Date());
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parseYmd = (s) => {
  const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(s || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
};

const CustomDateInput = forwardRef(`, 1, 'create: helpers');

f.c = replaceN(f.c, "startDate: new Date().toISOString().split('T')[0],", 'startDate: todayYmd(),', 2, 'create: initial start date');

f.c = replaceN(f.c, 'selected={new Date(formData.startDate)}',
  'selected={parseYmd(formData.startDate)}\n  minDate={startOfToday()}', 1, 'create: min date');

f.c = replaceN(f.c, '{new Date(formData.startDate).toLocaleDateString()}',
  '{parseYmd(formData.startDate).toLocaleDateString()}', 1, 'create: summary date');

// ───────────── Manage Checklist: start date can be corrected in Frequency Tuning ─────────────
let g = load('pages/ManageChecklist.jsx');

g.c = replaceN(g.c, "import BulkUpload from '../components/BulkUpload';",
`import BulkUpload from '../components/BulkUpload';

const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayYmd = () => ymd(new Date());`, 1, 'manage: helpers');

g.c = replaceN(g.c,
`frequencyConfig: item.frequencyConfig || { daysOfWeek: [], daysOfMonth: [] },
      createdAt: item.createdAt
    });`,
`frequencyConfig: item.frequencyConfig || { daysOfWeek: [], daysOfMonth: [] },
      createdAt: item.createdAt,
      // shown in Frequency Tuning; only sent to the server if the admin changes it
      startDate: item.nextDueDate ? ymd(new Date(item.nextDueDate)) : todayYmd(),
      startDateChanged: false
    });`, 1, 'manage: edit state');

g.c = replaceN(g.c, 'await API.put(`/tasks/checklist/${id}`, editData);',
`const { startDate, startDateChanged, ...rest } = editData;
      if (startDateChanged && startDate && startDate < todayYmd()) {
        alert("Start date cannot be in the past.");
        return;
      }
      const payload = startDateChanged ? { ...rest, startDate } : rest;
      await API.put(\`/tasks/checklist/\${id}\`, payload);`, 1, 'manage: save payload');

g.c = replaceN(g.c, 'catch (err) { alert("Update failed."); }',
  'catch (err) { alert(err.response?.data?.message || "Update failed."); }', 1, 'manage: show server message');

// Opening Frequency Tuning must not wipe what was already typed in the row (title, description, start date)
g.c = replaceN(g.c,
`setEditingId(item._id);
                          setEditData({
                            ...item,
                            frequency: item.frequency,
                            frequencyConfig: item.frequencyConfig || {
                              daysOfWeek: [],
                              daysOfMonth: []
                            }
                          });
                          setIsConfigModalOpen(true);`,
`setEditingId(item._id);
                          setEditData((prev) => ({
                            ...item,
                            ...prev,
                            frequency: prev.frequency || item.frequency,
                            frequencyConfig: prev.frequencyConfig || item.frequencyConfig || {
                              daysOfWeek: [],
                              daysOfMonth: []
                            }
                          }));
                          setIsConfigModalOpen(true);`, 1, 'manage: keep typed edits');

g.c = replaceN(g.c, '{/* FREQUENCY SELECT */}',
`{/* START DATE */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editData.startDate || ''}
                  min={todayYmd()}
                  onChange={(e) => {
                    let v = e.target.value;
                    if (v && v < todayYmd()) v = todayYmd();
                    setEditData({ ...editData, startDate: v, startDateChanged: true });
                  }}
                  className="w-full p-4 border border-border rounded-xl bg-background text-foreground text-sm font-bold"
                />
                <p className="text-[9px] text-slate-500 font-bold">
                  Entered the wrong start date? Change it here — the next due date is recalculated from it. Past dates are not allowed.
                </p>
              </div>

              {/* FREQUENCY SELECT */}`, 1, 'manage: start date field');

for (const [rel, { crlf, c }] of Object.entries(files)) fs.writeFileSync(path.join(root, rel), crlf ? c.replace(/\n/g, '\r\n') : c);
console.log('✅ Checklist start date: past dates blocked on Create; start date editable in Frequency Tuning');
