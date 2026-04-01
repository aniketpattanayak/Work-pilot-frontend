import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import { 
  BarChart3, 
  RefreshCcw, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Target,
  Layers,
  ChevronRight,
  History,
  Table as TableIcon,
  X,
  User,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Trash2,
  FileText,
  Timer,
  CalendarDays,
  ShieldAlert,
  Lock,
  PlayCircle ,
   ChevronDown, ChevronUp
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel'; 

/**
 * WEEKLY REVIEW MEETING v3.9
 * Purpose: Compliance auditing with Manual Date Range Deep-Dives.
 * UPDATED: Integrated Internal Modal Custom Date Range Selection.
 */
const ReviewMeeting = ({ tenantId }) => {
  const [viewType, setViewType] = useState('All'); 
  const [taskCategory, setTaskCategory] = useState('All'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Deep Dive State
  const [showModal, setShowModal] = useState(false);
  const [activePerson, setActivePerson] = useState(null);
  const [deepDiveData, setDeepDiveData] = useState([]);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [activeWeekIndex, setActiveWeekIndex] = useState(null); // Changed to null for clarity

  // NEW: Custom Date Range States for Modal
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const currentTenantId = tenantId || localStorage.getItem('tenantId');




  const [expandedChecklistIds, setExpandedChecklistIds] = useState([]);





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
      console.error("Analytics fetch failed:", err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, viewType, selectedDate, isAdmin]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /**
   * REFINED: FETCH TASK DETAILS
   * Accepts manual dates or pre-defined ranges.
   */
  const fetchTaskDetails = async (employeeId, start, end, index = null) => {
    if (!employeeId || !start || !end) return;
    try {
      setLoadingDeepDive(true);
      setActiveWeekIndex(index);
      
      // Update modal inputs to match what is being viewed
      setModalStartDate(start.split('T')[0]);
      setModalEndDate(end.split('T')[0]);

      const res = await API.get(`/tasks/employee-deep-dive/${employeeId}`, {
        params: { startDate: start, endDate: end }
      });
      setDeepDiveData(res.data || []);
    } catch (err) {
      console.error("Deep Dive Error:", err);
    } finally {
      setLoadingDeepDive(false);
    }
  };

  const deleteTaskRecord = async (taskId, type) => {
    if (!window.confirm("CRITICAL: Purge this record?")) return;
    try {
      const endpoint = type === 'Checklist' ? `/tasks/checklist/${taskId}` : `/tasks/task/${taskId}`;
      await API.delete(endpoint);
      fetchTaskDetails(activePerson.employeeId, modalStartDate, modalEndDate, activeWeekIndex);
      fetchAnalytics();
    } catch (err) {
      alert("Purge failed.");
    }
  };

  const saveTarget = async (employeeId, targetVal) => {
    try {
      await API.put('/tasks/update-weekly-target', { employeeId, target: targetVal });
      fetchAnalytics();
    } catch (err) { console.error("Sync Failed"); }
  };

  const getPercentage = (count, total) => {
    if (!total || total === 0) return '0.00%';
    return `${((count / total) * 100).toFixed(2)}%`;
  };

  const getWeekLabel = (index) => {
    const labels = ["LAST WEEK", "2ND LAST WEEK", "3RD LAST WEEK", "4TH LAST WEEK"];
    return labels[index] || `${index + 1}TH LAST WEEK`;
  };

  const calculateDelay = (deadline, completedAt) => {
    const d1 = new Date(deadline);
    const now = new Date();
    
    if (completedAt) {
      const d2 = new Date(completedAt);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? `${diff} Days Late` : "On-Time";
    } else {
      const diff = Math.floor((now - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? `${diff} Days OVERDUE (Missing)` : "Future Target";
    }
  };

  const summaryRows = useMemo(() => {
    const personnelMap = {};
    reportData.forEach(item => {
      const name = item.employeeName;
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.department || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (matchesSearch) {
        if (!personnelMap[name]) {
          personnelMap[name] = {
            employeeId: item.employeeId,
            name: name,
            dept: item.department || 'GENERAL',
            lateTarget: item.weeklyLateTarget || 20,
            checklist: { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 },
            delegation: { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 },
            history: [] 
          };
        }
        personnelMap[name].history.push({
          period: item.periodName || "Current",
          dates: { start: item.periodStart, end: item.periodEnd },
          checklist: item.checklist || { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 },
          delegation: item.delegation || { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 }
        });
        ['checklist', 'delegation'].forEach(key => {
          if (item[key]) {
            personnelMap[name][key].total += item[key].total || 0;
            personnelMap[name][key].done += item[key].done || 0;
            personnelMap[name][key].overdue += item[key].overdue || 0;
            personnelMap[name][key].late += item[key].late || 0;
            personnelMap[name][key].notDone += item[key].notDone || 0;
          }
        });
      }
    });
    const finalSummaryList = [];
    Object.values(personnelMap).forEach(p => {
      p.history.sort((a, b) => b.period.localeCompare(a.period));
      if (taskCategory === 'All' || taskCategory === 'Checklist') finalSummaryList.push({ rowId: `${p.name}-chk`, type: 'Checklist', ...p, ...p.checklist });
      if (taskCategory === 'All' || taskCategory === 'Delegation') finalSummaryList.push({ rowId: `${p.name}-del`, type: 'Delegation', ...p, ...p.delegation });
    });
    return finalSummaryList;
  }, [reportData, searchTerm, taskCategory]);

  const openHistoryModal = (row) => {
    setActivePerson(row);
    setDeepDiveData([]); 
    setShowModal(true);
    // Defaults to last week initially
    if (row.history.length > 0) fetchTaskDetails(row.employeeId, row.history[0].dates.start, row.history[0].dates.end, 0);
  };

const [expandedChecklistId, setExpandedChecklistId] = useState(null);
  const groupedChecklist = useMemo(() => {
  const map = {};

  deepDiveData.forEach(item => {
    if (item.type === 'Checklist') {
      if (!map[item.id]) {
        map[item.id] = {
          taskName: item.name,
          instances: []
        };
      }
      map[item.id].instances.push(item);
    }
  });

  return Object.entries(map);
}, [deepDiveData]);







const auditStats = useMemo(() => {
  if (!deepDiveData || deepDiveData.length === 0) {
    return { total: 0, done: 0, overdue: 0, notDone: 0 };
  }

  // 🔹 DELEGATION
  if (activePerson?.type === "Delegation") {
    const filtered = deepDiveData.filter(t => t.type === "Delegation");

    const total = filtered.length;
    const done = filtered.filter(t => t.completedAt).length;
    const overdue = filtered.filter(t => t.status === "OVERDUE").length;
    const notDone = total - done;

    return { total, done, overdue, notDone };
  }

  // 🔹 CHECKLIST (IMPORTANT)
  if (activePerson?.type === "Checklist") {
    let total = 0;
    let done = 0;
    let overdue = 0;

    groupedChecklist.forEach(([_, task]) => {
      task.instances.forEach(inst => {
        total++;

        if (inst.completedAt) done++;
        if (inst.status === "OVERDUE") overdue++;
      });
    });

    const notDone = total - done;

    return { total, done, overdue, notDone };
  }

  return { total: 0, done: 0, overdue: 0, notDone: 0 };
}, [deepDiveData, groupedChecklist, activePerson]);







  if (!isAdmin) return (
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[500px] gap-4">
      <RefreshCcw className="animate-spin text-primary" size={48} />
      <p className="text-slate-900 font-black text-sm tracking-[0.4em] uppercase">Syncing Records...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1750px] mx-auto animate-in fade-in duration-700 pb-20 px-4 text-left">
      
      {/* MAIN PAGE HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-primary p-4 rounded-xl shadow-lg"><BarChart3 className="text-white" size={32} /></div>
          <div>
            <h2 className="text-foreground text-3xl font-black tracking-tighter uppercase leading-none">Review Meeting</h2>
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mt-1 italic opacity-70">Live Compliance Ledger</p>
          </div>
        </div>
        <button onClick={fetchAnalytics} className="bg-card border-2 border-slate-950 px-8 py-3 rounded-xl text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-md">
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {/* MAIN FILTERS */}
      <div className="bg-card p-6 border border-border rounded-[2.5rem] mb-10 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative">
            <input type="text" placeholder="Identity or Dept..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background border border-border text-foreground px-12 py-3 rounded-2xl outline-none focus:border-slate-950 transition-all font-black text-sm shadow-inner" />
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="flex bg-card p-1 rounded-2xl border-2 border-border shadow-inner">
             {['All', 'Delegation', 'Checklist'].map(cat => (
               <button key={cat} onClick={() => setTaskCategory(cat)} className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${taskCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-foreground'}`}>{cat}</button>
             ))}
          </div>
        </div>
        {/*<div className="grid grid-cols-1 gap-6">
          <div className="flex bg-card p-1 rounded-2xl border-2 border-border shadow-inner max-w-md">
            {['All', 'Daily', 'Weekly', 'Monthly'].map(tab => (
              <button key={tab} onClick={() => setViewType(tab)} className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewType === tab ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-950'}`}>{tab}</button>
            ))}
          </div>
        </div>*/}
      </div>

      {/* SUMMARY TABLE */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl border-b-8 border-b-slate-900 overflow-hidden relative">
        <div className="max-h-[700px] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead className="sticky top-0 z-40 bg-background text-foreground border-b border-border">
              <tr className="text-foreground text-[10px] font-black uppercase tracking-[0.2em] ">
                <th className="px-6 py-6 border-r border-slate-700 text-center w-20">NO.</th>
                <th className="px-6 py-6 border-r border-slate-700">PERSONNEL IDENTITY</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">LATE TARGET (%)</th>
                <th className="px-6 py-6 border-r border-slate-700">DEPT.</th>
                <th className="px-6 py-6 border-r border-slate-700">TASK TYPE</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">TOTAL</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">DONE</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">OVERDUE</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">ACTUAL LATE (%)</th>
                <th className="px-6 py-6 text-center">NOT DONE (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summaryRows.map((row, index) => {
                const isOverTarget = parseFloat(getPercentage(row.late, row.total)) > row.lateTarget;
                return (
                  <tr key={row.rowId} className="cursor-pointer hover:bg-primary/5 transition-all group">
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-center text-[10px] font-black text-slate-400 group-hover:text-primary">{String(index + 1).padStart(2, '0')}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border font-black text-foreground text-xs uppercase flex items-center gap-4">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        {row.name}
                    </td>
                    <td className="px-6 py-5 border-r border-border text-center">
                       <input type="number" defaultValue={row.lateTarget} onBlur={(e) => saveTarget(row.employeeId, e.target.value)} className="w-16 bg-background border-2 border-border rounded-lg text-center font-black text-xs py-1 focus:border-primary outline-none" />
                    </td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-[10px] font-black uppercase text-muted-foreground">{row.dept}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-left">
                      <span className={`px-3 py-1 rounded text-[9px] font-black uppercase border-2 ${row.type === 'Checklist' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{row.type}</span>
                    </td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-center font-black text-xs">{row.total}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-center font-black text-xs text-emerald-600">{row.done}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-border text-center font-black text-xs text-red-600">{row.overdue}</td>
                    <td onClick={() => openHistoryModal(row)} className={`px-6 py-5 border-r border-border text-center font-black text-[11px] ${isOverTarget ? 'text-amber-600 bg-amber-50/50' : 'text-slate-400'}`}>{getPercentage(row.late, row.total)} {isOverTarget && <ArrowUpRight size={12} className="inline ml-1" />}</td>
                    <td onClick={() => openHistoryModal(row)} className={`px-6 py-5 text-center font-black text-[11px] ${parseFloat(getPercentage(row.notDone, row.total)) > 20 ? 'text-red-600 bg-red-50/50' : 'text-foreground'}`}>{getPercentage(row.notDone, row.total)} ({row.notDone})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL - CUSTOM DATE RANGE AUDIT INTEGRATED */}
      {showModal && activePerson && (
<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">

  {/* BACKDROP */}
  <div
    className="absolute inset-0"
    onClick={() => setShowModal(false)}
  />

  {/* MODAL */}
  <div className="relative w-full max-w-[96vw] h-[94vh] bg-card rounded-[2rem] border border-border shadow-2xl flex flex-col overflow-hidden border border-white/20">

    {/* ================= HEADER ================= */}
    <div className="sticky top-0 z-50 bg-background text-foreground border-b border-border px-6 py-5 flex justify-between items-center border-b border-white/10">

      <div className="flex items-center gap-4">
        <div className="bg-primary/20 p-3 rounded-xl">
          <User size={22} className="text-primary" />
        </div>

        <div>
          <h2 className="text-lg font-black uppercase leading-tight">
            {activePerson.name}
          </h2>
          <p className="text-[10px] tracking-widest text-slate-400 uppercase">
            {activePerson.dept} • Historical Compliance Audit
          </p>
        </div>
      </div>

      <button
        onClick={() => setShowModal(false)}
        className="bg-card/10 hover:bg-red-500 p-2 rounded-xl transition"
      >
        <X size={18} />
      </button>
    </div>

    {/* ================= FILTER BAR ================= */}
    <div className="sticky top-[72px] z-40 bg-card border-b border-border px-6 py-4 flex flex-wrap items-center gap-4">

      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-primary" />
        <span className="text-xs font-bold uppercase text-muted-foreground">
          Date Range
        </span>
      </div>

      <input
        type="date"
        value={modalStartDate}
        onChange={(e) => setModalStartDate(e.target.value)}
        className="border px-3 py-2 rounded-lg text-sm"
      />

      <input
        type="date"
        value={modalEndDate}
        onChange={(e) => setModalEndDate(e.target.value)}
        className="border px-3 py-2 rounded-lg text-sm"
      />

      <button
        onClick={() =>
          fetchTaskDetails(
            activePerson.employeeId,
            modalStartDate,
            modalEndDate,
            null
          )
        }
        className="bg-primary text-black px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wide shadow hover:shadow-lg transition"
      >
        Run Audit
      </button>

      <div className="ml-auto text-xs font-bold text-muted-foreground">
        {deepDiveData.length} Missions
      </div>
    </div>

    {/* ================= BODY ================= */}
    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background">

      {/* ================= WEEKLY SELECT ================= */}
      <div className="bg-card rounded-2xl shadow border p-4">
        <h4 className="text-xs font-black uppercase text-muted-foreground mb-3">
          Audit analysis
        </h4>

        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-xs">

            <thead className="bg-background text-muted-foreground uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Done</th>
                <th className="px-4 py-3 text-center">Overdue</th>
                <th className="px-4 py-3 text-center">Not Done (%)</th>
              </tr>
            </thead>
             
             
              <tbody>
  <tr className="border-t bg-primary/5">
    
    <td className="text-center px-4 py-3 text-slate-400">
      01
    </td>

    <td className="text-center font-bold">
      {auditStats.total}
    </td>

    <td className="text-center text-green-600 font-bold">
      {auditStats.done}
    </td>

    <td className="text-center text-red-500 font-bold">
      {auditStats.overdue}
    </td>

    <td className="text-center font-bold">
      {auditStats.total
        ? ((auditStats.notDone / auditStats.total) * 100).toFixed(1)
        : 0
      }% ({auditStats.notDone})
    </td>
  </tr>
</tbody>

          </table>
        </div>
      </div>

      {/* ================= AUDIT LEDGER ================= */}
      <div className="bg-card rounded-2xl shadow border overflow-hidden">

        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="font-black text-sm uppercase">
            Mission Audit Ledger ({modalStartDate} → {modalEndDate})
          </h3>
        </div>

        {loadingDeepDive ? (
  <div className="p-16 text-center text-slate-400 font-bold text-sm">
    Syncing Logs...
  </div>
) : deepDiveData.length === 0 ? (
  <div className="p-16 text-center text-slate-300 font-bold text-sm">
    No missions found for selected range
  </div>
) : (
  <>
    {/* ✅ ONLY FOR DELEGATION */}
    {activePerson.type === 'Delegation' && (
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-xs">
          
          <thead className="bg-background text-foreground border-b border-border text-[10px] uppercase">
            <tr>
              <th className="px-6 py-4 text-left">Mission</th>
              <th className="px-6 py-4 text-center">Deadline</th>
              <th className="px-6 py-4 text-center">Completed</th>
              <th className="px-6 py-4 text-center">Drift</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {deepDiveData
              .filter(t => t.type === 'Delegation')
              .map((task, i) => {
                const isUnfinished = !task.completedAt;

                const status =
                  task.status ||
                  (isUnfinished ? "MISSING" : "DONE");

                return (
                  <tr
                    key={i}
                    className={`border-t hover:bg-primary/5 ${
                      isUnfinished ? "bg-red-50/20" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold max-w-[200px] truncate" title={task.name}>
                        {task.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {task.description || "Operational standard protocol"}
                      </div>
                    </td>

                    <td className="text-center">
                      {new Date(task.deadline).toLocaleDateString("en-GB")}
                    </td>

                    <td className="text-center font-bold">
                      {task.completedAt ? (
                        <div className="flex flex-col">
                          <span>
                            {new Date(task.completedAt).toLocaleDateString("en-GB")}
                          </span>
                          <span className="text-[10px] text-green-600">
                            {new Date(task.completedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-500 uppercase text-[10px]">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="text-center font-bold">
                      {calculateDelay(task.deadline, task.completedAt)}
                    </td>

                    <td className="text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                          status === "OVERDUE"
                            ? "bg-red-500 text-white"
                            : status === "LATE"
                            ? "bg-yellow-400"
                            : status === "MISSING"
                            ? "bg-red-600 text-white"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="text-center">
                      <button
                        onClick={() => deleteTaskRecord(task.id, task.type)}
                        className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    )}

    {/* ✅ CHECKLIST UI (UNCHANGED) */}
    {activePerson.type === 'Checklist' && (
      <div className="space-y-4">
        {groupedChecklist.map(([taskId, task]) => {
          const isOpen = expandedChecklistIds.includes(taskId);

          return (
            <div
              key={taskId}
              className="bg-card border rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {task.taskName}
                  </h4>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Checklist Task
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                  onClick={() => {
  setExpandedChecklistIds(prev =>
    prev.includes(taskId)
      ? prev.filter(id => id !== taskId) // close only this one
      : [...prev, taskId] // open without closing others
  );
}}
                
                className="p-3 bg-background hover:bg-slate-200 rounded-xl transition flex items-center justify-center"
              >
                {isOpen ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

                  <button
                onClick={() => deleteTaskRecord(taskId, 'Checklist')}
                className="p-3 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition flex items-center justify-center"
              >
                <Trash2 size={18} />
              </button>
                </div>
              </div>

              {isOpen && (
                <div className="overflow-auto">
                  <div className="min-w-[800px] max-h-[500px] w-full text-xs">
                    <div className="border-t px-5 py-4 bg-background rounded-b-2xl">

                      <div className="grid grid-cols-3 text-[10px] font-bold text-muted-foreground uppercase mb-2">
                        <div>Date</div>
                        <div>Status</div>
                        <div>Completed</div>
                      </div>

                      <div className="space-y-2">
                        {task.instances.map((inst, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-3 text-xs bg-card border rounded-lg px-3 py-2"
                          >
                            <div>
                              <b>{new Date(inst.deadline).toLocaleDateString()}</b>
                            </div>

                            <div>
                              <span className={`font-bold ${
                                inst.status === "OVERDUE"
                                  ? "text-red-500"
                                  : inst.status === "LATE"
                                  ? "text-yellow-500"
                                  : "text-green-600"
                              }`}>
                                {inst.status}
                              </span>
                            </div>

                            <div>
                              <b>
                                {inst.completedAt
                                  ? new Date(inst.completedAt).toLocaleString()
                                  : "Pending"}
                              </b>
                            </div>
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
  </>
)}
      </div>

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