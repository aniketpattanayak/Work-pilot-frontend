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
  Send
} from 'lucide-react';

/**
 * CHECKLIST MONITOR: OPERATIONAL INTEGRITY TERMINAL v1.5
 * Purpose: Real-time oversight of routine protocols with adaptive theme logic.
 * Responsive: Handles complex data grids with graceful mobile degradation.
 */
const ChecklistMonitor = ({ tenantId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [remarks, setRemarks] = useState("");
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

  const handleForceComplete = async (e) => {
    e.preventDefault();
    if (!activeTask) return;
    try {
      setIsSubmitting(true);
      await API.post("/tasks/coordinator-force-done", {
        taskId: activeTask._id,
        coordinatorId: userId,
        remarks: remarks || "Marked as Done by Supervisor."
      });
      alert("Success: Tactical status override successful.");
      setShowModal(false);
      setRemarks("");
      fetchLiveStatus();
    } catch (err) {
      alert("Error: Command override failed.");
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

  const getStatus = (task) => {
    if (!task) return { label: 'UNKNOWN' };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDoneStr = task.lastCompleted ? new Date(task.lastCompleted).toISOString().split('T')[0] : null;
    const nextDue = new Date(task.nextDueDate);
    const nextDueStr = nextDue.toISOString().split('T')[0];

    if (lastDoneStr === todayStr) {
        return { label: 'DONE TODAY', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <CheckCircle size={12} />, isDone: true };
    }
    if (nextDueStr === todayStr) {
        return { label: 'PENDING', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Clock size={12} />, isDone: false };
    }
    if (nextDue < now) {
        return { label: 'MISSED', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertCircle size={12} />, isDone: false };
    }
    return { label: 'UPCOMING', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', icon: <Calendar size={12} />, isDone: false };
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
      
      {/* HEADER: Adaptive Spacing */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
        <div>
            <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter flex items-center gap-4 uppercase leading-none">
              <Activity className="text-primary" size={36} /> Work Monitor
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Track daily routine and staff performances.</p>
        </div>
        <button onClick={fetchLiveStatus} className="group bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-xl hover:shadow-primary/5">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh 
        </button>
      </div>

      {/* Grid Table Header - Adaptive Visibility */}
      <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] px-10 py-6 bg-card backdrop-blur-xl rounded-t-[2.5rem] border border-border font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.25em] items-center shadow-lg">
        <div>Task Name</div>
        <div>Assigned To</div>
        <div>Schedule</div>
        <div>Total done</div>
        <div>Last done</div>
        <div>Status</div>
        <div className="text-right">Info</div>
      </div>

      {/* DATA TERMINAL: Responsive List */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-[1.5rem] lg:rounded-b-[2.5rem] lg:rounded-t-none overflow-hidden shadow-2xl transition-colors duration-500">
        {report.map(task => {
          const status = getStatus(task);
          const stats = getMonthlyStats(task.history);
          const isExpanded = expandedId === task._id;

          return (
            <div key={task._id} className={`flex flex-col border-b border-border last:border-0 transition-all ${status.isDone ? 'opacity-60 grayscale' : 'opacity-100'}`}>
              <div 
                onClick={() => setExpandedId(isExpanded ? null : task._id)}
                className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] items-center px-6 py-6 lg:px-10 lg:py-7 cursor-pointer hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] ${isExpanded ? 'bg-primary/[0.03] dark:bg-primary/[0.05]' : ''}`}
              >
                <div className={`font-black text-sm lg:text-base tracking-tight truncate pr-4 ${status.isDone ? 'text-slate-400' : 'text-foreground'}`}>
                  <span className="lg:hidden text-[9px] block text-primary mb-1 uppercase tracking-widest font-black">Directive:</span>
                  {task.taskName}
                </div>
                
                <div className="hidden lg:block text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-tight truncate">
                  {task.doerId?.name || 'Unassigned Node'}
                </div>
                
                <div className="hidden lg:block text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
                  {task.frequency}
                </div>
                
                <div className="mt-2 lg:mt-0 text-primary font-black text-[11px] uppercase tracking-tighter">
                  <span className="lg:hidden text-slate-500 mr-2">Quota:</span>
                  {stats.count} Operations This Month
                </div>
                
                <div className="hidden lg:block text-xs text-slate-400 dark:text-slate-500 font-bold">
                  {task.lastCompleted ? new Date(task.lastCompleted).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                </div>
                
                {/* Status Badge: Adaptive Padding */}
                <div className="flex items-center mt-3 lg:mt-0">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 lg:px-3 lg:py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-widest whitespace-nowrap shadow-sm ${status.bg} ${status.color} ${status.border}`}>
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="hidden lg:flex justify-end text-slate-400 dark:text-slate-600">
                  {isExpanded ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* EXPANDED AUDIT VIEW */}
              {isExpanded && (
                <div className="bg-background/80 dark:bg-slate-950/40 p-6 lg:p-10 border-t border-border animate-in slide-in-from-top-4 duration-500">
                   
                   {/* Command Override Panel */}
                   {(userRoles.includes('Admin') || userRoles.includes('Coordinator')) && !status.isDone && (
                     <div className="mb-10 p-6 lg:p-8 bg-primary/5 border border-primary/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
                              <Zap size={24} className="text-primary" />
                            </div>
                            <div>
                                <h4 className="text-foreground text-base font-black uppercase tracking-tight">Administrative Override</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mt-1">Manual node verification required.</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setShowModal(true); }} className="w-full md:w-auto bg-primary hover:bg-sky-400 text-white dark:text-slate-950 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">
                          Execute Completion
                        </button>
                     </div>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] px-1">Tactical Record</h5>
                        <div className="bg-card p-6 rounded-3xl border border-border shadow-lg space-y-5">
                            <div className="flex justify-between border-b border-border pb-4">
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Active Personnel:</span>
                                <span className="text-foreground font-black text-xs uppercase tracking-tight">{task.doerId?.name || '---'}</span>
                            </div>
                            <div className="flex justify-between border-b border-border pb-4">
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Monthly Output:</span>
                                <span className="text-primary font-black text-xs">{stats.count} Units Completed</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Next Synchronization:</span>
                                <span className="text-foreground font-black text-xs">{task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString([], { dateStyle: 'medium' }) : 'AWAITING'}</span>
                            </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] px-1">Mission Audit Trail</h5>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-card p-6 rounded-3xl border border-border shadow-lg flex flex-col gap-6">
                          {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().slice(0, 10).map((log, i) => (
                            <div key={i} className="pl-6 border-l-2 border-border relative flex flex-col gap-2 pb-2">
                              <div className="absolute top-1 -left-[5px] w-2 h-2 rounded-full bg-primary/40 border border-primary/20 shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                <span className="text-primary">{log.action === 'Checklist Created' ? 'INITIALIZATION' : log.action}</span>
                                <span className="text-slate-400 dark:text-slate-600">{new Date(log.timestamp).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold italic leading-relaxed uppercase tracking-tight">"{log.remarks || 'Standard protocol verification.'}"</p>
                              {log.attachmentUrl && (
                                <a href={log.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-2 hover:opacity-70 transition-opacity">
                                  <ExternalLink size={12} /> View Encrypted Evidence
                                </a>
                              )}
                            </div>
                          )) : <p className="text-slate-400 dark:text-slate-700 text-[10px] text-center py-10 font-black uppercase tracking-[0.3em]">Telemetry Database Empty</p>}
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* INTERVENTION MODAL: Adaptive Surface */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 lg:p-12 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-foreground transition-colors active:scale-90"><X size={24} /></button>
            
            <div className="mb-10">
              <h3 className="text-primary text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <ShieldCheck size={28} /> Terminal Override
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mt-2">Target Node: {activeTask?.taskName}</p>
            </div>

            <form onSubmit={handleForceComplete} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Override Remarks</label>
                <textarea 
                  required 
                  placeholder="Document authorization reason..." 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full h-32 bg-background border border-border text-foreground p-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold resize-none shadow-inner uppercase tracking-tight" 
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-5 rounded-2xl bg-primary hover:bg-sky-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                {isSubmitting ? "Transmitting..." : "Confirm Protocol Completion"}
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