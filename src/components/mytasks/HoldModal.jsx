import React, { useState } from 'react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';
import DateReasonFields from './DateReasonFields';

/** The doer says why the work is stuck. The waiting time is not counted against them. */
export default function HoldModal({ task, onClose, onDone }) {
  const [v, setV] = useState({ reason: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!v.reason && !v.note.trim()) { setErr('Please say why the work is stuck.'); return; }
    if (v.reason === 'Other' && !v.note.trim()) { setErr('Please write a note when the reason is "Other".'); return; }
    setBusy(true); setErr('');
    try { await API.post(`/tasks/${task._id}/hold`, { reason: v.reason, reasonNote: v.note.trim() }); onDone && onDone(); }
    catch (e) { setErr((e.response && e.response.data && e.response.data.message) || 'Could not put the task On hold.'); }
    finally { setBusy(false); }
  };
  return (
    <ModalShell title="Put On hold" subtitle={task.title} onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving…' : 'Put On hold'}</button>
        </div>
      )}>
      <p className="text-xs text-muted-foreground mb-4">Use this when you cannot continue because you are waiting for someone else. The person who gave you the task is told, and the waiting time is not counted against you.</p>
      <DateReasonFields value={v} onChange={setV} invalid={!!err} />
      {err && <p role="alert" className="text-xs text-red-500 mt-3">{err}</p>}
    </ModalShell>
  );
}
