import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, FileSpreadsheet, CalendarRange, Users, ListChecks, Layers, RotateCcw, Search, Check } from 'lucide-react';
import API from '../api/axiosConfig';
import { dialog } from './Dialog';

/**
 * "Download" button + window for the Excel reports.
 *   scope: 'delegation' | 'checklist' | 'mytasks'  -> task reports (backend: /reports/excel/tasks)
 *          'employees'                              -> Manage Employee report (backend: /reports/excel/employees)
 *
 * Which records go into the file (the window offers three, like the table):
 *   All records            -> everything the page covers
 *   Shown in the table now -> exactly the rows the table lists after the page's search / filters (needs getRows)
 *   Selected               -> the rows ticked in the table (selectedIds, My Tasks) or picked inside the window (other pages)
 * Extra filters inside the window (status, doer, assigned by, period) narrow whichever of the three is chosen.
 * The number of records is asked from the server before downloading, so what you see is what the file holds.
 *
 * Props
 *   getRows()        -> [{ id, label, sub }] the rows the table shows right now (id = task id; checklist day rows: `${id}|${day}`)
 *   filtersActive    -> true when the table has a search / filter / tab applied
 *   onClearFilters() -> the page's own way of clearing its search and filters
 *   selectedIds      -> ids ticked in the page's own table (omit when the page has no tick boxes: the window then offers a picker)
 * Read-only: it only asks the server for a file; nothing on the page or in the data changes.
 */
const TASK_TYPES = [
  { key: 'complete', label: 'Complete Report', hint: 'Every sheet: schedule, task details, status, workload, people, summary and date-wise records', Icon: Layers },
  { key: 'datewise', label: 'Date-wise Report', hint: 'What was completed and what was missed on each date', Icon: CalendarRange },
  { key: 'employeewise', label: 'Employee-wise Report', hint: 'How much work each employee / doer has, and how much is done', Icon: Users },
  { key: 'taskwise', label: 'Task-wise Report', hint: 'Every task with its status, plus totals', Icon: ListChecks }
];
const TITLE = { delegation: 'Manage Delegation', checklist: 'Manage Checklist', mytasks: 'My Tasks', employees: 'Manage Employee' };
const STATUS_OPTIONS = ['Completed', 'Pending', 'Overdue'];
const PICK_LIMIT = 300;
const NO_ROWS = [];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const PRESETS = [
  ['Today', () => { const t = new Date(); return [ymd(t), ymd(t)]; }],
  ['Last 7 days', () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 6); return [ymd(f), ymd(t)]; }],
  ['This month', () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(t)]; }],
  ['Last month', () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), ymd(new Date(t.getFullYear(), t.getMonth(), 0))]; }],
  ['This year', () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), 0, 1)), ymd(t)]; }]
];

const inp = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20';
const PLAIN = { 'Content-Type': 'text/plain;charset=UTF-8' };   // JSON sent as text so a long id list is not stopped by the 100 KB JSON limit

