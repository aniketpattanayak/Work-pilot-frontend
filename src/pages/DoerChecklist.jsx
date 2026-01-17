import React, { useEffect, useState, useCallback } from "react";
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
  UserPlus,
  ShieldCheck,
  Zap,
  Target
} from "lucide-react";

/**
 * DOER CHECKLIST: OPERATIONAL EXECUTION TERMINAL v1.3
 * Purpose: Manages individualized mission delegations and recurring protocol cycles.
 * Logic: Supports AWS S3 multi-part uploads for work proof and collaborative node tracking.
 */
const DoerChecklist = ({ doerId }) => {
  const [checklist, setChecklist] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // --- ADMINISTRATIVE SUBMISSION STATES ---
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null); 
  const [modalType, setModalType] = useState(""); 
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- STATE FOR ASSET PREVIEW ---
  const [previewImage, setPreviewImage] = useState(null);

  const savedUser = JSON.parse(localStorage.getItem("user"));
  const currentDoerId = doerId || savedUser?._id || savedUser?.id;

  // --- DATA ACQUISITION: GRID SYNCHRONIZATION ---
  const fetchAllTasks = useCallback(async () => {
    if (!currentDoerId || currentDoerId === "undefined") return;
  
    try {
      setLoading(true);
      const [checklistRes, delegationRes] = await Promise.all([
        API.get(`/tasks/checklist/${currentDoerId}`).catch(() => ({ data: [] })),
        API.get(`/tasks/doer/${currentDoerId}`).catch(() => ({ data: [] }))
      ]);
  
      const safeChecklist = Array.isArray(checklistRes.data) 
        ? checklistRes.data 
        : (checklistRes.data?.data || []);

      const safeDelegation = Array.isArray(delegationRes.data) 
        ? delegationRes.data 
        : (delegationRes.data?.tasks || delegationRes.data?.data || []);

      setChecklist(safeChecklist);
      setDelegatedTasks(safeDelegation);
    } catch (err) {
      console.error("Grid Sync Failure:", err);
      setChecklist([]);
      setDelegatedTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentDoerId]);

  useEffect(() => {
    fetchAllTasks();
  }, [currentDoerId, fetchAllTasks]);

  const toggleExpand = (id) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const openCompletionModal = (task, type) => {
    setActiveTask(task);
    setModalType(type);
    setShowModal(true);
  };

  // --- COMMAND: TRANSMIT WORK PROOF ---
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
        await API.post("/tasks/checklist-done", formData, { 
          headers: { "Content-Type": "multipart/form-data" } 
        });
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);

        await API.put(`/tasks/respond`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      alert("Node Synchronized: Work verified and transmitted successfully.");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Transmission Protocol Failure.");
    } finally {
      setUploading(false);
    }
  };

  const isDoneToday = (lastCompleted) => {
    if (!lastCompleted) return false;
    const today = new Date().toISOString().split("T")[0];
    const doneDate = new Date(lastCompleted).toISOString().split("T")[0];
    return today === doneDate;
  };

  const handleTaskAction = async (taskId, status) => {
    let revisedDeadline = null;
    let actionRemarks = null;

    if (status === "Revision Requested") {
      revisedDeadline = prompt("Enter proposed Optimization Date (YYYY-MM-DD):");
      if (!revisedDeadline) return;
      actionRemarks = prompt("Specify justification for timeline adjustment:");
      if (!actionRemarks) return;

      try {
        await API.put(`/tasks/respond`, {
          taskId, status, revisedDeadline, remarks: actionRemarks, doerId: currentDoerId,
        });
        alert("Optimization proposal transmitted to commander.");
        fetchAllTasks();
      } catch (err) { alert("Protocol Handshake Failed"); }
    } else {
      try {
        await API.put(`/tasks/respond`, { taskId, status, doerId: currentDoerId });
        fetchAllTasks();
      } catch (err) { alert("Execution Signal Failed"); }
    }
  };

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-8">
        <div className="relative">
          <RefreshCcw className="animate-spin text-primary" size={64} />
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        </div>
        <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase text-center">Syncing Operational Grid...</p>
      </div>
    );

  const safeDelegatedTasks = Array.isArray(delegatedTasks) ? delegatedTasks : [];
  const safeChecklist = Array.isArray(checklist) ? checklist : [];

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-1000 pb-24 selection:bg-primary/30">
      
      {/* --- BLUEPRINT PREVIEW MODAL --- */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-10 right-10 bg-white/10 hover:bg-rose-500 text-white p-4 rounded-full transition-all active:scale-90 border border-white/10 shadow-2xl shadow-black/50">
            <X size={28} />
          </button>
          <img src={previewImage} alt="Blueprint Asset" className="max-w-full max-h-[85vh] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner transition-all duration-500">
            <ClipboardCheck size={36} className="text-primary" />
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Operational Board</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Directives Matrix: Individual Delegations & Recurring Cycles
            </p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-card hover:bg-background border border-border px-10 py-5 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Re-Sync Grid
        </button>
      </div>

      {/* --- SECTION: DELEGATED MISSIONS --- */}
      <section className="mb-20">
        <div className="flex items-center gap-5 mb-10 px-3">
           <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20"><Briefcase size={20} className="text-primary" /></div>
           <h3 className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.4em]">One-Time Node Assignments</h3>
           <div className="h-px flex-1 bg-border/50" />
        </div>

        {safeDelegatedTasks.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {safeDelegatedTasks.map((task) => {
              const isLead = task.doerId === currentDoerId;
              const isExpanded = expandedTaskId === task._id;

              return (
              <div key={task._id} className="flex flex-col group transition-all duration-500">
                <div 
                  onClick={() => toggleExpand(task._id)}
                  className={`
                    bg-card backdrop-blur-xl p-8 md:p-10 border transition-all cursor-pointer shadow-lg
                    ${isExpanded ? "rounded-t-[3rem] border-primary/40 bg-background/80" : "rounded-[3rem] border-border hover:border-primary/30"}
                  `}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <div className={`p-2.5 rounded-xl border transition-all duration-500 ${isExpanded ? 'bg-primary text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'bg-background border-border text-slate-400'}`}>
                           {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        <h4 className="text-foreground font-black text-2xl tracking-tighter truncate uppercase">{task.title}</h4>
                        
                        <span className={`px-5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-[0.2em] border shadow-sm ${
                          task.status === "Verified" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                          task.status === "Completed" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                          "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {task.status || 'Active'}
                        </span>

                        {!isLead && (
                          <div className="flex items-center gap-2 px-5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-[0.2em] border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm">
                            <Users size={12} /> Support Node
                          </div>
                        )}
                      </div>
                      <p className={`text-slate-500 dark:text-slate-400 text-sm font-bold leading-relaxed border-l-4 border-border pl-6 py-1 ${isExpanded ? '' : 'line-clamp-1'}`}>{task.description}</p>
                      
                      {/* Collaborative Team */}
                      {Array.isArray(task.helperDoers) && task.helperDoers.length > 0 && (
                        <div className="flex items-center gap-4 mt-6">
                           <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Support Team:</span>
                           <div className="flex flex-wrap gap-2.5">
                              {task.helperDoers.map((helper, hIdx) => (
                                <div key={hIdx} className="bg-background border border-border px-4 py-1.5 rounded-xl text-[10px] font-black text-foreground uppercase tracking-widest shadow-inner">
                                   {helper.name}
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                      {/* Reference Blueprint Assets */}
                      {Array.isArray(task.files) && task.files.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-6">
                          {task.files.map((file, i) => (
                            <button key={i} onClick={(e) => { e.stopPropagation(); setPreviewImage(file.fileUrl); }} className="flex items-center gap-3 bg-background border border-border px-5 py-3 rounded-2xl text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:border-primary transition-all active:scale-95 shadow-sm group/blueprint">
                               <ImageIcon size={16} className="group-hover/blueprint:scale-110 transition-transform" /> Blueprint Asset {i+1} <Maximize2 size={12} className="ml-2 opacity-30" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row lg:flex-col gap-4 w-full lg:w-auto shrink-0 mt-6 lg:mt-0">
                      {isLead ? (
                        <>
                          {task.status === "Pending" && (
                            <div className="flex gap-4 w-full">
                              <button onClick={(e) => { e.stopPropagation(); handleTaskAction(task._id, "Accepted"); }} className="flex-1 bg-primary hover:bg-sky-400 text-white dark:text-slate-950 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-2xl shadow-primary/20">
                                Accept Mission
                              </button>
                              {task.isRevisionAllowed && (
                                <button onClick={(e) => { e.stopPropagation(); handleTaskAction(task._id, "Revision Requested"); }} className="bg-background hover:bg-rose-500/10 text-rose-500 border border-rose-500/30 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98]">
                                  Negotiate
                                </button>
                              )}
                            </div>
                          )}
                          {task.status === "Accepted" && (
                            <button onClick={(e) => { e.stopPropagation(); openCompletionModal(task, "Delegation"); }} className="w-full bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white dark:text-slate-950 px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all active:scale-[0.98] shadow-2xl shadow-emerald-600/20">
                              Verify & Finalize Work
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center lg:items-end gap-2.5 px-8 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] w-full shadow-inner">
                           <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Collaborator Node</span>
                           <span className="text-[11px] font-black text-slate-400 truncate uppercase tracking-tight">Lead Commander: {task.doerName || 'Primary Node'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* EXPANDED ASSET BRIEFING PANEL */}
                {isExpanded && (
                  <div className="bg-background/40 backdrop-blur-3xl p-8 lg:p-14 rounded-b-[3rem] border border-primary/40 border-t-0 animate-in slide-in-from-top-6 duration-500 grid grid-cols-1 xl:grid-cols-2 gap-12 shadow-inner">
                    <div className="space-y-8">
                      <h5 className="text-foreground font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-4 px-2">
                        <AlertCircle size={20} className="text-primary" /> Asset Parameters
                      </h5>
                      <div className="bg-card p-8 rounded-[2.5rem] border border-border space-y-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                           <Target size={140} className="text-primary" />
                        </div>
                        <div className="flex justify-between items-center border-b border-border/50 pb-5 relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Lead</span>
                            <span className="text-sm font-black text-foreground uppercase tracking-tight">{task.doerName || 'Primary Authorized Node'}</span>
                        </div>
                        <div className="space-y-3 relative z-10">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commander Briefing</span>
                             <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-primary/20 pl-6 py-1">
                                "{task.remarks || "No additional parameters specified. Standard protocol applies."}"
                             </p>
                        </div>
                        <div className="flex items-center gap-4 pt-4 relative z-10">
                           <div className={`flex items-center gap-3 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${task.isRevisionAllowed ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-600 bg-rose-500/10 border border-rose-500/20'}`}>
                              {task.isRevisionAllowed ? <Zap size={12} fill="currentColor" className="animate-pulse"/> : <Lock size={12}/>}
                              {task.isRevisionAllowed ? "Negotiable Logic" : "Strict Maturity State"}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h5 className="text-foreground font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-4 px-2">
                        <History size={20} className="text-primary" /> Immutable Ledger
                      </h5>
                      <div className="bg-card p-8 rounded-[2.5rem] border border-border max-h-[350px] overflow-y-auto custom-scrollbar space-y-10 shadow-sm">
                        {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().map((log, i) => (
                          <div key={i} className="relative pl-10 border-l-2 border-border last:border-0 pb-2">
                            <div className="absolute top-1.5 -left-[9px] w-4 h-4 rounded-full bg-card border-4 border-primary shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-primary font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">{log.action || 'Telemetry Log'}</span>
                                <span className="text-slate-400 font-black text-[10px] font-mono tracking-widest uppercase">{new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed italic opacity-80">"{log.remarks || 'Standard status handshake.'}"</p>
                          </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-16 opacity-20 grayscale">
                                <ShieldCheck size={64} />
                                <p className="text-[11px] font-black uppercase mt-6 tracking-[0.5em]">Registry Zero-State</p>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        ) : (
            <div className="bg-card border-2 border-dashed border-border rounded-[4rem] p-32 text-center transition-all shadow-inner">
                <AlertCircle size={80} className="mx-auto text-slate-200 dark:text-slate-800 mb-8 opacity-50" />
                <p className="text-slate-400 dark:text-slate-600 font-black text-sm uppercase tracking-[0.5em]">Command Grid Dormant: No Missions Found</p>
            </div>
        )}
      </section>

      {/* --- SECTION: PROTOCOL CYCLES (RECURRING) --- */}
      <section>
        <div className="flex items-center gap-5 mb-10 px-3">
           <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><CheckCircle2 size={20} className="text-emerald-500" /></div>
           <h3 className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.4em]">Recurring Protocol Cycles</h3>
           <div className="h-px flex-1 bg-border/50" />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {safeChecklist.map((item) => {
            const alreadyDone = isDoneToday(item.lastCompleted);
            const isExpanded = expandedTaskId === item._id;
            return (
              <div key={item._id} className="flex flex-col group transition-all duration-500">
                <div 
                  onClick={() => toggleExpand(item._id)}
                  className={`
                    p-8 md:p-10 border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-center gap-8
                    ${alreadyDone ? "bg-background border-border opacity-60 grayscale-[0.4]" : "bg-card border-emerald-500/20 hover:border-emerald-500 shadow-lg shadow-emerald-500/5"}
                    ${isExpanded ? "rounded-t-[3rem] border-b-0 bg-background/80" : "rounded-[3rem]"}
                  `}
                >
                  <div className="flex items-center gap-8 w-full sm:w-auto">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border transition-all shadow-inner ${alreadyDone ? 'bg-background border-border text-slate-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/10'}`}>
                       {alreadyDone ? <Lock size={28} /> : <CheckCircle size={28} />}
                    </div>
                    <div>
                      <h4 className={`font-black text-2xl tracking-tighter uppercase ${alreadyDone ? "text-slate-400" : "text-foreground"}`}>{item.taskName}</h4>
                      <div className="flex items-center gap-4 mt-3">
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] bg-background px-3 py-1 rounded-lg border border-border shadow-inner">Recurrence: {item.frequency}</span>
                         <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">Active Loop Cycle</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                    {alreadyDone ? (
                      <div className="flex items-center gap-3 bg-emerald-500/5 px-8 py-3 rounded-full border border-emerald-500/20 shadow-inner">
                         <CheckCircle size={18} className="text-emerald-500" />
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Verified Today</span>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); openCompletionModal(item, "Checklist"); }} className="flex-1 sm:flex-none bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white dark:text-slate-950 px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-2xl shadow-emerald-600/20">
                        Initiate Cycle
                      </button>
                    )}
                    <div className={`p-2.5 rounded-xl transition-all duration-500 ${isExpanded ? 'bg-background text-primary rotate-180 shadow-inner' : 'text-slate-300 dark:text-slate-700'}`}>
                        <ChevronDown size={24} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-background/80 backdrop-blur-3xl p-8 rounded-b-[3rem] border border-border border-t-0 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                    <h5 className="text-emerald-500 font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4 px-3">
                        <History size={20} /> Cycle Verification History
                    </h5>
                    <div className="space-y-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                      {Array.isArray(item.history) && item.history.length > 0 ? [...item.history].reverse().map((log, i) => (
                        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-6 rounded-3xl border border-border hover:border-emerald-500/30 transition-all shadow-sm gap-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                             <Target size={60} className="text-emerald-500" />
                          </div>
                          <div className="space-y-3 flex-1 relative z-10">
                            <div className="flex items-center gap-4">
                                <span className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">{log.action || 'Execution Verify'}</span>
                                <span className="text-slate-400 font-black text-[10px] font-mono tracking-widest uppercase">{new Date(log.timestamp).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold leading-relaxed italic opacity-80">"{log.remarks || "Standard operating cycle finalized successfully."}"</p>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 relative z-10">
                             <div className="p-2.5 bg-background rounded-xl border border-border">
                               <FileText size={18} />
                             </div>
                          </div>
                        </div>
                      )) : <p className="text-slate-500 text-[11px] font-black uppercase py-16 text-center tracking-[0.5em] opacity-40">Protocol Transaction Log Empty</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- COMMAND MODAL: TRANSMISSION & VERIFICATION --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-card border border-border w-full max-w-xl rounded-[4rem] p-10 lg:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative animate-in zoom-in-95 duration-500">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-foreground transition-colors p-3 bg-background rounded-full border border-border shadow-inner active:scale-90">
                <X size={24} />
            </button>
            
            <div className="mb-12">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-primary/20">
                    <Send size={32} className="text-primary" />
                </div>
                <h3 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Node Finalization</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-4 opacity-70">Transmitting Work-Proof Telemetry: <span className="text-primary">{activeTask?.title || activeTask?.taskName}</span></p>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-10">
              <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3">Execution Remarks Brief</label>
                 <textarea required placeholder="Detailed briefing on work procedures performed..." value={remarks} onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-40 bg-background border border-border text-foreground p-8 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-bold text-sm shadow-inner resize-none leading-relaxed" />
              </div>

              <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3">S3 Evidence Attachment (Tactile Proof)</label>
                 <div className="relative group/upload">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className={`border-4 border-dashed p-12 rounded-[3rem] text-center transition-all duration-700 shadow-inner ${selectedFile ? 'bg-emerald-500/5 border-emerald-500 shadow-xl shadow-emerald-500/5' : 'bg-background border-border group-hover/upload:border-primary/50 group-hover/upload:bg-primary/5'}`}>
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl transition-transform group-hover/upload:scale-110 group-hover/upload:rotate-6 ${selectedFile ? 'bg-emerald-500 text-white' : 'bg-card border border-border text-slate-400'}`}>
                            <Upload size={28} />
                       </div>
                       <p className={`text-sm font-black uppercase tracking-widest ${selectedFile ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {selectedFile ? selectedFile.name : "Deploy Visual confirmation"}
                       </p>
                       {!selectedFile && <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 mt-3 uppercase tracking-[0.3em] opacity-50">Authorized Formats: Blueprint JPG, PNG, PDF</p>}
                    </div>
                 </div>
              </div>

              <button type="submit" disabled={uploading}
                className="w-full py-6 rounded-[2rem] bg-primary hover:bg-sky-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-5 cursor-pointer"
              >
                {uploading ? <RefreshCcw className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                {uploading ? "Verifying Telemetry..." : "Authorize Transmission"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default DoerChecklist;