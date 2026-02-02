import React, { useEffect, useState, useCallback, useMemo } from "react";
import API from '../api/axiosConfig';
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
  ChevronRight,
  ClipboardList,
  Target,
  Calendar,
  Upload,
  ChevronDown,
  ChevronUp,
  Search 
} from "lucide-react";

/**
 * COORDINATOR DASHBOARD v2.7
 * Purpose: Track Delegation & Routine Checklists with Location-Drift Protection.
 * FIXED: Nigeria/Mumbai date slippage using Strict Pattern-Lock.
 */
const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending'); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [tenantSettings, setTenantSettings] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedUser = JSON.parse(localStorage.getItem('user'));
  const coordinatorId = propCoordId || savedUser?._id || savedUser?.id;

  /**
   * PATTERN LOCK HELPER
   * Freezes date into a character string (YYYY-MM-DD).
   * Neutralizes the 4.5-hour Nigeria/Mumbai drift.
   */
  const toLockPattern = (input) => {
    if (!input) return "";
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * RE-ENGINEERED INSTANCE SCANNER
   * Character-matches against history to remove completed ghost cards instantly.
   */
  const getPendingInstances = (task) => {
    if (task.taskType !== 'Checklist') return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let instances = [];
    let pointer = new Date(task.nextDueDate);
    pointer.setHours(0, 0, 0, 0);
    
    // Map existing history to locked strings for character-matching
    const historyKeys = (task.history || [])
        .filter(h => h.action === "Completed" || h.action === "Administrative Completion")
        .map(h => toLockPattern(h.instanceDate || h.timestamp));

    const config = task.frequencyConfig || {};
    const weekends = tenantSettings?.weekends || [0]; 
    const holidays = tenantSettings?.holidays || [];

    const isNonWorkingDay = (d) => {
        const str = d.toISOString().split('T')[0];
        return weekends.includes(d.getDay()) || holidays.some(h => new Date(h.date).toISOString().split('T')[0] === str);
    };

    const matchesConfig = (d) => {
        if (task.frequency === 'Weekly') return config.daysOfWeek?.includes(d.getDay());
        if (task.frequency === 'Monthly') return config.daysOfMonth?.includes(d.getDate());
        return true; 
    };

    let loopCount = 0;
    while (pointer <= today && loopCount < 30) {
      loopCount++;
      const currentPattern = toLockPattern(pointer);
      
      if (!historyKeys.includes(currentPattern) && matchesConfig(pointer) && !isNonWorkingDay(pointer)) {
        instances.push({
          date: new Date(pointer),
          dateStr: pointer.toDateString(),
          isToday: pointer.getTime() === today.getTime(),
          isPast: pointer < today,
          status: pointer < today ? 'Pending' : 'TODAY'
        });
      }
      
      if (task.frequency === 'Daily') pointer.setDate(pointer.getDate() + 1);
      else if (task.frequency === 'Weekly') pointer.setDate(pointer.getDate() + 7);
      else break;
      
      pointer.setHours(0, 0, 0, 0);
    }
    return instances;
  };

  const fetchTasks = useCallback(async () => {
    if (!coordinatorId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // force_sync ensures fresh production data from Mumbai server
      const [res, settingsRes] = await Promise.all([
        API.get(`/tasks/coordinator/${coordinatorId}?force_sync=${Date.now()}`),
        API.get(`/superadmin/settings/${savedUser?.tenantId}`).catch(() => ({ data: {} }))
      ]);
      const data = Array.isArray(res.data) ? res.data : (res.data?.tasks || res.data?.data || []);
      setTasks(data);
      setTenantSettings(settingsRes.data?.settings || settingsRes.data || null);
    } catch (err) {
      console.error("Dashboard Sync Failed:", err);
      setTasks([]); 
    } finally {
      setLoading(false);
    }
  }, [coordinatorId, savedUser?.tenantId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const term = searchTerm.toLowerCase().trim();

    return tasks.filter(task => {
      const isDone = task.status === 'Completed' || task.status === 'Verified';
      let matchesTab = false;

      if (activeTab === 'Completed') matchesTab = isDone;
      else if (activeTab === 'Pending') {
        if (!isDone) {
          const deadline = new Date(task.deadline || task.nextDueDate);
          deadline.setHours(0, 0, 0, 0);
          matchesTab = task.taskType === 'Checklist' ? getPendingInstances(task).length > 0 : deadline <= today;
        }
      } else if (activeTab === 'Upcoming') {
        if (!isDone) {
          const deadline = new Date(task.deadline || task.nextDueDate);
          deadline.setHours(0, 0, 0, 0);
          matchesTab = task.taskType === 'Checklist' ? getPendingInstances(task).length === 0 && deadline > today : deadline > today;
        }
      }

      if (!matchesTab) return false;
      if (term === "") return true;

      return (task.title || "").toLowerCase().includes(term) || 
             (task.doerId?.name || "").toLowerCase().includes(term) || 
             (task.doerId?.department || "").toLowerCase().includes(term);
    });
  }, [tasks, activeTab, searchTerm, tenantSettings]);

  const handleMarkDone = async (task, instanceDate = null) => {
    if (task.taskType === 'Checklist' && instanceDate) {
      /**
       * PATTERN-LOCK SYNC
       * Locks the date as a string to prevent Mumbai server backwards-shift.
       */
      const lockedInstancePattern = toLockPattern(instanceDate);
      const formData = new FormData();
      formData.append("checklistId", task._id);
      formData.append("instanceDate", lockedInstancePattern); 
      formData.append("remarks", remarks || "Authorized by Coordinator");
      formData.append("completedBy", coordinatorId);
      if (selectedFile) formData.append("evidence", selectedFile);
      
      try {
        setIsSubmitting(true);
        await API.post("/tasks/checklist-done", formData);
        setRemarks(""); setSelectedFile(null);
        // Buffer for Mumbai DB indexing
        setTimeout(() => fetchTasks(), 1500);
        alert("Success! Registry Synchronized.");
      } catch (err) {
        alert("Error: Synchronization failed.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (window.confirm("Verify this Delegation Task as Done?")) {
        try {
          await API.post("/tasks/coordinator-force-done", {
            taskId: task._id, coordinatorId: coordinatorId,
            remarks: remarks || "Marked as Done by Coordinator"
          });
          setRemarks("");
          fetchTasks();
          alert("Success: Task completed.");
        } catch (err) {
          alert("Action failed: Protocol error.");
        }
      }
    }
  };

  const openReminderModal = (task) => {
    if (!task.doerId?.whatsappNumber) {
      alert("Mobile number not found for this staff member.");
      return;
    }
    setSelectedTask(task);
    setCustomMessage(`Reminder: The ${task.taskType} "${task.title}" is still pending. Please update the status.`);
    setIsModalOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (!selectedTask) return;
    window.open(`https://wa.me/${selectedTask.doerId.whatsappNumber}?text=${encodeURIComponent(customMessage)}`, '_blank');
    setIsModalOpen(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={40} />
      <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Verified Syncing...</p>
    </div>
  );

  const pendingCount = tasks.filter(t => (t.status === 'Pending' || t.status === 'Active') && (t.taskType !== 'Checklist' || getPendingInstances(t).length > 0)).length;
  const completedCount = tasks.filter(t => t.status === 'Completed' || t.status === 'Verified').length;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30 px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner"><ShieldCheck size={28} className="text-primary" /></div>
          <div>
            <h2 className="text-foreground text-xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">Coordinator Dashboard</h2>
            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Precision Industrial Performance Registry</p>
          </div>
        </div>
        <button onClick={fetchTasks} className="group w-full md:w-auto bg-card hover:bg-background border border-border px-10 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh Ledger
        </button>
      </div>

      {/* SEARCH BAR TERMINAL */}
      <div className="mb-8 relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Search size={22} className="text-slate-400 group-focus-within:text-primary transition-colors" /></div>
        <input type="text" placeholder="Filter by Personnel, Department, or Directive..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border pl-14 pr-12 py-5 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" />
        {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-red-500"><X size={20} /></button>}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-primary group-hover:scale-110 transition-transform"><Layers size={60} /></div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Total Directives</span>
          <div className="text-3xl md:text-4xl font-black text-foreground mt-2 tracking-tighter">{tasks.length}</div>
        </div>
        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 group-hover:scale-110 transition-transform"><Clock size={60} /></div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Pending Backlogs</span>
          <div className="text-3xl md:text-4xl font-black text-red-600 mt-2 tracking-tighter">{pendingCount}</div>
        </div>
        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={60} /></div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Sync Verified</span>
          <div className="text-3xl md:text-4xl font-black text-emerald-600 mt-2 tracking-tighter">{completedCount}</div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 mb-8 bg-card/50 p-2.5 rounded-[2rem] border border-border w-fit">
        {['Pending', 'Upcoming', 'Completed'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg scale-105' : 'text-slate-500 hover:text-foreground hover:bg-background'}`}>{tab}</button>
        ))}
      </div>

      {/* TASK LIST */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left min-w-[1000px]">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Type</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Directive Name</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Personnel</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] text-center">Contact</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Next Target</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Ledger State</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const isChecklist = task.taskType === 'Checklist';
                const instances = isChecklist ? getPendingInstances(task) : [];
                const isExpanded = expandedTaskId === task._id;
                const isPending = task.status === "Pending" || task.status === "Active";

                return (
                  <React.Fragment key={task._id}>
                    <tr className="hover:bg-primary/[0.02] transition-all group">
                      <td className="px-8 py-7"><div className={`p-2.5 rounded-xl w-fit ${isChecklist ? 'bg-amber-500/10 text-amber-600' : 'bg-sky-500/10 text-sky-600'}`}>{isChecklist ? <ClipboardList size={20} /> : <Target size={20} />}</div></td>
                      <td className="px-8 py-7"><div className="text-sm font-black text-foreground mb-1 uppercase tracking-tight truncate max-w-[200px]">{task.title}</div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{isChecklist ? `Cycle: ${task.frequency}` : `ID: ${task._id?.slice(-6).toUpperCase()}`}</div></td>
                      <td className="px-8 py-7"><div className="flex flex-col"><div className="flex items-center gap-2 text-slate-600 font-black text-[11px] uppercase tracking-tight"><UserCheck size={14} className="text-emerald-500" /> {task.doerId?.name || 'Staff'}</div><div className="text-[9px] text-slate-400 font-bold uppercase ml-5 tracking-tighter">Dept: {task.doerId?.department || 'OPS'}</div></div></td>
                      <td className="px-8 py-7 text-center"><div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-xl border border-border text-primary font-black text-[11px] font-mono shadow-inner"><Phone size={10} /> {task.doerId?.whatsappNumber || 'N/A'}</div></td>
                      <td className="px-8 py-7"><div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]"><Clock size={14} className="text-primary/40" /> {task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</div></td>
                      <td className="px-8 py-7"><span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest border ${isPending ? 'bg-red-500/10 text-red-600 border-red-500/20 shadow-sm' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm'}`}>{isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}{task.status}</span></td>
                      <td className="px-8 py-7">
                        <div className="flex justify-end items-center gap-3">
                          {isChecklist && instances.length > 0 && <button onClick={() => setExpandedTaskId(isExpanded ? null : task._id)} className="flex items-center gap-2 px-5 py-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all active:scale-90">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {instances.length} Backlogs</button>}
                          {activeTab !== 'Completed' && <button onClick={() => openReminderModal(task)} className="flex items-center gap-2 px-5 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-90"><MessageCircle size={16} /> Remind</button>}
                          {!isChecklist && isPending && <button onClick={() => handleMarkDone(task)} className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-90"><Zap size={16} /> Force Done</button>}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && instances.length > 0 && (
                      <tr>
                        <td colSpan="7" className="px-8 py-6 bg-background/50 border-y border-border/10">
                          <div className="space-y-4">
                            <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-6 flex items-center gap-3"><Layers size={14} /> Backlog Authorization Grid</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {instances.map((instance, idx) => (
                                <div key={idx} className={`flex justify-between items-center p-5 rounded-[1.5rem] border transition-all ${instance.isPast ? 'bg-red-500/5 border-red-500/20' : 'bg-card border-border'}`}>
                                    <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-2.5 rounded-xl border ${instance.isPast ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'}`}><Calendar size={20} className={instance.isPast ? 'text-red-600' : 'text-primary'} /></div>
                                    <div><p className="text-foreground font-black text-sm uppercase tracking-tight">{instance.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${instance.isPast ? 'text-red-500' : 'text-primary'}`}>{instance.status}</p></div>
                                    </div>
                                    <button onClick={() => handleMarkDone(task, instance.date)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 ${instance.isPast ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}><CheckCircle2 size={16} /> Mark Done</button>
                                </div>
                                ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHATSAPP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.4)] relative animate-in zoom-in-95">
            <div className="px-8 py-8 border-b border-border flex justify-between items-center bg-background/50">
                <div className="flex items-center gap-4"><div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20"><MessageSquare size={24} className="text-primary" /></div><h3 className="text-foreground font-black text-xl uppercase tracking-tighter">Send Reminder</h3></div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-foreground active:scale-90 p-2"><X size={28} /></button>
            </div>
            <div className="p-10 space-y-10">
              <div className="bg-background border border-border p-6 rounded-[1.5rem] shadow-inner"><div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 italic">Technical Contact:</div><div className="text-foreground font-black text-base flex items-center gap-4"><UserCheck size={18} className="text-emerald-500" /> {selectedTask?.doerId?.name} <span className="text-primary font-mono text-xs bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 tracking-widest">+{selectedTask?.doerId?.whatsappNumber}</span></div></div>
              <div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-2">Message Pattern</label><textarea className="w-full h-36 bg-background border border-border rounded-[1.5rem] p-6 text-foreground text-sm font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Enter mission briefing details..."></textarea></div>
              <button onClick={handleSendWhatsApp} className="w-full bg-primary hover:bg-sky-400 text-primary-foreground font-black py-6 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-primary/20 uppercase text-xs tracking-[0.3em]"><MessageCircle size={22} /> Transmit via WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default CoordinatorDashboard;