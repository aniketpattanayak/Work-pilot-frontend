import React, { useEffect, useState } from 'react';
import API from '../../api/axiosConfig';
import ModalShell from './ModalShell';

export default function SubTaskListModal({ parent, parentType, onClose }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    API.get('/tasks/sub-tasks', { params: { parentType, parentId: parent._id } })
      .then((r) => { if (live) setRows(r.data.subTasks || []); })
      .catch((e) => { if (live) { setRows([]); setErr((e.response && e.response.data && e.response.data.message) || 'Could not load the sub tasks.'); } });
    return () => { live = false; };
  }, [parent._id, parentType]);
  return (
    <ModalShell title="Sub tasks" subtitle={parent.title} onClose={onClose}>
      {rows === null && <p className="text-xs text-muted-foreground">Loading…</p>}
      {err && <p className="text-xs text-red-500">{err}</p>}
      {rows && rows.length === 0 && !err && <p className="text-xs text-muted-foreground">No sub tasks yet.</p>}
      <ul className="space-y-2">
        {(rows || []).map((t) => {
          const done = ['Completed', 'Verified'].includes(t.status);
          return (
            <li key={t._id} className="p-3 rounded-xl border border-border bg-background">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black break-words">{t.title}</p>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${done ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-slate-500 border-border'}`}>{done ? 'Done' : t.status}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Given to <b>{t.doer || '-'}</b> by {t.assigner || '-'} · due {t.deadline ? new Date(t.deadline).toLocaleString() : '-'}</p>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
