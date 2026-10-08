import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import {
  BarChart3,
  RefreshCcw,
  Search,
  Calendar,
  ChevronRight,
  X,
  User,
  ArrowUpRight,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * WEEKLY REVIEW MEETING v4.0
 * One row per person (Delegation + Checklist + FMS combined).
 * LATE TARGET / ACTUAL LATE / NOT DONE are averages of the three task types
 * (a type with no tasks counts as 0%).
 * Detail view: filter All / Delegation / Checklist / FMS.
 */
const EMPTY = { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 };
const TYPES = ['Delegation', 'Checklist', 'FMS'];

const pct = (count, total) => (total ? (count / total) * 100 : 0);
const fmtPct = (n) => `${n.toFixed(2)}%`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const statusClass = (status) =>
  status === 'OVERDUE' || status === 'MISSING'
    ? 'bg-red-500 text-white'
    : status === 'LATE'
    ? 'bg-yellow-400 text-black'
    : status === 'PENDING'
    ? 'bg-slate-200 text-slate-700'
    : 'bg-green-500 text-white';

const ReviewMeeting = ({ tenantId }) => {
  const [viewType] = useState('All');
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & deep-dive state
  const [showModal, setShowModal] = useState(false);
  const [activePerson, setActivePerson] = useState(null);
  const [deepDiveData, setDeepDiveData] = useState([]);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [activeWeekIndex, setActiveWeekIndex] = useState(null);
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [detailFilter, setDetailFilter] = useState('All'); // All | Delegation | Checklist | FMS
  const [expandedChecklistIds, setExpandedChecklistIds] = useState([]);
  const [expandedFmsIds, setExpandedFmsIds] = useState([]);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const isAdmin = user.roles?.includes('Admin') || user.role === 'Admin';

  const fetchAnalytics = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/review-analytics/${currentTenantId}`, {
        params: { view: viewType, date: selectedDate }
      });
      setReportData(res.data?.report || []);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, viewType, selectedDate, isAdmin]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const fetchTaskDetails = async (employeeId, start, end, index = null) => {
    if (!employeeId || !start || !end) return;
    try {
      setLoadingDeepDive(true);
      setActiveWeekIndex(index);
      setModalStartDate(start.split('T')[0]);
      setModalEndDate(end.split('T')[0]);
      const res = await API.get(`/tasks/employee-deep-dive/${employeeId}`, {
        params: { startDate: start, endDate: end }
      });
      setDeepDiveData(res.data || []);
    } catch (err) {
      console.error('Deep Dive Error:', err);
    } finally {
      setLoadingDeepDive(false);
    }
  };

  const deleteTaskRecord = async (taskId, type) => {
    if (!window.confirm('CRITICAL: Purge this record?')) return;
    try {
      const endpoint = type === 'Checklist' ? `/tasks/checklist/${taskId}` : `/tasks/task/${taskId}`;
      await API.delete(endpoint);
      fetchTaskDetails(activePerson.employeeId, modalStartDate, modalEndDate, activeWeekIndex);
      fetchAnalytics();
    } catch (err) {
      alert('Purge failed.');
    }
  };

  const saveTarget = async (employeeId, targetVal) => {
    try {
      await API.put('/tasks/update-weekly-target', { employeeId, target: targetVal });
      fetchAnalytics();
    } catch (err) {
      console.error('Sync Failed');
    }
  };

  const calculateDelay = (deadline, completedAt) => {
    const d1 = new Date(deadline);
    const now = new Date();
    if (completedAt) {
      const diff = Math.floor((new Date(completedAt) - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? `${diff} Days Late` : 'On-Time';
    }
    const diff = Math.floor((now - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} Days OVERDUE (Missing)` : 'Future Target';
  };

  // ONE row per person
  const summaryRows = useMemo(() => {
    const map = {};
    const q = searchTerm.toLowerCase();
    reportData.forEach((item) => {
      const name = item.employeeName || '';
      if (!(name.toLowerCase().includes(q) || (item.department || '').toLowerCase().includes(q))) return;
      const key = String(item.employeeId || name);
      if (!map[key]) {
        map[key] = {
          key,
          employeeId: item.employeeId,
          name,
          dept: item.department || 'GENERAL',
          lateTarget: item.weeklyLateTarget || 20,
          delegation: { ...EMPTY },
          checklist: { ...EMPTY },
          fms: { ...EMPTY },
          history: []
        };
      }
      const p = map[key];
      p.history.push({
        period: item.periodName || 'Current',
        dates: { start: item.periodStart, end: item.periodEnd }
      });
      ['delegation', 'checklist', 'fms'].forEach((k) => {
        const s = item[k];
        if (!s) return;
        Object.keys(EMPTY).forEach((f) => {
          p[k][f] += s[f] || 0;
        });
      });
    });

    return Object.values(map).map((p) => {
      p.history.sort((a, b) => b.period.localeCompare(a.period));
      const parts = [p.delegation, p.checklist, p.fms];
      const avgLate = parts.reduce((sum, s) => sum + pct(s.late, s.total), 0) / 3;
      const avgNotDone = parts.reduce((sum, s) => sum + pct(s.notDone, s.total), 0) / 3;
      const notDoneCount = parts.reduce((sum, s) => sum + s.notDone, 0);
      return { ...p, avgLate, avgNotDone, notDoneCount };
    });
  }, [reportData, searchTerm]);

  const openHistoryModal = (row) => {
    setActivePerson(row);
    setDeepDiveData([]);
    setDetailFilter('All');
    setExpandedChecklistIds([]);
    setExpandedFmsIds([]);
    setShowModal(true);
    if (row.history.length > 0 && row.history[0].dates.start && row.history[0].dates.end) {
      fetchTaskDetails(row.employeeId, row.history[0].dates.start, row.history[0].dates.end, 0);
    }
  };

  const rowsOfType = useMemo(
    () => ({
      Delegation: deepDiveData.filter((t) => t.type === 'Delegation'),
      Checklist: deepDiveData.filter((t) => t.type === 'Checklist'),
      FMS: deepDiveData.filter((t) => t.type === 'FMS')
    }),
    [deepDiveData]
  );

  const groupedChecklist = useMemo(() => {
    const map = {};
    rowsOfType.Checklist.forEach((item) => {
      if (!map[item.id]) map[item.id] = { taskName: item.name, instances: [] };
      map[item.id].instances.push(item);
    });
    return Object.entries(map);
  }, [rowsOfType]);

  // Stats strip for whatever filter is selected
  const auditStats = useMemo(() => {
    const rows = detailFilter === 'All' ? deepDiveData : rowsOfType[detailFilter] || [];
    const total = rows.length;
    const done = rows.filter((r) =>
      r.type === 'FMS' ? r.fms?.instanceStatus === 'completed' : !!r.completedAt
    ).length;
    const overdue = rows.filter((r) => r.status === 'OVERDUE').length;
    return { total, done, overdue, notDone: total - done };
  }, [deepDiveData, rowsOfType, detailFilter]);

  const show = (type) => detailFilter === 'All' || detailFilter === type;

  const toggle = (setter) => (id) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleChecklist = toggle(setExpandedChecklistIds);
  const toggleFms = toggle(setExpandedFmsIds);

  if (!isAdmin)
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="bg-card p-12 rounded-[3rem] border-2 border-border shadow-2xl flex flex-col items-center text-center max-w-lg space-y-6">
          <div className="bg-red-50 p-6 rounded-full border-4 border-red-100 shadow-inner">
            <Lock className="text-red-500" size={60} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-foreground text-2xl font-black uppercase tracking-tighter">Access Restricted</h3>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] mt-2 italic">
              The Review Meeting module is reserved for Executive Admin Personnel only.
            </p>
          </div>
          <div className="bg-background px-6 py-3 rounded-2xl border border-border text-slate-400 text-[9px] font-black uppercase tracking-widest">
            Security Protocol: Node-Identity Verification Failed
          </div>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <p className="text-slate-900 font-black text-sm tracking-[0.4em] uppercase">Syncing Records...</p>
      </div>
    );

  // small cell used for Delegation / Checklist / FMS columns
  const countCell = (row, s, colorClass) => (
    <td
      onClick={() => openHistoryModal(row)}
      className="px-6 py-5 border-r border-border text-center"
    >
      <div className={`font-black text-sm ${colorClass}`}>{s.total}</div>
      <div className="text-[9px] font-bold uppercase text-slate-400 mt-1">
        <span className="text-emerald-600">{s.done} done</span> · <span className="text-red-600">{s.overdue} overdue</span>
      </div>
    </td>
  );

  return (
    <div className="w-full max-w-[1750px] mx-auto animate-in fade-in duration-700 pb-20 px-4 text-left">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-primary p-4 rounded-xl shadow-lg">
            <BarChart3 className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-foreground text-3xl font-black tracking-tighter uppercase leading-none">Review Meeting</h2>
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mt-1 italic opacity-70">Live Compliance Ledger</p>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-card border-2 border-slate-950 px-8 py-3 rounded-xl text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-md"
        >
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-card p-6 border border-border rounded-[2.5rem] mb-10 shadow-sm">
        <div className="relative max-w-xl">
          <input
            type="text"
            placeholder="Identity or Dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-12 py-3 rounded-2xl outline-none focus:border-slate-950 transition-all font-black text-sm shadow-inner"
          />
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* SUMMARY TABLE — one row per person */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl border-b-8 border-b-slate-900 overflow-hidden relative">
        <div className="max-h-[700px] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead className="sticky top-0 z-40 bg-background text-foreground border-b border-border">
              <tr className="text-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-6 py-6 border-r border-slate-700 text-center w-20">NO.</th>
                <th className="px-6 py-6 border-r border-slate-700">PERSONNEL IDENTITY</th>
                <th className="px-6 py-6 border-r border-slate-700">DEPT.</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">LATE TARGET (%)</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">DELEGATION</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">CHECKLIST</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">FMS</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">ACTUAL LATE (%)</th>
                <th className="px-6 py-6 text-center">NOT DONE (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summaryRows.map((row, index) => {
                const isOverTarget = row.avgLate > row.lateTarget;
                return (
                  <tr key={row.key} className="cursor-pointer hover:bg-primary/5 transition-all group">
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-center text-[10px] font-black text-slate-400 group-hover:text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border font-black text-foreground text-xs uppercase">
                      <div className="flex items-center gap-4">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        {row.name}
                      </div>
                    </td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-[10px] font-black uppercase text-muted-foreground">
                      {row.dept}
                    </td>
                    <td className="px-6 py-5 border-r border-border text-center">
                      <input
                        type="number"
                        defaultValue={row.lateTarget}
                        onBlur={(e) => saveTarget(row.employeeId, e.target.value)}
                        className="w-16 bg-background border-2 border-border rounded-lg text-center font-black text-xs py-1 focus:border-primary outline-none"
                      />
                    </td>
                    {countCell(row, row.delegation, 'text-purple-700')}
                    {countCell(row, row.checklist, 'text-sky-700')}
                    {countCell(row, row.fms, 'text-orange-600')}
                    <td onClick={() => openHistoryModal(row)} className={`px-6 py-5 border-r border-border text-center font-black text-[11px] ${isOverTarget ? 'text-amber-600 bg-amber-50/50' : 'text-slate-400'}`}>
                      {fmtPct(row.avgLate)} {isOverTarget && <ArrowUpRight size={12} className="inline ml-1" />}
                    </td>
                    <td onClick={() => openHistoryModal(row)} className={`px-6 py-5 text-center font-black text-[11px] ${row.avgNotDone > 20 ? 'text-red-600 bg-red-50/50' : 'text-foreground'}`}>
                      {fmtPct(row.avgNotDone)} ({row.notDoneCount})
                    </td>
                  </tr>
                );
              })}
              {summaryRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-bold text-sm">No personnel found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {showModal && activePerson && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />

          <div className="relative w-full max-w-[96vw] h-[94vh] bg-card rounded-[2rem] border border-white/20 shadow-2xl flex flex-col overflow-hidden">
            {/* HEADER */}
            <div className="bg-background text-foreground border-b border-border px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 p-3 rounded-xl">
                  <User size={22} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase leading-tight">{activePerson.name}</h2>
                  <p className="text-[10px] tracking-widest text-slate-400 uppercase">{activePerson.dept} • Historical Compliance Audit</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-card/10 hover:bg-red-500 p-2 rounded-xl transition">
                <X size={18} />
              </button>
            </div>

            {/* DATE RANGE */}
            <div className="bg-card border-b border-border px-6 py-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                <span className="text-xs font-bold uppercase text-muted-foreground">Date Range</span>
              </div>
              <input type="date" value={modalStartDate} onChange={(e) => setModalStartDate(e.target.value)} className="border px-3 py-2 rounded-lg text-sm" />
              <input type="date" value={modalEndDate} onChange={(e) => setModalEndDate(e.target.value)} className="border px-3 py-2 rounded-lg text-sm" />
              <button
                onClick={() =>
                  fetchTaskDetails(activePerson.employeeId, `${modalStartDate}T00:00:00.000`, `${modalEndDate}T23:59:59.999`, null)
                }
                className="bg-primary text-black px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wide shadow hover:shadow-lg transition"
              >
                Run Audit
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
              {/* FILTER PILLS */}
              <div className="flex flex-wrap gap-2">
                {['All', ...TYPES].map((f) => {
                  const count = f === 'All' ? deepDiveData.length : rowsOfType[f].length;
                  return (
                    <button
                      key={f}
                      onClick={() => setDetailFilter(f)}
                      className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        detailFilter === f ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-card text-slate-500 border-border hover:text-foreground'
                      }`}
                    >
                      {f} ({count})
                    </button>
                  );
                })}
              </div>

              {/* STATS FOR SELECTED FILTER */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Total', auditStats.total, 'text-foreground'],
                  ['Done', auditStats.done, 'text-green-600'],
                  ['Overdue', auditStats.overdue, 'text-red-500'],
                  [
                    'Not Done',
                    `${auditStats.total ? ((auditStats.notDone / auditStats.total) * 100).toFixed(1) : 0}% (${auditStats.notDone})`,
                    'text-foreground'
                  ]
                ].map(([label, value, color]) => (
                  <div key={label} className="bg-card rounded-2xl border p-4 text-center shadow-sm">
                    <div className="text-[10px] font-black uppercase text-muted-foreground">{label}</div>
                    <div className={`text-xl font-black mt-1 ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {loadingDeepDive ? (
                <div className="p-16 text-center text-slate-400 font-bold text-sm">Syncing Logs...</div>
              ) : deepDiveData.length === 0 ? (
                <div className="p-16 text-center text-slate-300 font-bold text-sm">No tasks found for selected range</div>
              ) : (
                <>
                  {/* ===== DELEGATION ===== */}
                  {show('Delegation') && rowsOfType.Delegation.length > 0 && (
                    <div className="bg-card rounded-2xl shadow border overflow-hidden">
                      <div className="px-6 py-4 border-b font-black text-sm uppercase">Delegation Tasks ({rowsOfType.Delegation.length})</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1000px] w-full text-xs">
                          <thead className="bg-background text-foreground border-b border-border text-[10px] uppercase">
                            <tr>
                              <th className="px-6 py-4 text-left">Task</th>
                              <th className="px-6 py-4 text-center">Deadline</th>
                              <th className="px-6 py-4 text-center">Completed</th>
                              <th className="px-6 py-4 text-center">Drift</th>
                              <th className="px-6 py-4 text-center">Status</th>
                              <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowsOfType.Delegation.map((task, i) => {
                              const isUnfinished = !task.completedAt;
                              const status = task.status || (isUnfinished ? 'MISSING' : 'DONE');
                              return (
                                <tr key={`${task.id}-${i}`} className={`border-t hover:bg-primary/5 ${isUnfinished ? 'bg-red-50/20' : ''}`}>
                                  <td className="px-6 py-4">
                                    <div className="font-bold max-w-[260px] truncate" title={task.name}>{task.name}</div>
                                  </td>
                                  <td className="text-center">{fmtDate(task.deadline)}</td>
                                  <td className="text-center font-bold">
                                    {task.completedAt ? fmtDateTime(task.completedAt) : <span className="text-red-500 uppercase text-[10px]">Pending</span>}
                                  </td>
                                  <td className="text-center font-bold">{calculateDelay(task.deadline, task.completedAt)}</td>
                                  <td className="text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusClass(status)}`}>{status}</span>
                                  </td>
                                  <td className="text-center">
                                    <button onClick={() => deleteTaskRecord(task.id, 'Delegation')} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition">
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ===== CHECKLIST ===== */}
                  {show('Checklist') && groupedChecklist.length > 0 && (
                    <div className="space-y-3">
                      <div className="font-black text-sm uppercase">Checklist Tasks ({groupedChecklist.length} tasks · {rowsOfType.Checklist.length} runs)</div>
                      {groupedChecklist.map(([taskId, task]) => {
                        const isOpen = expandedChecklistIds.includes(taskId);
                        const doneCount = task.instances.filter((x) => x.completedAt).length;
                        return (
                          <div key={taskId} className="bg-card border rounded-2xl shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between px-5 py-4">
                              <div>
                                <h4 className="font-bold text-sm text-foreground">{task.taskName}</h4>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">
                                  Checklist · {doneCount}/{task.instances.length} done
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button onClick={() => toggleChecklist(taskId)} className="p-3 bg-background hover:bg-slate-200 rounded-xl transition flex items-center justify-center">
                                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                <button onClick={() => deleteTaskRecord(taskId, 'Checklist')} className="p-3 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition flex items-center justify-center">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            {isOpen && (
                              <div className="overflow-auto">
                                <div className="min-w-[600px] max-h-[500px] w-full text-xs">
                                  <div className="border-t px-5 py-4 bg-background rounded-b-2xl">
                                    <div className="grid grid-cols-3 text-[10px] font-bold text-muted-foreground uppercase mb-2">
                                      <div>Date</div>
                                      <div>Status</div>
                                      <div>Completed</div>
                                    </div>
                                    <div className="space-y-2">
                                      {task.instances.map((inst, i) => (
                                        <div key={i} className="grid grid-cols-3 text-xs bg-card border rounded-lg px-3 py-2">
                                          <div><b>{fmtDate(inst.deadline)}</b></div>
                                          <div>
                                            <span className={`font-bold ${inst.status === 'OVERDUE' ? 'text-red-500' : inst.status === 'LATE' ? 'text-yellow-500' : 'text-green-600'}`}>
                                              {inst.status}
                                            </span>
                                          </div>
                                          <div><b>{inst.completedAt ? new Date(inst.completedAt).toLocaleString() : 'Pending'}</b></div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ===== FMS ===== */}
                  {show('FMS') && rowsOfType.FMS.length > 0 && (
                    <div className="space-y-3">
                      <div className="font-black text-sm uppercase">FMS Flows ({rowsOfType.FMS.length})</div>
                      {rowsOfType.FMS.map((flow) => {
                        const id = String(flow.id);
                        const isOpen = expandedFmsIds.includes(id);
                        const f = flow.fms || { steps: [], pendingStep: null };
                        const myDone = f.steps.filter((s) => s.mine).length;
                        return (
                          <div key={id} className="bg-card border rounded-2xl shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between gap-4 px-5 py-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="font-bold text-sm text-foreground">{flow.name}</h4>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusClass(flow.status)}`}>{flow.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  {f.steps.length} step{f.steps.length === 1 ? '' : 's'} done
                                  {myDone > 0 ? ` (${myDone} by this person)` : ''}
                                </p>
                                {f.pendingStep ? (
                                  <p className={`text-xs font-bold mt-1 ${f.pendingStep.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                                    Pending step: {f.pendingStep.nodeName} · with {f.pendingStep.assignedToName || '—'}
                                    {f.pendingStep.mine ? ' (this person)' : ''} · due {fmtDateTime(f.pendingStep.plannedDeadline)}
                                    {f.pendingStep.overdue ? ' · OVERDUE' : ''}
                                  </p>
                                ) : (
                                  <p className="text-xs font-bold mt-1 text-green-600">All steps finished · {fmtDateTime(flow.completedAt)}</p>
                                )}
                              </div>
                              <button onClick={() => toggleFms(id)} className="p-3 bg-background hover:bg-slate-200 rounded-xl transition flex items-center justify-center shrink-0">
                                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                            </div>

                            {isOpen && (
                              <div className="border-t px-5 py-4 bg-background rounded-b-2xl overflow-x-auto">
                                {f.steps.length === 0 ? (
                                  <p className="text-xs text-slate-400 font-bold">No steps completed yet.</p>
                                ) : (
                                  <div className="min-w-[700px] space-y-2">
                                    <div className="grid grid-cols-5 text-[10px] font-bold text-muted-foreground uppercase mb-1">
                                      <div>Step</div>
                                      <div>Done by</div>
                                      <div>Planned</div>
                                      <div>Completed</div>
                                      <div>Result</div>
                                    </div>
                                    {f.steps.map((s, i) => {
                                      const inputs = Object.entries(s.inputs || {})
                                        .filter(([, v]) => v !== null && typeof v !== 'object' && String(v) !== '')
                                        .slice(0, 4);
                                      return (
                                        <div key={i} className={`bg-card border rounded-lg px-3 py-2 text-xs ${s.mine ? 'border-primary/60 bg-primary/5' : ''}`}>
                                          <div className="grid grid-cols-5 items-center">
                                            <div className="font-bold">{s.nodeName}{s.mine && <span className="ml-2 text-[9px] text-primary uppercase">this person</span>}</div>
                                            <div>{s.completedByName || s.assignedToName || '—'}</div>
                                            <div>{fmtDateTime(s.plannedDeadline)}</div>
                                            <div>{fmtDateTime(s.completedAt)}</div>
                                            <div>
                                              <span className={`font-bold ${s.onTime ? 'text-green-600' : 'text-red-500'}`}>
                                                {s.onTime ? 'On time' : 'Late'}
                                              </span>
                                              {s.decision ? <span className="ml-2 uppercase text-slate-500">{s.decision}</span> : null}
                                            </div>
                                          </div>
                                          {inputs.length > 0 && (
                                            <div className="mt-1 text-[10px] text-slate-500">
                                              {inputs.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* selected filter has nothing */}
                  {detailFilter !== 'All' && rowsOfType[detailFilter].length === 0 && (
                    <div className="p-16 text-center text-slate-300 font-bold text-sm">No {detailFilter} tasks in this range</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 20px; border: 2px solid white; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        table { border-collapse: collapse; }
        thead th { position: sticky !important; top: 0; z-index: 40; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

export default ReviewMeeting;
