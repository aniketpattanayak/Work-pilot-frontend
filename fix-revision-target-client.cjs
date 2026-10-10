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
const out = {};
const load = (rel) => { out[rel] = fs.readFileSync(path.join(root, rel), 'utf8'); return out[rel]; };

// ───────────────────────── 1. Revision Control panel: assigner can choose the date ─────────────────────────
let p = load('components/RevisionPanel.jsx');
const pCrlf = p.includes('\r\n');
p = p.replace(/\r\n/g, '\n');

p = replaceOnce(p, 'const isAssigner = source === "manage";',
`const isAssigner = source === "manage";

  // Date the assigner will authorize. Starts as the doer's proposed date; the assigner can change it.
  const toYmd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const doerProposedYmd = (() => {
    if (task?.proposedDeadline) return new Date(task.proposedDeadline).toISOString().slice(0, 10);
    const mt = /Proposed Deadline:\\s*(\\d{4}-\\d{2}-\\d{2})/.exec(reason);
    return mt ? mt[1] : '';
  })();
  const [approveDate, setApproveDate] = useState(doerProposedYmd);`, 'panel: approve date state');

p = replaceOnce(p,
`let proposedDate = reason.includes("Proposed Deadline:") ? reason.split("Proposed Deadline: ")[1] : task?.proposedDeadline;`,
`if (!approveDate) { alert("Please choose the new deadline date."); return; }
      // keep the task's original time of day, so choosing a date does not move the deadline to early morning
      const baseTime = task?.deadline ? new Date(task.deadline) : new Date();
      const [yy, mm, dd] = approveDate.split('-').map(Number);
      const finalDeadline = new Date(yy, mm - 1, dd, baseTime.getHours(), baseTime.getMinutes(), 0, 0);`, 'panel: approve date build');

p = replaceOnce(p, 'newDeadline: new Date(proposedDate),', 'newDeadline: finalDeadline,', 'panel: approve date send');

p = replaceOnce(p, '<label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Option A: Accept Proposal</label>',
`<label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Option A: Accept Proposal</label>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 ml-2">
                Doer proposed: {doerProposedYmd || 'not specified'} — you can change the date before authorizing.
              </p>
              <input
                type="date"
                value={approveDate}
                min={toYmd(new Date())}
                onChange={(e) => setApproveDate(e.target.value)}
                className="w-full p-4 border border-border rounded-xl bg-background text-foreground text-sm font-bold"
              />
            </div>`, 'panel: date input');

p = replaceOnce(p, 'Authorize Proposed Deadline', 'Authorize This Deadline', 'panel: button label');
out['components/RevisionPanel.jsx'] = pCrlf ? p.replace(/\n/g, '\r\n') : p;

// ───────────────────────── 2. Doer page: no "Revise" once a revision was approved ─────────────────────────
// (file has mixed line endings, so only a single-line edit is made and nothing is re-normalised)
let d = load('pages/DoerChecklist.jsx');
d = replaceOnce(d, '{task.isRevisionAllowed && !isPastDue && (',
  "{task.isRevisionAllowed && !isPastDue && !(task.history || []).some(h => h.action === 'Deadline Approved') && (", 'doer: hide Revise after approval');
out['pages/DoerChecklist.jsx'] = d;

// ───────────────────────── 3. Review Meeting: Late Target gets a Save button and a 0-100 limit ─────────────────────────
let r = load('pages/ReviewMeeting.jsx');
const rCrlf = r.includes('\r\n');
r = r.replace(/\r\n/g, '\n');

r = replaceOnce(r, 'const ReviewMeeting = ({ tenantId }) => {',
`// Late Target box: type a value from 0 to 100, then press Save (or Enter). Nothing is saved until Save is pressed.
const LateTargetInput = ({ value, disabled, onSave }) => {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [base, setBase] = useState(value);          // the value currently stored
  const [state, setState] = useState('idle');       // idle | saving | saved
  useEffect(() => { setDraft(String(value ?? '')); setBase(value); }, [value]);

  const clamp = (raw) => {
    if (raw === '') return '';
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(base ?? '');
    return String(Math.min(100, Math.max(0, n)));
  };
  const dirty = draft !== '' && Number(draft) !== Number(base);

  const commit = async () => {
    if (!dirty || state === 'saving') return;
    setState('saving');
    const ok = await onSave(Number(draft));
    if (ok) { setBase(Number(draft)); setState('saved'); setTimeout(() => setState('idle'), 2000); }
    else { setState('idle'); setDraft(String(base ?? '')); }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        value={draft}
        onChange={(e) => setDraft(clamp(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        disabled={disabled}
        className="w-16 bg-background border-2 border-border rounded-lg text-center font-black text-xs py-1 focus:border-primary outline-none"
      />
      {!disabled && dirty && (
        <button
          onClick={commit}
          disabled={state === 'saving'}
          className="px-2 py-1 rounded-lg bg-primary text-white text-[9px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
        >
          {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
      )}
      {state === 'saved' && <span className="text-[9px] font-black uppercase text-emerald-600">Saved ✓</span>}
    </div>
  );
};

const ReviewMeeting = ({ tenantId }) => {`, 'review: LateTargetInput component');

r = replaceOnce(r,
`const saveTarget = async (employeeId, targetVal) => {
    try {
      await API.put('/tasks/update-weekly-target', { employeeId, target: targetVal });
      fetchAnalytics();
    } catch (err) {
      console.error('Sync Failed');
    }
  };`,
`const saveTarget = async (employeeId, targetVal) => {
    try {
      await API.put('/tasks/update-weekly-target', { employeeId, target: targetVal });
      fetchAnalytics();
      return true;
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save the late target. Please try again.');
      return false;
    }
  };`, 'review: saveTarget');

r = replaceOnce(r,
`<input
                        type="number"
                        defaultValue={row.lateTarget}
                        onBlur={(e) => saveTarget(row.employeeId, e.target.value)}
                        disabled={isViewer}
                        className="w-16 bg-background border-2 border-border rounded-lg text-center font-black text-xs py-1 focus:border-primary outline-none"
                      />`,
`<LateTargetInput
                        value={row.lateTarget}
                        disabled={isViewer}
                        onSave={(v) => saveTarget(row.employeeId, v)}
                      />`, 'review: use LateTargetInput');
out['pages/ReviewMeeting.jsx'] = rCrlf ? r.replace(/\n/g, '\r\n') : r;

for (const [rel, content] of Object.entries(out)) fs.writeFileSync(path.join(root, rel), content);
console.log('✅ Revision panel date choice, one revision per task on the doer page, Late Target Save button (0-100)');
