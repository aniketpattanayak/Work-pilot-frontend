import React, { useEffect, useState, useCallback, useMemo } from "react";
import API from '../api/axiosConfig'; 
import {
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  History,
  Lock,
  X,
  Upload,
  Send,
  RefreshCcw,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Maximize2,
  CheckCircle2,
  Briefcase,
  Users,
  Activity
} from "lucide-react";

/**
 * DOER CHECKLIST: MISSION TERMINAL v1.5
 * Purpose: Aggregates one-time assignments and routines for the active node.
 * UI: Fully responsive and theme-adaptive (Light/Dark).
 */
const DoerChecklist = ({ doerId }) => {
  const [checklist, setChecklist] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [timeFilter, setTimeFilter] = useState('Today'); 
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null); 
  const [modalType, setModalType] = useState(""); 
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const savedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentDoerId = doerId || savedUser._id || savedUser.id;

  // Helper: Checks if a date is exactly Today
  const isSameDayAsToday = (dateStr) => {
    if (!dateStr) return false;
    const target = new Date(dateStr);
    const today = new Date();
    return target.getFullYear() === today.getFullYear() &&
           target.getMonth() === today.getMonth() &&
           target.getDate() === today.getDate();
  };

  /**
   * 1. DATA ACQUISITION: Synchronizing Mission Telemetry
   */
  const fetchAllTasks = useCallback(async () => {
    if (!currentDoerId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [checklistRes, delegationRes] = await Promise.all([
        API.get(`/tasks/checklist/${currentDoerId}`).catch(() => ({ data: [] })),
        API.get(`/tasks/doer/${currentDoerId}`).catch(() => ({ data: [] }))
      ]);

      const safeChecklist = Array.isArray(checklistRes.data) ? checklistRes.data : (checklistRes.data?.data || []);
      const safeDelegated = Array.isArray(delegationRes.data) ? delegationRes.data : (delegationRes.data?.tasks || delegationRes.data?.data || []);

      setChecklist(safeChecklist);
      setDelegatedTasks(safeDelegated);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false); 
    }
  }, [currentDoerId]);

  useEffect(() => { fetchAllTasks(); }, [fetchAllTasks]);

  /**
   * 2. TACTICAL FILTER ENGINE: Optimized for performance
   */
  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filterByDate = (dateStr) => {
      if (!dateStr) return false;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);

      if (timeFilter === 'Today') return target.getTime() <= now.getTime();
      if (timeFilter === 'Next 7 Days') {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        return target >= now && target <= nextWeek;
      }
      if (timeFilter === 'Next 1 Year') {
        const nextYear = new Date(now);
        nextYear.setFullYear(now.getFullYear() + 1);
        return target >= now && target <= nextYear;
      }
      return true; // 'All'
    };

    return {
      routines: checklist.filter(item => filterByDate(item.nextDueDate)),
      assignments: delegatedTasks.filter(item => filterByDate(item.deadline))
    };
  }, [checklist, delegatedTasks, timeFilter]);

  const isDoneToday = (lastCompleted) => {
    if (!lastCompleted) return false;
    const today = new Date().toISOString().split("T")[0];
    const doneDate = new Date(lastCompleted).toISOString().split("T")[0];
    return today === doneDate;
  };

  /**
   * 3. SUBMISSION HANDSHAKE: Encrypting and transmitting results
   */
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;
    const formData = new FormData();
    formData.append("remarks", remarks);
    if (selectedFile) formData.append("evidence", selectedFile);
    try {
      setUploading(true);
      if (modalType === "Checklist") {
        formData.append("checklistId", activeTask._id);
        await API.post("/tasks/checklist-done", formData);
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);
        await API.put(`/tasks/respond`, formData);
      }
      alert("Success: Mission telemetry synchronized.");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();
    } catch (err) { 
      alert("Submission Error: Transmission failed."); 
    } finally { 
      setUploading(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase">Syncing Mission Hub...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER: Adaptive Spacing */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <ClipboardCheck size={32} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Work Board</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Strict Agenda for: {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group w-full md:w-auto bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl hover:shadow-primary/5">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {/* TACTICAL FILTERS: Responsive Grid */}
      <div className="flex flex-wrap gap-3 mb-12">
        {['All', 'Today', 'Next 7 Days', 'Next 1 Year'].map(range => (
          <button 
            key={range} 
            onClick={() => setTimeFilter(range)}
            className={`px-6 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-sm ${
              timeFilter === range 
                ? 'bg-primary text-white dark:text-slate-950 border-primary shadow-primary/20' 
                : 'bg-card text-slate-500 border-border hover:border-slate-400'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* ASSIGNMENTS SECTION: Responsive Layout */}
      <section className="mb-16">
        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-4 px-1">
           <Briefcase size={16} className="text-primary" /> One-Time Assignments <div className="h-px flex-1 bg-border/50" />
        </h3>
        <div className="flex flex-col gap-4">
          {filteredData.assignments.length > 0 ? filteredData.assignments.map((task) => {
            const isDueToday = isSameDayAsToday(task.deadline);
            return (
              <div key={task._id} className="bg-card backdrop-blur-xl p-6 sm:p-8 border border-border rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-xl hover:border-primary/20 transition-all group gap-6">
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-black text-lg md:text-xl uppercase tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</h4>
                  <div className="flex items-center gap-3 mt-2">
                    <Clock size={12} className={isDueToday ? 'text-primary' : 'text-slate-400'} />
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDueToday ? 'text-primary' : 'text-slate-500 dark:text-slate-600'}`}>
                      Deadline: {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} {!isDueToday && "(Locked)"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                   {task.status === "Pending" && (
                     <button 
                       disabled={!isDueToday} 
                       onClick={() => API.put(`/tasks/respond`, {taskId: task._id, status: 'Accepted', doerId: currentDoerId}).then(fetchAllTasks)} 
                       className={`w-full sm:w-auto px-10 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg ${
                         isDueToday ? 'bg-primary text-white dark:text-slate-950 active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                       }`}
                     >
                       Authorize
                     </button>
                   )}
                   {task.status === "Accepted" && (
                     <button 
                       disabled={!isDueToday} 
                       onClick={() => {setActiveTask(task); setModalType("Delegation"); setShowModal(true);}} 
                       className={`w-full sm:w-auto px-10 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/10 ${
                         isDueToday ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                       }`}
                     >
                       Execute
                     </button>
                   )}
                </div>
              </div>
            );
          }) : (
            <div className="bg-background/50 border-2 border-dashed border-border rounded-[2.5rem] p-16 text-center group">
              <Activity size={40} className="mx-auto mb-4 text-slate-300 dark:text-slate-800 group-hover:scale-110 transition-transform" />
              <p className="text-slate-400 dark:text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">Registry Empty: No Directives in Range</p>
            </div>
          )}
        </div>
      </section>

      {/* ROUTINE CHECKLIST SECTION: Responsive Cards */}
      <section>
        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-4 px-1">
           <CheckCircle2 size={16} className="text-emerald-500" />Routines Checklists <div className="h-px flex-1 bg-border/50" />
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {filteredData.routines.length > 0 ? filteredData.routines.map((item) => {
            const alreadyDone = isDoneToday(item.lastCompleted);
            const isDueToday = isSameDayAsToday(item.nextDueDate);
            return (
              <div key={item._id} className={`p-6 sm:p-8 border flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-[1.5rem] sm:rounded-[2.5rem] transition-all gap-6 ${
                alreadyDone 
                  ? "bg-background/50 border-border opacity-50 grayscale shadow-inner" 
                  : "bg-card border-border shadow-xl hover:border-emerald-500/30"
              }`}>
                <div className="flex items-center gap-5 min-w-0">
                  <div className={`p-3 rounded-2xl border shrink-0 transition-colors ${
                    alreadyDone ? 'bg-background border-border text-slate-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500 shadow-sm'
                  }`}>
                    {alreadyDone ? <Lock size={20} /> : <CheckCircle size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className={`font-black tracking-tight text-lg md:text-xl uppercase truncate ${alreadyDone ? "text-slate-500" : "text-foreground"}`}>{item.taskName}</h4>
                    <div className="flex items-center gap-2 mt-2">
                       <Calendar size={12} className="text-slate-400" />
                       <p className={`text-[10px] font-black uppercase tracking-widest ${isDueToday ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500'}`}>Next Synchronization: {new Date(item.nextDueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} {!isDueToday && "(Locked)"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto">
                  {!alreadyDone ? (
                    <button 
                      disabled={!isDueToday} 
                      onClick={() => {setActiveTask(item); setModalType("Checklist"); setShowModal(true);}} 
                      className={`w-full sm:w-auto px-10 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all ${
                        isDueToday ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      Initialize
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase bg-background px-5 py-2.5 rounded-xl border border-border shadow-inner whitespace-nowrap">
                      <Lock size={12} /> Daily Cycle Finalized
                    </span>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="bg-background/50 border-2 border-dashed border-border rounded-[2.5rem] p-16 text-center group">
              <Activity size={40} className="mx-auto mb-4 text-slate-300 dark:text-slate-800 group-hover:scale-110 transition-transform" />
              <p className="text-slate-400 dark:text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">No Active Routines Scheduled</p>
            </div>
          )}
        </div>
      </section>

      {/* MISSION FINALIZATION MODAL: Adaptive Surface */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 lg:p-12 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-foreground transition-colors active:scale-90 cursor-pointer z-20"><X size={24} /></button>
            
            <form onSubmit={handleFinalSubmit} className="space-y-8 relative z-10">
              <div className="mb-10 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 mx-auto mb-6 shadow-sm">
                   <Send size={28} className="text-primary" />
                </div>
                <h3 className="text-foreground text-2xl font-black tracking-tighter uppercase leading-none">Mission Verification</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3 opacity-80 truncate">Directive: {activeTask?.title || activeTask?.taskName}</p>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 block">Execution Log Entry</label>
                 <textarea 
                   required 
                   placeholder="Define achieved milestones or tactical updates..." 
                   value={remarks} 
                   onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-36 bg-background border border-border text-foreground p-5 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-sm resize-none shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700 uppercase tracking-tight" 
                 />
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 block">Tactical Evidence Blueprint</label>
                 <div className="relative group border-2 border-dashed p-10 rounded-2xl text-center bg-background border-border group-hover:border-primary/40 transition-all shadow-inner">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center gap-3">
                       <Upload size={32} className={`transition-colors ${selectedFile ? 'text-emerald-500' : 'text-slate-400 group-hover:text-primary'}`} />
                       <div>
                         <p className="text-xs font-black text-foreground uppercase tracking-tight">{selectedFile ? selectedFile.name : "Authorize Asset Upload"}</p>
                         <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Images or PDF Documentation</p>
                       </div>
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={uploading} 
                className="w-full py-6 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white dark:text-slate-950 font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {uploading ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {uploading ? "Transmitting Evidence..." : "Finalize Mission Handshake"}
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-border/50 text-center flex items-center justify-center gap-2 opacity-30 grayscale">
               <ShieldCheck size={12} className="text-primary" />
               <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Secure Node Verification Active</p>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX (Themed) */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[10000] flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 bg-red-600 hover:bg-red-500 p-4 rounded-full text-white shadow-2xl transition-all active:scale-90 z-20"><X size={28} /></button>
          <img src={previewImage} alt="Mission Evidence" className="max-w-full max-h-[90vh] rounded-[2rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default DoerChecklist;