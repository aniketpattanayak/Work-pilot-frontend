import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../api/axiosConfig';

const d = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-');
const ROLE = { doer: 'Doer', assigner: 'Assigner', admin: 'Admin', coordinator: 'Coordinator', follower: 'Follower', approved: 'Approved request', hold: 'On hold pause' };

/** How often deadlines moved, who moved them and why; plus the score against the ORIGINAL date. */
export default function DateChangesReport({ from, to }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setData(null); setErr('');
    API.get('/tasks/date-changes-report', { params: { from: from || undefined, to: to || undefined } })
      .then((r) => { if (live) setData(r.data); })
      .catch((e) => { if (live) setErr((e.response && e.response.data && e.response.data.message) || 'Could not load the report.'); });
    return () => { live = false; };
  }, [open, from, to]);

  const th = 'border border-border px-2 py-1 text-left bg-card text-[10px] font-black uppercase tracking-widest';
  const td = 'border border-border px-2 py-1 text-xs';
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card" data-testid="date-changes-report">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"><CalendarClock size={15} className="text-primary" /> Deadline changes</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {err && <p className="text-xs text-red-500">{err}</p>}
          {!data && !err && <p className="text-xs text-muted-foreground">Loading…</p>}
          {data && (
            <>
              <p className="text-xs text-muted-foreground"><b>{data.total}</b> change{data.total === 1 ? '' : 's'} in this period{data.shortened ? `, ${data.shortened} made the deadline shorter` : ''}.</p>
              {data.total === 0 && data.honest.length === 0 && <p className="text-xs text-muted-foreground">No deadline was changed in this period.</p>}
              {data.honest.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Finished late: against the final date and against the original date</p>
                  <table className="w-full border-collapse"><thead><tr><th className={th}>Doer</th><th className={th}>Finished</th><th className={th}>Late vs final date</th><th className={th}>Late vs original date</th></tr></thead>
                    <tbody>{data.honest.map((r) => <tr key={r.name}><td className={td}>{r.name}</td><td className={td}>{r.finished}</td><td className={td}>{r.lateVsFinal}</td><td className={`${td} font-black ${r.lateVsOriginal > r.lateVsFinal ? 'text-red-600' : ''}`}>{r.lateVsOriginal}</td></tr>)}</tbody></table>
                </div>
              )}
              {data.perDoer.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Per doer</p>
                  <table className="w-full border-collapse"><thead><tr><th className={th}>Doer</th><th className={th}>Changes</th><th className={th}>Tasks</th><th className={th}>Days added</th><th className={th}>By the doer</th></tr></thead>
                    <tbody>{data.perDoer.map((r) => <tr key={r.name}><td className={td}>{r.name}</td><td className={td}>{r.changes}</td><td className={td}>{r.tasks}</td><td className={td}>{r.days}</td><td className={td}>{r.byDoer}</td></tr>)}</tbody></table>
                </div>
              )}
              {data.perReason.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Per reason</p>
                  <table className="w-full border-collapse"><thead><tr><th className={th}>Reason</th><th className={th}>Times</th></tr></thead>
                    <tbody>{data.perReason.map((r) => <tr key={r.reason}><td className={td}>{r.reason}</td><td className={td}>{r.count}</td></tr>)}</tbody></table>
                </div>
              )}
              {data.rows.length > 0 && (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Every change</p>
                  <table className="w-full border-collapse"><thead><tr><th className={th}>When</th><th className={th}>Task</th><th className={th}>Doer</th><th className={th}>Changed by</th><th className={th}>From → To</th><th className={th}>Reason</th></tr></thead>
                    <tbody>{data.rows.map((r, i) => (
                      <tr key={i}><td className={td}>{d(r.at)}</td><td className={td}>{r.title}</td><td className={td}>{r.doer}</td><td className={td}>{r.by} <span className="text-muted-foreground">({ROLE[r.role] || r.role})</span></td>
                        <td className={`${td} ${r.shortened ? 'text-red-600 font-bold' : ''}`}>{d(r.oldDeadline)} → {d(r.newDeadline)} ({r.days >= 0 ? '+' : ''}{r.days}d)</td><td className={td}>{[r.reason, r.note].filter(Boolean).join(' - ') || '-'}</td></tr>
                    ))}</tbody></table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
