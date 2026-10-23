import React, { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCcw } from 'lucide-react';
import API from '../api/axiosConfig';

const when = (d) => (d ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

/** Tasks I follow: read only. Followers follow up with the doer; they do not complete the task or change its date. */
export default function FollowingTasks({ employeeId }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!employeeId) { setRows([]); return; }
    try { const r = await API.get(`/tasks/following/${employeeId}`); setRows(Array.isArray(r.data) ? r.data : []); setErr(''); }
    catch (e) { setRows([]); setErr((e.response && e.response.data && e.response.data.message) || 'Could not load the tasks you follow.'); }
  }, [employeeId]);
  useEffect(() => { load(); }, [load]);

  const done = (t) => ['Completed', 'Verified'].includes(t.status);
  
  return (
    <div className="w-full max-w-[1200px] mx-auto pb-20 px-2 sm:px-6">
      <div className="flex items-center justify-between gap-3 mb-4 py-2 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shrink-0"><Eye size={20} className="text-primary" /></div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black tracking-tighter uppercase leading-none">Following</h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Tasks you watch</p>
          </div>
        </div>
        <button type="button" onClick={load} className="bg-card border border-border px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><RefreshCcw size={12} className="text-primary" /> Refresh</button>
      </div>
      {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
      {rows === null && <p className="text-xs text-muted-foreground">Loading…</p>}
      {rows && rows.length === 0 && !err && <p className="text-sm text-muted-foreground py-10 text-center">You are not following any task.</p>}
      <ul className="space-y-3">
        {(rows || []).map((t) => {
          const pr = t.pendingDateRequest && t.pendingDateRequest.byId ? t.pendingDateRequest : null;
          return (
            <li key={t._id} data-follow={t._id} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-sm break-words">{t.title}</p>
                  {t.description && <p className="text-xs text-muted-foreground mt-1 break-words">{t.description}</p>}
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest text-slate-500 border-border">{t.status}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Doer <b>{(t.doerId && t.doerId.name) || '-'}</b> · Given by {(t.assignerId && t.assignerId.name) || '-'} · Due <b>{when(t.deadline)}</b></p>
              {(t.followers || []).length > 0 && <p className="text-[11px] text-indigo-600 dark:text-indigo-300 mt-1">Followers: <b>{t.followers.map((f) => f.name).filter(Boolean).join(', ')}</b></p>}
              <p className="text-[10px] text-slate-500 mt-1">You only follow this task. Only {(t.doerId && t.doerId.name) || 'the doer'} can complete it or change its date. Use Chat on My Tasks to follow up.</p>
              {t.onHold && t.onHold.isOn && <p className="text-[10px] font-black uppercase text-amber-600 mt-1">On hold · the clock is paused</p>}
              {pr && <p className="text-xs text-amber-600 font-bold mt-2">Waiting for the assigner: {pr.byName || 'someone'} asked for {when(pr.proposedDeadline)}.</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {done(t) && <span className="text-[10px] font-black uppercase text-emerald-600">Done · the date is locked</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
