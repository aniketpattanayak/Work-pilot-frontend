// client/src/pages/DoerChecklist.jsx
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
  Activity,
  ShieldCheck,
  TrendingUp,
  Layers
} from "lucide-react";

/**
 * DOER CHECKLIST: MISSION TERMINAL v1.8
 * Purpose: Aggregates one-time assignments and routine instances.
 * Updated: Added "Pending Work" filter for incomplete tasks only.
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

      // The backend now sends multiple instances if gaps exist
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
   * 2. TACTICAL FILTER ENGINE: Updated with Pending Work filter
   */
  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filterByDate = (dateStr) => {
      if (!dateStr) return false;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);

      // NEW: 'Pending Work' filter - shows only overdue/missed items
      if (timeFilter === 'Pending Work') {
        return target.getTime() < now.getTime();
      }

      // 'Today' filter includes Backlog (Past dates) + Today
      if (timeFilter === 'Today') return target.getTime() <= now.getTime();
      
      if (timeFilter === 'Next 7 Days') {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        return target >= now && target <= nextWeek;
      }
      
      return true; // 'All'
    };

    // Filter delegation tasks by status for "Pending Work"
    const filteredAssignments = timeFilter === 'Pending Work' 
      ? delegatedTasks.filter(item => 
          (item.status !== 'Completed' && item.status !== 'Verified') && 
          filterByDate(item.deadline)
        )
      : delegatedTasks.filter(item => filterByDate(item.deadline));

    return {
      routines: checklist.filter(item => filterByDate(item.instanceDate || item.nextDueDate)),
      assignments: filteredAssignments
    };
  }, [checklist, delegatedTasks, timeFilter]);

  /**
   * 3. SUBMISSION HANDSHAKE: Updated for specific Instance Dates
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
        // Record which specific day we are marking as finished
        if (activeTask.instanceDate) {
            formData.append("instanceDate", activeTask.instanceDate);
        }
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
      <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase">Loading...</p>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 bg-card/50 p-6 md:p-10 border border-border rounded-[3rem] backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 shadow-inner shrink-0">
            <ClipboardCheck size={36} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">Work Board</h2>
            <div className="flex items-center gap-3 mt-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest opacity-80">Date Active for: {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group w-full md:w-auto bg-card hover:bg-background border border-border px-10 py-5 rounded-[1.8rem] text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/10 relative z-10">
          <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Sync Tasks
        </button>
      </div>

      {/* FILTERS - UPDATED WITH PENDING WORK */}
      <div className="flex flex-wrap gap-4 mb-16">
        {['All', 'Today', 'Pending Work', 'Next 7 Days'].map(range => (
          <button 
            key={range} 
            onClick={() => setTimeFilter(range)}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
              timeFilter === range 
                ? range === 'Pending Work'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-amber-500/30'
                  : 'bg-primary text-white dark:text-slate-950 border-primary shadow-primary/30'
                : 'bg-card text-slate-500 border-border hover:border-primary/40'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* ASSIGNMENTS SECTION */}
      <section className="mb-20">
        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-10 flex items-center gap-6 px-1">
           <Briefcase size={20} className="text-primary" /> One-Time Assignments <div className="h-px flex-1 bg-border/50" />
        </h3>
        <div className="flex flex-col gap-6">
          {filteredData.assignments.length > 0 ? filteredData.assignments.map((task) => {
            const isDueToday = isSameDayAsToday(task.deadline);
            const isPastDue = new Date(task.deadline) < new Date();
            
            return (
              <div key={task._id} className={`bg-card backdrop-blur-xl p-8 border rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center shadow-2xl transition-all group gap-8 ${
                isPastDue && task.status !== 'Completed' && task.status !== 'Verified'
                  ? 'border-amber-500/30 hover:border-amber-500/50'
                  : 'border-border hover:border-primary/30'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-foreground font-black text-xl md:text-2xl uppercase tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</h4>
                    {isPastDue && task.status !== 'Completed' && task.status !== 'Verified' && (
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest">Overdue</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <Clock size={14} className={isPastDue ? 'text-amber-500' : isDueToday ? 'text-primary' : 'text-slate-400'} />
                    <p className={`text-xs font-black uppercase tracking-widest ${
                      isPastDue ? 'text-amber-600' : isDueToday ? 'text-primary' : 'text-slate-500 dark:text-slate-600'
                    }`}>
                      Deadline: {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} 
                      {!isDueToday && !isPastDue && " (Locked)"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                   {task.status === "Pending" && (
                     <button 
                       disabled={!isDueToday && !isPastDue} 
                       onClick={() => API.put(`/tasks/respond`, {taskId: task._id, status: 'Accepted', doerId: currentDoerId}).then(fetchAllTasks)} 
                       className={`w-full md:w-auto px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                         (isDueToday || isPastDue) ? 'bg-primary text-white dark:text-slate-950 active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                       }`}
                     >
                       Authorize
                     </button>
                   )}
                   {task.status === "Accepted" && (
                     <button 
                       disabled={!isDueToday && !isPastDue} 
                       onClick={() => {setActiveTask(task); setModalType("Delegation"); setShowModal(true);}} 
                       className={`w-full md:w-auto px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/20 ${
                         (isDueToday || isPastDue) ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                       }`}
                     >
                       Execute Task
                     </button>
                   )}
                </div>
              </div>
            );
          }) : (
            <div className="bg-background/50 border-2 border-dashed border-border rounded-[3rem] p-20 text-center group">
              <Activity size={48} className="mx-auto mb-6 text-slate-300 dark:text-slate-800 group-hover:scale-110 transition-transform" />
              <p className="text-slate-400 dark:text-slate-600 font-black uppercase text-[11px] tracking-[0.5em]">
                {timeFilter === 'Pending Work' ? 'All Caught Up: No Overdue Tasks' : 'Registry Empty: No Directives in Range'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ROUTINES & BACKLOG SECTION */}
      <section>
        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-10 flex items-center gap-6 px-1">
           <Layers size={20} className="text-emerald-500" /> Routines & Backlog <div className="h-px flex-1 bg-border/50" />
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {filteredData.routines.length > 0 ? filteredData.routines.map((item) => {
            const displayDate = new Date(item.instanceDate || item.nextDueDate);
            const isBacklog = item.isBacklog; // Identified by backend gaps

            return (
              <div 
                key={`${item._id}-${item.instanceDate}`} 
                className={`p-8 sm:p-10 border flex flex-col md:flex-row justify-between items-start md:items-center rounded-[2.5rem] md:rounded-[3rem] transition-all gap-8 ${
                  isBacklog 
                    ? "bg-amber-500/[0.03] border-amber-500/20 shadow-2xl" 
                    : "bg-card border-border shadow-2xl hover:border-emerald-500/30"
                }`}
              >
                <div className="flex items-center gap-8 min-w-0">
                  <div className={`w-16 h-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 transition-all ${
                    isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                  }`}>
                    {isBacklog ? <History size={28} className="animate-pulse" /> : <CheckCircle2 size={28} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black tracking-tighter text-xl md:text-2xl uppercase truncate text-foreground mb-2">{item.taskName}</h4>
                    <div className="flex items-center gap-4">
                       <Calendar size={14} className="text-slate-400" />
                       <p className={`text-[10px] font-black uppercase tracking-widest ${isBacklog ? 'text-amber-600 font-black' : 'text-emerald-600'}`}>
                         {isBacklog ? 'MISSED DATE: ' : 'Scheduled Date: '} 
                         {displayDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                       </p>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-auto">
                    <button 
                      onClick={() => {
                        setActiveTask(item); 
                        setModalType("Checklist"); 
                        setShowModal(true);
                      }} 
                      className={`w-full md:w-auto px-12 py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${
                        isBacklog 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                      }`}
                    >
                      Mark as Done
                    </button>
                </div>
              </div>
            );
          }) : (
            <div className="bg-background/50 border-2 border-dashed border-border rounded-[3rem] p-20 text-center group">
              <Activity size={48} className="mx-auto mb-6 text-slate-300 dark:text-slate-800 group-hover:scale-110 transition-transform" />
              <p className="text-slate-400 dark:text-slate-600 font-black uppercase text-[11px] tracking-[0.5em]">
                {timeFilter === 'Pending Work' ? 'All Caught Up: No Missed Routines' : 'System Synchronized: No Pending Routines'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* MISSION FINALIZATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[3.5rem] p-10 md:p-14 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 overflow-y-auto max-h-[95vh] custom-scrollbar">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-foreground hover:rotate-90 transition-all active:scale-90 cursor-pointer z-20"><X size={32} /></button>
            
            <form onSubmit={handleFinalSubmit} className="space-y-10 relative z-10">
              <div className="mb-12 text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center border mx-auto mb-8 shadow-2xl ${
                    activeTask?.isBacklog ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/10 border-primary/20'
                }`}>
                   <Send size={36} className={activeTask?.isBacklog ? 'text-amber-600' : 'text-primary'} />
                </div>
                <h3 className="text-foreground text-3xl font-black tracking-tighter uppercase leading-none mb-4">
                    {activeTask?.isBacklog ? 'Catch-up Protocol' : 'Mission Verification'}
                </h3>
                <div className="inline-flex flex-col gap-2">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] opacity-60">Directive Identifier</span>
                    <p className="text-primary font-black uppercase tracking-tight text-lg">{activeTask?.title || activeTask?.taskName}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Target Date: {new Date(activeTask?.instanceDate || activeTask?.nextDueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3 block">Execution Narrative</label>
                 <textarea 
                   required 
                   placeholder="Define achieved milestones or tactical updates..." 
                   value={remarks} 
                   onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-44 bg-background border border-border text-foreground p-8 rounded-[2rem] focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-base resize-none shadow-inner placeholder:text-slate-400/50 uppercase tracking-tight" 
                 />
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3 block">Evidence Log Payload</label>
                 <div className="relative group border-2 border-dashed p-14 rounded-[2.5rem] text-center bg-background border-border group-hover:border-primary/50 transition-all shadow-inner">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center gap-5">
                       <Upload size={40} className={`transition-all duration-500 ${selectedFile ? 'text-emerald-500 scale-110' : 'text-slate-400 group-hover:text-primary'}`} />
                       <div>
                         <p className="text-sm font-black text-foreground uppercase tracking-tight">{selectedFile ? selectedFile.name : "Authorize Asset Upload"}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 opacity-60">High-Resolution Log (JPG, PNG, PDF)</p>
                       </div>
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={uploading} 
                className={`w-full py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-6 ${
                    activeTask?.isBacklog 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/30' 
                        : 'bg-gradient-to-r from-sky-500 to-sky-600 shadow-primary/30'
                } text-white dark:text-slate-950`}
              >
                {uploading ? <RefreshCcw className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                {uploading ? "Transmitting Cipher..." : "Finalize Mission Instance"}
              </button>
            </form>
            
            <div className="mt-12 pt-8 border-t border-border/50 text-center flex items-center justify-center gap-3 opacity-40 grayscale">
               <TrendingUp size={16} className="text-primary" />
               <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Secure Operation Pulse Active</p>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/98 z-[10000] flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-10 right-10 bg-red-600 hover:bg-red-500 p-5 rounded-full text-white shadow-2xl transition-all active:scale-90 z-20 hover:rotate-90"><X size={32} /></button>
          <img src={previewImage} alt="Mission Evidence" className="max-w-full max-h-[85vh] rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-700" />
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