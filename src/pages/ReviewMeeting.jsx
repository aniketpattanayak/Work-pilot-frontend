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
  Clock
} from 'lucide-react';

/**
 * WEEKLY REVIEW MEETING v2.7
 * Purpose: Condensed Historical Ledger with Excel-Style Fixed Headers.
 * Fix: Reduced UI scaling ("bigness") for a tighter, high-density professional view.
 */
const ReviewMeeting = ({ tenantId }) => {
  const [viewType, setViewType] = useState('All'); 
  const [taskCategory, setTaskCategory] = useState('All'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [activePerson, setActivePerson] = useState(null);

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

  const getWeekLabel = (index) => {
    if (index === 0) return "LAST WEEK";
    if (index === 1) return "2ND LAST WEEK";
    if (index === 2) return "3RD LAST WEEK";
    if (index === 3) return "4TH LAST WEEK";
    return `${index + 1}TH LAST WEEK`;
  };

  const summaryRows = useMemo(() => {
    const personnelMap = {};

    reportData.forEach(item => {
      const name = item.employeeName;
      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.department || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (matchesSearch) {
        if (!personnelMap[name]) {
          personnelMap[name] = {
            name: name,
            dept: item.department || 'GENERAL',
            checklist: { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 },
            delegation: { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 },
            history: [] 
          };
        }

        personnelMap[name].history.push({
          period: item.periodName || "Current",
          checklist: item.checklist || { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 },
          delegation: item.delegation || { total: 0, done: 0, overdue: 0, late: 0, notDone: 0 }
        });

        if (item.checklist) {
          personnelMap[name].checklist.total += item.checklist.total || 0;
          personnelMap[name].checklist.done += item.checklist.done || 0;
          personnelMap[name].checklist.overdue += item.checklist.overdue || 0;
          personnelMap[name].checklist.late += item.checklist.late || 0;
          personnelMap[name].checklist.notDone += item.checklist.notDone || 0;
        }

        if (item.delegation) {
          personnelMap[name].delegation.total += item.delegation.total || 0;
          personnelMap[name].delegation.done += item.delegation.done || 0;
          personnelMap[name].delegation.overdue += item.delegation.overdue || 0;
          personnelMap[name].delegation.late += item.delegation.late || 0;
          personnelMap[name].delegation.notDone += item.delegation.notDone || 0;
        }
      }
    });

    const finalSummaryList = [];
    Object.values(personnelMap).forEach(p => {
      p.history.sort((a, b) => b.period.localeCompare(a.period));

      if (taskCategory === 'All' || taskCategory === 'Checklist') {
        finalSummaryList.push({ id: `${p.name}-chk`, type: 'Checklist', ...p, ...p.checklist });
      }
      if (taskCategory === 'All' || taskCategory === 'Delegation') {
        finalSummaryList.push({ id: `${p.name}-del`, type: 'Delegation', ...p, ...p.delegation });
      }
    });

    return finalSummaryList;
  }, [reportData, searchTerm, taskCategory]);

  const getPercentage = (count, total) => {
    if (!total || total === 0) return '0.00%';
    return `${((count / total) * 100).toFixed(2)}%`;
  };

  const openHistoryModal = (row) => {
    setActivePerson(row);
    setShowModal(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[500px] gap-4">
      <RefreshCcw className="animate-spin text-primary" size={48} />
      <p className="text-slate-900 font-black text-sm tracking-[0.4em] uppercase">Syncing Records...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1700px] mx-auto animate-in fade-in duration-700 pb-20 px-4 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-slate-950 p-4 rounded-xl shadow-lg"><BarChart3 className="text-white" size={32} /></div>
          <div>
            <h2 className="text-slate-950 text-3xl font-black tracking-tighter uppercase leading-none text-left">Review Meeting</h2>
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mt-1 italic opacity-70">Locked Ledger Grid</p>
          </div>
        </div>
        <button onClick={fetchAnalytics} className="bg-white border-2 border-slate-950 px-8 py-3 rounded-xl text-slate-950 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-md">
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-200 mb-10 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative">
            <input type="text" placeholder="Identity or Dept..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-2 border-slate-200 text-slate-950 px-12 py-3 rounded-2xl outline-none focus:border-slate-950 transition-all font-black text-sm" />
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-white border-2 border-slate-200 text-slate-950 px-12 py-3 rounded-2xl outline-none font-black text-xs uppercase" />
            <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-200">
            {['All', 'Daily', 'Weekly', 'Monthly'].map(tab => (
              <button key={tab} onClick={() => setViewType(tab)} className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewType === tab ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-950'}`}>{tab}</button>
            ))}
          </div>
          <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-200">
            {['All', 'Delegation', 'Checklist'].map(cat => (
              <button key={cat} onClick={() => setTaskCategory(cat)} className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${taskCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-950'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      {/* SUMMARY TABLE WRAPPER - SCROLLABLE */}
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-2xl border-b-8 border-b-slate-900 overflow-hidden relative">
        <div className="max-h-[700px] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead className="sticky top-0 z-40 bg-slate-900">
              <tr className="text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-6 py-6 border-r border-slate-700 text-center w-20">NO.</th>
                <th className="px-6 py-6 border-r border-slate-700">PERSONNEL IDENTITY (SUMMARY)</th>
                <th className="px-6 py-6 border-r border-slate-700">DEPT.</th>
                <th className="px-6 py-6 border-r border-slate-700">TASK TYPE</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">TOTAL</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">DONE</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">OVERDUE</th>
                <th className="px-6 py-6 border-r border-slate-700 text-center">LATE (%)</th>
                <th className="px-6 py-6 text-center">NOT DONE (% & COUNT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summaryRows.map((row, index) => {
                const isPoor = parseFloat(getPercentage(row.notDone, row.total)) > 20;
                return (
                  <tr key={row.id} onClick={() => openHistoryModal(row)} className="cursor-pointer hover:bg-slate-50 transition-all group">
                    <td className="px-6 py-5 border-r border-slate-200 text-center text-[10px] font-black text-slate-400 group-hover:text-primary">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-6 py-5 border-r border-slate-200 font-black text-slate-950 text-xs uppercase flex items-center gap-4">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        {row.name}
                    </td>
                    <td className="px-6 py-5 border-r border-slate-200 text-[10px] font-black uppercase text-slate-500">{row.dept}</td>
                    <td className="px-6 py-5 border-r border-slate-200 text-left">
                      <span className={`px-3 py-1 rounded text-[9px] font-black uppercase border-2 ${row.type === 'Checklist' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{row.type}</span>
                    </td>
                    <td className="px-6 py-5 border-r border-slate-200 text-center font-black text-xs">{row.total}</td>
                    <td className="px-6 py-5 border-r border-slate-200 text-center font-black text-xs text-emerald-600">{row.done}</td>
                    <td className="px-6 py-5 border-r border-slate-200 text-center font-black text-xs text-red-600">{row.overdue}</td>
                    <td className="px-6 py-5 border-r border-slate-200 text-center font-black text-[11px] text-slate-400">{getPercentage(row.late, row.total)}</td>
                    <td className={`px-6 py-5 text-center font-black text-[11px] ${isPoor ? 'text-red-600 bg-red-50/50' : 'text-slate-900'}`}>{getPercentage(row.notDone, row.total)} ({row.notDone})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL - CONDENSED VIEW */}
      {showModal && activePerson && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 overflow-hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-white w-full max-w-[1600px] max-h-[92vh] rounded-[2rem] shadow-2xl flex flex-col border-2 border-white/20">
            {/* POPUP HEADER - TIGHTENED */}
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white border-b-2 border-primary z-50">
               <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner"><User size={24} /></div>
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tighter leading-none">{activePerson.name}</h3>
                     <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{activePerson.dept} • HISTORICAL LEDGER</p>
                  </div>
               </div>
               <button onClick={() => setShowModal(false)} className="bg-white/10 hover:bg-red-500 hover:scale-105 p-3 rounded-xl transition-all group shadow-lg"><X size={20} className="group-hover:rotate-90 transition-transform" /></button>
            </div>

            {/* POPUP BODY: CONDENSED SPACING */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-slate-100 relative">
               {activePerson.history.map((week, wIdx) => {
                  const weekStats = activePerson.type === 'Checklist' ? week.checklist : week.delegation;
                  const relativeLabel = getWeekLabel(wIdx); 

                  return (
                    <div key={wIdx} className="animate-in slide-in-from-bottom-4 duration-500">
                       {/* TABLE LABEL BLOCK - TIGHTENED */}
                       <div className="flex items-center gap-4 mb-4 ml-4">
                          <div className="p-2 bg-primary text-white rounded-xl shadow-md"><Clock size={18}/></div>
                          <div className="flex flex-col text-left">
                             <h4 className="text-base font-black uppercase tracking-tighter text-slate-950 leading-none">{relativeLabel}</h4>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Period: {week.period}</span>
                          </div>
                       </div>

                       {/* TABLE CONTAINER: SCROLLABLE */}
                       <div className="bg-white border-2 border-slate-300 rounded-[1.5rem] shadow-xl overflow-x-auto custom-scrollbar ring-4 ring-slate-200/30">
                          <table className="w-full text-left border-collapse min-w-[1550px]">
                             <thead className="sticky top-0 z-30 bg-slate-50 border-b-2 border-slate-200">
                                <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                   <th className="px-5 py-4 border-r border-slate-200 text-center w-20">NO.</th>
                                   <th className="px-5 py-4 border-r border-slate-200 bg-primary/5 text-primary text-left">PERIOD LABEL</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-left">PERSONNEL IDENTITY</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-left">DEPT.</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-left">TASK TYPE</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-center">TOTAL</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-center">DONE</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-center">OVERDUE</th>
                                   <th className="px-5 py-4 border-r border-slate-200 text-center">LATE (%)</th>
                                   <th className="px-5 py-4 text-center bg-red-50/20">NOT DONE (% & COUNT)</th>
                                </tr>
                             </thead>
                             <tbody>
                                <tr className="text-xs font-black text-slate-950 bg-white">
                                   <td className="px-5 py-4 border-r border-slate-200 text-center text-slate-400">01</td>
                                   <td className="px-5 py-4 border-r border-slate-200 font-black text-primary text-[10px] uppercase italic">{relativeLabel}</td>
                                   <td className="px-5 py-4 border-r border-slate-200 uppercase tracking-tight text-left">{activePerson.name}</td>
                                   <td className="px-5 py-4 border-r border-slate-200 text-slate-500 uppercase text-left">{activePerson.dept}</td>
                                   <td className="px-5 py-4 border-r border-slate-200 text-left">
                                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border-2 ${activePerson.type === 'Checklist' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{activePerson.type}</span>
                                   </td>
                                   <td className="px-5 py-4 border-r border-slate-200 text-center">{weekStats.total}</td>
                                   <td className="px-5 py-4 border-r border-slate-200 text-center text-emerald-600">{weekStats.done}</td>
                                   <td className="px-5 py-4 border-r border-slate-200 text-center text-red-600">{weekStats.overdue}</td>
                                   <td className={`px-5 py-4 border-r border-slate-200 text-center font-bold ${parseFloat(getPercentage(weekStats.late, weekStats.total)) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{getPercentage(weekStats.late, weekStats.total)}</td>
                                   <td className={`px-5 py-4 text-center font-bold ${parseFloat(getPercentage(weekStats.notDone, weekStats.total)) > 20 ? 'text-red-600 bg-red-50/30' : ''}`}>{getPercentage(weekStats.notDone, weekStats.total)} ({weekStats.notDone})</td>
                                </tr>
                             </tbody>
                          </table>
                       </div>
                    </div>
                  );
               })}
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
      `}</style>
    </div>
  );
};

export default ReviewMeeting;