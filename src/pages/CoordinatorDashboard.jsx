import React, { useEffect, useState, useCallback } from "react";
import API from '../api/axiosConfig'; // Centralized API instance
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
  X,
  Phone,
  MessageSquare,
  Layers,
  ChevronRight
} from "lucide-react";

/**
 * COORDINATOR DASHBOARD: OPERATIONAL OVERSIGHT v1.5
 * Purpose: Track staff work progress and take action with adaptive theme support.
 * UI: Responsive headings and theme-aware cards/modals.
 */
const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW STATES FOR MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [customMessage, setCustomMessage] = useState("");

  // Fallback for ID persistence
  const savedUser = JSON.parse(localStorage.getItem('user'));
  const coordinatorId = propCoordId || savedUser?._id || savedUser?.id;

  /**
   * DATA ACQUISITION: Defensively fetching operational telemetry.
   */
  const fetchTasks = useCallback(async () => {
    if (!coordinatorId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await API.get(`/tasks/coordinator/${coordinatorId}`);
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

  // Logic to open the reminder popup
  const openReminderModal = (task) => {
    if (!task.doerId?.whatsappNumber) {
        alert("Mobile number not found for this staff member.");
        return;
    }
    setSelectedTask(task);
    setCustomMessage(`Reminder: The task "${task.title}" is still pending. Please update the status.`);
    setIsModalOpen(true);
  };

  // Logic to actually send the WhatsApp message from the popup
  const handleSendWhatsApp = () => {
    if (!selectedTask) return;
    const number = selectedTask.doerId.whatsappNumber;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(customMessage)}`, '_blank');
    setIsModalOpen(false);
  };

  // Logic for Force Completion (Tactical Override)
  const handleForceDone = async (taskId) => {
    if (window.confirm("Are you sure you want to mark this task as Done?")) {
      try {
        await API.put(`/tasks/respond`, {
          taskId,
          status: 'Completed',
          remarks: "Marked as Done by Coordinator.",
          doerId: coordinatorId 
        });
        alert("Success: Task state synchronized to Completed.");
        fetchTasks();
      } catch (err) {
        alert("Action failed: Protocol error.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={40} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Loading...</p>
    </div>
  );

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const pendingCount = safeTasks.filter(t => t.status === 'Pending').length;
  const completedCount = safeTasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER SECTION: Responsive Scaling */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">
              Coordinator Dashboard
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Track staff work progress and take tactical action.</p>
          </div>
        </div>
        <button 
          onClick={fetchTasks} 
          className="group w-full md:w-auto bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl hover:shadow-primary/5"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Sync Board
        </button>
      </div>

      {/* STATS QUICK VIEW: Adaptive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-primary group-hover:scale-110 transition-transform"><Layers size={60} /></div>
            <span className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Total Tasks</span>
            <div className="text-3xl md:text-4xl font-black text-foreground mt-2 tracking-tighter">{safeTasks.length} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">task</span></div>
        </div>
        <div className="bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 group-hover:scale-110 transition-transform"><Clock size={60} /></div>
            <span className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Pending works</span>
            <div className="text-3xl md:text-4xl font-black text-red-600 dark:text-red-500 mt-2 tracking-tighter">{pendingCount} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Active</span></div>
        </div>
        <div className="bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={60} /></div>
            <span className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Ready for check </span>
            <div className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-500 mt-2 tracking-tighter">{completedCount} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Ready</span></div>
        </div>
      </div>

      {/* MONITORING TERMINAL: Responsive Table */}
      <div className="bg-card rounded-[1.5rem] md:rounded-[2.5rem] border border-border shadow-2xl overflow-hidden relative transition-colors duration-500">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left min-w-[900px]">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Task Details</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Staff Name</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] text-center">Contact Number</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">deadline</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {safeTasks.map((task) => {
                const isVerified = Array.isArray(task.history) && task.history.some((h) => h.action.includes("Coordinator"));
                const isPending = task.status === "Pending";

                return (
                  <tr key={task._id} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-300 group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-foreground mb-1 uppercase tracking-tight truncate max-w-[200px]">{task.title}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest font-mono">ID: {task._id?.slice(-6).toUpperCase() || 'N/A'}</div>
                    </td>
                    
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-tight">
                           <UserCheck size={14} className="text-emerald-500" /> {task.doerId?.name || 'Unknown Staff'}
                        </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-background px-4 py-1.5 rounded-xl border border-border text-primary font-black text-[11px] font-mono shadow-inner">
                           <Phone size={10} /> {task.doerId?.whatsappNumber || '---'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500 font-bold text-[11px]">
                           <Clock size={12} className="text-primary/40" /> {task.deadline ? new Date(task.deadline).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest border w-fit shadow-sm ${
                          isPending ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                          {task.status || 'Active'}
                        </span>
                        {isVerified && (
                          <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5 animate-pulse">
                            <Zap size={8} fill="currentColor" /> Oversight Logged
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          onClick={() => openReminderModal(task)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"
                        >
                          <MessageCircle size={14} /> Send Reminder
                        </button>

                        {task.status !== "Completed" && task.status !== "Verified" && (
                          <button
                            onClick={() => handleForceDone(task._id)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"
                          >
                            <Zap size={14} /> Force Done
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
        {safeTasks.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30 grayscale transition-colors">
                <ShieldCheck size={56} className="text-primary" />
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">No task found in tracking</p>
            </div>
        )}
      </div>

      {/* --- CUSTOM REMINDER MODAL: Adaptive Surface --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95">
            <div className="px-8 py-7 border-b border-border flex justify-between items-center bg-background/50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                      <MessageSquare size={22} className="text-primary" />
                    </div>
                    <h3 className="text-foreground font-black text-xl tracking-tighter uppercase leading-none">Dispatcher Hub</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-foreground transition-colors active:scale-90">
                    <X size={24} />
                </button>
            </div>
            
            <div className="p-8 lg:p-10">
                <div className="mb-8 bg-background border border-border p-5 rounded-2xl shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><User size={40} /></div>
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2">Recipient Protocol</div>
                    <div className="text-foreground font-black text-sm flex items-center gap-3">
                        <UserCheck size={16} className="text-emerald-500" /> {selectedTask?.doerId?.name} 
                        <span className="text-primary font-mono text-[11px] bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">({selectedTask?.doerId?.whatsappNumber})</span>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.3em] mb-3 block ml-2">Communication Payload</label>
                    <textarea 
                        className="w-full h-32 bg-background border border-border rounded-2xl p-5 text-foreground text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none shadow-inner uppercase tracking-tight"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Define reminder directive..."
                    ></textarea>
                </div>

                <button 
                    onClick={handleSendWhatsApp}
                    className="w-full bg-primary hover:bg-sky-400 text-white dark:text-slate-950 font-black py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-primary/20 uppercase text-xs tracking-[0.2em]"
                >
                    <MessageCircle size={20} /> Transmit via WhatsApp
                </button>
            </div>
            
            <div className="px-8 py-4 bg-background/50 border-t border-border flex items-center gap-2">
               <ShieldCheck size={12} className="text-primary/40" />
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">End-to-End Encrypted Terminal Handshake Active</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default CoordinatorDashboard;