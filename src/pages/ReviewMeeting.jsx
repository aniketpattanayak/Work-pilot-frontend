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
  CalendarDays
} from 'lucide-react';

/**
 * WEEKLY REVIEW MEETING v3.7
 * Features: Internal Modal Date Filtering + Full "Not Done" Audit Ledger + Live Delay Tracking.
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
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  const fetchAnalytics = useCallback(async () => {
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
  }, [currentTenantId, viewType, selectedDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const fetchTaskDetails = async (employeeId, weekRange, index) => {
    if (!employeeId || !weekRange?.start) return;
    try {
      setLoadingDeepDive(true);
      setActiveWeekIndex(index);
      const res = await API.get(`/tasks/employee-deep-dive/${employeeId}`, {
        params: { startDate: weekRange.start, endDate: weekRange.end }
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
      fetchTaskDetails(activePerson.employeeId, activePerson.history[activeWeekIndex].dates, activeWeekIndex);
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

  /**
   * LIVE AUDIT DELAY LOGIC
   * Calculates "Live Overdue" for missions not yet completed.
   */
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
    if (row.history.length > 0) fetchTaskDetails(row.employeeId, row.history[0].dates, 0);
  };

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
          <div className="bg-slate-950 p-4 rounded-xl shadow-lg"><BarChart3 className="text-white" size={32} /></div>
          <div>
            <h2 className="text-slate-950 text-3xl font-black tracking-tighter uppercase leading-none">Review Meeting</h2>
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mt-1 italic opacity-70">Live Compliance Ledger</p>
          </div>
        </div>
        <button onClick={fetchAnalytics} className="bg-white border-2 border-slate-950 px-8 py-3 rounded-xl text-slate-950 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-md">
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {/* MAIN FILTERS (DATE REMOVED FROM HERE) */}
      <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-200 mb-10 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative">
            <input type="text" placeholder="Identity or Dept..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-2 border-slate-200 text-slate-950 px-12 py-3 rounded-2xl outline-none focus:border-slate-950 transition-all font-black text-sm shadow-inner" />
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-200 shadow-inner">
             {['All', 'Delegation', 'Checklist'].map(cat => (
               <button key={cat} onClick={() => setTaskCategory(cat)} className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${taskCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-950'}`}>{cat}</button>
             ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-200 shadow-inner max-w-md">
            {['All', 'Daily', 'Weekly', 'Monthly'].map(tab => (
              <button key={tab} onClick={() => setViewType(tab)} className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewType === tab ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-950'}`}>{tab}</button>
            ))}
          </div>
        </div>
      </div>

      {/* SUMMARY TABLE */}
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-2xl border-b-8 border-b-slate-900 overflow-hidden relative">
        <div className="max-h-[700px] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead className="sticky top-0 z-40 bg-slate-900">
              <tr className="text-white text-[10px] font-black uppercase tracking-[0.2em]">
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
                  <tr key={row.rowId} className="cursor-pointer hover:bg-slate-50 transition-all group">
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 text-center text-[10px] font-black text-slate-400 group-hover:text-primary">{String(index + 1).padStart(2, '0')}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 font-black text-slate-950 text-xs uppercase flex items-center gap-4">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        {row.name}
                    </td>
                    <td className="px-6 py-5 border-r border-slate-200 text-center">
                       <input type="number" defaultValue={row.lateTarget} onBlur={(e) => saveTarget(row.employeeId, e.target.value)} className="w-16 bg-slate-100 border-2 border-slate-200 rounded-lg text-center font-black text-xs py-1 focus:border-primary outline-none" />
                    </td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 text-[10px] font-black uppercase text-slate-500">{row.dept}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 text-left">
                      <span className={`px-3 py-1 rounded text-[9px] font-black uppercase border-2 ${row.type === 'Checklist' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{row.type}</span>
                    </td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 text-center font-black text-xs">{row.total}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 text-center font-black text-xs text-emerald-600">{row.done}</td>
                    <td onClick={() => openHistoryModal(row)} className="px-6 py-5 border-r border-slate-200 text-center font-black text-xs text-red-600">{row.overdue}</td>
                    <td onClick={() => openHistoryModal(row)} className={`px-6 py-5 border-r border-slate-200 text-center font-black text-[11px] ${isOverTarget ? 'text-amber-600 bg-amber-50/50' : 'text-slate-400'}`}>{getPercentage(row.late, row.total)} {isOverTarget && <ArrowUpRight size={12} className="inline ml-1" />}</td>
                    <td onClick={() => openHistoryModal(row)} className={`px-6 py-5 text-center font-black text-[11px] ${parseFloat(getPercentage(row.notDone, row.total)) > 20 ? 'text-red-600 bg-red-50/50' : 'text-slate-900'}`}>{getPercentage(row.notDone, row.total)} ({row.notDone})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL - INTERNAL DATE FILTERING & AUDIT */}
      {showModal && activePerson && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 overflow-hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-[1680px] max-h-[92vh] rounded-[2rem] shadow-2xl flex flex-col border-2 border-white/20">
            
            {/* POPUP HEADER: DATE PICKER MOVED HERE */}
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white border-b-2 border-primary z-50">
               <div className="flex items-center gap-6">
                  <User size={24} className="text-primary"/>
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tighter leading-none">{activePerson.name}</h3>
                     <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{activePerson.dept} • HISTORICAL COMPLIANCE AUDIT</p>
                  </div>
               </div>

               {/* INTERNAL MODAL DATE PICKER */}
               <div className="hidden lg:flex items-center bg-white/5 border border-white/10 px-4 py-2 rounded-xl gap-4 group hover:border-primary transition-all">
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarDays size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Audit Reference:</span>
                  </div>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="bg-transparent text-white font-black text-xs outline-none cursor-pointer"
                  />
               </div>

               <button onClick={() => setShowModal(false)} className="bg-white/10 hover:bg-red-500 p-3 rounded-xl transition-all"><X size={20} /></button>
            </div>

            {/* POPUP BODY */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-slate-100">
               
               {/* 1. UNIFIED WEEKLY TABLE */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-4">
                     <History size={18} className="text-slate-400" />
                     <h4 className="text-sm font-black uppercase tracking-tighter text-slate-950">Personnel Progress (Weekly Wise Breakdown)</h4>
                  </div>
                  <div className="bg-white border-2 border-slate-300 rounded-[1.5rem] shadow-xl overflow-hidden ring-4 ring-slate-200/30">
                     <table className="w-full text-left border-collapse min-w-[1550px]">
                        <thead className="sticky top-0 z-30 bg-slate-50 border-b-2 border-slate-200">
                           <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                              <th className="px-5 py-4 border-r border-slate-200 text-center w-20">NO.</th>
                              <th className="px-5 py-4 border-r border-slate-200 bg-primary/5 text-primary text-left">PERIOD LABEL</th>
                              <th className="px-5 py-4 border-r border-slate-200 text-center">TOTAL</th>
                              <th className="px-5 py-4 border-r border-slate-200 text-center">DONE</th>
                              <th className="px-5 py-4 border-r border-slate-200 text-center text-red-600">OVERDUE</th>
                              <th className="px-5 py-4 text-center bg-red-50/20 text-slate-950">NOT DONE (%)</th>
                              <th className="px-5 py-4 text-center">DRILL DOWN</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {activePerson.history.map((week, wIdx) => {
                              const weekStats = activePerson.type === 'Checklist' ? week.checklist : week.delegation;
                              const isSelected = activeWeekIndex === wIdx;
                              return (
                                 <tr key={wIdx} className={`text-xs font-black text-slate-950 transition-all ${isSelected ? 'bg-primary/5' : 'bg-white hover:bg-slate-50'}`}>
                                    <td className="px-5 py-4 border-r border-slate-200 text-center text-slate-400">{String(wIdx + 1).padStart(2, '0')}</td>
                                    <td className="px-5 py-4 border-r border-slate-200 font-black text-slate-950 text-[10px] uppercase italic">{getWeekLabel(wIdx)} • {week.period}</td>
                                    <td className="px-5 py-4 border-r border-slate-200 text-center">{weekStats.total}</td>
                                    <td className="px-5 py-4 border-r border-slate-200 text-center text-emerald-600">{weekStats.done}</td>
                                    <td className="px-5 py-4 border-r border-slate-200 text-center text-red-600">{weekStats.overdue}</td>
                                    <td className={`px-5 py-4 border-r border-slate-200 text-center font-bold ${parseFloat(getPercentage(weekStats.notDone, weekStats.total)) > 20 ? 'text-red-600' : ''}`}>{getPercentage(weekStats.notDone, weekStats.total)} ({weekStats.notDone})</td>
                                    <td className="px-5 py-4 text-center">
                                       <button onClick={() => fetchTaskDetails(activePerson.employeeId, week.dates, wIdx)} className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-950'}`}>
                                          <Search size={14} />
                                       </button>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* 2. COMPREHENSIVE AUDIT LEDGER (REFINED FOR FULL "NOT DONE" VISIBILITY) */}
               <div className="space-y-6 pb-20">
                  <div className="flex items-center justify-between ml-4">
                     <div className="flex items-center gap-4">
                        <Layers size={20} className="text-slate-900"/>
                        <h4 className="text-lg font-black uppercase tracking-tighter text-slate-950">Mission Audit Ledger (Full Traceability)</h4>
                     </div>
                     <span className="bg-slate-950 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{deepDiveData.length} Missions Identified</span>
                  </div>

                  {loadingDeepDive ? (
                     <div className="bg-white p-24 rounded-[3rem] border-4 border-dotted border-slate-200 flex flex-col items-center justify-center shadow-xl">
                        <RefreshCcw className="animate-spin text-primary mb-4" size={32} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Syncing Production Logs...</span>
                     </div>
                  ) : deepDiveData.length > 0 ? (
                     <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border-2 border-slate-300">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                 <th className="px-6 py-5 border-r border-slate-800">Mission Name & Description</th>
                                 <th className="px-6 py-5 border-r border-slate-800 text-center">Target Deadline</th>
                                 <th className="px-6 py-5 border-r border-slate-800 text-center">Actual Completion</th>
                                 <th className="px-6 py-5 border-r border-slate-800 text-center">Audit Drift (Live Counter)</th>
                                 <th className="px-6 py-4 text-center">Mission State</th>
                                 <th className="px-6 py-4 text-center">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {deepDiveData.map((task, tIdx) => {
                                 const isUnfinished = !task.completedAt;
                                 return (
                                    <tr key={tIdx} className={`hover:bg-slate-50 transition-all text-xs ${isUnfinished ? 'bg-red-50/10' : ''}`}>
                                       <td className="px-6 py-5 border-r border-slate-100">
                                          <div className={`font-black uppercase tracking-tight mb-1 ${isUnfinished ? 'text-red-700' : 'text-slate-950'}`}>{task.name}</div>
                                          <div className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-[450px] italic">
                                             {task.description || "Operational standard protocol. Follow SOP strictly."}
                                          </div>
                                       </td>
                                       <td className="px-6 py-5 border-r border-slate-100 text-center font-bold text-slate-500 uppercase">{new Date(task.deadline).toLocaleDateString('en-GB')}</td>
                                       <td className="px-6 py-5 border-r border-slate-100 text-center font-black">
                                          {task.completedAt ? (
                                            <div className="flex flex-col">
                                               <span className="text-slate-950">{new Date(task.completedAt).toLocaleDateString('en-GB')}</span>
                                               <span className="text-[9px] text-emerald-600 opacity-60 uppercase">{new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                          ) : (
                                            <span className="text-red-500 font-black animate-pulse uppercase text-[10px]">Pending Mission</span>
                                          )}
                                       </td>
                                       <td className={`px-6 py-5 border-r border-slate-100 text-center font-black italic ${isUnfinished ? 'text-red-600' : 'text-slate-500'}`}>
                                          {calculateDelay(task.deadline, task.completedAt)}
                                       </td>
                                       <td className="px-6 py-5 border-r border-slate-100 text-center">
                                          <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase border-2 shadow-sm ${
                                             task.status === 'LATE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                             (task.status === 'OVERDUE' || isUnfinished) ? 'bg-red-600 text-white border-red-700' :
                                             'bg-emerald-50 text-emerald-600 border-emerald-200'
                                          }`}>{task.status || (isUnfinished ? 'MISSING' : 'DONE')}</span>
                                       </td>
                                       <td className="px-6 py-5 text-center">
                                          <button onClick={() => deleteTaskRecord(task.id, task.type)} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all group">
                                             <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                                          </button>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  ) : (
                     <div className="bg-white p-24 rounded-[3rem] border-4 border-dotted border-slate-100 text-center">
                        <AlertCircle className="mx-auto mb-3 text-slate-200" size={48} />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Select a period from the Personnel Progress table to audit missions.</span>
                     </div>
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