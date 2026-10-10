// Run from the client folder:  node fix-assign-onward-client.cjs
const fs = require('fs');
const path = require('path');

function patch(file, edits) {
  const p = path.join(process.cwd(), file);
  let s = fs.readFileSync(p, 'utf8');
  for (const e of edits) {
    const n = (s.match(new RegExp(e.re.source, 'g')) || []).length;
    if (n !== 1) { console.error(`ABORT ${file}: anchor "${e.name}" matched ${n} times (need 1). Nothing written.`); process.exit(1); }
    s = s.replace(e.re, (...a) => e.fn(a[1], a));
  }
  fs.writeFileSync(p, s);
  console.log('patched', file);
}
const L = (nl, t) => t.split('\n').join(nl);

// ───────────────────────── DoerChecklist.jsx ─────────────────────────
const STATE = `
  // ── Assign a received task onward ──
  const [onwardTask, setOnwardTask] = useState(null);
  const [onwardStaff, setOnwardStaff] = useState([]);
  const [onwardPick, setOnwardPick] = useState('');
  const [onwardNote, setOnwardNote] = useState('');
  const [onwardBusy, setOnwardBusy] = useState(false);
  const [onwardErr, setOnwardErr] = useState('');
  const myRoles = Array.isArray(savedUser.roles) ? savedUser.roles : (savedUser.role ? [savedUser.role] : []);
  const idOf = (v) => String((v && v._id) || v || '');
  const canForward = (t) =>
    myRoles.includes('Assigner') &&
    (t.status === 'Pending' || t.status === 'Accepted') &&
    idOf(t.doerId) === String(currentDoerId);
  const openOnward = async (t) => {
    setOnwardTask(t); setOnwardPick(''); setOnwardNote(''); setOnwardErr(''); setOnwardStaff([]);
    try {
      const r = await API.get(\`/tasks/authorized-staff/\${currentDoerId}\`);
      const taken = new Set([String(currentDoerId), idOf(t.assignerId), ...(t.forwardChain || []).map(c => idOf(c.employeeId))]);
      setOnwardStaff((r.data?.doers || []).filter(d => !taken.has(String(d._id))));
    } catch {
      setOnwardErr('Could not load your team. Please try again.');
    }
  };
  const submitOnward = async () => {
    if (!onwardPick) { setOnwardErr('Please choose who to assign this to.'); return; }
    try {
      setOnwardBusy(true); setOnwardErr('');
      await API.post('/tasks/assign-onward', { taskId: onwardTask._id, newDoerId: onwardPick, remarks: onwardNote.trim() });
      setOnwardTask(null);
      fetchAllTasks();
    } catch (err) {
      setOnwardErr(err.response?.data?.message || 'Could not assign this task onward.');
    } finally {
      setOnwardBusy(false);
    }
  };
`;
const BTN = (v) => `{canForward(${v}) && (
                    <button onClick={() => openOnward(${v})} className="px-3 py-1 bg-indigo-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Assign Onward</button>
                  )}`;
const MODAL = `{onwardTask && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-center p-6">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 relative border border-border">
            <button onClick={() => setOnwardTask(null)} className="absolute top-4 right-4"><X size={20} /></button>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Assign Onward</h3>
            <p className="text-xs text-muted-foreground mb-4 break-words">{onwardTask.title}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              {[onwardTask.assignerId?.name, ...(onwardTask.forwardChain || []).map(c => c.employeeId?.name), 'You'].filter(Boolean).join(' → ')} → <span className="text-indigo-500">New person</span>
            </p>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Assign to</label>
            <select value={onwardPick} onChange={(e) => setOnwardPick(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm">
              <option value="">Select a person…</option>
              {onwardStaff.map(d => <option key={d._id} value={d._id}>{d.name}{d.department ? \` (\${d.department})\` : ''}</option>)}
            </select>
            {onwardStaff.length === 0 && !onwardErr && (
              <p className="text-xs text-amber-600 mb-3">No one is mapped under you yet. Ask your Admin to map team members to you.</p>
            )}
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Note (optional)</label>
            <textarea value={onwardNote} onChange={(e) => setOnwardNote(e.target.value)} rows={2} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm" placeholder="Anything they should know" />
            {onwardErr && <p className="text-xs text-red-500 mb-3">{onwardErr}</p>}
            <p className="text-[10px] text-muted-foreground mb-4">The person you pick becomes the doer and marks it done. You and the original assigner are both told when it is completed.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOnwardTask(null)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
              <button onClick={submitOnward} disabled={onwardBusy} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{onwardBusy ? 'Assigning…' : 'Assign Onward'}</button>
            </div>
          </div>
        </div>
      )}

      `;

