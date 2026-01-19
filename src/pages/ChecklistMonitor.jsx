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
      alert("Task Updated!");
      setShowModal(false);
      setRemarks("");
      fetchLiveStatus();
    } catch (err) {
      alert("Failed to update task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * FIX: Only count actual 'Completed' work. 
   * This stops 'Checklist Created' from counting as '1 Day Done'.
   */
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
        return { label: 'DONE TODAY', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <CheckCircle size={12} />, isDone: true };
    }
    if (nextDueStr === todayStr) {
        return { label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Clock size={12} />, isDone: false };
    }
    if (nextDue < now) {
        return { label: 'MISSED', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertCircle size={12} />, isDone: false };
    }
    return { label: 'UPCOMING', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: <Calendar size={12} />, isDone: false };
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Status...</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      
      <div className="flex justify-between items-center mb-10">
        <div>
            <h2 className="text-white text-3xl font-black tracking-tighter flex items-center gap-3">
            <Activity className="text-sky-400" size={32} /> Work Monitor
            </h2>
            <p className="text-slate-500 text-sm font-medium">Track daily routines and staff performance.</p>
        </div>
        <button onClick={fetchLiveStatus} className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all flex items-center gap-3 active:scale-95 shadow-lg">
          <RefreshCcw size={18} /> Refresh Board
        </button>
      </div>

      {/* Grid Table Header - Optimized Widths */}
      <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] px-8 py-5 bg-slate-900/80 backdrop-blur-md rounded-t-3xl border border-slate-800 font-black text-slate-500 text-[10px] uppercase tracking-widest items-center">
        <div>Task Name</div>
        <div>Assigned To</div>
        <div>Schedule</div>
        <div>Total Done</div>
        <div>Last Done</div>
        <div>Status</div>
        <div className="text-right pr-2">Info</div>
      </div>

      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-b-3xl overflow-hidden shadow-2xl">
        {report.map(task => {
          const status = getStatus(task);
          const stats = getMonthlyStats(task.history);
          const isExpanded = expandedId === task._id;

          return (
            <div key={task._id} className={`flex flex-col border-b border-slate-800/50 last:border-0 transition-all ${status.isDone ? 'opacity-60 grayscale' : ''}`}>
              <div 
                onClick={() => setExpandedId(isExpanded ? null : task._id)}
                className={`grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr_1.2fr_0.4fr] items-center px-8 py-6 cursor-pointer hover:bg-slate-900/50 ${isExpanded ? 'bg-slate-900' : ''}`}
              >
                <div className={`font-bold text-sm truncate pr-4 ${status.isDone ? 'text-slate-500' : 'text-slate-100'}`}>{task.taskName}</div>
                <div className="text-slate-400 text-xs font-bold truncate">{task.doerId?.name || 'Unassigned'}</div>
                <div className="text-slate-500 text-[10px] font-black uppercase">{task.frequency}</div>
                <div className="text-sky-400 font-black text-[11px]">{stats.count} Times This Month</div>
                <div className="text-xs text-slate-500">{task.lastCompleted ? new Date(task.lastCompleted).toLocaleDateString() : 'Never'}</div>
                
                {/* Fixed Status Badge with whitespace-nowrap */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-[9px] uppercase whitespace-nowrap ${status.bg} ${status.color} ${status.border}`}>
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="text-right text-slate-600 pr-2">{isExpanded ? <ChevronUp size={18} className="text-sky-400" /> : <ChevronDown size={18} />}</div>
              </div>

              {isExpanded && (
                <div className="bg-slate-900/50 p-8 border-t border-slate-800 animate-in slide-in-from-top-2">
                   {(userRoles.includes('Admin') || userRoles.includes('Coordinator')) && !status.isDone && (
                     <div className="mb-8 p-5 bg-sky-500/5 border border-sky-500/20 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Zap size={20} className="text-sky-400" />
                            <div>
                                <h4 className="text-white text-sm font-bold">Admin Force Done</h4>
                                <p className="text-slate-500 text-xs">Finish this for the staff member.</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setShowModal(true); }} className="bg-sky-500 text-slate-950 px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Mark as Done</button>
                     </div>
                   )}

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h5 className="text-sky-400 font-black text-[10px] uppercase mb-4 tracking-widest">Performance Record</h5>
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                            <div className="flex justify-between border-b border-slate-900 pb-2">
                                <span className="text-slate-500 text-[11px] uppercase font-bold">Monthly Done:</span>
                                <span className="text-white font-black text-xs">{stats.count} Days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-[11px] uppercase font-bold">Next Check:</span>
                                <span className="text-white font-black text-xs">{task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sky-400 font-black text-[10px] uppercase mb-4 tracking-widest">Recent Activity</h5>
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
                          {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().slice(0, 5).map((log, i) => (
                            <div key={i} className="pl-4 border-l-2 border-slate-800 flex flex-col gap-1 pb-2">
                              <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter">
                                <span className="text-emerald-400">{log.action === 'Checklist Created' ? 'TASK CREATED' : log.action}</span>
                                <span className="text-slate-600">{new Date(log.timestamp).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-400 text-[11px] font-medium">"{log.remarks || 'Done.'}"</p>
                              {log.attachmentUrl && <a href={log.attachmentUrl} target="_blank" rel="noreferrer" className="text-sky-400 text-[9px] font-bold uppercase mt-1 flex items-center gap-1"><ExternalLink size={10} /> View Proof</a>}
                            </div>
                          )) : <p className="text-slate-700 text-[10px] text-center py-5 uppercase font-bold">No history available</p>}
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-sky-400 text-xl font-black mb-1">Mark as Done</h3>
            <p className="text-slate-500 text-xs mb-6">Completing task: {activeTask?.taskName}</p>
            <form onSubmit={handleForceComplete} className="space-y-4">
              <textarea required placeholder="Reason for completing this..." value={remarks} onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-24 bg-slate-950 border border-slate-800 text-white p-4 rounded-xl outline-none focus:border-sky-500 text-sm resize-none" />
              <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-xl bg-sky-500 text-slate-950 font-black text-xs uppercase shadow-lg transition-all active:scale-95">
                {isSubmitting ? "Saving..." : "Confirm Done"}
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