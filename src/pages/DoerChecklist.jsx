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
  ImageIcon,
  Maximize2,
  CheckCircle2,
  Briefcase,
  Users,
  Activity,
  ShieldCheck,
  TrendingUp,
  Layers,
  LayoutGrid,
  Info,
  Target,
  FileSearch,
  Hash,
  CalendarClock
} from "lucide-react";

/**
 * DOER CHECKLIST: MISSION TERMINAL v2.5
 * Purpose: High-density Excel-style grid for Doer tasks.
 * Fix: Tightened padding and typography for maximum data density.
 * Fix: Locked column alignment during accordion expansion.
 */
const DoerChecklist = ({ doerId }) => {
  const [checklist, setChecklist] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [timeFilter, setTimeFilter] = useState('Today'); 
  const [activeCategory, setActiveCategory] = useState('Checklist'); 
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

  const truncateText = (text, length = 50) => {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

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
      console.error("Sync Error:", err);
    } finally {
      setLoading(false); 
    }
  }, [currentDoerId]);

  useEffect(() => { fetchAllTasks(); }, [fetchAllTasks]);

  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filterByDate = (dateStr) => {
      if (!dateStr) return false;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      if (timeFilter === 'Pending Work') return target.getTime() < now.getTime();
      if (timeFilter === 'Today') return target.getTime() <= now.getTime();
      if (timeFilter === 'Next 7 Days') {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        return target >= now && target <= nextWeek;
      }
      return true;
    };

    const filteredAssignments = timeFilter === 'Pending Work' 
      ? delegatedTasks.filter(item => (item.status !== 'Completed' && item.status !== 'Verified') && filterByDate(item.deadline))
      : delegatedTasks.filter(item => filterByDate(item.deadline));

    return {
      routines: checklist.filter(item => filterByDate(item.instanceDate || item.nextDueDate)),
      assignments: filteredAssignments
    };
  }, [checklist, delegatedTasks, timeFilter]);

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;
    
    // DEBUG: Verify these values in your browser console if you hit an error
    console.log("Initiating Sync for ID:", activeTask._id, "Modal Type:", modalType);

    const formData = new FormData();

    /** * 1. APPEND TEXT FIELDS FIRST
     * Backend parsers like Multer often ignore text fields that arrive 
     * after the binary file stream has started.
     */
    formData.append("remarks", remarks || "");
    
    try {
      setUploading(true);

      if (modalType === "Checklist") {
        // CHECKLIST SPECIFIC FIELDS
        formData.append("checklistId", activeTask._id);
        if (activeTask.instanceDate) {
          formData.append("instanceDate", activeTask.instanceDate);
        }
        // FILE LAST
        if (selectedFile) formData.append("evidence", selectedFile); 
        
        await API.post("/tasks/checklist-done", formData);
      } else {
        // DELEGATION SPECIFIC FIELDS
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);
        
        // FILE LAST
        if (selectedFile) formData.append("evidence", selectedFile); 
        
        await API.put(`/tasks/respond`, formData);
      }

      alert("Success: Mission telemetry synced.");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();

    } catch (err) { 
      // LOGS TO HELP YOU IDENTIFY BACKEND REJECTIONS
      console.error("Submission Error Details:", err.response?.data || err.message);
      alert("Submission Error: Transmission failed."); 
    } finally { 
      setUploading(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[300px] bg-transparent">
      <RefreshCcw className="animate-spin text-primary mb-2" size={24} />
      <p className="text-slate-500 font-black text-[8px] tracking-[0.4em] uppercase">Syncing Node...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 px-2 sm:px-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 py-4 border-b border-border gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shadow-inner">
            <ClipboardCheck size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-foreground text-lg md:text-xl font-black tracking-tighter uppercase leading-none">Task Ledger</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">Session Active: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-card border border-border px-4 py-1.5 rounded-lg text-foreground font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm">
          <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Synchronize
        </button>
      </div>

      {/* CATEGORY TABS */}
      <div className="grid grid-cols-2 gap-2 mb-4">
          <button 
            onClick={() => setActiveCategory('Checklist')}
            className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 shadow-sm ${
              activeCategory === 'Checklist' ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20' : 'bg-card text-slate-500 border-border'
            }`}
          >
            <Layers size={16} />
            <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest">Checklist Task</span>
            {filteredData.routines.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                {filteredData.routines.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveCategory('Delegation')}
            className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 shadow-sm ${
              activeCategory === 'Delegation' ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-card text-slate-500 border-border'
            }`}
          >
            <Briefcase size={16} />
            <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest">Deligation Task</span>
            {filteredData.assignments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                {filteredData.assignments.length}
              </span>
            )}
          </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['Today', 'Next 7 Days', 'Pending Work'].map(range => (
          <button 
            key={range} 
            onClick={() => setTimeFilter(range)}
            className={`px-3 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
              timeFilter === range ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-card text-slate-500 border-border hover:border-primary/40'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* EXCEL GRID HEADER */}
      <div className="hidden lg:grid grid-cols-[2.5fr_1fr_1fr_1fr] px-6 py-2.5 bg-slate-900 dark:bg-slate-950 rounded-t-lg border border-slate-800 font-black text-slate-400 text-[8px] uppercase tracking-[0.25em] items-center">
        <div>Mission Identifier</div>
        <div className="text-center">Protocol Date</div>
        <div className="text-center">Priority / Node</div>
        <div className="text-right pr-4">Registry Action</div>
      </div>

      {/* DATA TERMINAL: EXCEL SHEET VIEW */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-lg lg:rounded-t-none overflow-hidden shadow-xl">
        {activeCategory === 'Delegation' ? (
          filteredData.assignments.length > 0 ? filteredData.assignments.map((task) => {
            const isExpanded = expandedTaskId === task._id;
            const isPastDue = new Date(task.deadline) < new Date();
            
            return (
              <div key={task._id} className="flex flex-col border-b border-border last:border-0 group">
                <div 
                  onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                  className={`flex flex-col lg:grid lg:grid-cols-[2.5fr_1fr_1fr_1fr] items-start lg:items-center px-4 py-2.5 lg:px-6 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-primary/[0.02] ${isExpanded ? 'bg-slate-100/50 dark:bg-primary/[0.05]' : ''}`}
                >
                  <div className="flex items-center gap-3 w-full lg:w-auto mb-1 lg:mb-0 min-w-0">
                    <div className="shrink-0">{isExpanded ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-slate-400" />}</div>
                    <span className={`font-black text-[10px] uppercase tracking-tight truncate leading-none ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                        {task.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                    <Calendar size={12} className="text-primary/30" />
                    <p className={`uppercase tracking-tighter ${isPastDue && task.status !== 'Completed' ? 'text-red-500' : 'text-slate-500'}`}>
                      {new Date(task.deadline).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex justify-center items-center gap-2 w-full lg:w-auto mb-1 lg:mb-0">
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${isPastDue ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-primary border-primary/20 bg-primary/5'}`}>
                        {task.priority || 'Standard'}
                    </span>
                    <span className="text-[7px] text-slate-400 font-black uppercase">/ {task.status}</span>
                  </div>
                  <div className="flex justify-end gap-2 w-full lg:w-auto">
                    {task.status === "Pending" && (
                       <button onClick={(e) => { e.stopPropagation(); API.put(`/tasks/respond`, {taskId: task._id, status: 'Accepted', doerId: currentDoerId}).then(fetchAllTasks); }} className="px-3 py-1 bg-primary text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md active:scale-95 transition-all">Accept</button>
                    )}
                    {task.status === "Accepted" && (
                       <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setModalType("Delegation"); setShowModal(true); }} className="px-3 py-1 bg-emerald-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md active:scale-95 transition-all">Complete</button>
                    )}
                  </div>
                </div>

                {/* EXPANDED VIEW: DELEGATION */}
                {isExpanded && (
                    <div className="px-6 pb-4 pt-1 bg-slate-50 dark:bg-slate-900/40 animate-in slide-in-from-top-1 duration-200">
                        <div className="bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm">
                            <h5 className="text-primary text-[8px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 border-b border-border/50 pb-2"><Info size={10} /> Mission Briefing</h5>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[7px] text-slate-400 font-black uppercase tracking-widest block mb-1">Technical Scope</label>
                                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed italic">"{task.description || "Briefing data not provided."}"</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                                    <div><p className="text-[7px] text-slate-400 font-black uppercase">Registry</p><p className="text-[9px] font-bold text-foreground">#{task._id?.slice(-10).toUpperCase()}</p></div>
                                    <div><p className="text-[7px] text-slate-400 font-black uppercase">Status</p><p className="text-[9px] font-black text-emerald-600 uppercase">{task.status}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">Directives Synchronized</p></div>
          )
        ) : (
          filteredData.routines.length > 0 ? filteredData.routines.map((item) => {
            const isExpanded = expandedTaskId === `${item._id}-${item.instanceDate}`;
            const displayDate = new Date(item.instanceDate || item.nextDueDate);
            const isBacklog = item.isBacklog; 

            return (
              <div key={`${item._id}-${item.instanceDate}`} className="flex flex-col border-b border-border last:border-0 group">
                <div 
                  onClick={() => setExpandedTaskId(isExpanded ? null : `${item._id}-${item.instanceDate}`)}
                  className={`flex flex-col lg:grid lg:grid-cols-[2.5fr_1fr_1fr_1fr] items-start lg:items-center px-4 py-2.5 lg:px-6 cursor-pointer transition-all hover:bg-slate-50 ${isExpanded ? 'bg-emerald-50/20' : ''}`}
                >
                  <div className="flex items-center gap-3 w-full lg:w-auto mb-1 lg:mb-0 min-w-0">
                    <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                      {isBacklog ? <History size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                    <span className={`font-black text-[10px] uppercase tracking-tight truncate leading-none ${isExpanded ? 'text-emerald-600' : 'text-foreground'}`}>
                        {item.taskName}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                    <Calendar size={12} className="text-slate-400" />
                    <p className={`uppercase tracking-tighter ${isBacklog ? 'text-amber-600' : 'text-slate-500'}`}>
                      {displayDate.toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex justify-center w-full lg:w-auto mb-1 lg:mb-0">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.frequency || 'Daily'} CYCLE</span>
                  </div>
                  <div className="flex justify-end w-full lg:w-auto">
                    <button onClick={(e) => { e.stopPropagation(); setActiveTask(item); setModalType("Checklist"); setShowModal(true); }} className={`px-4 py-1 rounded font-black text-[8px] uppercase tracking-widest shadow-md text-white active:scale-95 transition-all ${isBacklog ? 'bg-amber-600' : 'bg-emerald-600'}`}>Submit</button>
                  </div>
                </div>

                {/* EXPANDED VIEW: CHECKLIST */}
                {isExpanded && (
                    <div className="px-6 pb-4 pt-1 bg-emerald-50/5 animate-in slide-in-from-top-1 duration-200">
                        <div className="bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm">
                            <h5 className="text-emerald-600 text-[8px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 border-b border-border/30 pb-2"><FileSearch size={10} /> Protocol Blueprint</h5>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[7px] text-slate-400 font-black uppercase block mb-1">Operational Guidelines</label>
                                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed italic">"{item.description || "Daily maintenance protocol requires strictly verified execution."}"</p>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border/30">
                                    <div><p className="text-[7px] text-slate-400 font-black uppercase">Freq</p><p className="text-[9px] font-black text-emerald-600 uppercase">{item.frequency || 'Daily'}</p></div>
                                    <div><p className="text-[7px] text-slate-400 font-black uppercase">Expected</p><p className="text-[9px] font-bold">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'N/A'}</p></div>
                                    <div><p className="text-[7px] text-slate-400 font-black uppercase">Last Sync</p><p className="text-[9px] font-bold">{item.lastCompleted ? new Date(item.lastCompleted).toLocaleDateString() : 'INITIAL'}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">Registry Synchronized</p></div>
          )
        )}
      </div>

      {/* MISSION MODAL - Preservation logic maintained */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-foreground transition-all active:scale-90 cursor-pointer"><X size={24} /></button>
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mx-auto mb-4 ${activeTask?.isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-primary/10 border-primary/20 text-primary'}`}><Send size={24} /></div>
                <h3 className="text-foreground text-xl font-black uppercase tracking-tight">{activeTask?.isBacklog ? 'Backlog Sync' : 'Update Task'}</h3>
                <p className="text-primary font-black text-[10px] uppercase mt-1 tracking-widest">{activeTask?.title || activeTask?.taskName}</p>
              </div>
              <textarea required placeholder="Mission remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full h-32 bg-background border border-border text-foreground p-4 rounded-2xl outline-none font-bold text-[10px] uppercase shadow-inner" />
              <div className="relative border-2 border-dashed p-6 rounded-2xl text-center bg-background border-border hover:border-primary/50 transition-all">
                 <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                 <Upload size={20} className="mx-auto text-slate-400 mb-2" />
                 <p className="text-[9px] font-black text-foreground uppercase">{selectedFile ? selectedFile.name : "Attach Payload"}</p>
              </div>
              <button disabled={uploading} className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] text-white shadow-lg active:scale-95 transition-all ${activeTask?.isBacklog ? 'bg-amber-600' : 'bg-primary'}`}>
                {uploading ? <RefreshCcw className="animate-spin mr-2 inline" size={16} /> : <ShieldCheck size={16} className="mr-2 inline" />} Finalize Result
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/98 z-[10000] flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Evidence" className="max-w-full max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95" />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default DoerChecklist;