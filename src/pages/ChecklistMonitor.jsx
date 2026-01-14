import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
import axios from 'axios';
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

const ChecklistMonitor = ({ tenantId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // --- STATES FOR ADMINISTRATIVE OVERRIDE ---
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  
  // Fetch logged in user to check roles
  const sessionUser = JSON.parse(localStorage.getItem('user'));
  const userRoles = Array.isArray(sessionUser?.roles) ? sessionUser.roles : (sessionUser?.role ? [sessionUser.role] : []);
  const userId = sessionUser?.id || sessionUser?._id;

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures 'report' is always an array to prevent .map crashes.
   */
  const fetchLiveStatus = useCallback(async () => {
    try {
      setLoading(true);
      // Switched to centralized API instance
      const res = await API.get(`/tasks/checklist-all/${currentTenantId}`);
      
      // Safety: Unwrap data if nested, ensure array format
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setReport(data);
    } catch (err) {
      console.error("Monitor Fetch Error:", err);
      setReport([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchLiveStatus();
  }, [fetchLiveStatus]);

  // --- HANDLER FOR FORCE COMPLETION ---
  const handleForceComplete = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      setIsSubmitting(true);
      // Switched to centralized API instance
      await API.post("/tasks/coordinator-force-done", {
        taskId: activeTask._id,
        coordinatorId: userId,
        remarks: remarks || "Administrative completion via Monitoring Node."
      });

      alert("Task Finalized via Administrative Override!");
      setShowModal(false);
      setRemarks("");
      fetchLiveStatus();
    } catch (err) {
      alert("Override Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * UPDATED: Defensive Performance Stats
   */
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

    return {
      count: monthCompletions.length,
      total: now.getDate() 
    };
  };

  const getStatus = (task) => {
    if (!task) return { label: 'UNKNOWN' };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDoneStr = task.lastCompleted ? new Date(task.lastCompleted).toISOString().split('T')[0] : null;
    const nextDue = new Date(task.nextDueDate);

    if (lastDoneStr === todayStr) {
        return { label: 'COMPLETED TODAY', color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700', icon: <CheckCircle size={14} />, isDone: true };
    }
    if (nextDue.toISOString().split('T')[0] === todayStr) {
        return { label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Clock size={14} />, isDone: false };
    }
    if (nextDue < now) {
        return { label: 'MISSED', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertCircle size={14} />, isDone: false };
    }
    return { label: 'SCHEDULED', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: <Calendar size={14} />, isDone: false };
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <span className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Generating Factory Audit...</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div>
            <h2 className="text-white text-3xl font-black tracking-tighter flex items-center gap-3">
            <Activity className="text-sky-400" size={32} /> Routine Operations Monitor
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Real-time verification of recurring factory tasks and AWS audit trails.</p>
        </div>
        <button 
            onClick={fetchLiveStatus} 
            className="group bg-slate-900 hover:bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all flex items-center gap-3 active:scale-95 shadow-lg"
        >
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Refresh Live Telemetry
        </button>
      </div>

      {/* Grid Table Header */}
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.2fr_1fr_0.4fr] px-8 py-5 bg-slate-900/80 backdrop-blur-md rounded-t-3xl border border-slate-800 border-b-0 font-black text-slate-500 text-[10px] uppercase tracking-widest">
        <div>Recurring Task</div>
        <div>Assigned Personnel</div>
        <div>Frequency</div>
        <div>Monthly Performance</div>
        <div>Last Recorded Activity</div>
        <div>Status</div>
        <div className="text-right">Info</div>
      </div>

      {/* Main List Area */}
      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-b-3xl overflow-hidden shadow-2xl">
        {/* FIX: Safe check for report map */}
        {Array.isArray(report) && report.map(task => {
          const status = getStatus(task);
          const stats = getMonthlyStats(task.history);
          const isExpanded = expandedId === task._id;

          return (
            <div key={task._id} className={`flex flex-col border-b border-slate-800/50 last:border-0 transition-all ${status.isDone ? 'opacity-60 saturate-50' : ''}`}>
              {/* Table Row */}
              <div 
                onClick={() => setExpandedId(isExpanded ? null : task._id)}
                className={`grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1.2fr_1fr_0.4fr] items-center px-8 py-6 cursor-pointer transition-colors hover:bg-slate-900/50 ${isExpanded ? 'bg-slate-900' : ''}`}
              >
                <div className={`font-bold text-sm tracking-tight ${status.isDone ? 'text-slate-500' : 'text-slate-100'}`}>
                    {task.taskName}
                </div>
                
                <div className="flex items-center gap-2.5 text-slate-400 text-xs font-bold">
                  <div className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                    <User size={12} />
                  </div>
                  {task.doerId?.name || 'Unassigned'}
                </div>

                <div className="text-slate-500 text-xs font-black uppercase tracking-widest">
                    {task.frequency}
                </div>
                
                <div className="flex flex-col gap-2.5 pr-8">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Efficiency</span>
                        <span className="text-[11px] font-black text-sky-400">{stats.count} Days Done</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" 
                            style={{ width: `${(stats.count / Math.max(stats.total, 1)) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="text-xs font-medium text-slate-500">
                  {task.lastCompleted ? new Date(task.lastCompleted).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No Record'}
                </div>

                <div>
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-black text-[10px] uppercase tracking-tighter transition-all ${status.bg} ${status.color} ${status.border}`}>
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="text-right text-slate-600">
                  {isExpanded ? <ChevronUp size={20} className="text-sky-400" /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* EXPANDED SECTION */}
              {isExpanded && (
                <div className="bg-slate-900/50 p-10 border-t border-slate-800 animate-in slide-in-from-top-2">
                   
                   {/* ACTION BUTTONS FOR ADMIN/COORDINATOR NODE */}
                   {(userRoles.includes('Admin') || userRoles.includes('Coordinator')) && !status.isDone && (
                     <div className="mb-10 p-6 bg-sky-500/5 border border-sky-500/20 rounded-[2rem] flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="bg-sky-500/20 p-3 rounded-2xl">
                                <Zap size={24} className="text-sky-400 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold">Administrative Override Power</h4>
                                <p className="text-slate-500 text-xs font-medium">As a Supervisor, you can finalize this task on behalf of {task.doerId?.name}.</p>
                            </div>
                        </div>
                        <button 
                          onClick={() => { setActiveTask(task); setShowModal(true); }}
                          className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          Perform Force Completion
                        </button>
                     </div>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="flex flex-col gap-4">
                        <h5 className="text-sky-400 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                          <BarChart3 size={16} /> Operational Intelligence
                        </h5>
                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Activity size={80} />
                           </div>
                           <div className="relative z-10 space-y-4">
                                <div className="flex justify-between border-b border-slate-800 pb-3">
                                    <span className="text-slate-500 text-xs font-bold uppercase">Monthly Output</span>
                                    <span className="text-white font-black text-sm">{stats.count} / {stats.total} Completions</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800 pb-3">
                                    <span className="text-slate-500 text-xs font-bold uppercase">Next Check-Point</span>
                                    <span className="text-white font-black text-sm">{task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-xs font-bold uppercase">Quality Accuracy</span>
                                    <span className="text-emerald-400 font-black text-sm">{((stats.count / Math.max(stats.total, 1)) * 100).toFixed(1)}%</span>
                                </div>
                           </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <h5 className="text-sky-400 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                          <HistoryIcon size={16} /> Immutable Audit Trail (AWS S3)
                        </h5>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6">
                          {/* FIX: Safe Spread and Map for history */}
                          {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().slice(0, 5).map((log, i) => (
                            <div key={i} className="relative pl-6 border-l border-slate-800 flex flex-col gap-2 pb-2">
                              <div className="absolute top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              
                              <div className="flex justify-between items-center">
                                <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">{log.action}</span>
                                <span className="text-slate-600 font-bold text-[10px]">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</span>
                              </div>
                              
                              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                                <MessageSquare size={14} className="text-slate-600 mt-0.5 shrink-0" />
                                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                                    {log.remarks || "Standard operating procedure followed."}
                                </p>
                              </div>

                              {log.attachmentUrl && (
                                <a 
                                  href={log.attachmentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-[10px] font-black uppercase tracking-widest bg-sky-500/10 w-fit px-4 py-2 rounded-lg border border-sky-500/20 transition-all hover:scale-105 active:scale-95"
                                >
                                  <ExternalLink size={12} /> Verify AWS Document Proof
                                </a>
                              )}
                            </div>
                          )) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                <ShieldCheck size={40} />
                                <p className="font-bold text-xs uppercase mt-3">No audit records found</p>
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

      {/* --- ADMINISTRATIVE OVERRIDE MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
            
            <div className="mb-8">
                <h3 className="text-sky-400 text-2xl font-black tracking-tight flex items-center gap-3">
                   <Zap size={24} /> Force Finalize Task
                </h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Executing on behalf of: <span className="text-slate-300 font-bold">{activeTask?.taskName}</span></p>
            </div>

            <form onSubmit={handleForceComplete} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Supervisor Audit Remarks</label>
                 <textarea 
                   required 
                   placeholder="Why are you completing this for the staff member?" 
                   value={remarks} 
                   onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-32 bg-slate-950 border border-slate-800 text-slate-100 p-5 rounded-2xl outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700 font-medium resize-none" 
                 />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                   <AlertCircle size={10} className="inline mr-1" /> This action will be recorded in the immutable AWS S3 audit trail as an administrative completion by {sessionUser?.name}.
                </p>
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                {isSubmitting ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {isSubmitting ? "Updating Global Telemetry..." : "Confirm Force Completion"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ChecklistMonitor;