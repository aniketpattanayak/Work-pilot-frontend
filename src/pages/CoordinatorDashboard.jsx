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
  MessageSquare
} from "lucide-react";

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
   * UPDATED: Defensive Data Fetching
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

  // NEW: Logic to open the reminder popup
  const openReminderModal = (task) => {
    if (!task.doerId?.whatsappNumber) {
        alert("Mobile number not found for this staff member.");
        return;
    }
    setSelectedTask(task);
    setCustomMessage(`Reminder: The task "${task.title}" is still pending. Please update the status.`);
    setIsModalOpen(true);
  };

  // NEW: Logic to actually send the WhatsApp message from the popup
  const handleSendWhatsApp = () => {
    if (!selectedTask) return;
    const number = selectedTask.doerId.whatsappNumber;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(customMessage)}`, '_blank');
    setIsModalOpen(false);
  };

  // Logic for Force Completion
  const handleForceDone = async (taskId) => {
    if (window.confirm("Are you sure you want to mark this task as Done?")) {
      try {
        await API.put(`/tasks/respond`, {
          taskId,
          status: 'Completed',
          remarks: "Marked as Done by Coordinator.",
          doerId: coordinatorId 
        });
        alert("Task updated successfully.");
        fetchTasks();
      } catch (err) {
        alert("Action failed.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={32} />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Dashboard...</p>
    </div>
  );

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
            <h2 className="text-white text-3xl font-black tracking-tighter">Coordinator Dashboard</h2>
            <p className="text-slate-500 text-sm font-medium">Track staff work progress and take action.</p>
          </div>
        </div>
        <button 
          onClick={fetchTasks} 
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all flex items-center gap-3 active:scale-95"
        >
          <RefreshCcw size={16} /> Sync Board
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Tasks</span>
            <div className="text-3xl font-black text-white mt-1">{safeTasks.length} <span className="text-sm font-medium text-slate-600">Items</span></div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pending Work</span>
            <div className="text-3xl font-black text-red-400 mt-1">{pendingCount} <span className="text-sm font-medium text-slate-600">Pending</span></div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Ready for Check</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{completedCount} <span className="text-sm font-medium text-slate-600">Completed</span></div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="bg-slate-950 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 text-left">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Contact No.</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deadline</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {safeTasks.map((task) => {
                const isVerified = Array.isArray(task.history) && task.history.some((h) => h.action.includes("Coordinator"));
                const isPending = task.status === "Pending";

                return (
                  <tr key={task._id} className="hover:bg-slate-900/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-200 mb-1">{task.title}</div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">ID: {task._id?.slice(-6) || 'N/A'}</div>
                    </td>
                    
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                           <UserCheck size={12} className="text-emerald-400" /> {task.doerId?.name || 'Staff'}
                        </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-sky-400 font-black text-xs">
                           <Phone size={10} /> {task.doerId?.whatsappNumber || 'N/A'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                           <Clock size={12} /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
                        </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[9px] uppercase border w-fit ${
                          isPending ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                          {task.status || 'Active'}
                        </span>
                        {isVerified && (
                          <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1">
                            <Zap size={8} fill="currentColor" /> Checked by You
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => openReminderModal(task)}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-500 hover:text-slate-950 transition-all active:scale-95"
                        >
                          <MessageCircle size={14} /> Send Reminder
                        </button>

                        {task.status !== "Completed" && (
                          <button
                            onClick={() => handleForceDone(task._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-95"
                          >
                            <Send size={14} /> Mark as Done
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
                <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No tasks found in tracking.</p>
            </div>
        )}
      </div>

      {/* --- CUSTOM REMINDER MODAL (POPUP) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl scale-in-center">
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-sky-400" />
                    <h3 className="text-white font-black text-lg">Send Reminder</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <div className="p-8">
                <div className="mb-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Receiver</div>
                    <div className="text-white font-bold text-sm flex items-center gap-2">
                        <UserCheck size={14} className="text-emerald-400" /> {selectedTask?.doerId?.name} 
                        <span className="text-slate-600 font-medium">({selectedTask?.doerId?.whatsappNumber})</span>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block ml-1">Your Message</label>
                    <textarea 
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all resize-none"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Type your message here..."
                    ></textarea>
                </div>

                <button 
                    onClick={handleSendWhatsApp}
                    className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                >
                    <MessageCircle size={18} /> Send to WhatsApp
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorDashboard;