import React, { useEffect, useState, useCallback } from "react";
import API from '../api/axiosConfig'; // Centralized API instance
import axios from "axios";
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
  Zap
} from "lucide-react";

const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback for ID persistence
  const savedUser = JSON.parse(localStorage.getItem('user'));
  const coordinatorId = propCoordId || savedUser?._id || savedUser?.id;

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures 'tasks' is always an array to prevent .filter and .map crashes.
   */
  const fetchTasks = useCallback(async () => {
    if (!coordinatorId) return;
    try {
      setLoading(true);
      // Switched to centralized API instance
      const res = await API.get(`/tasks/coordinator/${coordinatorId}`);
      
      // Safety: Unwrap data if nested, ensure array format
      const data = Array.isArray(res.data) ? res.data : (res.data?.tasks || res.data?.data || []);
      setTasks(data);
    } catch (err) {
      console.error("Coordinator Fetch Error:", err);
      setTasks([]); // Fallback to empty array to prevent UI crashes
    } finally {
      setLoading(false);
    }
  }, [coordinatorId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Logic for WhatsApp Reminder (Handled as per your requirement)
  const handleReminder = (number, title) => {
    if (!number) {
        alert("WhatsApp number not found for this doer.");
        return;
    }
    const message = `Reminder: Task "${title}" is pending. Please update status.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Logic for Force Completion
  const handleForceDone = async (taskId) => {
    if (window.confirm("Verify and Force-Complete this task as Coordinator?")) {
      try {
        // Switched to centralized API instance
        await API.put(`/tasks/respond`, {
          taskId,
          status: 'Completed',
          remarks: "Force-Completed by Coordinator via Work-Wise View.",
          doerId: coordinatorId 
        });
        alert("Task Verified & Marked Done.");
        fetchTasks();
      } catch (err) {
        alert("Action failed: " + (err.response?.data?.message || err.message));
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={32} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase">Syncing Tracking Data...</p>
    </div>
  );

  /**
   * DEFENSIVE STATS CALCULATION
   * We calculate these before the return to ensure no "undefined" errors occur
   */
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const pendingCount = safeTasks.filter(t => t.status === 'Pending').length;
  const completedCount = safeTasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
            <ShieldCheck size={28} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-white text-3xl font-black tracking-tighter">Coordinator Hub</h2>
            <p className="text-slate-500 text-sm font-medium">Work-Wise surveillance of linked assigners and assigned doers.</p>
          </div>
        </div>
        <button 
          onClick={fetchTasks} 
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-5 py-2.5 rounded-xl text-slate-300 text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
        >
          <RefreshCcw size={14} /> Refresh Board
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Watchlist</span>
            <div className="text-3xl font-black text-white mt-1">{safeTasks.length} <span className="text-sm font-medium text-slate-600">Tasks</span></div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Urgent/Overdue</span>
            <div className="text-3xl font-black text-red-400 mt-1">{pendingCount} <span className="text-sm font-medium text-slate-600">Pending</span></div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Quality Check</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{completedCount} <span className="text-sm font-medium text-slate-600">Ready</span></div>
        </div>
      </div>

      {/* Desktop Monitoring Table */}
      <div className="bg-slate-950 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 text-left">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigner</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsible Doer</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deadline</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {/* FIX: Use safeTasks to prevent .map error */}
              {safeTasks.map((task) => {
                const isVerified = Array.isArray(task.history) && task.history.some((h) => h.action.includes("Coordinator"));
                const isPending = task.status === "Pending";

                return (
                  <tr key={task._id} className="hover:bg-slate-900/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-200 mb-1">{task.title}</div>
                      <div className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Task ID: {task._id?.slice(-6) || 'N/A'}</div>
                    </td>
                    
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                           <User size={12} className="text-sky-400" /> {task.assignerId?.name || 'Unknown'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                           <UserCheck size={12} className="text-emerald-400" /> {task.doerId?.name || 'Unassigned'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                           <Clock size={12} /> {task.deadline ? new Date(task.deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No Deadline'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-tighter w-fit border ${
                          isPending ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                          {task.status || 'Active'}
                        </span>
                        {isVerified && (
                          <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1">
                            <Zap size={10} fill="currentColor" /> Verified by You
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleReminder(task.doerId?.whatsappNumber, task.title)}
                          className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-slate-950 transition-all active:scale-90"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle size={16} />
                        </button>

                        {task.status !== "Completed" && (
                          <button
                            onClick={() => handleForceDone(task._id)}
                            className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-90"
                            title="Coordinator Force Done"
                          >
                            <Send size={16} />
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
            <div className="p-20 text-center">
                <ShieldCheck size={48} className="mx-auto text-slate-800 mb-4" />
                <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Your tracking board is currently empty.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorDashboard;