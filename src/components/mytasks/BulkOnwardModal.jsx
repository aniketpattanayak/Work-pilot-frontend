import React, { useEffect, useState } from 'react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';

/** Pass many received tasks to one person from your Doer Mapping. */
export default function BulkOnwardModal({ items, eligible, currentDoerId, onClose, onDone }) {
  const checked = items.map((it) => ({ it, ...eligible(it) }));
  const todo = checked.filter((c) => c.ok).map((c) => c.it);
  const skipped = checked.filter((c) => !c.ok);
  const [staff, setStaff] = useState(null);
  const [pick, setPick] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState({});

  useEffect(() => {
    let live = true;
    API.get(`/tasks/authorized-staff/${currentDoerId}`).then((r) => { if (live) setStaff((r.data && r.data.doers) || []); }).catch(() => { if (live) { setStaff([]); setErr('Could not load your team.'); } });
    return () => { live = false; };
  }, [currentDoerId]);

  const idOf = (v) => String((v && v._id) || v || '');
  const closeIt = () => onClose(Object.values(result).filter((r) => r.ok).length);
  const pending = todo.filter((t) => !(result[t.uniqueKey] && result[t.uniqueKey].ok));
  const submit = async () => {
    if (!pick) { setErr('Please choose who to assign these tasks to.'); return; }
    setBusy(true); setErr('');
    const res = { ...result };
    for (const t of pending) {
      const taken = new Set([String(currentDoerId), idOf(t.assignerId), ...(t.forwardChain || []).map((c) => idOf(c.employeeId))]);
      if (taken.has(String(pick))) { res[t.uniqueKey] = { ok: false, message: 'This person already had this task, so it cannot go to them.' }; continue; }
      try { await API.post('/tasks/assign-onward', { taskId: t._id, newDoerId: pick, remarks: note.trim() }); res[t.uniqueKey] = { ok: true }; }
      catch (e) { res[t.uniqueKey] = { ok: false, message: (e.response && e.response.data && e.response.data.message) || 'Could not assign this task.' }; }
    }
    setResult(res); setBusy(false);
    const failed = todo.filter((t) => !(res[t.uniqueKey] && res[t.uniqueKey].ok));
    if (failed.length === 0 && skipped.length === 0) onDone(todo.length);
    else setErr(failed.length ? `${todo.length - failed.length} assigned, ${failed.length} could not be assigned (see below).` : '');
  };

  return (
    <ModalShell title={`Assign ${todo.length} task${todo.length === 1 ? '' : 's'} onward`} onClose={closeIt}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeIt} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Close</button>
          {pending.length > 0 && <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Assigning…' : 'Assign onward'}</button>}
        </div>
      )}>
      {skipped.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10" role="alert">
          <p className="text-xs font-black text-red-600 mb-1">{skipped.length} selected task{skipped.length > 1 ? 's were' : ' was'} skipped:</p>
          <ul className="text-xs text-red-600 space-y-0.5 list-disc pl-4">{skipped.map((c) => <li key={c.it.uniqueKey}><b>{c.it.title}</b> — {c.why}</li>)}</ul>
        </div>
      )}
      <ul className="mb-4 space-y-1">
        {todo.map((t) => { const r = result[t.uniqueKey]; return (
          <li key={t.uniqueKey} className={`text-xs px-3 py-2 rounded-xl border ${r && r.ok ? 'border-emerald-500/40 text-emerald-600' : r ? 'border-red-500 text-red-600' : 'border-border'}`}>
            <b>{t.title}</b>{r && r.ok && ' — assigned'}{r && !r.ok && ` — ${r.message}`}
          </li>); })}
      </ul>
      {pending.length > 0 && (
        <>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Assign to</label>
          <select aria-label="Assign to" value={pick} onChange={(e) => setPick(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm">
            <option value="">{staff === null ? 'Loading…' : 'Select a person…'}</option>
            {(staff || []).filter((d) => String(d._id) !== String(currentDoerId)).map((d) => <option key={d._id} value={d._id}>{d.name}{d.department ? ` (${d.department})` : ''}</option>)}
          </select>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Note (optional)</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full mb-2 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
        </>
      )}
      {err && <p role="alert" className="text-xs text-red-500">{err}</p>}
    </ModalShell>
  );
}
