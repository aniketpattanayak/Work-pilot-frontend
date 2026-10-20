import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import { pctTone, TONE_CLASSES, PERIOD_LABELS, neighbourDate } from '../utils/reviewScore';
import { Globe, RefreshCcw, Search, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ResponsiveTable from '../components/ResponsiveTable';
import MobileFilters from '../components/MobileFilters';
import DateChangesReport from '../components/DateChangesReport';

/**
 * GLOBAL VIEW — read-only company-wide Review Meeting sheet (for the Viewer role).
 * Nothing here changes data: it only reads /review-analytics and /employee-deep-dive.
 */
const TYPES = ['Delegation', 'Checklist', 'FMS'];
const KEYS = { Delegation: 'delegation', Checklist: 'checklist', FMS: 'fms' };
const GROUP_STYLE = {
  delegation: { head: 'bg-purple-600 text-white', sub: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  checklist: { head: 'bg-sky-600 text-white', sub: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  fms: { head: 'bg-orange-500 text-white', sub: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300' }
};
const COLS = [
  ['total', 'TOT', 'Total tasks due in the period'],
  ['onTimeDone', 'OT', 'Done on time'],
  ['lateDone', 'LD', 'Done late'],
  ['pendingOnTime', 'PO', 'Pending, deadline not yet passed'],
  ['latePending', 'LP', 'Pending and past its deadline (late pending)']
];
const EMPTY = { total: 0, onTimeDone: 0, lateDone: 0, pendingOnTime: 0, latePending: 0 };

const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const drift = (deadline, completedAt) => {
  if (!deadline) return '—';
  const d1 = new Date(deadline);
  if (completedAt) {
    const diff = Math.floor((new Date(completedAt) - d1) / 86400000);
    return diff > 0 ? `${diff}d late` : 'On time';
  }
  const diff = Math.floor((new Date() - d1) / 86400000);
  return diff > 0 ? `${diff}d overdue` : 'Not due yet';
};

// Drift colour: the Admin sets the day limits in Settings (default 0-10 green, 11-50 yellow, 51-100 orange, above red).
const DEFAULT_DRIFT = { greenMax: 10, yellowMax: 50, orangeMax: 100 };
const DRIFT_TONE = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  none: ''
};
const driftTone = (deadline, completedAt, bands) => {
  if (!deadline) return 'none';
  const b = bands || DEFAULT_DRIFT;
  const diff = Math.floor(((completedAt ? new Date(completedAt) : new Date()) - new Date(deadline)) / 86400000);
  if (!completedAt && diff <= 0) return 'none'; // not due yet
  const days = Math.max(0, diff);
  if (days <= b.greenMax) return 'green';
  if (days <= b.yellowMax) return 'yellow';
  if (days <= b.orangeMax) return 'orange';
  return 'red';
};

const bucketOf = (r) => {
  const done = r.type === 'FMS' ? r.fms?.instanceStatus === 'completed' : !!r.completedAt;
  if (done) return r.status === 'LATE' ? 'lateDone' : 'onTimeDone';
  return r.status === 'OVERDUE' ? 'latePending' : 'pendingOnTime';
};
const BUCKET_LABEL = { onTimeDone: 'DONE', lateDone: 'LATE DONE', pendingOnTime: 'PENDING', latePending: 'LATE PENDING' };
const BUCKET_CLASS = {
  onTimeDone: 'bg-emerald-500 text-white',
  lateDone: 'bg-amber-400 text-black',
  pendingOnTime: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
  latePending: 'bg-red-500 text-white'
};

const cellBase = 'border border-border px-1.5 py-1 text-center tabular-nums';

// Previous period: the Late Target the Admin had set then, next to what the person actually did (late %).
const PreviousCell = ({ prev }) => {
  if (!prev) return <td className={`${cellBase} text-slate-300`}>&mdash;</td>;
  const target = Number(prev.target);
  const actual = Number(prev.latePct) || 0;
  const tone = !prev.hasTasks ? '' : (actual > target ? TONE_CLASSES.red : TONE_CLASSES.green);
  const tip = `${prev.periodName}: target ${target}%${prev.targetSource === 'current' ? ' (current target; no change recorded)' : ''}, ${prev.hasTasks ? 'actual late ' + actual.toFixed(1) + '%' : 'no tasks in that period'}`;
  return (
    <td className={`${cellBase} whitespace-nowrap`} title={tip}>
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-black">
        <span className="text-slate-500">Target {target}%</span>
        <span className="text-slate-300">&rarr;</span>
        {prev.hasTasks ? <span className={`px-1.5 py-0.5 rounded ${tone}`}>Late {actual.toFixed(1)}%</span> : <span className="text-slate-400">no tasks</span>}
      </div>
    </td>
  );
};

// Late Target box (Admin mode): type 0-100, then press Save (or Enter). Nothing is saved until then.
const LateTargetInput = ({ value, onSave }) => {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [base, setBase] = useState(value);
  const [state, setState] = useState('idle'); // idle | saving | saved
  useEffect(() => { setDraft(String(value ?? '')); setBase(value); }, [value]);
  const clamp = (raw) => {
    if (raw === '') return '';
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(base ?? '');
    return String(Math.min(100, Math.max(0, n)));
  };
  const dirty = draft !== '' && Number(draft) !== Number(base);
  const commit = async () => {
    if (!dirty || state === 'saving') return;
    setState('saving');
    const ok = await onSave(Number(draft));
    if (ok) { setBase(Number(draft)); setState('saved'); setTimeout(() => setState('idle'), 2000); }
    else { setState('idle'); setDraft(String(base ?? '')); }
  };
  return (
    <div className="flex items-center justify-center gap-1">
      <input type="number" min={0} max={100} step={1} value={draft}
        onChange={(e) => setDraft(clamp(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className="w-14 bg-background border border-border rounded-md text-center font-black text-[11px] py-0.5 focus:border-primary outline-none" />
      {dirty && (
        <button onClick={commit} disabled={state === 'saving'} className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[9px] font-black uppercase disabled:opacity-50">
          {state === 'saving' ? '…' : 'Save'}
        </button>
      )}
      {state === 'saved' && <span className="text-[9px] font-black text-emerald-600">✓</span>}
    </div>
  );
};

const GlobalView = ({ tenantId, mode = 'view' }) => {
  // 'view' = read-only (Viewer role). 'review' = Admin Review Meeting: same sheet plus Late Target and delete.
  const canEdit = mode === 'review';
  const [report, setReport] = useState([]);
  const [config, setConfig] = useState(null);
  const [periodInfo, setPeriodInfo] = useState(null);
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [range, setRange] = useState(null);       // { from, to } custom dates, or null = the company's review period
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [locFilter, setLocFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  const [active, setActive] = useState(null);       // employee row opened in the audit sheet
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [openFms, setOpenFms] = useState([]);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/tasks/review-analytics/${currentTenantId}`, { params: range ? { from: range.from, to: range.to } : { date: refDate } });
      setReport(Array.isArray(res.data?.report) ? res.data.report : []);
      setConfig(res.data?.config || null);
      setPeriodInfo({ view: res.data?.view, startDate: res.data?.startDate, endDate: res.data?.endDate });
    } catch (e) {
      setReport([]);
      setError(e.response?.data?.message || 'Could not load the review data.');
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, refDate, range]);

  useEffect(() => { load(); }, [load]);

  const saveTarget = async (employeeId, target) => {
    try {
      await API.put('/tasks/update-weekly-target', { employeeId, target });
      load();
      return true;
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save the late target. Please try again.');
      return false;
    }
  };

  const thresholds = config?.thresholds;
  const driftBands = config?.driftBands || DEFAULT_DRIFT;
  const previousName = report.find((r) => r.previous)?.previous?.periodName || '';

  const locOptions = useMemo(() => [...new Set(report.map((r) => (r.location || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [report]);
  const deptOptions = useMemo(() => [...new Set(report.map((r) => (r.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [report]);

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return report
      .filter((r) => {
        if (q && !((r.employeeName || '').toLowerCase().includes(q) || (r.department || '').toLowerCase().includes(q) || (r.location || '').toLowerCase().includes(q))) return false;
        if (locFilter !== 'All' && (r.location || '').trim() !== locFilter) return false;
        if (deptFilter !== 'All' && (r.department || '').trim() !== deptFilter) return false;
        return true;
      })
      .sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
  }, [report, search, locFilter, deptFilter]);

  const totals = useMemo(() => {
    const t = { delegation: { ...EMPTY }, checklist: { ...EMPTY }, fms: { ...EMPTY } };
    let lateSum = 0; let notDoneSum = 0; let counted = 0;
    people.forEach((p) => {
      Object.keys(t).forEach((k) => COLS.forEach(([f]) => { t[k][f] += p[k]?.[f] || 0; }));
      if (p.overall?.hasTasks) { lateSum += p.overall.latePct; notDoneSum += p.overall.notDonePct; counted += 1; }
    });
    return { t, avgLate: counted ? lateSum / counted : 0, avgNotDone: counted ? notDoneSum / counted : 0, counted };
  }, [people]);

  const openAudit = async (p, s, e) => {
    setActive(p);
    setTypeFilter('All');
    setOpenFms([]);
    const istDay = (iso) => (iso ? new Date(new Date(iso).getTime() + 330 * 60000).toISOString().split('T')[0] : '');
    const from = s || istDay(p.periodStart);
    const to = e || istDay(p.periodEnd);
    setStart(from); setEnd(to);
    if (!from || !to) { setRows([]); return; }
    try {
      setRowsLoading(true);
      const res = await API.get(`/tasks/employee-deep-dive/${p.employeeId}`, {
        params: { startDate: `${from}T00:00:00.000+05:30`, endDate: `${to}T23:59:59.999+05:30` }
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setRows([]);
    } finally {
      setRowsLoading(false);
    }
  };

  const deleteRecord = async (r) => {
    const msg = r.type === 'Checklist'
      ? `Delete the WHOLE checklist task "${r.name}" (every run of it, not just this date)?`
      : `Delete the task "${r.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await API.delete(r.type === 'Checklist' ? `/tasks/checklist/${r.id}` : `/tasks/${r.id}`);
      if (active) openAudit(active, start, end);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const shownRows = useMemo(() => (typeFilter === 'All' ? rows : rows.filter((r) => r.type === typeFilter)), [rows, typeFilter]);
  const counts = useMemo(() => {
    const c = { total: shownRows.length, onTimeDone: 0, lateDone: 0, pendingOnTime: 0, latePending: 0 };
    shownRows.forEach((r) => { c[bucketOf(r)] += 1; });
    c.latePct = c.total ? ((c.lateDone + c.latePending) / c.total) * 100 : 0;
    c.notDonePct = c.total ? ((c.pendingOnTime + c.latePending) / c.total) * 100 : 0;
    return c;
  }, [shownRows]);

  const pctCell = (v, extra = '') => (
    <td className={`${cellBase} font-black ${TONE_CLASSES[pctTone(v, thresholds)]} ${extra}`}>{fmtPct(v)}</td>
  );

  return (
    <div className="w-full max-w-[1900px] mx-auto pb-10 text-left">
      {/* TITLE + PERIOD */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-xl"><Globe className="text-white" size={22} /></div>
          <div>
            <h2 className="text-foreground text-2xl font-black tracking-tight uppercase leading-none">{canEdit ? 'Review Meeting' : 'Global View'}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{canEdit ? 'Live compliance ledger' : 'Read-only company review sheet'}</p>
          </div>
        </div>
        {periodInfo?.startDate && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {!range && <button onClick={() => { const d = neighbourDate(periodInfo, -1); if (d) setRefDate(d); }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">&larr; Previous</button>}
            <div className="text-xs font-black uppercase tracking-widest text-foreground px-2">
              {PERIOD_LABELS[periodInfo.view] || periodInfo.view} &middot; {fmtDate(periodInfo.startDate)} &ndash; {fmtDate(periodInfo.endDate)}
            </div>
            {!range && <button onClick={() => { const d = neighbourDate(periodInfo, 1); if (d) setRefDate(d); }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">Next &rarr;</button>}
            {!range && <button onClick={() => setRefDate(new Date().toISOString().split('T')[0])} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted">Current</button>}
            <button onClick={load} className="px-3 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted flex items-center gap-1.5"><RefreshCcw size={12} /> Refresh</button>
            <div className="flex items-center gap-1.5 border-l border-border pl-2 ml-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">From</span>
              <input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">To</span>
              <input type="date" value={toDraft} min={fromDraft || undefined} onChange={(e) => setToDraft(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold" />
              <button
                onClick={() => setRange({ from: fromDraft, to: toDraft })}
                disabled={!fromDraft || !toDraft || toDraft < fromDraft}
                title={!fromDraft || !toDraft ? 'Pick both dates' : (toDraft < fromDraft ? 'The "to" date cannot be before the "from" date' : 'Show this date range')}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >Apply</button>
              {range && (
                <button onClick={() => { setRange(null); setFromDraft(''); setToDraft(''); }} className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted">Clear</button>
              )}
            </div>
          </div>
        )}
      </div>

      <DateChangesReport from={range ? range.from : (periodInfo?.startDate ? String(periodInfo.startDate).slice(0, 10) : undefined)} to={range ? range.to : (periodInfo?.endDate ? String(periodInfo.endDate).slice(0, 10) : undefined)} />

      {/* FILTERS + LEGEND */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 mb-3">
        <MobileFilters
          activeCount={[locFilter !== 'All', deptFilter !== 'All'].filter(Boolean).length}
          onClear={() => { setLocFilter('All'); setDeptFilter('All'); }}
          className="flex flex-wrap items-center gap-2"
          alwaysVisible={
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, dept, location..." className="bg-background border border-border rounded-lg pl-8 pr-7 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64" />
              {search && (
                <button type="button" aria-label="Clear search" title="Clear" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={13} /></button>
              )}
            </div>
          }
        >
          <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold" title="Filter by location">
            <option value="All">All Locations</option>
            {locOptions.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold" title="Filter by department">
            <option value="All">All Departments</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </MobileFilters>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{people.length} people</span>
          <div className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 flex-wrap">
            <span>TOT total</span><span>OT on-time done</span><span>LD late done</span><span>PO pending (not due)</span><span>LP late pending</span>
            {thresholds && (
              <>
                <span className={`px-1.5 py-0.5 rounded ${TONE_CLASSES.red}`}>&ge; {thresholds.red}%</span>
                <span className={`px-1.5 py-0.5 rounded ${TONE_CLASSES.orange}`}>&ge; {thresholds.orange}%</span>
                <span className={`px-1.5 py-0.5 rounded ${TONE_CLASSES.green}`}>below</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SHEET */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-slate-500 text-xs font-black uppercase tracking-widest"><RefreshCcw className="animate-spin text-primary" size={20} /> Loading...</div>
        ) : error ? (
          <div className="py-24 text-center text-sm font-bold text-red-500">{error}</div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-250px)]">
            <ResponsiveTable>
            <table className="mobile-card-table w-full border-collapse text-[11px] min-w-[1250px]">
              <thead className="sticky top-0 z-30">
                <tr className="text-[10px] font-black uppercase tracking-wider">
                  <th rowSpan={2} className="sticky left-0 z-40 border-b border-border bg-background px-2 py-1 w-10 min-w-[40px] max-w-[40px]">S.no</th>
                  <th rowSpan={2} className="sticky left-10 z-40 border-b border-border bg-background px-2 py-1 text-left min-w-[150px]">Employee</th>
                  <th rowSpan={2} className="border-b border-border bg-background px-2 py-1 text-left min-w-[90px]">Location</th>
                  <th rowSpan={2} className="border-b border-border bg-background px-2 py-1 text-left min-w-[110px]">Dept</th>
                  {canEdit && <th rowSpan={2} className="border-b border-border bg-background px-2 py-1 min-w-[110px]">Late Target (%)</th>}
                  {canEdit && <th rowSpan={2} className="border-b border-border bg-background px-2 py-1 min-w-[190px]" title={`Last period${previousName ? ' (' + previousName + ')' : ''}: the target set for the person, and the late % they actually had`}>Previous period<div className="text-[8px] font-bold normal-case tracking-normal text-slate-400">Target &rarr; Actual late %{previousName ? ` · ${previousName}` : ''}</div></th>}
                  {TYPES.map((t) => (
                    <th key={t} colSpan={5} className={`border-b border-border px-2 py-1 ${GROUP_STYLE[KEYS[t]].head}`}>{t}</th>
                  ))}
                  <th rowSpan={2} className="border-b border-border bg-background px-2 py-1 min-w-[78px]" title="(late done + late pending) / all tasks due">Late %</th>
                  <th rowSpan={2} className="border-b border-border bg-background px-2 py-1 min-w-[78px]" title="(pending + late pending) / all tasks due">Not Done %</th>
                </tr>
                <tr className="text-[9px] font-black">
                  {TYPES.map((t) => COLS.map(([f, label, tip]) => (
                    <th key={t + f} title={tip} className={`border-b border-border px-1 py-0.5 ${GROUP_STYLE[KEYS[t]].sub}`}>{label}</th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {people.map((p, i) => (
                  <tr key={String(p.employeeId)} onClick={() => openAudit(p)} className="cursor-pointer hover:bg-primary/10 odd:bg-background/40">
                    <td className={`${cellBase} sticky left-0 z-10 bg-card text-slate-400 min-w-[40px] max-w-[40px]`}>{i + 1}</td>
                    <td className="sticky left-10 z-10 bg-card border border-border px-2 py-1 font-black uppercase text-foreground whitespace-nowrap">{p.employeeName}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.location || '—'}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.department || '—'}</td>
                    {canEdit && (
                      <td className="border border-border px-1 py-0.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <LateTargetInput value={p.weeklyLateTarget} onSave={(v) => saveTarget(p.employeeId, v)} />
                      </td>
                    )}
                    {canEdit && <PreviousCell prev={p.previous} />}
                    {TYPES.map((t) => COLS.map(([f]) => {
                      const v = p[KEYS[t]]?.[f] || 0;
                      const tone = v > 0 && f === 'lateDone' ? 'text-amber-600 font-black' : v > 0 && f === 'latePending' ? 'text-red-600 font-black' : v > 0 ? 'text-foreground font-bold' : 'text-slate-300 dark:text-slate-600';
                      return <td key={t + f} className={`${cellBase} ${tone}`}>{v}</td>;
                    }))}
                    {pctCell(p.overall?.latePct || 0)}
                    {pctCell(p.overall?.notDonePct || 0)}
                  </tr>
                ))}
                {people.length === 0 && (
                  <tr><td colSpan={canEdit ? 23 : 21} className="py-16 text-center text-slate-400 font-bold text-sm">No people match</td></tr>
                )}
              </tbody>
              {people.length > 0 && (
                <tfoot className="sticky bottom-0 z-20">
                  <tr className="font-black bg-muted">
                    <td colSpan={canEdit ? 6 : 4} className="border border-border px-2 py-1 text-right uppercase tracking-widest text-[10px]">Total / Average</td>
                    {TYPES.map((t) => COLS.map(([f]) => <td key={t + f} className={`${cellBase}`}>{totals.t[KEYS[t]][f]}</td>))}
                    {pctCell(totals.avgLate)}
                    {pctCell(totals.avgNotDone)}
                  </tr>
                </tfoot>
              )}
            </table>
            </ResponsiveTable>
          </div>
        )}
      </div>

      {/* AUDIT SHEET */}
      {active && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
          <div className="absolute inset-0" onClick={() => setActive(null)} />
          <div className="relative w-full max-w-[98vw] h-[95vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border bg-background">
              <div className="min-w-0">
                <h3 className="text-base font-black uppercase leading-tight truncate">{active.employeeName}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{[active.department, active.location].filter(Boolean).join(' · ') || 'No department / location'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold" />
                <span className="text-slate-400 text-xs">to</span>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold" />
                <button onClick={() => openAudit(active, start, end)} className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest">Run</button>
                <button onClick={() => setActive(null)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500"><X size={18} /></button>
              </div>
            </div>

            <div className="px-5 py-2 border-b border-border flex flex-wrap items-center gap-2">
              {['All', ...TYPES].map((f) => {
                const n = f === 'All' ? rows.length : rows.filter((r) => r.type === f).length;
                return (
                  <button key={f} onClick={() => setTypeFilter(f)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${typeFilter === f ? 'bg-primary text-white border-primary' : 'bg-card text-slate-500 border-border hover:text-foreground'}`}>
                    {f} ({n})
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                {[
                  ['Total', counts.total, 'bg-muted text-foreground'],
                  ['Done on time', counts.onTimeDone, BUCKET_CLASS.onTimeDone],
                  ['Late done', counts.lateDone, BUCKET_CLASS.lateDone],
                  ['Pending', counts.pendingOnTime, BUCKET_CLASS.pendingOnTime],
                  ['Late pending', counts.latePending, BUCKET_CLASS.latePending]
                ].map(([label, v, cls]) => (
                  <span key={label} className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${cls}`}>{label}: {v}</span>
                ))}
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${TONE_CLASSES[pctTone(counts.latePct, thresholds)]}`}>Late {fmtPct(counts.latePct)}</span>
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${TONE_CLASSES[pctTone(counts.notDonePct, thresholds)]}`}>Not done {fmtPct(counts.notDonePct)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {rowsLoading ? (
                <div className="py-24 text-center text-slate-400 font-bold text-sm">Loading...</div>
              ) : shownRows.length === 0 ? (
                <div className="py-24 text-center text-slate-400 font-bold text-sm">No tasks in this range</div>
              ) : (
                <ResponsiveTable>
                <table className="mobile-card-table w-full border-collapse text-[11px] min-w-[900px]">
                  <thead className="sticky top-0 z-20 bg-background">
                    <tr className="text-[10px] font-black uppercase tracking-wider">
                      {['S.no', 'Type', 'Task', 'Deadline', 'Completed', 'Drift', 'Status', ...(canEdit ? ['Action'] : [])].map((h) => (
                        <th key={h} className="border border-border px-2 py-1 text-left bg-background">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((r, i) => {
                      const b = bucketOf(r);
                      const key = `${r.id}-${i}`;
                      const isFms = r.type === 'FMS';
                      const open = openFms.includes(key);
                      const f = r.fms || { steps: [], pendingStep: null };
                      return (
                        <React.Fragment key={key}>
                          <tr className={`odd:bg-background/40 ${isFms ? 'cursor-pointer hover:bg-primary/10' : ''}`} onClick={isFms ? () => setOpenFms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key])) : undefined}>
                            <td className="border border-border px-2 py-1 text-slate-400 text-center w-10">{i + 1}</td>
                            <td className="border border-border px-2 py-1 font-black uppercase text-[10px] w-24">{r.type}</td>
                            <td className="border border-border px-2 py-1 font-bold">
                              <span className="inline-flex items-center gap-1">{isFms && (open ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}{r.name}</span>
                            </td>
                            <td className="border border-border px-2 py-1 whitespace-nowrap">{fmtDate(r.deadline)}</td>
                            <td className="border border-border px-2 py-1 whitespace-nowrap">{r.completedAt ? fmtDateTime(r.completedAt) : '—'}</td>
                            <td className="border border-border px-2 py-1 whitespace-nowrap font-bold"><span className={`px-1.5 py-0.5 rounded ${DRIFT_TONE[driftTone(r.deadline, r.completedAt, driftBands)]}`}>{drift(r.deadline, r.completedAt)}</span></td>
                            <td className="border border-border px-2 py-1 text-center w-28">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${BUCKET_CLASS[b]}`}>{BUCKET_LABEL[b]}</span>
                            </td>
                            {canEdit && (
                              <td className="border border-border px-2 py-1 text-center w-16" onClick={(e) => e.stopPropagation()}>
                                {r.type === 'FMS' ? '—' : (
                                  <button type="button" title={r.type === 'Checklist' ? 'Delete this whole checklist task' : 'Delete this task'} onClick={() => deleteRecord(r)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                )}
                              </td>
                            )}
                          </tr>
                          {isFms && open && (
                            <tr>
                              <td colSpan={canEdit ? 8 : 7} className="border border-border bg-muted/40 px-4 py-2">
                                {f.steps.length === 0 && !f.pendingStep && <span className="text-slate-400 font-bold">No steps yet.</span>}
                                {f.steps.length > 0 && (
                                  <ResponsiveTable>
                                  <table className="mobile-card-table w-full border-collapse text-[11px] mb-2">
                                    <thead><tr className="text-[9px] font-black uppercase text-slate-500">
                                      {['Step', 'Done by', 'Planned', 'Completed', 'Result'].map((h) => <th key={h} className="border border-border px-2 py-0.5 text-left bg-card">{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                      {f.steps.map((st, j) => (
                                        <tr key={j} className={st.mine ? 'bg-primary/5' : 'bg-card'}>
                                          <td className="border border-border px-2 py-0.5 font-bold">{st.nodeName}{st.mine && <span className="ml-1 text-[9px] text-primary uppercase">this person</span>}</td>
                                          <td className="border border-border px-2 py-0.5">{st.completedByName || st.assignedToName || '—'}</td>
                                          <td className="border border-border px-2 py-0.5">{fmtDateTime(st.plannedDeadline)}</td>
                                          <td className="border border-border px-2 py-0.5">{fmtDateTime(st.completedAt)}</td>
                                          <td className={`border border-border px-2 py-0.5 font-bold ${st.onTime ? 'text-emerald-600' : 'text-red-500'}`}>{st.onTime ? 'On time' : 'Late'}{st.decision ? ` · ${st.decision}` : ''}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                </ResponsiveTable>
                                )}
                                {f.pendingStep && (
                                  <p className={`font-bold ${f.pendingStep.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                                    Pending step: {f.pendingStep.nodeName} · with {f.pendingStep.assignedToName || '—'}{f.pendingStep.mine ? ' (this person)' : ''} · due {fmtDateTime(f.pendingStep.plannedDeadline)}{f.pendingStep.overdue ? ' · OVERDUE' : ''}
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                                  </ResponsiveTable>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalView;
