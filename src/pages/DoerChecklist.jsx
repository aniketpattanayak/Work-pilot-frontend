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
  Layers,
  LayoutGrid,
  Info,
  Target,
  FileSearch,
  Hash,
  CalendarClock
} from "lucide-react";

/**
 * DOER CHECKLIST: MISSION TERMINAL v2.2
 * Updates: Removed "Locked" status, enabled early completion, and restored Revised Date view.
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

  // Truncate only for the front view
  const truncateText = (text, length = 32) => {
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
    const formData = new FormData();
    formData.append("remarks", remarks);
    if (selectedFile) formData.append("evidence", selectedFile);
    
    try {
      setUploading(true);
      if (modalType === "Checklist") {
        formData.append("checklistId", activeTask._id);
        if (activeTask.instanceDate) formData.append("instanceDate", activeTask.instanceDate);
        await API.post("/tasks/checklist-done", formData);
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);
        await API.put(`/tasks/respond`, formData);
      }
      alert("Success: Mission telemetry synced.");
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
    <div className="flex flex-col items-center justify-center h-[400px] bg-transparent">
      <RefreshCcw className="animate-spin text-primary mb-4" size={40} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.4em] uppercase">Syncing Node...</p>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30 px-4 sm:px-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-card/50 p-6 md:p-10 border border-border rounded-[3rem] backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 shadow-inner">
            <ClipboardCheck size={36} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Mission Control</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-3 opacity-60">Cycle Active: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-card border border-border px-10 py-5 rounded-[1.8rem] text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/10 relative z-10">
          <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Synchronize
        </button>
      </div>

      {/* CATEGORY TABS */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setActiveCategory('Checklist')}
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-3 py-6 rounded-[2.5rem] border transition-all active:scale-95 shadow-xl ${
              activeCategory === 'Checklist' ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/30' : 'bg-card text-slate-500 border-border'
            }`}
          >
            <Layers size={22} />
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">Checklist Task</span>
            {filteredData.routines.length > 0 && (
              <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded-full shadow-lg animate-bounce border-2 border-background">
                {filteredData.routines.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveCategory('Delegation')}
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-3 py-6 rounded-[2.5rem] border transition-all active:scale-95 shadow-xl ${
              activeCategory === 'Delegation' ? 'bg-primary text-white border-primary shadow-primary/30' : 'bg-card text-slate-500 border-border'
            }`}
          >
            <Briefcase size={22} />
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">Delegation Task</span>
            {filteredData.assignments.length > 0 && (
              <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded-full shadow-lg animate-bounce border-2 border-background">
                {filteredData.assignments.length}
              </span>
            )}
          </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-12">
        {['Today', 'Next 7 Days', 'Pending Work'].map(range => (
          <button 
            key={range} 
            onClick={() => setTimeFilter(range)}
            className={`px-6 py-3.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-md ${
              timeFilter === range ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-card text-slate-500 border-border hover:border-primary/40'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* MISSION LISTING */}
      <div className="space-y-6">
        {activeCategory === 'Delegation' ? (
          filteredData.assignments.length > 0 ? filteredData.assignments.map((task) => {
            const isExpanded = expandedTaskId === task._id;
            const isPastDue = new Date(task.deadline) < new Date();
            
            return (
              <div 
                key={task._id} 
                onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                className={`bg-card backdrop-blur-xl border rounded-[2.5rem] overflow-hidden shadow-2xl transition-all cursor-pointer ${
                  isExpanded ? 'border-primary ring-4 ring-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="p-6 sm:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-foreground font-black text-xl md:text-2xl uppercase tracking-tight truncate">
                            {isExpanded ? task.title : truncateText(task.title, 35)}
                        </h4>
                        {isPastDue && task.status !== 'Completed' && task.status !== 'Verified' && (
                            <span className="bg-red-500/10 border border-red-500/20 text-red-600 text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest shrink-0">Overdue</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <Clock size={14} className={isPastDue ? 'text-red-500' : 'text-primary'} />
                      <p className={`text-xs font-black uppercase tracking-widest ${isPastDue ? 'text-red-600' : 'text-slate-500'}`}>
                        Deadline: {new Date(task.deadline).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    {task.status === "Pending" && (
                       <button onClick={(e) => { e.stopPropagation(); API.put(`/tasks/respond`, {taskId: task._id, status: 'Accepted', doerId: currentDoerId}).then(fetchAllTasks); }} className="flex-1 md:flex-none px-10 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Accept task </button>
                    )}
                    {task.status === "Accepted" && (
                       <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setModalType("Delegation"); setShowModal(true); }} className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Mark as Completed </button>
                    )}
                  </div>
                </div>

                {/* EXPANDED DETAIL VIEW: DELEGATION */}
                {isExpanded && (
                    <div className="px-6 sm:px-10 pb-10 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-background/50 p-6 rounded-[1.8rem] border border-border shadow-inner">
                            <h5 className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2 border-b border-border/30 pb-4"><Info size={14} /> Mission Intel Dashboard</h5>
                            
                            <div className="space-y-8">
                                <div>
                                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Full Mission Identifier</label>
                                    <p className="text-foreground text-sm font-black leading-relaxed uppercase tracking-tight">{task.title}</p>
                                </div>
                                
                                <div>
                                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Technical Description & Scope</label>
                                    <p className="text-slate-500 text-xs leading-relaxed italic">"{task.description || "Briefing data not provided."}"</p>
                                </div>

                                {/* NEW: REVISED DATE MONITORING */}
                                {task.status === 'Revision Requested' && (
                                    <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20">
                                        <label className="text-[9px] text-amber-600 font-black uppercase tracking-[0.3em] block mb-3 flex items-center gap-2"><CalendarClock size={12} /> Revision Intelligence</label>
                                        <p className="text-xs text-slate-600 font-bold mb-2">Proposed Status: <span className="text-amber-600">Revision Pending Authorization</span></p>
                                        <p className="text-[10px] text-slate-500 italic">"{task.remarks}"</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-border/30">
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Registry Code</p>
                                        <p className="text-[10px] font-bold text-foreground opacity-60 flex items-center gap-2"><Hash size={12} /> #{task._id?.slice(-10).toUpperCase()}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Target Priority</p>
                                        <p className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2"><Target size={12} /> {task.priority || 'Standard'}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Protocol Node</p>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><LayoutGrid size={12} /> {task.status}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
          }) : (
            <div className="bg-background/50 border-2 border-dashed border-border rounded-[3rem] p-20 text-center opacity-40">
              <Activity size={48} className="mx-auto mb-6" />
              <p className="font-black uppercase text-[11px] tracking-[0.5em]">No Missions Assigned</p>
            </div>
          )
        ) : (
          filteredData.routines.length > 0 ? filteredData.routines.map((item) => {
            const isExpanded = expandedTaskId === `${item._id}-${item.instanceDate}`;
            const displayDate = new Date(item.instanceDate || item.nextDueDate);
            const isBacklog = item.isBacklog; 

            return (
              <div 
                key={`${item._id}-${item.instanceDate}`} 
                onClick={() => setExpandedTaskId(isExpanded ? null : `${item._id}-${item.instanceDate}`)}
                className={`bg-card border rounded-[2.5rem] overflow-hidden shadow-2xl transition-all cursor-pointer group ${
                  isBacklog ? "bg-amber-500/[0.03] border-amber-500/20" : "border-border hover:border-emerald-500/30"
                } ${isExpanded ? 'ring-4 ring-emerald-500/10 border-emerald-500/50' : ''}`}
              >
                <div className="p-6 sm:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="flex items-center gap-6 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${
                      isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                    }`}>
                      {isBacklog ? <History size={26} className="animate-pulse" /> : <CheckCircle2 size={26} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black tracking-tight text-xl md:text-2xl uppercase truncate text-foreground group-hover:text-emerald-600 transition-colors">
                        {isExpanded ? item.taskName : truncateText(item.taskName, 35)}
                      </h4>
                      <div className="flex items-center gap-3 mt-2">
                         <Calendar size={12} className="text-slate-400" />
                         <p className={`text-[10px] font-black uppercase tracking-widest ${isBacklog ? 'text-amber-600 font-black' : 'text-slate-400'}`}>
                           {displayDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                         </p>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveTask(item); setModalType("Checklist"); setShowModal(true); }} 
                    className={`w-full md:w-auto px-10 py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                        isBacklog ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >Submit Result</button>
                </div>

                {/* EXPANDED DETAIL VIEW: CHECKLIST */}
                {isExpanded && (
                    <div className="px-6 sm:px-10 pb-10 pt-2 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-background/50 p-6 rounded-[1.8rem] border border-border shadow-inner">
                            <h5 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2 border-b border-border/30 pb-4"><FileSearch size={14} /> Comprehensive Protocol Blueprint</h5>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Routine Identifier</label>
                                    <p className="text-foreground text-sm font-black leading-relaxed uppercase tracking-tight">{item.taskName}</p>
                                </div>
                                
                                <div>
                                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Operational Guidelines</label>
                                    <p className="text-slate-500 text-xs leading-relaxed italic">"{item.description || "Daily maintenance protocol requires strictly verified execution."}"</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-border/30">
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Cycle frequency</p>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase">{item.frequency || 'Daily'}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Target Instance</p>
                                        <p className="text-[10px] font-black text-foreground uppercase tracking-tighter">{displayDate.toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Next Expected</p>
                                        <p className="text-[10px] font-bold text-slate-500">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Audit Record</p>
                                        <p className="text-[10px] font-bold text-slate-500">{item.lastCompleted ? 'Last Synced ' + new Date(item.lastCompleted).toLocaleDateString() : 'New Protocol'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
          }) : (
            <div className="bg-background/50 border-2 border-dashed border-border rounded-[3rem] p-20 text-center opacity-40">
              <Activity size={48} className="mx-auto mb-6" />
              <p className="font-black uppercase text-[11px] tracking-[0.5em]">System Registry Synchronized</p>
            </div>
          )
        )}
      </div>

      {/* MISSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[3.5rem] p-10 md:p-14 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 overflow-y-auto max-h-[95vh] custom-scrollbar">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-foreground transition-all active:scale-90 cursor-pointer z-20"><X size={32} /></button>
            <form onSubmit={handleFinalSubmit} className="space-y-10 relative z-10">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center border mx-auto mb-8 shadow-2xl ${activeTask?.isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-primary/10 border-primary/20 text-primary'}`}><Send size={36} /></div>
                <h3 className="text-foreground text-3xl font-black tracking-tighter uppercase mb-4">{activeTask?.isBacklog ? 'Catch-up Protocol' : 'Mission Verification'}</h3>
                <p className="text-primary font-black uppercase text-sm tracking-widest">{activeTask?.title || activeTask?.taskName}</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Submission Target: {new Date(activeTask?.instanceDate || activeTask?.nextDueDate).toLocaleDateString()}</p>
              </div>
              <textarea required placeholder="Define achieved milestones..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full h-44 bg-background border border-border text-foreground p-8 rounded-[2rem] outline-none transition-all font-bold text-base shadow-inner uppercase tracking-tight placeholder:text-slate-500" />
              <div className="relative group border-2 border-dashed p-14 rounded-[2.5rem] text-center bg-background border-border hover:border-primary/50 transition-all shadow-inner">
                 <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                 <Upload size={40} className="mx-auto text-slate-400 group-hover:text-primary mb-4 transition-colors" />
                 <p className="text-sm font-black text-foreground uppercase">{selectedFile ? selectedFile.name : "Authorize Asset Upload"}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Mission Evidence Payload</p>
              </div>
              <button disabled={uploading} className={`w-full py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl transition-all active:scale-95 text-white ${activeTask?.isBacklog ? 'bg-amber-600 shadow-amber-500/20' : 'bg-primary shadow-primary/20'}`}>
                {uploading ? <RefreshCcw className="animate-spin mr-3 inline" size={24} /> : <ShieldCheck size={24} className="mr-3 inline" />} Finalize Result
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/98 z-[10000] flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Evidence" className="max-w-full max-h-[85vh] rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95" />
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