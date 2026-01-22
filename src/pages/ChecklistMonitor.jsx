// client/src/pages/ChecklistMonitor.jsx
import React, { useEffect, useState, useCallback } from 'react';
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
  Upload
} from 'lucide-react';

/**
 * CHECKLIST MONITOR v2.0
 * Purpose: Track daily work and team performance
 * Updated: Shows multiple pending dates in one card
 */
const ChecklistMonitor = ({ tenantId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
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
      console.error("Monitor Fetch Error:", err);
      setReport([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchLiveStatus();
  }, [fetchLiveStatus]);

  // Generate pending instances for a task
  const getPendingInstances = (task) => {
    if (!task) return [];
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let instances = [];
    let pointer = new Date(task.nextDueDate);
    pointer.setHours(0, 0, 0, 0);
    
    // Generate instances from nextDueDate up to today
    let loopCount = 0;
    while (pointer <= today && loopCount < 30) {
      loopCount++;
      const dateStr = pointer.toDateString();
      
      // Check if this date was already completed
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
          status: isPast ? 'OVERDUE' : isToday ? 'TODAY' : 'UPCOMING'
        });
      }
      
      // Move to next day for daily tasks
      if (task.frequency === 'Daily') {
        pointer.setDate(pointer.getDate() + 1);
      } else if (task.frequency === 'Weekly') {
        pointer.setDate(pointer.getDate() + 7);
      } else {
        break; // For monthly/quarterly, just show current instance
      }
      
      pointer.setHours(0, 0, 0, 0);
    }
    
    return instances;
  };

  const handleMarkDone = async (e) => {
    e.preventDefault();
    if (!activeTask || !selectedDate) return;
    
    const formData = new FormData();
    formData.append("checklistId", activeTask._id);
    formData.append("instanceDate", selectedDate);
    formData.append("remarks", remarks || "Marked as done by admin");
    formData.append("completedBy", userId);
    if (selectedFile) formData.append("evidence", selectedFile);
    
    try {
      setIsSubmitting(true);
      await API.post("/tasks/checklist-done", formData);
      alert("Success! Work marked as done.");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      setSelectedDate(null);
      fetchLiveStatus();
    } catch (err) {
      alert("Error: Failed to mark as done.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonthlyStats = (history) => {
    if (!Array.isArray(history)) return { count: 0 };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const actualWork = history.filter(log => {
      const isDone = log.action === 'Completed' || log.action === 'Administrative Completion';
      const logDate = new Date(log.timestamp);
      return isDone && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    return { count: actualWork.length };
  };

  const getOverallStatus = (task) => {
    if (!task) return { label: 'UNKNOWN', isDone: false };
    
    const instances = getPendingInstances(task);
    
    if (instances.length === 0) {
      return { 
        label: 'ALL DONE', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20', 
        icon: <CheckCircle size={12} />, 
        isDone: true 
      };
    }
    
    const hasMissed = instances.some(i => i.isPast);
    const hasToday = instances.some(i => i.isToday);
    
    if (hasMissed) {
      return { 
        label: `${instances.filter(i => i.isPast).length} Over due`, 
        color: 'text-red-600', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/30', 
        icon: <AlertCircle size={12} />, 
        isDone: false 
      };
    }
    
    if (hasToday) {
      return { 
        label: 'DUE TODAY', 
        color: 'text-amber-600', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/30', 
        icon: <Clock size={12} />, 
        isDone: false 
      };
    }
    
    return { 
      label: 'UPCOMING', 
      color: 'text-primary', 
      bg: 'bg-primary/10', 
      border: 'border-primary/30', 
      icon: <Calendar size={12} />, 
      isDone: false 
    };
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Loading...</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
        <div>
            <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter flex items-center gap-4 uppercase leading-none">
              <Activity className="text-primary" size={36} /> Work Monitor
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80">Track daily tasks and team performance</p>
        </div>
        <button onClick={fetchLiveStatus} className="group bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-xl hover:shadow-primary/5">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh 
        </button>
      </div>

      {/* TABLE HEADER */}
      <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] px-10 py-6 bg-card backdrop-blur-xl rounded-t-[2.5rem] border border-border font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.25em] items-center shadow-lg">
        <div>Task Name</div>
        <div>Assigned To</div>
        <div>Frequency</div>
        <div>This Month</div>
        <div>Last Done</div>
        <div>Status</div>
        <div className="text-right">Details</div>
      </div>

      {/* TASK LIST */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-[1.5rem] lg:rounded-b-[2.5rem] lg:rounded-t-none overflow-hidden shadow-2xl transition-colors duration-500">
        {report.map(task => {
          const status = getOverallStatus(task);
          const stats = getMonthlyStats(task.history);
          const isExpanded = expandedId === task._id;
          const instances = getPendingInstances(task);

          return (
            <div key={task._id} className={`flex flex-col border-b border-border last:border-0 transition-all ${status.isDone ? 'opacity-60 grayscale' : 'opacity-100'}`}>
              <div 
                onClick={() => setExpandedId(isExpanded ? null : task._id)}
                className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] items-center px-6 py-6 lg:px-10 lg:py-7 cursor-pointer hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] ${isExpanded ? 'bg-primary/[0.03] dark:bg-primary/[0.05]' : ''}`}
              >
                <div className={`font-black text-sm lg:text-base tracking-tight truncate pr-4 ${status.isDone ? 'text-slate-400' : 'text-foreground'}`}>
                  <span className="lg:hidden text-[9px] block text-primary mb-1 uppercase tracking-widest font-black">Task Name:</span>
                  {task.taskName}
                </div>
                
                <div className="hidden lg:block text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-tight truncate">
                  {task.doerId?.name || 'Not Assigned'}
                </div>
                
                <div className="hidden lg:block text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
                  {task.frequency}
                </div>
                
                <div className="mt-2 lg:mt-0 text-primary font-black text-[11px] uppercase tracking-tighter">
                  <span className="lg:hidden text-slate-500 mr-2">Total Done:</span>
                  {stats.count} Times
                </div>
                
                <div className="hidden lg:block text-xs text-slate-400 dark:text-slate-500 font-bold">
                  {task.lastCompleted ? new Date(task.lastCompleted).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Done Yet'}
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2 mt-3 lg:mt-0">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 lg:px-3 lg:py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-widest whitespace-nowrap shadow-sm ${status.bg} ${status.color} ${status.border}`}>
                    {status.icon} {status.label}
                  </span>
                  {instances.length > 1 && (
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      +{instances.length - 1} more
                    </span>
                  )}
                </div>

                <div className="hidden lg:flex justify-end text-slate-400 dark:text-slate-600">
                  {isExpanded ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* EXPANDED VIEW */}
              {isExpanded && (
                <div className="bg-background/80 dark:bg-slate-950/40 p-6 lg:p-10 border-t border-border animate-in slide-in-from-top-4 duration-500">
                   
                   {/* PENDING DATES SECTION */}
                   {instances.length > 0 && (
                     <div className="mb-10">
                       <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-6 px-1">Pending Work Dates</h5>
                       <div className="grid grid-cols-1 gap-4">
                         {instances.map((instance, idx) => (
                           <div 
                             key={idx}
                             className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl border transition-all gap-4 ${
                               instance.isPast 
                                 ? 'bg-red-500/5 border-red-500/20' 
                                 : instance.isToday 
                                 ? 'bg-amber-500/5 border-amber-500/20' 
                                 : 'bg-card border-border'
                             }`}
                           >
                             <div className="flex items-center gap-4 flex-1">
                               <div className={`p-3 rounded-xl border ${
                                 instance.isPast 
                                   ? 'bg-red-500/10 border-red-500/20' 
                                   : instance.isToday 
                                   ? 'bg-amber-500/10 border-amber-500/20' 
                                   : 'bg-primary/10 border-primary/20'
                               }`}>
                                 <Calendar size={20} className={
                                   instance.isPast 
                                     ? 'text-red-600' 
                                     : instance.isToday 
                                     ? 'text-amber-600' 
                                     : 'text-primary'
                                 } />
                               </div>
                               <div>
                                 <p className="text-foreground font-black text-sm uppercase tracking-tight">
                                   {instance.date.toLocaleDateString('en-IN', { 
                                     weekday: 'short',
                                     day: '2-digit', 
                                     month: 'short', 
                                     year: 'numeric' 
                                   })}
                                 </p>
                                 <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                                   instance.isPast 
                                     ? 'text-red-600' 
                                     : instance.isToday 
                                     ? 'text-amber-600' 
                                     : 'text-primary'
                                 }`}>
                                   {instance.status}
                                 </p>
                               </div>
                             </div>
                             
                             {(userRoles.includes('Admin') || userRoles.includes('Coordinator')) && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveTask(task);
                                   setSelectedDate(instance.date.toISOString());
                                   setShowModal(true);
                                 }}
                                 className={`w-full md:w-auto px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg ${
                                   instance.isPast 
                                     ? 'bg-red-600 hover:bg-red-500 text-white' 
                                     : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                 }`}
                               >
                                 <CheckCircle size={14} className="inline mr-2" />
                                 Mark as Done
                               </button>
                             )}
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* TASK DETAILS */}
                      <div className="space-y-6">
                        <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] px-1">Task Details</h5>
                        <div className="bg-card p-6 rounded-3xl border border-border shadow-lg space-y-5">
                            <div className="flex justify-between border-b border-border pb-4">
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Assigned To:</span>
                                <span className="text-foreground font-black text-xs uppercase tracking-tight">{task.doerId?.name || 'Not Assigned'}</span>
                            </div>
                            <div className="flex justify-between border-b border-border pb-4">
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">This Month:</span>
                                <span className="text-primary font-black text-xs">{stats.count} Times Done</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Next Due:</span>
                                <span className="text-foreground font-black text-xs">{task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Set'}</span>
                            </div>
                        </div>
                      </div>

                      {/* HISTORY */}
                      <div className="space-y-6">
                        <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] px-1">Recent History</h5>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-card p-6 rounded-3xl border border-border shadow-lg flex flex-col gap-6">
                          {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().slice(0, 10).map((log, i) => (
                            <div key={i} className="pl-6 border-l-2 border-border relative flex flex-col gap-2 pb-2">
                              <div className="absolute top-1 -left-[5px] w-2 h-2 rounded-full bg-primary/40 border border-primary/20 shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                <span className="text-primary">{log.action === 'Checklist Created' ? 'CREATED' : log.action}</span>
                                <span className="text-slate-400 dark:text-slate-600">{new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold leading-relaxed">"{log.remarks || 'Work completed successfully'}"</p>
                              {log.attachmentUrl && (
                                <a href={log.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-2 hover:opacity-70 transition-opacity">
                                  <ExternalLink size={12} /> View Proof
                                </a>
                              )}
                            </div>
                          )) : <p className="text-slate-400 dark:text-slate-700 text-[10px] text-center py-10 font-black uppercase tracking-[0.3em]">No History Yet</p>}
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
        <div className="fixed inset-0 bg-slate-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 lg:p-12 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowModal(false); setSelectedFile(null); setRemarks(""); }} className="absolute top-8 right-8 text-slate-400 hover:text-foreground transition-colors active:scale-90"><X size={24} /></button>
            
            <div className="mb-10">
              <h3 className="text-primary text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <CheckCircle size={28} /> Mark as Done
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mt-2">Task: {activeTask?.taskName}</p>
              <p className="text-slate-400 text-[10px] font-bold mt-1">Date: {selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>

            <form onSubmit={handleMarkDone} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Work Details</label>
                <textarea 
                  required 
                  placeholder="Describe what was done..." 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full h-32 bg-background border border-border text-foreground p-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold resize-none shadow-inner" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Upload Proof (Optional)</label>
                <div className="relative border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/30 transition-all">
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files[0])} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <Upload size={32} className={`mx-auto mb-3 ${selectedFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <p className="text-sm font-black text-foreground">{selectedFile ? selectedFile.name : "Click to upload image"}</p>
                  <p className="text-[10px] text-slate-500 mt-2">JPG, PNG (Max 5MB)</p>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                {isSubmitting ? "Saving..." : "save"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default ChecklistMonitor;