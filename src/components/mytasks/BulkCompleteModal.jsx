import React, { useRef, useState } from 'react';
import { Upload, Camera, CheckCircle } from 'lucide-react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';
import LocalFileThumb from '../LocalFileThumb';
import { useUploadLimit, checkFiles, uploadHint } from '../../utils/uploadLimit';

const when = (d) => (d ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

/**
 * Finish many tasks in one go. Every task shows its details, a remarks box (needed) and photos.
 * `eligible(item)` -> { ok, why }. Tasks that cannot be completed here are listed in red and skipped.
 */
export default function BulkCompleteModal({ items, eligible, currentDoerId, onClose, onDone }) {
  const maxMb = useUploadLimit();
  const checked = items.map((it) => ({ it, ...eligible(it) }));
  const todo = checked.filter((c) => c.ok).map((c) => c.it);
  const skipped = checked.filter((c) => !c.ok);

  const [form, setForm] = useState(() => Object.fromEntries(todo.map((t) => [t.uniqueKey, { remarks: '', files: [] }])));
  const [bad, setBad] = useState({});         // uniqueKey -> message (missing info)
  const [result, setResult] = useState({});   // uniqueKey -> { ok, message }
  const [busy, setBusy] = useState(false);
  const [top, setTop] = useState('');
  const refs = useRef({});

  const set = (k, patch) => setForm((f) => ({ ...f, [k]: { ...f[k], ...patch } }));
  const addFiles = (t, list) => {
    const { ok, problems } = checkFiles(list, maxMb);
    if (problems.length) setBad((b) => ({ ...b, [t.uniqueKey]: problems.join(' ') }));
    else setBad((b) => { const n = { ...b }; delete n[t.uniqueKey]; return n; });
    if (!ok.length) return;
    set(t.uniqueKey, { files: t.dataType === 'Checklist' ? [ok[0]] : [...form[t.uniqueKey].files, ...ok] });
  };

  const pending = todo.filter((t) => !(result[t.uniqueKey] && result[t.uniqueKey].ok));

  const submit = async () => {
    setTop('');
    const problems = {};
    pending.forEach((t) => { if (!String((form[t.uniqueKey] || {}).remarks || '').trim()) problems[t.uniqueKey] = 'Please write the remarks for this task.'; });
    setBad(problems);
    const first = pending.find((t) => problems[t.uniqueKey]);
    if (first) {
      setTop(`${Object.keys(problems).length} task${Object.keys(problems).length > 1 ? 's' : ''} need${Object.keys(problems).length > 1 ? '' : 's'} remarks before you can submit. They are marked in red.`);
      const el = refs.current[first.uniqueKey];
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    const res = { ...result };
    for (const t of pending) {
      const f = form[t.uniqueKey];
      const fd = new FormData();
      fd.append('remarks', f.remarks.trim());
      try {
        if (t.dataType === 'Checklist') {
          fd.append('checklistId', t._id);
          if (t.instanceDate) fd.append('instanceDate', t.instanceDate);
          if (f.files[0]) fd.append('evidence', f.files[0]);
          await API.post('/tasks/checklist-done', fd);
        } else {
          fd.append('taskId', t._id); fd.append('status', 'Completed'); fd.append('doerId', currentDoerId);
          f.files.forEach((x) => fd.append('evidence', x));
          await API.put('/tasks/respond', fd);
        }
        res[t.uniqueKey] = { ok: true, message: 'Done' };
      } catch (e) {
        res[t.uniqueKey] = { ok: false, message: (e.response && e.response.data && e.response.data.message) || 'Could not complete this task.' };
      }
      setResult({ ...res });
    }
    setBusy(false);
    const failed = todo.filter((t) => !(res[t.uniqueKey] && res[t.uniqueKey].ok));
    if (failed.length === 0 && skipped.length === 0) onDone(todo.length);
    else if (failed.length === 0) setTop(`${todo.length} task${todo.length > 1 ? 's' : ''} completed. The skipped ones are listed above.`);
    else setTop(`${todo.length - failed.length} completed, ${failed.length} could not be completed. See the red messages.`);
  };

  const finished = todo.length > 0 && pending.length === 0;
  const closeIt = () => onClose(Object.values(result).filter((r) => r.ok).length);

  return (
    <ModalShell wide title={`Complete ${todo.length} task${todo.length === 1 ? '' : 's'}`} subtitle="Check each task, add your remarks and photos, then press Submit at the bottom." onClose={closeIt}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${top.includes('red') || top.includes('could not') ? 'text-red-500' : 'text-muted-foreground'}`} role="status">{top}</p>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={closeIt} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">{finished ? 'Close' : 'Cancel'}</button>
            {!finished && todo.length > 0 && <button type="button" disabled={busy} onClick={submit} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Submitting…' : `Submit ${pending.length}`}</button>}
          </div>
        </div>
      )}>
      {skipped.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10" role="alert">
          <p className="text-xs font-black text-red-600 mb-1">{skipped.length} selected task{skipped.length > 1 ? 's were' : ' was'} skipped:</p>
          <ul className="text-xs text-red-600 space-y-0.5 list-disc pl-4">
            {skipped.map((c) => <li key={c.it.uniqueKey}><b>{c.it.title}</b> — {c.why}</li>)}
          </ul>
        </div>
      )}
      {todo.length === 0 && <p className="text-sm text-muted-foreground">None of the selected tasks can be completed here.</p>}
      <div className="space-y-4">
        {todo.map((t, i) => {
          const r = result[t.uniqueKey];
          const f = form[t.uniqueKey] || { remarks: '', files: [] };
          const err = bad[t.uniqueKey];
          return (
            <div key={t.uniqueKey} ref={(el) => { refs.current[t.uniqueKey] = el; }}
              className={`p-4 rounded-2xl border ${r && r.ok ? 'border-emerald-500/50 bg-emerald-500/5' : err || (r && !r.ok) ? 'border-red-500 bg-red-500/5' : 'border-border bg-background'}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black break-words"><span className="text-muted-foreground mr-1">{i + 1}.</span>{t.title}</p>
                <span className="shrink-0 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest text-primary border-primary/20">{t.dataType}</span>
              </div>
              {t.description && <p className="text-xs text-muted-foreground mt-1 break-words">{t.description}</p>}
              <p className="text-[11px] text-slate-500 mt-1">Due {when(t.deadlineDate)} · Given by {t.assignerName || '-'}{t.priority ? ` · ${t.priority}` : ''}</p>
              {r && r.ok ? (
                <p className="mt-3 text-xs font-black text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> Completed</p>
              ) : (
                <>
                  <textarea aria-label={`Remarks for ${t.title}`} rows={2} value={f.remarks} onChange={(e) => { set(t.uniqueKey, { remarks: e.target.value }); if (bad[t.uniqueKey]) setBad((b) => { const n = { ...b }; delete n[t.uniqueKey]; return n; }); }}
                    placeholder="Remarks (needed)…" className={`mt-3 w-full px-3 py-2 rounded-xl border bg-card text-sm outline-none ${err ? 'border-red-500' : 'border-border'}`} />
                  <div className="flex gap-2 mt-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-border text-[9px] font-black uppercase text-slate-400 hover:border-primary/50 hover:text-primary cursor-pointer">
                      <Upload size={14} /> From storage
                      <input type="file" multiple={t.dataType !== 'Checklist'} className="hidden" onChange={(e) => { addFiles(t, e.target.files); e.target.value = ''; }} />
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-border text-[9px] font-black uppercase text-slate-400 hover:border-primary/50 hover:text-primary cursor-pointer">
                      <Camera size={14} /> Take photo
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(t, e.target.files); e.target.value = ''; }} />
                    </label>
                  </div>
                  {f.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {f.files.map((x, j) => <LocalFileThumb key={j} file={x} onRemove={() => set(t.uniqueKey, { files: f.files.filter((_, k) => k !== j) })} />)}
                    </div>
                  )}
                  <p className="mt-1 text-[9px] text-slate-400">{uploadHint(maxMb)}</p>
                  {(err || (r && !r.ok)) && <p role="alert" className="mt-2 text-xs font-bold text-red-500">{err || r.message}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
