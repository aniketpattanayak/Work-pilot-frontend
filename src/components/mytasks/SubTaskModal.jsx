import React, { useEffect, useState } from 'react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';
import DynamicFieldRenderer from '../DynamicFieldRenderer';
import FormField, { FIELD_GRID } from '../FormField';
import useFormLayout from '../../hooks/useFormLayout';

const inp = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20';
const toLocalInput = (d) => { const x = new Date(d); const p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };

/** Split a task of yours: give a part of it to someone from your Doer Mapping. */
export default function SubTaskModal({ parent, parentType, currentDoerId, onClose, onDone }) {
  const L = useFormLayout('subtask'); // company's own order / names / hidden fields (Settings > Form designer)
  const [customValues, setCustomValues] = useState({});
  const [staff, setStaff] = useState(null);
  const [f, setF] = useState({ title: '', description: '', receiverId: '', deadline: parent.deadlineDate ? toLocalInput(parent.deadlineDate) : '', priority: 'Medium' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [bad, setBad] = useState(false);

  useEffect(() => {
    let live = true;
    API.get(`/tasks/authorized-staff/${currentDoerId}`).then((r) => { if (live) setStaff(r.data && r.data.doers || []); }).catch(() => { if (live) { setStaff([]); setErr('Could not load your team.'); } });
    return () => { live = false; };
  }, [currentDoerId]);

  const later = f.deadline && parent.deadlineDate && new Date(f.deadline).getTime() > new Date(parent.deadlineDate).getTime();
  const submit = async () => {
    setBad(true); setErr('');
    if (!f.title.trim()) { setErr('Please write the sub task name.'); return; }
    if (!f.receiverId) { setErr('Please choose who gets this sub task.'); return; }
    if (!f.deadline) { setErr('Please choose the deadline.'); return; }
    const missing = L.firstMissing({ description: f.description, priority: f.priority });
    if (missing) { setErr(missing); return; }
    setBusy(true);
    try {
      const r = await API.post('/tasks/sub-task', { parentType, parentId: parent._id, title: f.title.trim(), description: f.description, receiverId: f.receiverId, deadline: new Date(f.deadline).toISOString(), priority: f.priority, customFields: customValues });
      onDone && onDone(r.data);
    } catch (e) { setErr((e.response && e.response.data && e.response.data.message) || 'Could not create the sub task.'); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title="Add a sub task" subtitle={`Part of: ${parent.title}`} onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving…' : 'Create sub task'}</button>
        </div>
      )}>
      <div className="space-y-3">
        <div className={FIELD_GRID}>
          <FormField L={L} id="title" full>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{L.label('title', 'Sub task name')} *</label>
            <input aria-label="Sub task name" className={`${inp} ${bad && !f.title.trim() ? 'border-red-500' : ''}`} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </FormField>
          <FormField L={L} id="description" full>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{L.label('description', 'Details')}{L.required('description') ? ' *' : ' (optional)'}</label>
            <textarea rows={2} className={`${inp} resize-none`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </FormField>
          <DynamicFieldRenderer variant="plain" fields={L.customFields} layout={L} entity="subtask" values={customValues} requireOnCreate onChange={(name, value) => setCustomValues((v) => ({ ...v, [name]: value }))} />
          <FormField L={L} id="receiver" full>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{L.label('receiver', 'Give it to')} *</label>
            <select aria-label="Give it to" className={`${inp} ${bad && !f.receiverId ? 'border-red-500' : ''}`} value={f.receiverId} onChange={(e) => setF({ ...f, receiverId: e.target.value })}>
              <option value="">{staff === null ? 'Loading…' : 'Choose a person…'}</option>
              {(staff || []).map((d) => <option key={d._id} value={d._id}>{d.name}{d.department ? ` (${d.department})` : ''}</option>)}
            </select>
            {staff && staff.length === 0 && <p className="text-xs text-amber-600 mt-1">No one is in your Doer Mapping yet. Ask your admin to map people to you.</p>}
          </FormField>
          <FormField L={L} id="deadline">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{L.label('deadline', 'Deadline')} *</label>
            <input aria-label="Sub task deadline" type="datetime-local" className={inp} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          </FormField>
          <FormField L={L} id="priority">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{L.label('priority', 'Priority')}</label>
            <select className={inp} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </FormField>
        </div>
        {later && <p role="status" className="text-xs text-amber-600 font-bold">Heads up: this sub task ends after the main task ({new Date(parent.deadlineDate).toLocaleString()}). You can still create it.</p>}
        {err && <p role="alert" className="text-xs text-red-500">{err}</p>}
        <p className="text-[10px] text-muted-foreground">The person you choose is told on WhatsApp, and so is the person who gave you the main task. You can finish the main task even if a sub task is still open.</p>
      </div>
    </ModalShell>
  );
}
