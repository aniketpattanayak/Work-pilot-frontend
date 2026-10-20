import React, { useState } from 'react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';
import DateReasonFields from './DateReasonFields';
import { reasonError } from '../../utils/dateReasonCheck';
import useDateReasons from '../../hooks/useDateReasons';

const ymd = (d) => { const x = new Date(d); const p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };

/** Ask for a new date on many tasks at once (same rules as one task: once only, before the deadline passes). */
export default function BulkReviseModal({ items, eligible, onClose, onDone }) {
  const { required } = useDateReasons();
  const checked = items.map((it) => ({ it, ...eligible(it) }));
  const todo = checked.filter((c) => c.ok).map((c) => c.it);
  const skipped = checked.filter((c) => !c.ok);
  const [date, setDate] = useState('');
  const [rs, setRs] = useState({ reason: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [bad, setBad] = useState(false);
  const [result, setResult] = useState({});
  const pending = todo.filter((t) => !(result[t.uniqueKey] && result[t.uniqueKey].ok));

  const submit = async () => {
    setBad(true); setErr('');
    const e1 = reasonError(rs, required);
    if (!date) { setErr('Please choose the new date.'); return; }
    if (e1) { setErr(e1); return; }
    if (!rs.note.trim() && !rs.reason) { setErr('Please write the reason.'); return; }
    setBusy(true);
    const res = { ...result };
    for (const t of pending) {
      const old = new Date(t.deadlineDate);
      const [yy, mm, dd] = date.split('-').map(Number);
      const nd = new Date(yy, mm - 1, dd, old.getHours(), old.getMinutes(), 0, 0);
      const remarks = [rs.reason, rs.note.trim()].filter(Boolean).join(' - ');
      try {
        await API.post('/tasks/handle-revision', { taskId: t._id, action: 'Request', remarks: `${remarks}. Proposed Deadline: ${date}`, reason: rs.reason, reasonNote: rs.note.trim(), proposedDeadline: nd.toISOString() });
        res[t.uniqueKey] = { ok: true };
      } catch (e) { res[t.uniqueKey] = { ok: false, message: (e.response && e.response.data && e.response.data.message) || 'Could not send this request.' }; }
    }
    setResult(res); setBusy(false);
    const failed = todo.filter((t) => !(res[t.uniqueKey] && res[t.uniqueKey].ok));
    if (failed.length === 0 && skipped.length === 0) onDone(todo.length);
    else setErr(failed.length ? `${todo.length - failed.length} done, ${failed.length} failed (see below).` : '');
  };

  const closeIt = () => onClose(Object.values(result).filter((r) => r.ok).length);
  return (
    <ModalShell title={`Change the date of ${todo.length} task${todo.length === 1 ? '' : 's'}`} onClose={closeIt}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeIt} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Close</button>
          {pending.length > 0 && <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-xl bg-yellow-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Sending…' : 'Send'}</button>}
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
            <b>{t.title}</b> <span className="text-muted-foreground">(now {ymd(t.deadlineDate)})</span>{r && r.ok && ' — sent'}{r && !r.ok && ` — ${r.message}`}
          </li>); })}
      </ul>
      {pending.length > 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">New date for all *</label>
            <input aria-label="New date" type="date" min={ymd(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className={`w-full px-3 py-2 rounded-xl border bg-background text-sm ${bad && !date ? 'border-red-500' : 'border-border'}`} />
          </div>
          <DateReasonFields value={rs} onChange={setRs} invalid={bad} />
          <p className="text-[10px] text-muted-foreground">Tasks with a day limit set by the giver move at once only inside that limit; the others go to the giver for approval.</p>
        </div>
      )}
      {err && <p role="alert" className="text-xs text-red-500 mt-3">{err}</p>}
    </ModalShell>
  );
}
