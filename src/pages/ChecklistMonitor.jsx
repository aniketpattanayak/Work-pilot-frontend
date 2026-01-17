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
  FileSearch,
  Lock,
  Database
} from 'lucide-react';

/**
 * CHECKLIST MONITOR: OPERATIONAL SURVEILLANCE NODE
 * Purpose: Provides immutable oversight of recurring factory processes and S3 audit trails.
 * Logic: Supports administrative overrides and real-time efficiency barometer calculations.
 */
const ChecklistMonitor = ({ tenantId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // --- ADMINISTRATIVE OVERRIDE PROTOCOL STATES ---
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
      console.error("Monitor Telemetry Error:", err);
      setReport([]); 
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchLiveStatus();
  }, [fetchLiveStatus]);

  // --- COMMAND: ADMINISTRATIVE OVERRIDE ---
  const handleForceComplete = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      setIsSubmitting(true);
      await API.post("/tasks/coordinator-force-done", {
        taskId: activeTask._id,
        coordinatorId: userId,
        remarks: remarks || "Administrative completion via Surveillance Node override."
      });

      alert("Node Synchronized: Task finalized via administrative authority.");
      setShowModal(false);
      setRemarks("");
      fetchLiveStatus();
    } catch (err) {
      alert("Override Failure: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonthlyStats = (history) => {
    if (!Array.isArray(history) || history.length === 0) return { count: 0, total: 30 };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthCompletions = history.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    return { count: monthCompletions.length, total: now.getDate() };
  };

  const getStatus = (task) => {
    if (!task) return { label: 'OFFLINE' };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDoneStr = task.lastCompleted ? new Date(task.lastCompleted).toISOString().split('T')[0] : null;
    const nextDue = new Date(task.nextDueDate);

    if (lastDoneStr === todayStr) {
        return { label: 'VERIFIED TODAY', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', icon: <CheckCircle size={14} />, isDone: true };
    }
    if (nextDue.toISOString().split('T')[0] === todayStr) {
        return { label: 'PENDING ACTION', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', icon: <Clock size={14} />, isDone: false };
    }
    if (nextDue < now) {
        return { label: 'NODE BREACH (MISSED)', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', icon: <AlertCircle size={14} />, isDone: false };
    }
    return { label: 'SCHEDULED', color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', icon: <Calendar size={14} />, isDone: false };
  };

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[600px] gap-8">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={64} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.5em] text-xs">Generating Operational Audit...</span>
        <span className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest opacity-50">Synchronizing S3 Document Store</span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 pb-20">
      
      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter flex items-center gap-5 uppercase">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Activity className="text-primary" size={32} />
              </div>
              Operational Surveillance
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Immutable Verification of Recurring Assets & AWS S3 Document Proofs
            </p>
        </div>
        <button 
            onClick={fetchLiveStatus} 
            className="group bg-card hover:bg-background border border-border px-10 py-5 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5"
        >
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Sync Telemetry
        </button>
      </div>

      {/* --- RESPONSIVE MONITORING GRID --- */}
      <div className="bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-500">
        
        {/* Table Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.2fr_1fr_0.4fr] px-12 py-8 bg-background/50 backdrop-blur-md border-b border-border font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.3em]">
            <div>Process Identity</div>
            <div>Auth Node</div>
            <div>Frequency</div>
            <div>Efficiency Index</div>
            <div>Last Verification</div>
            <div>Maturity State</div>
            <div className="text-right">Audit</div>
        </div>

        <div className="flex flex-col divide-y divide-border/40">
            {report.map(task => {
            const status = getStatus(task);
            const stats = getMonthlyStats(task.history);
            const isExpanded = expandedId === task._id;

            return (
                <div key={task._id} className={`flex flex-col transition-all duration-500 ${status.isDone ? 'bg-background/20 opacity-70' : ''}`}>
                
                {/* DATA ROW */}
                <div 
                    onClick={() => setExpandedId(isExpanded ? null : task._id)}
                    className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_1.5fr_1.2fr_1fr_0.4fr] items-center px-8 lg:px-12 py-8 lg:py-10 cursor-pointer hover:bg-background/80 transition-all gap-6 lg:gap-0 ${isExpanded ? 'bg-background/50 ring-1 ring-inset ring-primary/10' : ''}`}
                >
                    {/* Process Identity */}
                    <div className="flex items-center gap-5">
                        <div className={`p-2.5 rounded-xl border ${status.bg} ${status.border} ${status.color} shadow-sm`}>
                           {status.icon}
                        </div>
                        <div className={`font-black text-lg lg:text-sm tracking-tighter uppercase ${status.isDone ? 'text-slate-500' : 'text-foreground'}`}>
                            {task.taskName}
                        </div>
                    </div>
                    
                    {/* Auth Node (Personnel) */}
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-tight">
                        <div className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center text-primary shadow-inner">
                            <User size={14} />
                        </div>
                        <span className="truncate">{task.doerId?.name || 'Unassigned'}</span>
                    </div>

                    <div className="hidden lg:block text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
                        {task.frequency || 'Periodic'}
                    </div>
                    
                    {/* Efficiency Barometer */}
                    <div className="flex flex-col gap-3 lg:pr-12">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Efficiency</span>
                            <span className="text-[10px] font-black text-primary">{stats.count} Verified</span>
                        </div>
                        <div className="h-2 w-full bg-background border border-border rounded-full overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-1000 shadow-[0_0_10px_rgba(56,189,248,0.3)]" 
                                style={{ width: `${(stats.count / Math.max(stats.total, 1)) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-[11px] font-black text-slate-500 font-mono tracking-tighter uppercase">
                    {task.lastCompleted ? new Date(task.lastCompleted).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No Sequence Record'}
                    </div>

                    <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full border font-black text-[9px] uppercase tracking-[0.15em] transition-all shadow-sm ${status.bg} ${status.color} ${status.border}`}>
                            {status.icon} {status.label}
                        </span>
                    </div>

                    <div className="hidden lg:flex justify-end text-slate-300 dark:text-slate-700">
                    {isExpanded ? <ChevronUp size={24} className="text-primary" /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {/* --- EXPANDED AUDIT PANEL --- */}
                {isExpanded && (
                    <div className="bg-background/30 p-8 lg:p-16 border-t border-border/40 animate-in slide-in-from-top-4 duration-500">
                    
                    {/* ADMINISTRATIVE OVERRIDE NODE */}
                    {(userRoles.includes('Admin') || userRoles.includes('Coordinator')) && !status.isDone && (
                        <div className="mb-16 p-8 lg:p-10 bg-card border border-primary/20 rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl shadow-primary/5 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                              <Lock size={120} className="text-primary" />
                            </div>
                            <div className="flex items-center gap-8 relative z-10">
                                <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 shadow-inner">
                                    <Zap size={32} className="text-primary animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-foreground font-black uppercase text-base tracking-tight">Administrative Override Terminal</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Authorized node detected. Protocol allows manual finalization of this sequence.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setActiveTask(task); setShowModal(true); }}
                                className="w-full lg:w-auto bg-primary hover:bg-sky-400 text-white dark:text-slate-950 px-12 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 transition-all active:scale-95 relative z-10"
                            >
                                Execute Override Sequence
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                        {/* Intelligence Block */}
                        <div className="space-y-8">
                            <h5 className="text-slate-400 dark:text-primary font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-4 px-3">
                                <BarChart3 size={20} /> Operational Analytics
                            </h5>
                            <div className="bg-card p-10 rounded-[2.5rem] border border-border relative overflow-hidden shadow-sm">
                              <div className="absolute -top-10 -right-10 p-6 opacity-5 pointer-events-none">
                                      <Activity size={180} />
                              </div>
                              <div className="relative z-10 space-y-8">
                                      <div className="flex justify-between items-center border-b border-border/50 pb-6">
                                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Monthly Pulse</span>
                                          <span className="text-foreground font-black text-lg">{stats.count} <span className="text-xs opacity-30 font-mono mx-1">/</span> {stats.total} Checks</span>
                                      </div>
                                      <div className="flex justify-between items-center border-b border-border/50 pb-6">
                                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Next Maturity Cycle</span>
                                          <span className="text-foreground font-black text-sm uppercase tracking-tight">{task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Calculated Integrity</span>
                                          <span className="text-emerald-500 font-black text-3xl tracking-tighter">{((stats.count / Math.max(stats.total, 1)) * 100).toFixed(1)}%</span>
                                      </div>
                              </div>
                            </div>
                        </div>

                        {/* Audit Trail Block */}
                        <div className="space-y-8">
                            <h5 className="text-slate-400 dark:text-primary font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-4 px-3">
                                <HistoryIcon size={20} /> Immutable AWS Audit Trail
                            </h5>
                            <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-card p-10 rounded-[2.5rem] border border-border shadow-sm flex flex-col gap-10">
                            {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().slice(0, 10).map((log, i) => (
                                <div key={i} className="relative pl-10 border-l-2 border-border last:border-0 pb-4">
                                <div className="absolute top-1.5 -left-[9px] w-4 h-4 rounded-full bg-card border-4 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-[0.2em] px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">{log.action || 'Sequence Log'}</span>
                                    <span className="text-slate-400 font-black text-[9px] font-mono tracking-widest uppercase">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</span>
                                </div>
                                
                                <div className="bg-background/50 p-6 rounded-2xl border border-border shadow-inner">
                                    <div className="flex gap-4">
                                        <MessageSquare size={16} className="text-slate-400 dark:text-slate-600 mt-1 shrink-0" />
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-bold italic opacity-80">
                                            "{log.remarks || "Standard operating protocol finalized."}"
                                        </p>
                                    </div>

                                    {log.attachmentUrl && (
                                        <a 
                                        href={log.attachmentUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-6 inline-flex items-center gap-3 text-primary hover:text-sky-400 text-[10px] font-black uppercase tracking-[0.3em] bg-background border border-border px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-sm"
                                        >
                                        <FileSearch size={16} /> Verify S3 Document Proof
                                        </a>
                                    )}
                                </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                    <Database size={64} className="text-slate-400 mb-5" />
                                    <p className="font-black text-xs uppercase tracking-[0.4em]">Zero Trace Log</p>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    </div>
                )}
                </div>
            );
            })}
        </div>
      </div>

      {/* --- OVERRIDE COMMAND MODAL (Adaptive Design) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-card border border-border w-full max-w-xl rounded-[4rem] p-10 lg:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-500">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-foreground transition-colors p-2 bg-background rounded-full border border-border shadow-inner"><X size={24} /></button>
            
            <div className="mb-12">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-primary/20">
                    <Zap size={32} className="text-primary" />
                </div>
                <h3 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase">Finalize Sequence</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4">Node Override: <span className="text-primary">{activeTask?.taskName}</span></p>
            </div>

            <form onSubmit={handleForceComplete} className="space-y-10">
              <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3">Supervisor Audit Remarks</label>
                 <textarea 
                   required 
                   placeholder="Provide authoritative justification for manual override..." 
                   value={remarks} 
                   onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-44 bg-background border border-border text-foreground p-8 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-bold text-sm resize-none shadow-inner" 
                 />
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl flex gap-5">
                <AlertCircle size={22} className="text-amber-500 shrink-0" />
                <p className="text-amber-600 dark:text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">
                   CRITICAL: This event will be timestamped and permanently signed by {sessionUser?.name} in the master factory audit ledger.
                </p>
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-6 rounded-2xl bg-primary hover:bg-sky-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 cursor-pointer"
              >
                {isSubmitting ? <RefreshCcw className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                {isSubmitting ? "Executing..." : "Confirm Override"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default ChecklistMonitor;