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
  Search // Added Search Icon
} from "lucide-react";

/**
 * COORDINATOR DASHBOARD v2.5
 * Purpose: Track Delegation Tasks & Routine Checklists with Global Search & Multi-instance support
 */
const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending'); 
  const [searchTerm, setSearchTerm] = useState(""); // Added Search State

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedUser = JSON.parse(localStorage.getItem('user'));
  const coordinatorId = propCoordId || savedUser?._id || savedUser?.id;

  // Generate pending instances for checklist tasks
  const getPendingInstances = (task) => {
    if (task.taskType !== 'Checklist') return [];
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let instances = [];
    let pointer = new Date(task.nextDueDate);
    pointer.setHours(0, 0, 0, 0);
    
    let loopCount = 0;
    while (pointer <= today && loopCount < 30) {
      loopCount++;
      const dateStr = pointer.toDateString();
      
      // Check if already completed
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
          status: isPast ? 'Pending' : isToday ? 'TODAY' : 'UPCOMING'
        });
      }
      
      if (task.frequency === 'Daily') {
        pointer.setDate(pointer.getDate() + 1);
      } else if (task.frequency === 'Weekly') {
        pointer.setDate(pointer.getDate() + 7);
      } else {
        break;
      }
      
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

  /**
   * TACTICAL FILTER & SEARCH LOGIC
   * Categorizes tasks based on status, dates, and search keywords
   */
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const term = searchTerm.toLowerCase().trim();

    return tasks.filter(task => {
      // 1. Check Tab Category
      const isDone = task.status === 'Completed' || task.status === 'Verified';
      let matchesTab = false;

      if (activeTab === 'Completed') matchesTab = isDone;
      else if (activeTab === 'Pending') {
        if (!isDone) {
          const deadline = new Date(task.deadline || task.nextDueDate);
          deadline.setHours(0, 0, 0, 0);
          if (task.taskType === 'Checklist') {
            matchesTab = getPendingInstances(task).length > 0;
          } else {
            matchesTab = deadline <= today;
          }
        }
      } else if (activeTab === 'Upcoming') {
        if (!isDone) {
          const deadline = new Date(task.deadline || task.nextDueDate);
          deadline.setHours(0, 0, 0, 0);
          if (task.taskType === 'Checklist') {
            matchesTab = getPendingInstances(task).length === 0 && deadline > today;
          } else {
            matchesTab = deadline > today;
          }
        }
      }

      if (!matchesTab) return false;

      // 2. Check Search Term (Name, Dept, Title)
      if (term === "") return true;

      const titleMatch = (task.title || "").toLowerCase().includes(term);
      const nameMatch = (task.doerId?.name || "").toLowerCase().includes(term);
      const deptMatch = (task.doerId?.department || "").toLowerCase().includes(term);

      return titleMatch || nameMatch || deptMatch;
    });
  }, [tasks, activeTab, searchTerm]);

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
    const number = selectedTask.doerId.whatsappNumber;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(customMessage)}`, '_blank');
    setIsModalOpen(false);
  };

  const handleMarkDone = async (task, instanceDate = null) => {
    if (task.taskType === 'Checklist' && instanceDate) {
      const formData = new FormData();
      formData.append("checklistId", task._id);
      formData.append("instanceDate", instanceDate);
      formData.append("remarks", remarks || "Marked as done by coordinator");
      formData.append("completedBy", coordinatorId);
      if (selectedFile) formData.append("evidence", selectedFile);
      
      try {
        setIsSubmitting(true);
        await API.post("/tasks/checklist-done", formData);
        alert("Success! Work marked as done.");
        setRemarks("");
        setSelectedFile(null);
        setSelectedDate(null);
        fetchTasks();
      } catch (err) {
        alert("Error: Failed to mark as done.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (window.confirm("Are you sure you want to mark this task as Done?")) {
        try {
          await API.post("/tasks/coordinator-force-done", {
            taskId: task._id,
            coordinatorId: coordinatorId,
            remarks: remarks || "Marked as Done by Coordinator"
          });
          alert("Success: Task marked as done.");
          setRemarks("");
          fetchTasks();
        } catch (err) {
          alert("Action failed: Protocol error.");
        }
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
  const pendingCount = safeTasks.filter(t => (t.status === 'Pending' || t.status === 'Active') && (t.taskType !== 'Checklist' || getPendingInstances(t).length > 0)).length;
  const completedCount = safeTasks.filter(t => t.status === 'Completed' || t.status === 'Verified').length;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">
              Coordinator Dashboard
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-2 opacity-80">Track team tasks and daily work</p>
          </div>
        </div>
        <button 
          onClick={fetchTasks} 
          className="group w-full md:w-auto bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl hover:shadow-primary/5"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {/* SEARCH BAR TERMINAL */}
      <div className="mb-6 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-400 group-focus-within:text-primary transition-colors" />
        </div>
        <input 
          type="text"
          placeholder="Search by Personnel Name, Department, or Task Title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border pl-12 pr-10 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-inner"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-primary group-hover:scale-110 transition-transform"><Layers size={60} /></div>
          <span className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Total Tasks</span>
          <div className="text-3xl md:text-4xl font-black text-foreground mt-2 tracking-tighter">{safeTasks.length}</div>
        </div>
        <div className="bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 group-hover:scale-110 transition-transform"><Clock size={60} /></div>
          <span className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Pending Work</span>
          <div className="text-3xl md:text-4xl font-black text-red-600 dark:text-red-500 mt-2 tracking-tighter">{pendingCount}</div>
        </div>
        <div className="bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={60} /></div>
          <span className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Completed</span>
          <div className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-500 mt-2 tracking-tighter">{completedCount}</div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 mb-6 bg-card/50 p-2 rounded-3xl border border-border w-fit">
        {['Pending', 'Upcoming', 'Completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-slate-500 hover:text-foreground hover:bg-background'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TASK LIST */}
      <div className="bg-card rounded-[1.5rem] md:rounded-[2.5rem] border border-border shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left min-w-[1000px]">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Type</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Task Name</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Assigned To</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] text-center">Mobile</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Due Date</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const isChecklist = task.taskType === 'Checklist';
                const instances = isChecklist ? getPendingInstances(task) : [];
                const isExpanded = expandedTaskId === task._id;
                const isPending = task.status === "Pending" || task.status === "Active";
                const hasPendingInstances = instances.length > 0;

                return (
                  <React.Fragment key={task._id}>
                    <tr className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all group">
                      <td className="px-8 py-6">
                        <div className={`p-2 rounded-lg w-fit ${isChecklist ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                          {isChecklist ? <ClipboardList size={18} /> : <Target size={18} />}
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-foreground mb-1 uppercase tracking-tight truncate max-w-[200px]">{task.title}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                          {isChecklist ? `Frequency: ${task.frequency}` : `ID: ${task._id?.slice(-6).toUpperCase()}`}
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-tight">
                            <UserCheck size={14} className="text-emerald-500" /> {task.doerId?.name || 'Not Assigned'}
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase ml-5 tracking-tighter">
                            Dept: {task.doerId?.department || 'N/A'}
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-background px-4 py-1.5 rounded-xl border border-border text-primary font-black text-[11px] font-mono shadow-inner">
                          <Phone size={10} /> {task.doerId?.whatsappNumber || 'Not Set'}
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                          <Clock size={12} className="text-primary/40" /> 
                          {task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : 'Not Set'}
                        </div>
                        {hasPendingInstances && (
                          <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-1 block">
                            {instances.filter(i => i.isPast).length} Pending + {instances.filter(i => i.isToday).length} Today
                          </span>
                        )}
                      </td>

                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest border w-fit shadow-sm ${
                          isPending ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                          {task.status || 'Active'}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex justify-end items-center gap-3">
                          {hasPendingInstances && (
                            <button
                              onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all active:scale-90"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {instances.length} Pending
                            </button>
                          )}
                          
                          {activeTab !== 'Completed' && (
                            <button
                              onClick={() => openReminderModal(task)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all active:scale-90"
                            >
                              <MessageCircle size={14} /> Remind
                            </button>
                          )}

                          {!isChecklist && task.status !== "Completed" && task.status !== "Verified" && (
                            <button
                              onClick={() => handleMarkDone(task)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                            >
                              <Zap size={14} /> Mark Done
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED PENDING INSTANCES */}
                    {isExpanded && hasPendingInstances && (
                      <tr>
                        <td colSpan="7" className="px-8 py-6 bg-background/50">
                          <div className="space-y-4">
                            <h5 className="text-primary font-black text-[10px] uppercase tracking-widest mb-4">Pending Dates to Mark</h5>
                            {instances.map((instance, idx) => (
                              <div 
                                key={idx}
                                className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-xl border transition-all gap-4 ${
                                  instance.isPast 
                                    ? 'bg-red-500/5 border-red-500/20' 
                                    : instance.isToday 
                                    ? 'bg-amber-500/5 border-amber-500/20' 
                                    : 'bg-card border-border'
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`p-2 rounded-lg border ${
                                    instance.isPast 
                                      ? 'bg-red-500/10 border-red-500/20' 
                                      : instance.isToday 
                                      ? 'bg-amber-500/10 border-amber-500/20' 
                                      : 'bg-primary/10 border-primary/20'
                                  }`}>
                                    <Calendar size={18} className={
                                      instance.isPast 
                                        ? 'text-red-600 dark:text-red-400' 
                                        : instance.isToday 
                                        ? 'text-amber-600 dark:text-amber-400' 
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
                                        ? 'text-red-600 dark:text-red-400' 
                                        : instance.isToday 
                                        ? 'text-amber-600 dark:text-amber-400' 
                                        : 'text-primary'
                                    }`}>
                                      {instance.status}
                                    </p>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => handleMarkDone(task, instance.date.toISOString())}
                                  className={`w-full md:w-auto px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
                                    instance.isPast 
                                      ? 'bg-red-600 hover:bg-red-500 text-white' 
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  }`}
                                >
                                  <CheckCircle2 size={14} />
                                  Mark as Done
                                </button>
                              </div>
                            ))}
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
        {filteredTasks.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
            <ShieldCheck size={56} className="text-primary" />
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">No matches found for "{searchTerm}" in {activeTab}</p>
          </div>
        )}
      </div>

      {/* WHATSAPP REMINDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95">
            <div className="px-8 py-7 border-b border-border flex justify-between items-center bg-background/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                  <MessageSquare size={22} className="text-primary" />
                </div>
                <h3 className="text-foreground font-black text-xl tracking-tighter uppercase">Send Reminder</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-foreground transition-colors active:scale-90">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 lg:p-10">
              <div className="mb-8 bg-background border border-border p-5 rounded-2xl shadow-inner">
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-2">Sending To:</div>
                <div className="text-foreground font-black text-sm flex items-center gap-3">
                  <UserCheck size={16} className="text-emerald-500" /> {selectedTask?.doerId?.name} 
                  <span className="text-primary font-mono text-[11px] bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">({selectedTask?.doerId?.whatsappNumber})</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block ml-2">Message</label>
                <textarea 
                  className="w-full h-32 bg-background border border-border rounded-2xl p-5 text-foreground text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none shadow-inner"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your reminder message..."
                ></textarea>
              </div>

              <button 
                onClick={handleSendWhatsApp}
                className="w-full bg-primary hover:bg-sky-400 text-primary-foreground font-black py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-primary/20 uppercase text-xs tracking-widest"
              >
                <MessageCircle size={20} /> Send via WhatsApp
              </button>
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