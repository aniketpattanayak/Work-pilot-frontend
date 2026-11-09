import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import { pctTone, TONE_CLASSES, PERIOD_LABELS, neighbourDate, getPctStyle, setStoredDynamicColors } from '../utils/reviewScore';
import { Globe, RefreshCcw, Search, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ResponsiveTable from '../components/ResponsiveTable';
import MobileFilters from '../components/MobileFilters';
import TaskDetailsModal from '../components/TaskDetailsModal';

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
const PreviousCell = ({ prev, dynamicColors }) => {
  if (!prev) return <td className={`${cellBase} text-slate-300`}>&mdash;</td>;
  const target = Number(prev.target);
  const actual = Number(prev.latePct) || 0;
  const tip = `${prev.periodName}: target ${target}%${prev.targetSource === 'current' ? ' (current target; no change recorded)' : ''}, ${prev.hasTasks ? 'actual late ' + actual.toFixed(1) + '%' : 'no tasks in that period'}`;
  return (
    <td className={`${cellBase} whitespace-nowrap`} title={tip}>
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-black">
        <span className="text-slate-500">Target {target}%</span>
        <span className="text-slate-300">&rarr;</span>
        {prev.hasTasks ? (
          <span style={getPctStyle(actual, dynamicColors)} className="px-1.5 py-0.5 rounded shadow-sm">
            Late {actual.toFixed(1)}%
          </span>
        ) : (
          <span className="text-slate-400">no tasks</span>
        )}
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

const getCurrentWeekRange = () => {
  const now = new Date(Date.now() + 330 * 60000); // IST time
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const day = now.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // Monday of current week. If today is Monday (day === 1), user expects 02/11/2026 to 09/11/2026 (completed 7-day cycle)
  const diffDays = day === 0 ? 6 : (day === 1 ? 7 : day - 1);
  const monday = new Date(Date.UTC(y, m, d - diffDays));
  const fromStr = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
  const toStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { from: fromStr, to: toStr };
};

const GlobalView = ({ tenantId, mode = 'view' }) => {
  const defaultWeekRange = useMemo(() => getCurrentWeekRange(), []);
  // 'view' = read-only (Viewer role). 'review' = Admin Review Meeting: same sheet plus Late Target and delete.
  const canEdit = mode === 'review';
  const [report, setReport] = useState([]);
  const [config, setConfig] = useState(null);
  const [periodInfo, setPeriodInfo] = useState(null);
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [range, setRange] = useState(null);
  const [fromDraft, setFromDraft] = useState(defaultWeekRange.from);
  const [toDraft, setToDraft] = useState(defaultWeekRange.to);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [locFilter, setLocFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  const [active, setActive] = useState(null);       // employee row opened in the audit sheet
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [start, setStart] = useState(defaultWeekRange.from);
  const [end, setEnd] = useState(defaultWeekRange.to);
  const [typeFilter, setTypeFilter] = useState('All');
  const [openFms, setOpenFms] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const savedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const currentTenantId = tenantId || localStorage.getItem('tenantId') || savedUser?.tenantId;

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/tasks/review-analytics/${currentTenantId}`, { params: range ? { from: range.from, to: range.to, view: 'Custom' } : { date: refDate, view: 'Weekly' } });
      setReport(Array.isArray(res.data?.report) ? res.data.report : []);
      setConfig(res.data?.config || null);
      if (res.data?.config?.dynamicColors) {
        setStoredDynamicColors(res.data.config.dynamicColors);
      }
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
    const istYmd = (iso) => (iso ? new Date(new Date(iso).getTime() + 330 * 60000).toISOString().split('T')[0] : '');
    const todayStr = new Date(Date.now() + 330 * 60000).toISOString().split('T')[0];
    const from = s || range?.from || istYmd(periodInfo?.startDate) || defaultWeekRange.from;
    const rawTo = e || range?.to || istYmd(periodInfo?.endDate) || defaultWeekRange.to;
    const to = (!range && !e && rawTo > todayStr) ? todayStr : rawTo;
    setStart(from); setEnd(to);
    if (!from || !to) { setRows([]); return; }
    try {
      setRowsLoading(true);
      const [deepRes, doerRes, chkRes, allChkRes] = await Promise.all([
        API.get(`/tasks/employee-deep-dive/${p.employeeId}`, {
          params: { startDate: `${from}T00:00:00.000+05:30`, endDate: `${to}T23:59:59.999+05:30` }
        }),
        API.get(`/tasks/doer/${p.employeeId}?includePassedOn=1`).catch(() => ({ data: [] })),
        API.get(`/tasks/checklist/${p.employeeId}?includeDone=1`).catch(() => ({ data: [] })),
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);

      const cleanName = (val) => {
        if (!val) return null;
        const s = String(val).trim();
        if (!s || /^[-–—―−\s]+$/.test(s) || s.toLowerCase() === 'unassigned' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
        return s;
      };

      const doerTasks = Array.isArray(doerRes.data) ? doerRes.data : (doerRes.data?.tasks || []);
      const doerTaskMap = new Map();
      doerTasks.forEach(dt => {
        if (dt) {
          const asg = cleanName(dt.assignerId?.name) || cleanName(dt.assignerName) || cleanName(dt.assignedBy) || null;
          if (dt._id && asg) doerTaskMap.set(String(dt._id), asg);
          const title = (dt.title || dt.taskName || '').toLowerCase().trim();
          if (title && asg) doerTaskMap.set(title, asg);
        }
      });

      const allChkTasks = Array.isArray(allChkRes?.data) ? allChkRes.data : (allChkRes?.data?.data || []);
      const chkTasks = Array.isArray(chkRes?.data) ? chkRes.data : (chkRes?.data?.data || []);
      const chkTaskMap = new Map();
      [...allChkTasks, ...chkTasks].forEach(ct => {
        if (ct) {
          // Following My Task table (toChecklistItem): i.createdBy?.name || i.assignerId?.name || 'Admin'
          const asg =
            cleanName(ct.createdBy?.name) ||
            cleanName(ct.assignerId?.name) ||
            cleanName(ct.assignerName) ||
            cleanName(ct.assignedBy) ||
            'Admin';
          if (ct._id && asg) chkTaskMap.set(String(ct._id), asg);
          const name = (ct.taskName || ct.title || '').toLowerCase().trim();
          if (name && asg) chkTaskMap.set(name, asg);
        }
      });

      const rawRows = Array.isArray(deepRes.data) ? deepRes.data : [];
      const mappedRows = rawRows.map(r => {
        let assignedBy = '—';
        const nameKey = (r.name || '').toLowerCase().trim();
        const rType = String(r.type || '').trim().toLowerCase();

        if (rType === 'delegation') {
          assignedBy =
            cleanName(doerTaskMap.get(String(r.id))) ||
            cleanName(nameKey ? doerTaskMap.get(nameKey) : null) ||
            cleanName(r.assignedBy) ||
            cleanName(r.assignerName) ||
            cleanName(r.assignerId?.name) ||
            '—';
        } else if (rType === 'checklist') {
          // Consistent with My Task checklist tab (toChecklistItem: i.createdBy?.name || i.assignerId?.name || 'Admin')
          assignedBy =
            cleanName(chkTaskMap.get(String(r.id))) ||
            cleanName(nameKey ? chkTaskMap.get(nameKey) : null) ||
            cleanName(r.assignedBy) ||
            cleanName(r.assignerName) ||
            cleanName(r.createdBy?.name) ||
            cleanName(r.assignerId?.name) ||
            'Admin';
        } else if (rType === 'fms') {
          assignedBy = cleanName(r.assignedBy) || 'System';
        } else {
          assignedBy = cleanName(r.assignedBy) || '—';
        }

        return {
          ...r,
          type: rType === 'delegation' ? 'Delegation' : rType === 'checklist' ? 'Checklist' : rType === 'fms' ? 'FMS' : (r.type || 'Delegation'),
          assignedBy,
          assignedTo: cleanName(r.assignedTo) || cleanName(active?.employeeName) || cleanName(p.employeeName) || '—'
        };
      });

      setRows(mappedRows);
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
    <td
      className={`${cellBase} font-black ${extra}`}
      style={getPctStyle(v, config?.dynamicColors)}
    >
      {fmtPct(v)}
    </td>
  );

  return (
    <div className="w-full max-w-[1900px] mx-auto pb-10 text-left">
      {/* ROW 1: TITLE + REFRESH */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="bg-primary p-2 sm:p-2.5 rounded-xl shrink-0 shadow-sm flex items-center justify-center">
            <Globe className="text-white w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 text-left">
            <h2 className="text-foreground text-lg sm:text-2xl font-black tracking-tight uppercase leading-tight whitespace-nowrap">
              {canEdit ? 'Review Meeting' : 'Global View'}
            </h2>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              {canEdit ? 'Live compliance ledger' : 'Read-Only Company Review Sheet'}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="group bg-card hover:bg-background border border-border px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-foreground font-black text-[9.5px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 shadow-sm shrink-0"
        >
          <RefreshCcw size={13} className="group-hover:rotate-180 transition-transform duration-700 text-primary shrink-0" />
          <span>Refresh</span>
        </button>
      </div>

      {/* ROW 2: PERIOD & DATE RANGE */}
      {periodInfo?.startDate && (() => {
        const displayEnd = (!range && new Date(periodInfo.endDate) > new Date()) ? new Date() : periodInfo.endDate;
        return (
          <div className="bg-card border border-border rounded-xl p-3 mb-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs font-black uppercase tracking-widest text-foreground">
                {PERIOD_LABELS[periodInfo.view] || periodInfo.view || 'Weekly'} &middot; {fmtDate(range ? range.from : periodInfo.startDate)} to {fmtDate(range ? range.to : displayEnd)}
              </div>
              {!range && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => { const d = neighbourDate(periodInfo, -1); if (d) setRefDate(d); }}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted active:scale-95 transition"
                  >
                    &larr; Previous
                  </button>
                  <button
                    onClick={() => setRefDate(new Date().toISOString().split('T')[0])}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted active:scale-95 transition"
                  >
                    Current
                  </button>
                  <button
                    onClick={() => { const d = neighbourDate(periodInfo, 1); if (d) setRefDate(d); }}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-black hover:bg-muted active:scale-95 transition"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2.5 border-t border-border">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">From</span>
                  <input
                    type="date"
                    value={fromDraft}
                    onChange={(e) => setFromDraft(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">To</span>
                  <input
                    type="date"
                    value={toDraft}
                    min={fromDraft || undefined}
                    onChange={(e) => setToDraft(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 sm:pt-0 sm:self-end">
                <button
                  onClick={() => setRange({ from: fromDraft, to: toDraft })}
                  disabled={!fromDraft || !toDraft || toDraft < fromDraft}
                  title={!fromDraft || !toDraft ? 'Pick both dates' : (toDraft < fromDraft ? 'The "to" date cannot be before the "from" date' : 'Show this date range')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
                >
                  Apply
                </button>
                {range && (
                  <button
                    onClick={() => {
                      const fresh = getCurrentWeekRange();
                      setRange(null);
                      setFromDraft(fresh.from);
                      setToDraft(fresh.to);
                    }}
                    className="px-3 py-2 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted active:scale-95 transition"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
            <div className="flex items-center gap-1.5 ml-1">
              <span style={getPctStyle(5, config?.dynamicColors)} className="px-2 py-0.5 rounded text-[9px] font-black">1–10%</span>
              <span style={getPctStyle(15, config?.dynamicColors)} className="px-2 py-0.5 rounded text-[9px] font-black">11–20%</span>
              <span style={getPctStyle(25, config?.dynamicColors)} className="px-2 py-0.5 rounded text-[9px] font-black">&ge; 21%</span>
            </div>
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
          <>
            {/* DESKTOP TABLE VIEW (> 768px) */}
            <div className="gv-desktop-table hidden md:block overflow-auto max-h-[calc(100vh-250px)]">
              <table className="w-full border-collapse text-[11px] min-w-[1250px]">
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
                      {canEdit && <PreviousCell prev={p.previous} dynamicColors={config?.dynamicColors} />}
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
            </div>

            {/* MOBILE CARD VIEW (<= 768px) */}
            <div className="gv-mobile-cards block md:hidden space-y-3 p-2.5 bg-muted/20">
              {people.map((p, i) => {
                const lateScore = Number(p.overall?.latePct) || 0;
                const stripeCls =
                  lateScore <= 10 ? 'border-l-emerald-500' :
                    lateScore <= 20 ? 'border-l-amber-500' :
                      'border-l-red-500';

                const scoreTone =
                  lateScore <= 10 ? 'bg-emerald-600 text-white' :
                    lateScore <= 20 ? 'bg-amber-500 text-white' :
                      'bg-red-500 text-white';

                return (
                  <div
                    key={String(p.employeeId)}
                    onClick={() => openAudit(p)}
                    className={`bg-card border border-border rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition cursor-pointer hover:border-primary/50 relative overflow-hidden border-l-4 ${stripeCls}`}
                  >
                    {/* Header: Employee Name, Dept/Loc, Late % badges */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-muted-foreground">#{i + 1}</span>
                          <h4 className="font-black text-sm uppercase text-foreground truncate">{p.employeeName}</h4>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
                          {[p.department, p.location].filter(Boolean).join(' · ') || 'No dept/location'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className={`inline-flex flex-col items-center leading-tight rounded-lg px-2.5 py-1 font-bold shadow-sm ${scoreTone}`}>
                          <span className="text-[10px] font-black uppercase">Late {fmtPct(lateScore)}</span>
                          <span className="text-[8.5px] font-semibold opacity-90">Not Done {fmtPct(p.overall?.notDonePct || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Target & Previous Period if canEdit */}
                    {canEdit && (
                      <div className="pl-1 mb-2.5 p-2 bg-muted/40 rounded-xl flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Late Target:</span>
                          <LateTargetInput value={p.weeklyLateTarget} onSave={(v) => saveTarget(p.employeeId, v)} />
                        </div>
                        {p.previous && (
                          <div className="text-[9px] font-bold flex items-center gap-1">
                            <span className="text-muted-foreground">Prev:</span>
                            <span>{p.previous.target}% &rarr;</span>
                            <span style={getPctStyle(p.previous.latePct || 0, config?.dynamicColors)} className="px-1 py-0.5 rounded">
                              {p.previous.hasTasks ? `${Number(p.previous.latePct).toFixed(1)}%` : 'no tasks'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Module breakdown (Delegation, Checklist, FMS) */}
                    <div className="pl-1 space-y-2">
                      {TYPES.map((t) => {
                        const k = KEYS[t];
                        const d = p[k] || EMPTY;
                        return (
                          <div key={t} className="rounded-xl border border-border/60 overflow-hidden text-[10px]">
                            <div className={`px-2.5 py-1 font-black uppercase flex items-center justify-between ${GROUP_STYLE[k].head}`}>
                              <span>{t}</span>
                              <span className="text-[9px] opacity-90">TOT: {d.total}</span>
                            </div>
                            <div className={`grid grid-cols-4 text-center divide-x divide-border/40 py-1.5 ${GROUP_STYLE[k].sub}`}>
                              <div title="On Time Done">
                                <div className="text-[8.5px] font-black uppercase tracking-tight opacity-75">OT</div>
                                <div className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">{d.onTimeDone}</div>
                              </div>
                              <div title="Late Done">
                                <div className="text-[8.5px] font-black uppercase tracking-tight opacity-75">LD</div>
                                <div className={`font-bold text-[11px] ${d.lateDone > 0 ? 'text-amber-600 font-black' : ''}`}>{d.lateDone}</div>
                              </div>
                              <div title="Pending (On Time)">
                                <div className="text-[8.5px] font-black uppercase tracking-tight opacity-75">PO</div>
                                <div className="font-bold text-[11px]">{d.pendingOnTime}</div>
                              </div>
                              <div title="Late Pending">
                                <div className="text-[8.5px] font-black uppercase tracking-tight opacity-75">LP</div>
                                <div className={`font-bold text-[11px] ${d.latePending > 0 ? 'text-red-600 font-black' : ''}`}>{d.latePending}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom row: Tap hint */}
                    <div className="pl-1 mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                      <span>View Task Audit Details</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                );
              })}
              {people.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold text-sm bg-card border border-border rounded-xl">
                  No people match
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* AUDIT SHEET */}
      {active && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-3">
          <div className="absolute inset-0" onClick={() => setActive(null)} />
          <div className="relative w-full max-w-full h-full sm:max-w-[98vw] sm:h-[95vh] bg-card rounded-none sm:rounded-2xl border-0 sm:border border-border shadow-2xl flex flex-col overflow-hidden">
            <div className="flex flex-col gap-2.5 px-3.5 sm:px-5 py-3 border-b border-border bg-background">
              {/* Row 1: Employee info + Close button */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-black uppercase leading-tight truncate text-foreground">{active.employeeName}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
                    {[active.department, active.location].filter(Boolean).join(' · ') || 'No department / location'}
                  </p>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition shrink-0"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Row 2: Date filter bar - perfectly responsive, inputs never get cut off */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2 border-t border-border/60">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">From Date</span>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">To Date</span>
                    <input
                      type="date"
                      value={end}
                      min={start || undefined}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => openAudit(active, start, end)}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition shadow-sm shrink-0 flex items-center justify-center gap-1.5"
                >
                  Run Filter
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-5 py-2.5 border-b border-border flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
                {['All', ...TYPES].map((f) => {
                  const n = f === 'All' ? rows.length : rows.filter((r) => r.type === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setTypeFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition active:scale-95 text-center ${typeFilter === f
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-card text-slate-500 border-border hover:text-foreground'
                        }`}
                    >
                      {f} ({n})
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  ['Total', counts.total, 'bg-muted text-foreground'],
                  ['Done on time', counts.onTimeDone, BUCKET_CLASS.onTimeDone],
                  ['Late done', counts.lateDone, BUCKET_CLASS.lateDone],
                  ['Pending', counts.pendingOnTime, BUCKET_CLASS.pendingOnTime],
                  ['Late pending', counts.latePending, BUCKET_CLASS.latePending]
                ].map(([label, v, cls]) => (
                  <span key={label} className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${cls}`}>{label}: {v}</span>
                ))}
                <span style={getPctStyle(counts.latePct, config?.dynamicColors)} className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider">Late {fmtPct(counts.latePct)}</span>
                <span style={getPctStyle(counts.notDonePct, config?.dynamicColors)} className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider">Not done {fmtPct(counts.notDonePct)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {rowsLoading ? (
                <div className="py-24 text-center text-slate-400 font-bold text-sm">Loading...</div>
              ) : shownRows.length === 0 ? (
                <div className="py-24 text-center text-slate-400 font-bold text-sm">No tasks in this range</div>
              ) : (
                <>
                  {/* DESKTOP TABLE VIEW (> 768px) */}
                  <div className="hidden md:block overflow-auto">
                    <table className="w-full border-collapse text-[11px] min-w-[1100px]">
                      <thead className="sticky top-0 z-20 bg-background">
                        <tr className="text-[10px] font-black uppercase tracking-wider">
                          {['S.no', 'Type', 'Task', 'Assigned By', 'Assigned To', 'Deadline', 'Completed', 'Drift', 'Status', ...(canEdit ? ['Action'] : [])].map((h) => (
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
                              <tr
                                className="odd:bg-background/40 cursor-pointer hover:bg-primary/10 transition-colors"
                                onClick={() => setSelectedTask(r)}
                                title="Click to view complete task details & journey"
                              >
                                <td className="border border-border px-2 py-1 text-slate-400 text-center w-10">{i + 1}</td>
                                <td className="border border-border px-2 py-1 font-black uppercase text-[10px] w-24">{r.type}</td>
                                <td className="border border-border px-2 py-1 font-bold">
                                  <span className="inline-flex items-center gap-1">
                                    {isFms && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenFms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
                                        }}
                                        className="p-0.5 hover:bg-muted rounded text-slate-400 hover:text-foreground"
                                        title={open ? 'Collapse steps' : 'Expand steps'}
                                      >
                                        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                      </button>
                                    )}
                                    {r.name}
                                  </span>
                                </td>
                                <td className="border border-border px-2 py-1 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  {r.assignedBy || '—'}
                                </td>
                                <td className="border border-border px-2 py-1 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{r.assignedTo || active?.employeeName || '—'}</td>
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
                                  <td colSpan={canEdit ? 10 : 9} className="border border-border bg-muted/40 px-4 py-2">
                                    {f.steps.length === 0 && !f.pendingStep && <span className="text-slate-400 font-bold">No steps yet.</span>}
                                    {f.steps.length > 0 && (
                                      <table className="w-full border-collapse text-[11px] mb-2">
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
                  </div>

                  {/* MOBILE CARD VIEW (<= 768px) - MATCHES MANAGE DELEGATION CARD LAYOUT */}
                  <div className="block md:hidden overflow-y-auto space-y-3 p-2.5 bg-muted/20">
                    {shownRows.map((r, i) => {
                      const b = bucketOf(r);
                      const key = `mob-${r.id}-${i}`;
                      const isFms = r.type === 'FMS';
                      const open = openFms.includes(key);
                      const f = r.fms || { steps: [], pendingStep: null };

                      // Border stripe matching status tone
                      const stripeColor =
                        b === 'onTimeDone' ? 'border-l-emerald-500' :
                          b === 'lateDone' ? 'border-l-amber-500' :
                            b === 'latePending' ? 'border-l-red-500' :
                              'border-l-sky-500';

                      // Deadline pill tone
                      const deadlineTone =
                        b === 'onTimeDone' || b === 'lateDone' ? 'bg-emerald-600' :
                          b === 'latePending' ? 'bg-red-500' :
                            'bg-amber-500';

                      // Status badge pill tone
                      const statusBadgeCls =
                        b === 'onTimeDone' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                          b === 'lateDone' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                            b === 'latePending' ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-black' :
                              'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30';

                      const typeBadgeCls =
                        r.type === 'Delegation' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30' :
                          r.type === 'Checklist' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30' :
                            'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30';

                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedTask(r)}
                          className={`bg-card border border-border rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition cursor-pointer hover:border-primary/50 relative overflow-hidden border-l-4 ${stripeColor}`}
                        >
                          {/* ROW 1: [Left: Status Badge Pill] [Right: Deadline Badge Pill] */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${statusBadgeCls}`}>
                              {BUCKET_LABEL[b]}
                            </span>
                            <div className={`inline-flex flex-col items-center leading-tight rounded-lg px-2.5 py-1 text-white font-bold shadow-sm shrink-0 ${deadlineTone}`}>
                              <span className="text-[10.5px] font-black">{fmtDate(r.deadline)}</span>
                              {r.deadline && (() => {
                                const dt = new Date(r.deadline);
                                const hasTime = dt.getHours() !== 0 || dt.getMinutes() !== 0;
                                return hasTime ? (
                                  <span className="text-[9px] font-semibold opacity-90">
                                    {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          {/* ROW 2: Task Name + Type Badge */}
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${typeBadgeCls}`}>
                                {r.type}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${DRIFT_TONE[driftTone(r.deadline, r.completedAt, driftBands)]}`}>
                                {drift(r.deadline, r.completedAt)}
                              </span>
                            </div>
                            <h4 className="font-black text-sm uppercase text-foreground leading-snug break-words">
                              {r.name}
                            </h4>
                          </div>

                          {/* ROW 3: Description / Remarks in italics */}
                          {(r.remarks || r.description) && (
                            <p className="text-xs text-foreground/80 italic mb-2 break-words">
                              {r.remarks || r.description}
                            </p>
                          )}

                          {/* ROW 4 & 5: GIVEN BY & ASSIGNED TO */}
                          <div className="space-y-1 text-xs mb-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground shrink-0">GIVEN BY:</span>
                              <span className="font-bold text-foreground break-words">{r.assignedBy || '—'}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground shrink-0">ASSIGNED TO:</span>
                              <span className="font-bold text-foreground break-words">{r.assignedTo || active?.employeeName || '—'}</span>
                            </div>
                            {r.completedAt && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground shrink-0">COMPLETED:</span>
                                <span className="font-bold text-foreground">{fmtDateTime(r.completedAt)}</span>
                              </div>
                            )}
                          </div>

                          {/* FMS Steps Accordion if FMS */}
                          {isFms && f.steps.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setOpenFms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]))}
                                className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1 hover:underline"
                              >
                                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {open ? 'Hide FMS Steps' : `View FMS Steps (${f.steps.length})`}
                              </button>
                              {open && (
                                <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/30">
                                  {f.steps.map((st, j) => (
                                    <div key={j} className="text-[10.5px] p-1.5 rounded-lg bg-muted/40">
                                      <div className="font-black text-foreground">{st.nodeName}{st.mine && <span className="ml-1 text-[8.5px] text-primary uppercase">(this person)</span>}</div>
                                      <div className="text-slate-500 font-bold">{st.completedByName || st.assignedToName || '—'} · {fmtDateTime(st.completedAt || st.plannedDeadline)}</div>
                                      <div className={`font-black ${st.onTime ? 'text-emerald-600' : 'text-red-500'}`}>{st.onTime ? 'On time' : 'Late'}{st.decision ? ` · ${st.decision}` : ''}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* BOTTOM ROW: Tap hint & Actions */}
                          <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                            <span className="text-primary flex items-center gap-1">
                              View Task Details & Journey <span>&rarr;</span>
                            </span>
                            {canEdit && r.type !== 'FMS' && (
                              <button
                                type="button"
                                title={r.type === 'Checklist' ? 'Delete this whole checklist task' : 'Delete this task'}
                                onClick={(e) => { e.stopPropagation(); deleteRecord(r); }}
                                className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAILS POPUP */}
      {selectedTask && (
        <TaskDetailsModal
          taskId={selectedTask.id}
          taskType={selectedTask.type}
          instanceDate={selectedTask.deadline}
          fallbackRow={selectedTask}
          dynamicColors={config?.dynamicColors}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default GlobalView;
