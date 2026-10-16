import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import ActivityLogPanel from '../components/ActivityLogPanel';
import { pctTone, TONE_CLASSES, PERIOD_LABELS, neighbourDate } from '../utils/reviewScore';
import { RefreshCcw, Trophy, Star, Medal, Zap, ShieldCheck, Flame, Target, Rocket, Award, MapPin, Briefcase, Mail, Plane } from 'lucide-react';
import ResponsiveTable from '../components/ResponsiveTable';

/**
 * PERSONAL DASHBOARD — every login sees their own numbers.
 * An Admin can switch to any employee with the picker. All data comes from /tasks/user-dashboard/:id.
 */
const BADGE_ICONS = { Star, Trophy, Medal, Zap, ShieldCheck, Flame, Target, Rocket, Award };
const TYPES = [['delegation', 'Delegation', 'bg-purple-600'], ['checklist', 'Checklist', 'bg-sky-600'], ['fms', 'FMS', 'bg-orange-500']];
const BUCKETS = [
  ['total', 'Total', 'text-foreground'],
  ['onTimeDone', 'Done on time', 'text-emerald-600'],
  ['lateDone', 'Late done', 'text-amber-600'],
  ['pendingOnTime', 'Pending', 'text-slate-500'],
  ['latePending', 'Late pending', 'text-red-600']
];
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
// Calendar day as YYYY-MM-DD in local time (the server reads these as India dates)
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lastNDays = (n) => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - (n - 1)); return { from: ymd(from), to: ymd(to) }; };
const RANGES = [['current', 'Current period'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Date range']];
// The four numbers asked for, for each work type
const STAT_TILES = [
  ['Done on time', (s) => s.onTimeDone, 'text-emerald-600', 'Finished on or before the deadline'],
  ['Not done on time', (s) => s.lateDone, 'text-amber-600', 'Finished, but after the deadline'],
  ['Not done', (s) => s.pendingOnTime + s.latePending, 'text-slate-600 dark:text-slate-300', 'Not finished yet (includes the overdue ones)'],
  ['Not done & overdue', (s) => s.latePending, 'text-red-600', 'Not finished and the deadline has already passed']
];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const Card = ({ title, right, children }) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const MiniTable = ({ cols, rows, empty }) => (
  rows.length === 0 ? (
    <p className="px-4 py-6 text-center text-xs font-bold text-slate-400">{empty}</p>
  ) : (
    <div className="overflow-auto max-h-72">
      <ResponsiveTable>
      <table className="mobile-card-table w-full border-collapse text-[11px]">
        <thead className="sticky top-0 bg-background">
          <tr>{cols.map((c) => <th key={c} className="px-3 py-1.5 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-border">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {r.map((cell, j) => <td key={j} className="px-3 py-1.5 font-semibold">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </ResponsiveTable>
    </div>
  )
);

const UserDashboard = ({ tenantId, userId, isAdmin }) => {
  const [viewId, setViewId] = useState(userId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [rangeMode, setRangeMode] = useState('current'); // current | 7 | 30 | 90 | custom
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedCustom, setAppliedCustom] = useState(null); // { from, to } once Apply is pressed
  const [people, setPeople] = useState([]);
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  useEffect(() => { setViewId(userId); }, [userId]);

  // Admin: the list for the picker (up to 500 people)
  useEffect(() => {
    if (!isAdmin || !currentTenantId) return;
    let alive = true;
    API.get(`/tasks/employees/${currentTenantId}`, { params: { limit: 500 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.employees || [];
        if (alive) setPeople(list.map((e) => ({ _id: e._id, name: e.name, department: e.department || '', location: e.location || '' })));
      })
      .catch(() => { if (alive) setPeople([]); });
    return () => { alive = false; };
  }, [isAdmin, currentTenantId]);

  const load = useCallback(async () => {
    if (!viewId) { setLoading(false); setError('Your account could not be identified. Please log in again.'); return; }
    try {
      setLoading(true);
      setError('');
      let params = { date: refDate };
      if (rangeMode === '7' || rangeMode === '30' || rangeMode === '90') params = lastNDays(Number(rangeMode));
      else if (rangeMode === 'custom') {
        if (!appliedCustom) { setLoading(false); return; } // wait until the dates are chosen and Apply is pressed
        params = appliedCustom;
      }
      const res = await API.get(`/tasks/user-dashboard/${viewId}`, { params });
      setData(res.data);
    } catch (e) {
      setData(null);
      setError(e.response?.data?.message || 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, [viewId, refDate, rangeMode, appliedCustom]);

  useEffect(() => { load(); }, [load]);

  const th = data?.config?.thresholds;
  const periodInfo = data ? { view: data.view, startDate: data.startDate, endDate: data.endDate } : null;
  const sortedPeople = useMemo(() => [...people].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [people]);
  const emp = data?.employee;
  const o = data?.stats?.overall;

  return (
    <div className="w-full max-w-[1500px] mx-auto text-left space-y-4 pb-10">
      {/* TITLE + PICKER + PERIOD */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase text-foreground leading-none">Dashboard</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
            {data && !data.isSelf ? `Viewing ${emp?.name}` : 'My performance'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <select
              value={viewId}
              onChange={(e) => setViewId(e.target.value)}
              title="Choose an employee"
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-bold min-w-[220px]"
            >
              <option value={userId}>My dashboard</option>
              {sortedPeople.filter((p) => String(p._id) !== String(userId)).map((p) => (
                <option key={p._id} value={p._id}>{p.name}{p.department ? ` · ${p.department}` : ''}{p.location ? ` · ${p.location}` : ''}</option>
              ))}
            </select>
            {String(viewId) !== String(userId) && (
              <button onClick={() => setViewId(userId)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">Back to mine</button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 flex-wrap">
            {RANGES.map(([k, label]) => (
              <button key={k} onClick={() => setRangeMode(k)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rangeMode === k ? 'bg-primary text-white shadow' : 'text-slate-500 hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
          {periodInfo && periodInfo.startDate && (
            <>
              {rangeMode === 'current' && (
                <>
                  <button onClick={() => { const d = neighbourDate(periodInfo, -1); if (d) setRefDate(d); }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">&larr; Previous</button>
                  <span className="text-xs font-black uppercase tracking-widest px-2">{PERIOD_LABELS[periodInfo.view] || periodInfo.view} &middot; {fmtDate(periodInfo.startDate)} &ndash; {fmtDate(periodInfo.endDate)}</span>
                  <button onClick={() => { const d = neighbourDate(periodInfo, 1); if (d) setRefDate(d); }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">Next &rarr;</button>
                  <button onClick={() => setRefDate(new Date().toISOString().split('T')[0])} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">Current</button>
                </>
              )}
              {rangeMode !== 'current' && rangeMode !== 'custom' && (
                <span className="text-xs font-black uppercase tracking-widest px-2">{fmtDate(periodInfo.startDate)} &ndash; {fmtDate(periodInfo.endDate)}</span>
              )}
            </>
          )}
          {rangeMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">From</label>
              <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold" />
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">To</label>
              <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold" />
              <button disabled={!customFrom || !customTo} onClick={() => setAppliedCustom({ from: customFrom, to: customTo })}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black disabled:opacity-40">Apply</button>
            </div>
          )}
          <button onClick={load} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted flex items-center gap-1.5"><RefreshCcw size={12} /> Refresh</button>
        </div>
      </div>

      {rangeMode === 'custom' && !appliedCustom ? (
        <div className="py-20 text-center text-sm font-bold text-slate-500">Choose the From and To dates, then press Apply.</div>
      ) : loading && !data ? (
        <div className="flex items-center justify-center gap-3 py-24 text-slate-500 text-xs font-black uppercase tracking-widest"><RefreshCcw className="animate-spin text-primary" size={20} /> Loading...</div>
      ) : error ? (
        <div className="py-20 text-center text-sm font-bold text-red-500">{error}</div>
      ) : data && (
        <>
          {/* IDENTITY + KPIs */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_2fr] gap-4">
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xl font-black">{(emp.name || '?').charAt(0).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="text-lg font-black uppercase leading-tight truncate">{emp.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {emp.roles.map((r) => <span key={r} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-border bg-background text-slate-500">{r}</span>)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 truncate"><Briefcase size={12} className="text-primary/60" />{emp.department || '—'}</span>
                <span className="flex items-center gap-1.5 truncate"><MapPin size={12} className="text-primary/60" />{emp.location || '—'}</span>
                <span className="flex items-center gap-1.5 truncate sm:col-span-2"><Mail size={12} className="text-primary/60" />{emp.email || '—'}</span>
                {emp.leaveStatus?.onLeave && <span className="flex items-center gap-1.5 text-amber-600 font-black sm:col-span-2"><Plane size={12} />On leave {fmtDate(emp.leaveStatus.startDate)} – {fmtDate(emp.leaveStatus.endDate)}</span>}
              </div>
              <div className="flex items-center gap-4 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <Trophy className={emp.totalPoints > 0 ? 'text-amber-500' : 'text-slate-300'} size={28} />
                  <div>
                    <p className="text-2xl font-black leading-none">{(emp.totalPoints || 0).toLocaleString()}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Points</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emp.earnedBadges.length === 0 && <span className="text-[10px] font-bold text-slate-400">No badges yet</span>}
                  {emp.earnedBadges.map((b, i) => {
                    const Icon = BADGE_ICONS[b.iconName] || Star;
                    return <span key={i} title={b.name} className="p-2 rounded-xl border border-border bg-background" style={{ borderBottom: `3px solid ${b.color}` }}><Icon size={16} color={b.color} /></span>;
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Late %', o.latePct, true, '(late done + late pending) / all due'],
                ['Not done %', o.notDonePct, true, '(pending + late pending) / all due'],
                ['Done on time %', o.onTimeDonePct, false, ''],
                ['Pending %', o.pendingOnTimePct, false, 'not yet due']
              ].map(([label, v, tone, tip]) => (
                <div key={label} title={tip} className={`rounded-2xl border border-border p-4 flex flex-col justify-between ${tone ? TONE_CLASSES[pctTone(v, th)] : 'bg-card'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
                  <p className="text-3xl font-black leading-none mt-3">{o.hasTasks ? fmtPct(v) : '—'}</p>
                </div>
              ))}
              {TYPES.map(([k, label, bg]) => {
                const s = data.stats[k];
                const den = Math.max(s.total, s.onTimeDone + s.lateDone + s.pendingOnTime + s.latePending);
                return (
                  <div key={k} className="col-span-2 md:col-span-4 bg-card border border-border rounded-2xl overflow-hidden">
                    <div className={`${bg} text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest flex justify-between`}><span>{label}</span><span>Total {den}</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 text-center py-3 gap-y-3">
                      {STAT_TILES.map(([name, get, cls, tip]) => {
                        const n = get(s);
                        return (
                          <div key={name} title={tip}>
                            <p className={`text-2xl font-black leading-none ${cls}`}>{n}</p>
                            <p className={`text-xs font-black mt-1 ${cls}`}>{den > 0 ? fmtPct((100 * n) / den) : '—'}</p>
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">{name}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WORK LISTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title={`Overdue delegation tasks (${data.overdue.count}${data.overdue.truncated ? '+' : ''})`}>
              <MiniTable cols={['Task', 'Deadline', 'Late by']} empty="Nothing overdue 🎉"
                rows={data.overdue.items.map((t) => [t.title, fmtDate(t.deadline), `${Math.max(1, Math.floor((Date.now() - new Date(t.deadline)) / 86400000))}d`])} />
            </Card>
            <Card title={`Due in the next 7 days (${data.dueSoon.count})`}>
              <MiniTable cols={['Task', 'Deadline']} empty="Nothing due this week"
                rows={data.dueSoon.items.map((t) => [t.title, fmtDateTime(t.deadline)])} />
            </Card>
            <Card title={`Checklist · ${data.checklist.overdueCount} overdue · ${data.checklist.todayCount} due today`}>
              <MiniTable cols={['Checklist', 'Frequency', 'Next due']} empty="No checklist is due"
                rows={data.checklist.items.map((c) => [c.name, c.frequency, fmtDate(c.nextDueDate)])} />
            </Card>
            <Card title={`FMS steps waiting on this person (${data.fms.pendingCount})`}>
              <MiniTable cols={['Flow', 'Step', 'Due']} empty="No FMS step is waiting"
                rows={data.fms.items.map((f) => [f.name, f.step, <span key={f.id} className={f.overdue ? 'text-red-600 font-black' : ''}>{fmtDateTime(f.deadline)}{f.overdue ? ' · overdue' : ''}</span>])} />
            </Card>
          </div>

          {/* TOP PERFORMERS (Admin) */}
          {isAdmin && (
            <Card title="Top performers" right={<span className="text-[9px] font-black uppercase tracking-widest text-slate-400">By points</span>}>
              <MiniTable cols={['#', 'Name', 'Dept / Location', 'Points']} empty="No points recorded yet"
                rows={data.topPerformers.map((p, i) => [i + 1, p.name, [p.department, p.location].filter(Boolean).join(' · ') || '—', <span key={p._id} className="font-black text-amber-600">{(p.totalPoints || 0).toLocaleString()}</span>])} />
            </Card>
          )}
        </>
      )}

      {/* LOG (Admin): who did what, default today */}
      {isAdmin && <ActivityLogPanel tenantId={currentTenantId} />}
    </div>
  );
};

export default UserDashboard;
