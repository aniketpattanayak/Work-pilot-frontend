import React, { useEffect, useState, useCallback } from "react";
import API from '../api/axiosConfig'; // Centralized API instance
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
  UserCheck
} from "lucide-react";

const DoerChecklist = ({ doerId }) => {
  const [checklist, setChecklist] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // --- STATES FOR COMPLETION MODAL ---
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null); 
  const [modalType, setModalType] = useState(""); 
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- STATE FOR IMAGE PREVIEW ---
  const [previewImage, setPreviewImage] = useState(null);

  const savedUser = JSON.parse(localStorage.getItem("user"));
  const currentDoerId = doerId || savedUser?._id || savedUser?.id;

  /**
   * UPDATED: Defensive Data Fetching
   * Prevents '.map is not a function' by ensuring state is always an array.
   */
  const fetchAllTasks = useCallback(async () => {
    if (!currentDoerId || currentDoerId === "undefined") return;
  
    try {
      setLoading(true);
      // Switched to centralized API instance
      const [checklistRes, delegationRes] = await Promise.all([
        API.get(`/tasks/checklist/${currentDoerId}`).catch(() => ({ data: [] })),
        API.get(`/tasks/doer/${currentDoerId}`).catch(() => ({ data: [] }))
      ]);
  
      // Safety: Unwrap nested data if backend structure differs
      const safeChecklist = Array.isArray(checklistRes.data) 
        ? checklistRes.data 
        : (checklistRes.data?.data || []);

      const safeDelegation = Array.isArray(delegationRes.data) 
        ? delegationRes.data 
        : (delegationRes.data?.tasks || delegationRes.data?.data || []);

      setChecklist(safeChecklist);
      setDelegatedTasks(safeDelegation);
    } catch (err) {
      console.error("Error fetching tasks:", err);
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
        // Switched to API instance
        await API.post("/tasks/checklist-done", formData, { 
          headers: { "Content-Type": "multipart/form-data" } 
        });
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);

        // Switched to API instance
        await API.put(`/tasks/respond`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      alert("Work submitted successfully!");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed.");
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
      revisedDeadline = prompt("Enter your proposed New Deadline (YYYY-MM-DD):");
      if (!revisedDeadline) return;
      actionRemarks = prompt("Why do you need a revision?");
      if (!actionRemarks) return;

      try {
        // Switched to API instance
        await API.put(`/tasks/respond`, {
          taskId, status, revisedDeadline, remarks: actionRemarks, doerId: currentDoerId,
        });
        alert("Revision requested.");
        fetchAllTasks();
      } catch (err) { alert("Update failed"); }
    } else {
      try {
        // Switched to API instance
        await API.put(`/tasks/respond`, {
          taskId, status, doerId: currentDoerId,
        });
        fetchAllTasks();
      } catch (err) { alert("Update failed"); }
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <RefreshCcw className="animate-spin text-sky-400" size={40} />
        <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase">Loading Operational Board...</p>
      </div>
    );

  // Defensive Helpers for JSX
  const safeDelegatedTasks = Array.isArray(delegatedTasks) ? delegatedTasks : [];
  const safeChecklist = Array.isArray(checklist) ? checklist : [];

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* --- IMAGE PREVIEW MODAL --- */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-md transition-all" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-xl transition-all active:scale-95 cursor-pointer">
            <X size={24} />
          </button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
            <ClipboardCheck size={32} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-white text-3xl font-black tracking-tighter">Work Board</h2>
            <p className="text-slate-500 text-sm font-medium">Manage your personal delegations and routine operations.</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-slate-900 hover:bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all flex items-center gap-3 active:scale-95">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Sync Board
        </button>
      </div>

      {/* --- DELEGATED TASKS SECTION --- */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
           <Briefcase size={18} className="text-sky-400" />
           <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">One-Time Assignments</h3>
           <div className="h-px flex-1 bg-slate-800/50 ml-2" />
        </div>

        {safeDelegatedTasks.length > 0 ? (
          <div className="flex flex-col gap-3">
            {safeDelegatedTasks.map((task) => {
              const isLead = task.doerId === currentDoerId;
              const isExpanded = expandedTaskId === task._id;

              return (
              <div key={task._id} className="flex flex-col group">
                <div 
                  onClick={() => toggleExpand(task._id)}
                  className={`
                    bg-slate-900/40 backdrop-blur-md p-6 border transition-all cursor-pointer hover:bg-slate-900/60
                    ${isExpanded ? "rounded-t-[2rem] border-slate-700 bg-slate-900/80" : "rounded-3xl border-slate-800/60 shadow-lg"}
                  `}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {isExpanded ? <ChevronUp size={20} className="text-sky-400" /> : <ChevronDown size={20} className="text-slate-600" />}
                        <h4 className="text-white font-bold text-lg tracking-tight">{task.title}</h4>
                        
                        <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-tighter border ${
                          task.status === "Verified" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          task.status === "Completed" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        }`}>
                          {task.status || 'Active'}
                        </span>

                        {!isLead && (
                          <span className="px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-tighter border bg-purple-500/10 text-purple-400 border-purple-500/20">
                            Support Staff
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm font-medium line-clamp-1 group-hover:line-clamp-none transition-all">{task.description}</p>
                      
                      {/* Helpers Visibility */}
                      {Array.isArray(task.helperDoers) && task.helperDoers.length > 0 && (
                        <div className="flex items-center gap-2 mt-4">
                           <Users size={12} className="text-slate-500" />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">Support:</span>
                           <div className="flex flex-wrap gap-1.5">
                              {task.helperDoers.map((helper, hIdx) => (
                                <span key={hIdx} className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-400">
                                   {helper.name}
                                </span>
                              ))}
                           </div>
                        </div>
                      )}

                      {/* Reference Files */}
                      {Array.isArray(task.files) && task.files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {task.files.map((file, i) => (
                            <button key={i} onClick={(e) => { e.stopPropagation(); setPreviewImage(file.fileUrl); }} className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black text-sky-400 uppercase tracking-widest hover:border-sky-500/50 transition-all active:scale-95">
                               <ImageIcon size={14} /> Blueprint {i+1} <Maximize2 size={10} className="ml-1" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {isLead ? (
                        <>
                          {task.status === "Pending" && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleTaskAction(task._id, "Accepted"); }} className="flex-1 md:flex-none bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                                Accept
                              </button>
                              {task.isRevisionAllowed && (
                                <button onClick={(e) => { e.stopPropagation(); handleTaskAction(task._id, "Revision Requested"); }} className="flex-1 md:flex-none bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                                  Revise
                                </button>
                              )}
                            </>
                          )}
                          {task.status === "Accepted" && (
                            <button onClick={(e) => { e.stopPropagation(); openCompletionModal(task, "Delegation"); }} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                              Complete Task
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-end gap-1 px-4 py-2 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                           <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Support Mode</span>
                           <span className="text-[8px] font-bold text-slate-600">Assisting: {task.doerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-b-[2rem] border border-slate-700 border-t-0 animate-in slide-in-from-top-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="text-sky-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={14} /> Execution Parameters
                      </h5>
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                        <p className="text-xs font-medium text-slate-400">
                          <strong className="text-slate-200">Lead Doer:</strong> {task.doerName || 'You'}
                        </p>
                        <p className="text-xs font-medium text-slate-400">
                          <strong className="text-slate-200">Assigner Notes:</strong> {task.remarks || "No specific instructions provided."}
                        </p>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol:</span>
                           <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${task.isRevisionAllowed ? 'text-emerald-400 bg-emerald-500/5' : 'text-red-400 bg-red-500/5'}`}>
                              {task.isRevisionAllowed ? "Flexible Deadline" : "Strict Deadline"}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-sky-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <History size={14} /> Lifecycle Log
                      </h5>
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 max-h-[200px] overflow-y-auto custom-scrollbar space-y-4">
                        {Array.isArray(task.history) && task.history.map((log, i) => (
                          <div key={i} className="relative pl-5 border-l border-slate-800 last:border-0 pb-1">
                            <div className="absolute top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-sky-500/50" />
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sky-400 font-black text-[9px] uppercase tracking-widest">{log.action}</span>
                                <span className="text-slate-600 font-bold text-[9px]">{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">{log.remarks}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        ) : (
            <div className="bg-slate-900/20 border border-slate-800/40 rounded-[2rem] p-12 text-center">
                <AlertCircle size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">No Active Assignments Found</p>
            </div>
        )}
      </section>

      {/* --- ROUTINE CHECKLIST SECTION --- */}
      <section>
        <div className="flex items-center gap-3 mb-6">
           <CheckCircle2 size={18} className="text-emerald-400" />
           <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Routine Checklist</h3>
           <div className="h-px flex-1 bg-slate-800/50 ml-2" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {safeChecklist.map((item) => {
            const alreadyDone = isDoneToday(item.lastCompleted);
            const isExpanded = expandedTaskId === item._id;
            return (
              <div key={item._id} className="flex flex-col group">
                <div 
                  onClick={() => toggleExpand(item._id)}
                  className={`
                    p-5 border transition-all cursor-pointer flex justify-between items-center
                    ${alreadyDone ? "bg-slate-950/50 border-slate-800/50 opacity-60 grayscale-[0.5]" : "bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/40 shadow-lg"}
                    ${isExpanded ? "rounded-t-3xl border-b-0" : "rounded-3xl"}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl border ${alreadyDone ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}>
                       {alreadyDone ? <Lock size={18} /> : <CheckCircle size={18} />}
                    </div>
                    <div>
                      <h4 className={`font-bold tracking-tight ${alreadyDone ? "text-slate-500" : "text-slate-100"}`}>{item.taskName}</h4>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Recurrence: {item.frequency}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {alreadyDone ? (
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">Verified Today</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); openCompletionModal(item, "Checklist"); }} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg">
                        Complete
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-600" /> : <ChevronDown size={20} className="text-slate-600" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-950/80 p-6 rounded-b-3xl border border-slate-800 border-t-0 animate-in slide-in-from-top-1">
                    <h5 className="text-emerald-400 font-black text-[9px] uppercase tracking-widest mb-4 flex items-center gap-2"><History size={12} /> Audit History</h5>
                    <div className="space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                      {Array.isArray(item.history) && item.history.length > 0 ? [...item.history].reverse().map((log, i) => (
                        <div key={i} className="flex justify-between items-start bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                          <div className="flex flex-col gap-1">
                            <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-tighter">{log.action}</span>
                            <p className="text-xs text-slate-400 font-medium italic">"{log.remarks}"</p>
                          </div>
                          <span className="text-slate-600 font-bold text-[9px] whitespace-nowrap">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                      )) : <p className="text-slate-600 text-[10px] font-bold uppercase py-4 text-center tracking-widest">No previous history found</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- UNIVERSAL SUBMISSION MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
            
            <div className="mb-8">
                <h3 className="text-sky-400 text-2xl font-black tracking-tight flex items-center gap-3">
                <Send size={24} /> Work Verification
                </h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Submitting proof for: <span className="text-slate-300 font-bold">{activeTask?.title || activeTask?.taskName}</span></p>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Execution Remarks</label>
                 <textarea required placeholder="Briefly describe the work performed..." value={remarks} onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-32 bg-slate-950 border border-slate-800 text-slate-100 p-5 rounded-2xl outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700 font-medium resize-none" />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Evidence Attachment (Optional)</label>
                 <div className="relative group">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className={`border-2 border-dashed p-8 rounded-2xl text-center transition-all ${selectedFile ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-950 border-slate-800 group-hover:border-sky-500/40'}`}>
                       <Upload size={28} className={`mx-auto mb-2 ${selectedFile ? 'text-emerald-400' : 'text-slate-600 group-hover:text-sky-400'}`} />
                       <p className={`text-xs font-bold ${selectedFile ? 'text-emerald-200' : 'text-slate-500'}`}>
                          {selectedFile ? selectedFile.name : "Click or drag proof image here"}
                       </p>
                    </div>
                 </div>
              </div>

              <button type="submit" disabled={uploading}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                {uploading ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {uploading ? "Verifying Proof..." : "Finalize & Submit Completion"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DoerChecklist;