// client/src/pages/ChecklistMonitor.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import API from '../api/axiosConfig'; 
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar, 
  RefreshCcw,
  User,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Zap, 
  X,
  Send,
  Upload,
  Filter,
  Search as SearchIcon,
  LayoutGrid,
  ClipboardList,
  Fingerprint
} from 'lucide-react';

/**
 * CHECKLIST MONITOR v3.1
 * Updated: Operational Ledger now shows both "Instance Date" (Target) and "Submission Date" (Actual).
 */
const ChecklistMonitor = ({ tenantId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeFrequency, setActiveFrequency] = useState('All Cycles');
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const sessionUser = JSON.parse(localStorage.getItem('user'));
  const userRoles = Array.isArray(sessionUser?.roles) ? sessionUser.roles : (sessionUser?.role ? [sessionUser.role] : []);
  const userId = sessionUser?.id || sessionUser?._id;

  const fetchLiveStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/tasks/checklist-all/${currentTenantId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setReport(data);
    } catch (err) {
      console.error("Ledger Fetch Error:", err);
      setReport([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => { fetchLiveStatus(); }, [fetchLiveStatus]);

  /**
   * PROTOCOL INSTANCE CALCULATOR
   */
  const getPendingInstances = (task) => {
    if (!task) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let instances = [];
    let pointer = new Date(task.nextDueDate);
    pointer.setHours(0, 0, 0, 0);
    
    let loopCount = 0;
    while (pointer <= today && loopCount < 30) {
      loopCount++;
      const dateStr = pointer.toDateString();
      
      const isDone = task.history && task.history.some(h => {
        if (h.action !== "Completed" && h.action !== "Administrative Completion") return false;
        const historyDate = new Date(h.instanceDate || h.timestamp);
        historyDate.setHours(0, 0, 0, 0);
        return historyDate.toDateString() === dateStr;
      });
      
      if (!isDone) {
        const isToday = dateStr === today.toDateString();
        const isPast = pointer < today;
        instances.push({
          date: new Date(pointer),
          dateStr: dateStr,
          isToday: isToday,
          isPast: isPast,
          status: isPast ? 'OVERDUE' : 'TODAY'
        });
      }
      
      if (task.frequency === 'Daily') pointer.setDate(pointer.getDate() + 1);
      else if (task.frequency === 'Weekly') pointer.setDate(pointer.getDate() + 7);
      else break; 
      pointer.setHours(0, 0, 0, 0);
    }
    return instances;
  };

  const getOverallStatus = (task) => {
    if (!task) return { label: 'UNKNOWN', isDone: false };
    const instances = getPendingInstances(task);
    if (instances.length === 0) return { label: 'ALL DONE', color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <CheckCircle size={12} />, isDone: true };
    const hasMissed = instances.some(i => i.isPast);
    const hasToday = instances.some(i => i.isToday);
    if (hasMissed) return { label: 'OVERDUE', color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertCircle size={12} />, isDone: false, count: instances.filter(i => i.isPast).length };
    if (hasToday) return { label: 'DUE TODAY', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Clock size={12} />, isDone: false };
    return { label: 'UPCOMING', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', icon: <Calendar size={12} />, isDone: false };
  };

  /**
   * CATEGORIZED FILTER & SEARCH ENGINE
   */
  const filteredReport = useMemo(() => {
    return report.filter(task => {
      const statusObj = getOverallStatus(task);
      const instances = getPendingInstances(task);

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = task.taskName?.toLowerCase().includes(term);
        const matchesDesc = task.description?.toLowerCase().includes(term);
        const matchesDoer = task.doerId?.name?.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc && !matchesDoer) return false;
      }

      if (selectedFilterDate) {
        const searchDateStr = selectedFilterDate.toDateString();
        const matchesDue = instances.some(i => i.dateStr === searchDateStr);
        const matchesHistory = task.history?.some(h => new Date(h.instanceDate || h.timestamp).toDateString() === searchDateStr);
        if (!matchesDue && !matchesHistory) return false;
      }

      if (activeTab !== 'All') {
        if (activeTab === 'Pending' && statusObj.isDone) return false;
        if (activeTab === 'Overdue' && statusObj.label !== 'OVERDUE') return false;
        if (activeTab === 'Due Today' && statusObj.label !== 'DUE TODAY') return false;
      }
      
      if (activeFrequency !== 'All Cycles') {
        const freqMap = activeFrequency === 'Half Yearly' ? 'Half-Yearly' : activeFrequency;
        if (task.frequency !== freqMap) return false;
      }

      return true;
    });
  }, [report, activeTab, activeFrequency, searchTerm, selectedFilterDate]);

  const handleMarkDone = async (e) => {
    e.preventDefault();
    if (!activeTask || !selectedDate) return;
    const formData = new FormData();
    formData.append("checklistId", activeTask._id);
    formData.append("instanceDate", selectedDate);
    formData.append("remarks", remarks || "Marked as done via Monitor");
    formData.append("completedBy", userId);
    if (selectedFile) formData.append("evidence", selectedFile);
    
    try {
      setIsSubmitting(true);
      await API.post("/tasks/checklist-done", formData);
      alert("Registry Updated Successfully.");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchLiveStatus();
    } catch (err) { alert("Transmission Error."); } 
    finally { setIsSubmitting(false); }
  };

  const getMonthlyStats = (history) => {
    if (!Array.isArray(history)) return { count: 0 };
    const now = new Date();
    const actualWork = history.filter(log => {
      const isDone = log.action === 'Completed' || log.action === 'Administrative Completion';
      const logDate = new Date(log.timestamp);
      return isDone && logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    });
    return { count: actualWork.length };
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={48} />
      <span className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Synchronizing...</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30 px-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
            <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter flex items-center gap-4 uppercase leading-none">
              <Activity className="text-primary" size={36} /> Work Monitor
            </h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Precision Industrial Performance Ledger</p>
        </div>
        <button onClick={fetchLiveStatus} className="group bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh 
        </button>
      </div>

      {/* SEARCH & DATE SEARCH TERMINAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="relative group">
          <input 
            type="text"
            placeholder="Search Name, Description or Doer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border px-12 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors" size={20} />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={18}/></button>}
        </div>

        <div className="relative group">
            <DatePicker
              selected={selectedFilterDate}
              onChange={(date) => setSelectedFilterDate(date)}
              placeholderText="FILTER BY SPECIFIC CALENDAR DATE"
              className="w-full bg-card border border-border px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 shadow-inner"
            />
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors" size={20} />
            {selectedFilterDate && <button onClick={() => setSelectedFilterDate(null)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={18}/></button>}
        </div>
      </div>

      {/* CATEGORIZED FILTER TABS */}
      <div className="space-y-6 mb-10">
        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 flex items-center gap-2">
            <Clock size={12} className="text-primary"/> Timeline Perspective
          </label>
          <div className="flex flex-wrap gap-2">
            {['All', 'Overdue', 'Due Today'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${activeTab === tab ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-card text-slate-500 border-border hover:border-primary/40'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 flex items-center gap-2">
            <RefreshCcw size={12} className="text-emerald-500"/> Operational Cycle
          </label>
          <div className="flex flex-wrap gap-2">
            {['All Cycles', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly'].map((freq) => (
              <button key={freq} onClick={() => setActiveFrequency(freq)} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border ${activeFrequency === freq ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-card text-slate-400 border-border hover:border-emerald-500/40'}`}>
                {freq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE HEADER */}
      <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] px-10 py-6 bg-card rounded-t-[2.5rem] border border-border font-black text-slate-500 text-[9px] uppercase tracking-[0.25em] items-center shadow-lg">
        <div>Task Description</div>
        <div>Personnel</div>
        <div>Cycle</div>
        <div>Activity (Mo)</div>
        <div>Last Log</div>
        <div>Registry State</div>
        <div className="text-right">Tuning</div>
      </div>

      {/* TASK LIST */}
      <div className="flex flex-col bg-card border border-border rounded-b-[2.5rem] overflow-hidden shadow-2xl transition-colors">
        {filteredReport.map(task => {
          const status = getOverallStatus(task);
          const stats = getMonthlyStats(task.history);
          const isExpanded = expandedId === task._id;
          const instances = getPendingInstances(task);

          return (
            <div key={task._id} className={`flex flex-col border-b border-border last:border-0 transition-all ${status.isDone ? 'opacity-50 grayscale' : ''}`}>
              <div 
                onClick={() => setExpandedId(isExpanded ? null : task._id)}
                className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] items-center px-6 py-7 lg:px-10 cursor-pointer hover:bg-primary/[0.02] ${isExpanded ? 'bg-primary/[0.03]' : ''}`}
              >
                <div className={`font-black text-sm lg:text-base tracking-tight pr-4 ${isExpanded ? 'whitespace-normal' : 'truncate'} text-foreground`}>
                  <span className="lg:hidden text-[9px] block text-primary mb-1 uppercase tracking-widest font-black">Technical Description:</span>
                  {task.description || task.taskName}
                </div>
                
                <div className="hidden lg:block text-slate-500 text-xs font-black uppercase tracking-tight truncate">
                  {task.doerId?.name || 'Unassigned'}
                </div>
                
                <div className="hidden lg:block text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  {task.frequency}
                </div>
                
                <div className="mt-2 lg:mt-0 text-primary font-black text-[11px] uppercase tracking-tighter">
                  <span className="lg:hidden text-slate-500 mr-2">Usage:</span>
                  {stats.count} Instances
                </div>
                
                <div className="hidden lg:block text-xs text-slate-400 font-bold uppercase tracking-tighter">
                  {task.lastCompleted ? new Date(task.lastCompleted).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'NOT LOGGED'}
                </div>
                
                <div className="flex items-center gap-2 mt-3 lg:mt-0">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 lg:px-3 lg:py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-widest shadow-sm ${status.bg} ${status.color} ${status.border}`}>
                    {status.icon} {status.label}
                  </span>
                  {instances.length > 1 && (
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">+{instances.length - 1} BACKLOG</span>
                  )}
                </div>

                <div className="hidden lg:flex justify-end text-slate-400">
                  {isExpanded ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* EXPANDED SYSTEM VIEW */}
              {isExpanded && (
                <div className="bg-background/50 p-6 lg:p-12 border-t border-border animate-in slide-in-from-top-4 duration-500">
                   
                   {/* PENDING DATES GRID */}
                   {instances.length > 0 && (
                     <div className="mb-12">
                       <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                         <LayoutGrid size={16}/> Protocol Backlog Authorization
                       </h5>
                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                         {instances.map((instance, idx) => (
                           <div key={idx} className={`flex justify-between items-center p-6 rounded-[1.5rem] border transition-all ${instance.isPast ? 'bg-red-500/5 border-red-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                             <div className="flex items-center gap-5">
                               <div className={`p-3 rounded-xl ${instance.isPast ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                 <Calendar size={20} />
                               </div>
                               <div>
                                 <p className="text-foreground font-black text-sm uppercase tracking-tight">{instance.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                 <p className={`text-[10px] font-black uppercase tracking-widest ${instance.isPast ? 'text-red-500' : 'text-amber-600'}`}>{instance.status}</p>
                               </div>
                             </div>
                             {(userRoles.includes('Admin') || userRoles.includes('Coordinator')) && (
                               <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setSelectedDate(instance.date.toISOString()); setShowModal(true); }} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl transition-all active:scale-90 ${instance.isPast ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                 DONE
                               </button>
                             )}
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      {/* TECHNICAL PARAMETERS */}
                      <div className="space-y-8">
                        <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.4em] px-2">Directive Parameters</h5>
                        <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-xl space-y-8">
                            <div className="border-b border-border pb-6">
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block mb-3 italic">Node Identifier (Task Name):</span>
                                <span className="text-foreground font-black text-lg uppercase leading-tight tracking-tighter">{task.taskName}</span>
                            </div>
                            <div className="border-b border-border pb-6">
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block mb-3 italic">Operational Briefing (Description):</span>
                                <p className="text-foreground font-bold text-base leading-relaxed whitespace-pre-wrap">{task.description || "NO MISSION DATA"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Personnel Mapping:</span>
                                    <div className="flex items-center gap-2 text-foreground font-black text-sm uppercase"><User size={14} className="text-primary" /> {task.doerId?.name || 'Unassigned'}</div>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Target Sync:</span>
                                    <div className="flex items-center gap-2 text-foreground font-black text-sm uppercase"><Clock size={14} className="text-emerald-500" /> {task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* PERFORMANCE HISTORY LOG (OPERATIONAL LEDGER) */}
                      <div className="space-y-8">
                        <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.4em] px-2">Operational Ledger</h5>
                        <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-card p-8 rounded-[2.5rem] border border-border shadow-xl flex flex-col gap-8">
                          {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().slice(0, 15).map((log, i) => (
                            <div key={i} className="pl-8 border-l-4 border-primary/20 relative flex flex-col gap-3 pb-2 transition-all hover:border-primary">
                              <div className="absolute top-1 -left-[10px] w-4 h-4 rounded-full bg-primary border-4 border-card shadow-lg" />
                              
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Fingerprint size={12} className="opacity-50" />
                                    {log.action === 'Checklist Created' ? 'NODE INITIALIZED' : log.action}
                                  </span>
                                  {/* INSTANCE DATE DISPLAY (The day work was meant for) */}
                                  {log.instanceDate && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1 uppercase tracking-tighter">
                                      <Calendar size={12} /> Work for: {new Date(log.instanceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>

                                {/* ACTUAL SUBMISSION DATE (Timestamp) */}
                                <div className="text-slate-400 text-[9px] font-black uppercase tracking-tighter flex flex-col items-end">
                                  <span className="opacity-60 italic lowercase">Sync timestamp:</span>
                                  <span>Logged: {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  <span>Time: {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>

                              <p className="text-slate-500 font-bold text-sm leading-relaxed italic mt-1">"{log.remarks || 'Mission completed.'}"</p>
                              
                              {log.attachmentUrl && (
                                <a href={log.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-3 hover:opacity-70">
                                  <ExternalLink size={14} /> View Technical Snapshot
                                </a>
                              )}
                            </div>
                          )) : <div className="text-center py-20 opacity-20"><ClipboardList size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Registry Log Empty</p></div>}
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MARK AS DONE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-xl rounded-[3rem] p-10 lg:p-14 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95">
            <button onClick={() => { setShowModal(false); setSelectedFile(null); setRemarks(""); }} className="p-2 absolute top-10 right-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90"><X size={28} /></button>
            <div className="mb-12">
              <h3 className="text-primary text-3xl font-black uppercase tracking-tighter flex items-center gap-4"><CheckCircle size={36} /> Authorize Sync</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest mt-4 text-xs">Directive: {activeTask?.taskName}</p>
              <p className="text-slate-400 font-black text-[11px] mt-2 tracking-[0.2em]">Timeline Reference: {selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <form onSubmit={handleMarkDone} className="space-y-10">
              <textarea required placeholder="Mission execution debrief..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full h-40 bg-background border border-border text-foreground p-6 rounded-3xl outline-none focus:ring-8 focus:ring-primary/5 text-base font-bold shadow-inner resize-none" />
              <div className="relative border-2 border-dashed border-border rounded-3xl p-10 text-center hover:border-primary/50 transition-all bg-background/50">
                  <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload size={40} className={`mx-auto mb-4 ${selectedFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">{selectedFile ? selectedFile.name : "Authorize Snapshot Upload"}</p>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-7 rounded-[2rem] bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 disabled:opacity-50">Synchronize Registry Node</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ChecklistMonitor;