export default function ExcelReportButton({ scope, tenantId, className = '', compact = false, getRows, filtersActive = false, onClearFilters, selectedIds }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('complete');
  const [choice, setChoice] = useState('all');          // 'all' | 'filtered' | 'selected'
  const [rangeMode, setRangeMode] = useState('all');    // 'all' | 'range'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [assignerId, setAssignerId] = useState('');
  const [status, setStatus] = useState('');
  const [people, setPeople] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [pickSearch, setPickSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState({ loading: false, data: null, error: '' });
  const countToken = useRef(0);

  const isEmployees = scope === 'employees';
  const showPeople = scope !== 'mytasks';
  const showAssigner = scope === 'delegation' || scope === 'checklist';
  const hasTableTicks = Array.isArray(selectedIds);
  const tid = tenantId || localStorage.getItem('tenantId');

  // The rows the table lists right now (read fresh while the window is open, so the file always matches the table)
  const rows = open && typeof getRows === 'function' ? getRows() : NO_ROWS;
  const rowsSig = `${rows.length}|${rows.length ? rows[0].id : ''}|${rows.length ? rows[rows.length - 1].id : ''}`;
  const tickSig = hasTableTicks ? selectedIds.join(',') : '';

  // Start each opening on the most useful choice: what the table shows if it is filtered, otherwise everything
  const openWindow = () => {
    setChoice(filtersActive && typeof getRows === 'function' ? 'filtered' : 'all');
    setPicked(new Set());
    setPickSearch('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !(showPeople || showAssigner) || people.length || !tid) return;
    let live = true;
    API.get(`/tasks/employees/${tid}`, { params: { limit: 500 } })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.employees || r.data?.data || []);
        if (live) setPeople([...list].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      })
      .catch(() => { /* the list stays empty: "All employees" still works */ });
    return () => { live = false; };
  }, [open, showPeople, showAssigner, people.length, tid]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy]);

  const rangeBad = useMemo(() => {
    if (isEmployees || rangeMode !== 'range') return '';
    if (!from || !to) return 'Choose both dates.';
    if (to < from) return 'The "to" date cannot be before the "from" date.';
    return '';
  }, [isEmployees, rangeMode, from, to]);

  const chosenIds = () => {
    if (choice === 'filtered') return rows.map((r) => r.id);
    if (choice === 'selected') return hasTableTicks ? selectedIds : [...picked];
    return undefined;
  };
  const selectedCount = hasTableTicks ? selectedIds.length : picked.size;
  const nothingChosen = (choice === 'filtered' && rows.length === 0) || (choice === 'selected' && selectedCount === 0);

  const payload = (extra = {}) => {
    const body = { ...extra };
    if (!isEmployees) { body.scope = scope; body.type = type; }
    if (employeeId && showPeople) body.employeeId = employeeId;
    if (assignerId && showAssigner) body.assignerId = assignerId;
    if (!isEmployees && status) body.status = status;
    if (!isEmployees && rangeMode === 'range') { body.from = from; body.to = to; }
    const ids = chosenIds();
    if (ids) body.ids = ids;
    return body;
  };
  const endpoint = isEmployees ? '/reports/excel/employees' : '/reports/excel/tasks';

  // How many records the file will hold (asked from the server, same rules as the file itself)
  const sig = `${open}|${scope}|${type}|${choice}|${status}|${employeeId}|${assignerId}|${rangeMode}|${from}|${to}|${rowsSig}|${tickSig}|${picked.size}`;
  useEffect(() => {
    if (!open) return undefined;
    if (rangeBad) { setCount({ loading: false, data: null, error: '' }); return undefined; }
    if (nothingChosen) { setCount({ loading: false, data: { tasks: 0, entries: 0, overdue: 0, employees: 0 }, error: '' }); return undefined; }
    const token = ++countToken.current;
    setCount((c) => ({ ...c, loading: true, error: '' }));
    const t = setTimeout(async () => {
      try {
        const res = await API.post(endpoint, JSON.stringify(payload({ count: '1' })), { headers: PLAIN });
        if (token === countToken.current) setCount({ loading: false, data: res.data || null, error: '' });
      } catch (err) {
        if (token === countToken.current) setCount({ loading: false, data: null, error: err?.response?.data?.message || 'Could not count the records.' });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, rangeBad, nothingChosen]);

  const records = count.data ? (isEmployees ? count.data.employees : count.data.tasks) : null;
  const download = async () => {
    if (busy || rangeBad || nothingChosen) return;
    setBusy(true);
    try {
      const res = await API.post(endpoint, JSON.stringify(payload()), { headers: PLAIN, responseType: 'blob' });
      const ctype = res.data?.type || '';
      if (ctype.includes('json') || ctype.startsWith('text/')) throw Object.assign(new Error('The server did not send a spreadsheet.'), { response: { data: res.data } });
      const cd = res.headers?.['content-disposition'] || '';
      const m = /filename="?([^";]+)"?/i.exec(cd);
      const name = m ? m[1] : `WorkPilot_${TITLE[scope].replace(/\s+/g, '')}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      let reason = '';
      try {
        const d = err?.response?.data;
        if (d && typeof d.text === 'function') { const t = await d.text(); try { reason = JSON.parse(t).message || t.slice(0, 200); } catch { reason = t.slice(0, 200); } }
        else if (d?.message) reason = d.message;
      } catch { /* generic text below */ }
      await dialog.alert('Could not download the report.\n' + (reason || err?.message || 'Please try again.'), { tone: 'error', title: 'Download failed' });
    } finally {
      setBusy(false);
    }
  };

  const resetWindowFilters = () => {
    setStatus(''); setEmployeeId(''); setAssignerId(''); setRangeMode('all'); setFrom(''); setTo('');
    setPicked(new Set()); setPickSearch('');
    setChoice('all');
  };
  const windowFiltersOn = !!(status || employeeId || assignerId || rangeMode === 'range');
  const clearTableFilters = () => { if (typeof onClearFilters === 'function') onClearFilters(); setChoice('all'); };

  const personLabel = (p) => `${p.name}${p.department ? ` (${p.department})` : ''}`;
  const canFilter = typeof getRows === 'function';
  const pickRows = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.label} ${r.sub || ''}`.toLowerCase().includes(q)) : rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsSig, pickSearch]);
  const togglePick = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = pickRows.length > 0 && pickRows.every((r) => picked.has(r.id));
  const togglePickAll = () => setPicked((s) => { const n = new Set(s); if (pickRows.every((r) => n.has(r.id))) pickRows.forEach((r) => n.delete(r.id)); else pickRows.forEach((r) => n.add(r.id)); return n; });

  const Choice = ({ value, title, hint, disabled, extra }) => (
    <button type="button" disabled={disabled} onClick={() => setChoice(value)} data-testid={`excel-choice-${value}`}
      className={`text-left rounded-xl border px-3 py-2.5 transition-all disabled:opacity-45 disabled:cursor-not-allowed ${choice === value ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-background hover:border-primary/40'}`}>
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-tight">
        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${choice === value ? 'border-primary bg-primary' : 'border-slate-400'}`}>{choice === value && <Check size={9} className="text-primary-foreground" />}</span>
        {title}{extra}
      </span>
      <span className="block text-[10px] text-slate-500 mt-1 leading-snug">{hint}</span>
    </button>
  );

  return (
    <>
      <button type="button" onClick={openWindow} data-testid="excel-download"
        className={`group flex items-center justify-center gap-2 bg-card hover:bg-background border border-border px-4 py-2 rounded-xl text-foreground font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${className}`}
        title="Download an Excel report">
        <Download size={compact ? 12 : 14} className="text-primary" /> Download
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Download Excel report" data-testid="excel-dialog"
            className="no-auto-sheet w-full max-w-lg max-h-[92vh] overflow-y-auto bg-card text-foreground border border-border rounded-2xl shadow-2xl">
            <div className="flex items-start gap-3 px-5 pt-5">
              <div className="w-10 h-10 shrink-0 rounded-xl border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center justify-center"><FileSpreadsheet size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black uppercase tracking-tight">Download Excel report</p>
                <p className="text-xs text-slate-500 mt-0.5">{TITLE[scope]}{isEmployees ? ': employee details and doer allocation' : ''}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => !busy && setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-slate-400"><X size={14} /></button>
            </div>

            <div className="px-5 pt-4 pb-1 space-y-4">
              {/* 1. Which records */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Which records</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Choice value="all" title="All" hint={isEmployees ? 'Every employee' : 'Everything this page covers'} />
                  <Choice value="filtered" title="Shown now" disabled={!canFilter || !filtersActive}
                    extra={canFilter && filtersActive ? <span className="ml-auto text-[10px] text-primary font-black normal-case">{rows.length}</span> : null}
                    hint={!canFilter || !filtersActive ? 'Search or filter the table first, then download only what it shows' : `Only the ${rows.length} row${rows.length === 1 ? '' : 's'} in the table after your search / filters`} />
                  <Choice value="selected" title="Selected" disabled={hasTableTicks && selectedIds.length === 0}
                    extra={selectedCount > 0 ? <span className="ml-auto text-[10px] text-primary font-black normal-case">{selectedCount}</span> : null}
                    hint={hasTableTicks ? (selectedIds.length ? `Only the ${selectedIds.length} row${selectedIds.length === 1 ? '' : 's'} you ticked` : 'Tick rows in the table first') : 'Pick the rows you want below'} />
                </div>
                {filtersActive && typeof onClearFilters === 'function' && (
                  <button type="button" onClick={clearTableFilters} data-testid="excel-clear-table"
                    className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-primary">
                    <RotateCcw size={11} /> Clear the table's search &amp; filters
                  </button>
                )}

                {choice === 'selected' && !hasTableTicks && (
                  <div className="mt-3 rounded-xl border border-border bg-background" data-testid="excel-picker">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                      <Search size={13} className="text-slate-400 shrink-0" />
                      <input value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Search these rows…" className="flex-1 min-w-0 bg-transparent text-xs font-semibold outline-none" />
                      <button type="button" onClick={togglePickAll} className="text-[10px] font-black uppercase tracking-wider text-primary shrink-0">{allPicked ? 'Untick all' : 'Tick all'}</button>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-border">
                      {pickRows.length === 0 && <p className="px-3 py-3 text-[11px] text-slate-500">No rows to pick.</p>}
                      {pickRows.slice(0, PICK_LIMIT).map((r) => (
                        <label key={r.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50">
                          <input type="checkbox" checked={picked.has(r.id)} onChange={() => togglePick(r.id)} className="mt-0.5 w-4 h-4 accent-[hsl(var(--primary))] shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-xs font-bold truncate">{r.label}</span>
                            {r.sub && <span className="block text-[10px] text-slate-500 truncate">{r.sub}</span>}
                          </span>
                        </label>
                      ))}
                      {pickRows.length > PICK_LIMIT && <p className="px-3 py-2 text-[10px] text-slate-500">Showing the first {PICK_LIMIT} of {pickRows.length}. Use the search above to find the rest, or "Tick all" to take all {pickRows.length}.</p>}
                    </div>
                  </div>
                )}
              </div>

              {!isEmployees && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">What to download</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TASK_TYPES.map(({ key, label, hint, Icon }) => (
                      <button key={key} type="button" onClick={() => setType(key)} data-testid={`excel-type-${key}`}
                        className={`text-left rounded-xl border px-3 py-2.5 transition-all ${type === key ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-background hover:border-primary/40'}`}>
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-tight"><Icon size={13} className="text-primary shrink-0" />{label}</span>
                        <span className="block text-[10px] text-slate-500 mt-1 leading-snug">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Extra filters */}
              {!isEmployees && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filters (optional)</p>
                    {(windowFiltersOn || choice !== 'all') && (
                      <button type="button" onClick={resetWindowFilters} data-testid="excel-reset" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-primary"><RotateCcw size={11} /> Reset</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Task status
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inp} mt-1 normal-case tracking-normal`} data-testid="excel-status">
                        <option value="">All statuses</option>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    {showPeople && (
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Doer
                        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`${inp} mt-1 normal-case tracking-normal`} data-testid="excel-employee">
                          <option value="">All doers</option>
                          {people.map((p) => <option key={p._id} value={p._id}>{personLabel(p)}</option>)}
                        </select>
                      </label>
                    )}
                    {showAssigner && (
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned by
                        <select value={assignerId} onChange={(e) => setAssignerId(e.target.value)} className={`${inp} mt-1 normal-case tracking-normal`} data-testid="excel-assigner">
                          <option value="">Anyone</option>
                          {people.map((p) => <option key={p._id} value={p._id}>{personLabel(p)}</option>)}
                        </select>
                      </label>
                    )}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-3 mb-2">Period</p>
                  <div className="flex gap-2 mb-2">
                    {[['all', 'Complete history'], ['range', 'Choose dates']].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setRangeMode(k)} data-testid={`excel-range-${k}`}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider ${rangeMode === k ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-slate-500 hover:border-primary/40'}`}>{l}</button>
                    ))}
                  </div>
                  {rangeMode === 'range' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">From
                          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${inp} mt-1 normal-case tracking-normal`} data-testid="excel-from" />
                        </label>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">To
                          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${inp} mt-1 normal-case tracking-normal`} data-testid="excel-to" />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESETS.map(([l, fn]) => (
                          <button key={l} type="button" onClick={() => { const [f, t] = fn(); setFrom(f); setTo(t); }} className="px-2.5 py-1 rounded-lg border border-border bg-background text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-foreground hover:border-primary/40">{l}</button>
                        ))}
                      </div>
                      {rangeBad && <p className="text-[11px] text-red-500 font-semibold">{rangeBad}</p>}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2 leading-snug">
                    {rangeMode === 'all'
                      ? 'All history, plus the next 30 days of schedule.'
                      : scope === 'checklist' || scope === 'mytasks'
                        ? 'Includes tasks given, due or completed in these dates, and checklist days scheduled in these dates.'
                        : 'Includes tasks given, due or completed in these dates.'}
                  </p>
                </div>
              )}
              {scope === 'mytasks' && <p className="text-[10px] text-slate-500 leading-snug">This report is about your own checklist and delegation tasks. Work-flow (FMS) steps are not part of it.</p>}
            </div>

            {/* 3. Count + buttons */}
            <div className="px-5 pt-3">
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${nothingChosen || records === 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-border bg-background text-foreground'}`} data-testid="excel-count" aria-live="polite">
                {rangeBad ? 'Choose the dates to see how many records will be included.'
                  : count.error ? count.error
                    : count.loading && !count.data ? 'Counting records…'
                      : nothingChosen ? (choice === 'selected' ? 'No rows selected yet.' : 'The table shows no rows.')
                        : records === null ? '—'
                          : records === 0 ? 'No records match. Change the filters to include some.'
                            : isEmployees
                              ? <><span className="font-black">{records}</span> employee{records === 1 ? '' : 's'} will be included{count.loading ? ' …' : ''}</>
                              : <><span className="font-black">{records}</span> task{records === 1 ? '' : 's'} will be included
                                {count.data.entries !== records ? <span className="text-slate-500"> · {count.data.entries} schedule entries</span> : null}
                                {count.data.overdue > 0 ? <span className="text-red-500"> · {count.data.overdue} overdue</span> : null}{count.loading ? ' …' : ''}</>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-border bg-card text-foreground font-black text-[11px] uppercase tracking-wider hover:bg-background disabled:opacity-50">Cancel</button>
              <button type="button" disabled={busy || !!rangeBad || nothingChosen || records === 0 || !!count.error} onClick={download} data-testid="excel-go"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-wider hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
                <Download size={14} /> {busy ? 'Preparing…' : 'Download Excel'}
              </button>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}
