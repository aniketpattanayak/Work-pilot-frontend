import React, { useEffect, useState } from 'react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';
import DateReasonFields from './DateReasonFields';
import useDateReasons from '../../hooks/useDateReasons';
import { reasonError } from '../../utils/dateReasonCheck';

const toLocal = (d) => { const x = new Date(d); const p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };
const inp = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20';

/**
 * A follower (or assigner / admin) changes the deadline of a task. `directly` = the change is applied at once;
 * otherwise it goes to the assigner as a request. The server decides, this window only explains it.
 */
export default function ChangeDateModal({ task, directly, onClose, onDone }) {
  const { required } = useDateReasons();
  const [when, setWhen] = useState(task.deadline ? toLocal(task.deadline) : '');
  const [rs, setRs] = useState({ reason: '', note: '' });
  const [warn, setWarn] = useState([]);
  const [err, setErr] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!when) { setWarn([]); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      API.post('/tasks/date-check', { taskId: task._id, date: new Date(when).toISOString() })
        .then((r) => { if (live) setWarn((r.data && r.data.warnings) || []); }).catch(() => { if (live) setWarn([]); });
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [when, task._id]);

  const submit = async () => {
    setBad(true); setErr('');
    if (!when) { setErr('Please choose the new date.'); return; }
    if (new Date(when).getTime() === new Date(task.deadline).getTime()) { setErr('That is already the deadline.'); return; }
    const e1 = reasonError(rs, required); if (e1) { setErr(e1); return; }
    setBusy(true);
    try {
      const r = await API.post(`/tasks/${task._id}/change-date`, { newDeadline: new Date(when).toISOString(), reason: rs.reason, reasonNote: rs.note.trim() });
      onDone(r.data);
    } catch (e) { setErr((e.response && e.response.data && e.response.data.message) || 'Could not change the date.'); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title={directly ? 'Change the date' : 'Ask for a new date'} subtitle={task.title} onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving…' : directly ? 'Change date' : 'Send request'}</button>
        </div>
      )}>
      <p className="text-xs text-muted-foreground mb-3">{directly ? 'The new date is applied at once. The doer is told, and the change is saved in the task history.' : 'You may not change this date yourself. Your request goes to the person who gave the task, who can approve or reject it.'}</p>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">New deadline *</label>
          <input aria-label="New deadline" type="datetime-local" className={`${inp} ${bad && !when ? 'border-red-500' : ''}`} value={when} onChange={(e) => setWhen(e.target.value)} />
          {warn.map((w, i) => <p key={i} role="status" className="text-xs text-amber-600 font-bold mt-1">{w}</p>)}
        </div>
        <DateReasonFields value={rs} onChange={setRs} invalid={bad} />
        {err && <p role="alert" className="text-xs text-red-500">{err}</p>}
      </div>
    </ModalShell>
  );
}
