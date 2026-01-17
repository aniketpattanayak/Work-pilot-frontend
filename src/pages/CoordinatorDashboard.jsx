import React, { useEffect, useState, useCallback } from "react";
import API from '../api/axiosConfig'; // Centralized API instance for production stability
import { 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  Clock, 
  User, 
  UserCheck, 
  AlertCircle,
  RefreshCcw,
  MessageCircle,
  Zap,
  Activity,
  ArrowRight,
  ExternalLink,
  Target
} from "lucide-react";

/**
 * COORDINATOR DASHBOARD: WORK-WISE SURVEILLANCE HUB
 * Purpose: Provides high-level oversight of linked assigners and doers.
 * Logic: Includes WhatsApp reminders, force-complete overrides, and real-time telemetry analytics.
 */
const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback for ID persistence based on session data
  const savedUser = JSON.parse(localStorage.getItem('user'));
  const coordinatorId = propCoordId || savedUser?._id || savedUser?.id;

  // --- DATA ACQUISITION PROTOCOL ---
  const fetchTasks = useCallback(async () => {
    if (!coordinatorId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/coordinator/${coordinatorId}`);
      
      // Defensive Unwrap logic to handle diverse API response structures
      const data = Array.isArray(res.data) ? res.data : (res.data?.tasks || res.data?.data || []);
      setTasks(data);
    } catch (err) {
      console.error("Coordinator Fetch Error:", err);
      setTasks([]); 
    } finally {
      setLoading(false);
    }
  }, [coordinatorId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // --- COMMAND: WHATSAPP SYNC REMINDER ---
  const handleReminder = (number, title) => {
    if (!number) {
        alert("Operational Error: WhatsApp number not found for this doer node.");
        return;
    }
    const message = `Reminder: Task "${title}" is pending in Work-Pilot. Please update status to maintain synchronization.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- COMMAND: SUPERVISOR MANUAL OVERRIDE ---
  const handleForceDone = async (taskId) => {
    if (window.confirm("CRITICAL: Verify and Force-Complete this task as Coordinator? This bypasses the standard doer protocol.")) {
      try {
        await API.put(`/tasks/respond`, {
          taskId,
          status: 'Completed',
          remarks: "Administrative completion finalized by Coordinator via Supervisor Hub override.",
          doerId: coordinatorId 
        });
        alert("Handshake Complete: Task marked Done.");
        fetchTasks();
      } catch (err) {
        alert("Action failed: " + (err.response?.data?.message || err.message));
      }
    }
  };

  // --- SKELETON LOADING VIEW (Adaptive Theme) ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[600px] gap-8 transition-colors duration-500 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={56} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase">Synchronizing Monitoring Nodes...</p>
    </div>
  );

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const pendingCount = safeTasks.filter(t => t.status === 'Pending').length;
  const completedCount = safeTasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 pb-20 selection:bg-primary/30">
      
      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner transition-colors duration-500">
            <ShieldCheck size={36} className="text-primary" />
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Coordinator Hub</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Work-Wise Surveillance: Monitoring Linked Assigners & Doer Nodes
            </p>
          </div>
        </div>
        <button 
          onClick={fetchTasks} 
          className="group bg-card hover:bg-background border border-border px-10 py-5 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5"
        >
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh Live Feed
        </button>
      </div>

      {/* --- TELEMETRY ANALYTICS MATRIX --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 px-1">
        
        {/* Metric 1: Global Watchlist */}
        <div className="group bg-card p-10 rounded-[3rem] border border-border backdrop-blur-xl shadow-xl hover:border-primary/40 transition-all duration-500 relative overflow-hidden">
            <Target className="absolute -right-8 -bottom-8 text-primary/5 group-hover:scale-125 transition-transform duration-1000" size={140} />
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] relative z-10">Global Watchlist</span>
            <div className="flex items-end gap-3 mt-4 relative z-10">
                <div className="text-6xl font-black text-foreground tracking-tighter leading-none">{safeTasks.length}</div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nodes</div>
            </div>
            <div className="mt-8 h-1.5 w-full bg-background border border-border rounded-full overflow-hidden relative z-10 shadow-inner">
                <div className="h-full bg-primary w-full opacity-40" />
            </div>
        </div>

        {/* Metric 2: Stalled Assets */}
        <div className="group bg-card p-10 rounded-[3rem] border border-border backdrop-blur-xl shadow-xl hover:border-rose-500/40 transition-all duration-500 relative overflow-hidden">
            <AlertCircle className="absolute -right-8 -bottom-8 text-rose-500/5 group-hover:scale-125 transition-transform duration-1000" size={140} />
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] relative z-10">Stalled Assets</span>
            <div className="flex items-end gap-3 mt-4 relative z-10">
                <div className="text-6xl font-black text-rose-600 dark:text-rose-500 tracking-tighter leading-none">{pendingCount}</div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Critical</div>
            </div>
            <div className="mt-8 h-1.5 w-full bg-background border border-border rounded-full overflow-hidden relative z-10 shadow-inner">
                <div className="h-full bg-rose-500 animate-pulse" style={{ width: `${(pendingCount / Math.max(safeTasks.length, 1)) * 100}%` }} />
            </div>
        </div>

        {/* Metric 3: Quality Output */}
        <div className="group bg-card p-10 rounded-[3rem] border border-border backdrop-blur-xl shadow-xl hover:border-emerald-500/40 transition-all duration-500 relative overflow-hidden">
            <CheckCircle2 className="absolute -right-8 -bottom-8 text-emerald-500/5 group-hover:scale-125 transition-transform duration-1000" size={140} />
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] relative z-10">Quality Output</span>
            <div className="flex items-end gap-3 mt-4 relative z-10">
                <div className="text-6xl font-black text-emerald-600 dark:text-emerald-500 tracking-tighter leading-none">{completedCount}</div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Verified</div>
            </div>
            <div className="mt-8 h-1.5 w-full bg-background border border-border rounded-full overflow-hidden relative z-10 shadow-inner">
                <div className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981]" style={{ width: `${(completedCount / Math.max(safeTasks.length, 1)) * 100}%` }} />
            </div>
        </div>
      </div>

      {/* --- MAIN MONITORING DECK --- */}
      <div className="bg-card rounded-[3rem] border border-border shadow-2xl overflow-hidden transition-all duration-500">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border text-left">
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Asset Parameters</th>
                <th className="px-8 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Origin Node</th>
                <th className="px-8 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Execution Node</th>
                <th className="px-8 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Maturity</th>
                <th className="px-8 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Telemetry</th>
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] text-right">Operational Intervene</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {safeTasks.map((task) => {
                const isVerified = Array.isArray(task.history) && task.history.some((h) => h.action.includes("Coordinator"));
                const isPending = task.status === "Pending";

                return (
                  <tr key={task._id} className="hover:bg-background/50 transition-all duration-300 group">
                    <td className="px-12 py-10">
                      <div className="text-base font-black text-foreground mb-1 group-hover:text-primary transition-colors uppercase tracking-tight">{task.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 dark:text-slate-600 font-black tracking-[0.2em] uppercase">Protocol ID: {task._id?.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    
                    <td className="px-8 py-10">
                        <div className="flex items-center gap-4 text-slate-500 font-black text-[11px] uppercase tracking-tighter bg-background border border-border px-5 py-2.5 rounded-xl w-fit shadow-inner">
                           <User size={14} className="text-primary opacity-60" /> {task.assignerId?.name || 'Root Console'}
                        </div>
                    </td>

                    <td className="px-8 py-10">
                        <div className="flex items-center gap-4 text-slate-500 font-black text-[11px] uppercase tracking-tighter">
                           <div className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center text-emerald-500 shadow-sm">
                             <UserCheck size={16} />
                           </div>
                           {task.doerId?.name || 'Unlinked Node'}
                        </div>
                    </td>

                    <td className="px-8 py-10">
                        <div className="flex items-center gap-3 text-slate-500 font-black text-[11px] font-mono tracking-widest uppercase">
                           <Clock size={16} className="text-slate-400" /> {task.deadline ? new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }) : 'INF'}
                        </div>
                    </td>

                    <td className="px-8 py-10">
                      <div className="flex flex-col gap-3">
                        <span className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-[0.15em] w-fit border shadow-sm ${
                          isPending ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20'
                        }`}>
                          {isPending ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                          {task.status || 'Active'}
                        </span>
                        {isVerified && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-[0.25em] animate-in slide-in-from-left-2 px-1">
                            <Zap size={12} fill="currentColor" className="animate-pulse" /> Supervisor Logged
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-12 py-10">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                        <button
                          onClick={() => handleReminder(task.doerId?.whatsappNumber, task.title)}
                          className="p-4 bg-background text-primary rounded-2xl border border-border hover:bg-primary hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-lg"
                          title="WhatsApp Sync Dispatch"
                        >
                          <MessageCircle size={20} />
                        </button>

                        {task.status !== "Completed" && (
                          <button
                            onClick={() => handleForceDone(task._id)}
                            className="p-4 bg-background text-amber-500 rounded-2xl border border-border hover:bg-amber-500 hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-lg"
                            title="Supervisor Manual Override"
                          >
                            <Send size={20} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* --- EMPTY STATE TERMINAL --- */}
        {safeTasks.length === 0 && !loading && (
            <div className="py-40 text-center animate-in zoom-in-95 duration-700">
                <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse"></div>
                    <ShieldCheck size={80} className="text-slate-100 dark:text-slate-800 relative z-10" />
                    <Activity size={32} className="absolute -bottom-2 -right-2 text-primary z-20" />
                </div>
                <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.5em] text-xs">Surveillance Grid Dormant</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-bold opacity-60">Awaiting task initiation across linked nodes.</p>
            </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default CoordinatorDashboard;