patch('src/pages/DoerChecklist.jsx', [
  { name: 'state', re: /(\r?\n)(  const currentDoerId = doerId \|\| savedUser\._id \|\| savedUser\.id;)/,
    fn: (nl, a) => nl + a[2] + nl + L(nl, STATE).replace(/^\r?\n/, '') },
  { name: 'button consolidated', re: /(\r?\n)( +)(\{item\.dataType === 'Delegation' && \(item\.status === "Pending" \|\| item\.status === "Accepted"\) && \()/,
    fn: (nl, a) => nl + a[2] + L(nl, BTN('item')) + nl + a[2] + a[3] },
  { name: 'button delegation tab', re: /(\r?\n)( +)(\{\(task\.status === "Pending" \|\| task\.status === "Accepted"\) && \()/,
    fn: (nl, a) => nl + a[2] + L(nl, BTN('task')) + nl + a[2] + a[3] },
  { name: 'modal', re: /(\r?\n)( +)(\{showRevisionModal && selectedTask && \()/,
    fn: (nl, a) => nl + a[2] + L(nl, MODAL) + a[3] },
]);

// ───────────────────────── ManageTasks.jsx ─────────────────────────
patch('src/pages/ManageTasks.jsx', [
  { name: 'helpers', re: /(\r?\n)(  const currentTenantId = tenantId \|\| localStorage\.getItem\('tenantId'\);)/,
    fn: (nl, a) => nl + a[2] + nl + L(nl, `  const myRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
  const idOf = (v) => String((v && v._id) || v || '');
  // Someone who only passed the task on (not the original assigner, not an Admin) can follow
  // and verify it, but only the original assigner or an Admin may edit or delete it.
  const passedOnOnly = (t) =>
    !myRoles.includes('Admin') &&
    idOf(t.assignerId) !== String(currentAssignerId) &&
    (t.forwardChain || []).some(c => idOf(c.employeeId) === String(currentAssignerId));
  const chainText = (t) =>
    [t.assignerId?.name, ...(t.forwardChain || []).map(c => c.employeeId?.name), t.doerId?.name].filter(Boolean).join(' → ');`) },
  { name: 'doer cell', re: /(\r?\n)( +)(<span className="truncate block">\{task\.doerId\?\.name \|\| 'Unassigned'\}<\/span>)/,
    fn: (nl, a) => nl + a[2] + a[3] + nl + a[2] + L(nl, `{(task.forwardChain || []).length > 0 && (
  <span className="block text-[9px] font-semibold text-indigo-500 whitespace-normal break-words mt-1" title="Assignment chain">{chainText(task)}</span>
)}`) },
  { name: 'edit button', re: /(\r?\n)( *)(\{!isViewer && \()(\r?\n<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleOpenEdit\(task\); \}\})/,
    fn: (nl, a) => nl + a[2] + '{!isViewer && !passedOnOnly(task) && (' + a[4] },
  { name: 'delete button', re: /(\r?\n)( *)(\{!isViewer && \()(\r?\n<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleCancelTask\(task\._id\); \}\})/,
    fn: (nl, a) => nl + a[2] + '{!isViewer && !passedOnOnly(task) && (' + a[4] },
]);
console.log('DONE');
