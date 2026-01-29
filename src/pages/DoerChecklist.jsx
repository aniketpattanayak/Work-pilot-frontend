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
 * DOER CHECKLIST: MISSION TERMINAL v2.3
 * Purpose: High-density Excel-style grid for Doer tasks.
 * Fix: Reduced text sizing and padding for maximum density.
 * Fix: Maintained header alignment during accordion expansion.
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

  const truncateText = (text, length = 40) => {
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
      alert("Success: Records Updated.");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();
    } catch (err) { 
      alert("Error: Update failed."); 
    } finally { 
      setUploading(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] bg-transparent">
      <RefreshCcw className="animate-spin text-primary mb-4" size={32} />
      <p className="text-slate-500 font-black text-[9px] tracking-[0.3em] uppercase">Syncing Ledger...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 px-4 sm:px-6">
      
      {/* HEADER SECTION - Condensed */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 py-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 shadow-inner">
            <ClipboardCheck size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-foreground text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Task Ledger</h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60 italic">Mission Terminal v2.3</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-card border border-border px-6 py-2.5 rounded-xl text-foreground font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95 shadow-md">
          <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh Data
        </button>
      </div>

      {/* CATEGORY TABS */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => setActiveCategory('Checklist')} className={`relative flex items-center justify-center gap-2 py-4 rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Checklist' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-slate-500 border-border'}`}>
            <Layers size={18} />
            <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest">Checklist Task</span>
            {filteredData.routines.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{filteredData.routines.length}</span>}
          </button>
          <button onClick={() => setActiveCategory('Delegation')} className={`relative flex items-center justify-center gap-2 py-4 rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Delegation' ? 'bg-primary text-white border-primary' : 'bg-card text-slate-500 border-border'}`}>
            <Briefcase size={18} />
            <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest">Deligation Task</span>
            {filteredData.assignments.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{filteredData.assignments.length}</span>}
          </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['Today', 'Next 7 Days', 'Pending Work'].map(range => (
          <button key={range} onClick={() => setTimeFilter(range)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${timeFilter === range ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-card text-slate-500 border-border hover:border-primary/40'}`}>
            {range}
          </button>
        ))}
      </div>

      {/* EXCEL GRID HEADER */}
      <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr] px-6 py-3 bg-slate-900 dark:bg-slate-950 rounded-t-xl border border-slate-800 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em] items-center">
        <div>Mission Identifier</div>
        <div className="text-center">Reference Date</div>
        <div className="text-center">Priority / Cycle</div>
        <div className="text-right pr-4">Registry Action</div>
      </div>

      {/* DATA TERMINAL: HIGH DENSITY */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-xl lg:rounded-t-none overflow-hidden shadow-xl">
        {activeCategory === 'Delegation' ? (
          filteredData.assignments.length > 0 ? filteredData.assignments.map((task) => {
            const isExpanded = expandedTaskId === task._id;
            const isPastDue = new Date(task.deadline) < new Date();
            
            return (
              <div key={task._id} className="flex flex-col border-b border-border last:border-0 group">
                <div onClick={() => setExpandedTaskId(isExpanded ? null : task._id)} className={`flex flex-col lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr] items-start lg:items-center px-4 py-3 lg:px-6 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-primary/[0.03] ${isExpanded ? 'bg-slate-100/50 dark:bg-primary/[0.06]' : ''}`}>
                  <div className="flex items-center gap-3 w-full lg:w-auto mb-2 lg:mb-0 min-w-0">
                    <div className="shrink-0">{isExpanded ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-slate-400" />}</div>
                    <span className={`font-black text-[11px] uppercase tracking-tight truncate leading-none ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                        {isExpanded ? task.title : truncateText(task.title, 45)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-2 lg:mb-0 text-[10px] font-bold">
                    <Calendar size={12} className="text-primary/40" />
                    <span className={isPastDue && task.status !== 'Completed' ? 'text-red-500' : 'text-slate-500'}>
                      {new Date(task.deadline).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex justify-center w-full lg:w-auto mb-2 lg:mb-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${isPastDue ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-primary border-primary/20 bg-primary/5'}`}>
                        {task.priority || 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 w-full lg:w-auto">
                    {task.status === "Pending" ? (
                       <button onClick={(e) => { e.stopPropagation(); API.put(`/tasks/respond`, {taskId: task._id, status: 'Accepted', doerId: currentDoerId}).then(fetchAllTasks); }} className="px-4 py-1.5 bg-primary text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-md">Accept</button>
                    ) : (
                       <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setModalType("Delegation"); setShowModal(true); }} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-md">Complete</button>
                    )}
                  </div>
                </div>
                {/* EXPANDED VIEW: DELEGATION */}
                {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50 dark:bg-slate-900/40 animate-in slide-in-from-top-1 duration-200">
                        <div className="bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2"><Info size={12} className="text-primary" /><span className="text-[9px] font-black uppercase text-slate-400">Tactical Briefing</span></div>
                            <p className="text-slate-600 text-[11px] font-bold leading-relaxed italic">"{task.description || "No supplemental details provided."}"</p>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div><label className="text-[8px] font-black text-slate-400 uppercase block">Registry Code</label><span className="text-[10px] font-bold text-foreground">#{task._id?.slice(-8).toUpperCase()}</span></div>
                                <div><label className="text-[8px] font-black text-slate-400 uppercase block">Current Node</label><span className="text-[10px] font-black text-emerald-600 uppercase">{task.status}</span></div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={40} className="mx-auto mb-4" /><p className="font-black uppercase text-[9px] tracking-[0.4em]">Directives Synchronized</p></div>
          )
        ) : (
          filteredData.routines.length > 0 ? filteredData.routines.map((item) => {
            const isExpanded = expandedTaskId === `${item._id}-${item.instanceDate}`;
            const displayDate = new Date(item.instanceDate || item.nextDueDate);
            const isBacklog = item.isBacklog; 
            return (
              <div key={`${item._id}-${item.instanceDate}`} className="flex flex-col border-b border-border last:border-0 group">
                <div onClick={() => setExpandedTaskId(isExpanded ? null : `${item._id}-${item.instanceDate}`)} className={`flex flex-col lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr] items-start lg:items-center px-4 py-3 lg:px-6 cursor-pointer transition-all hover:bg-slate-50 ${isExpanded ? 'bg-emerald-50/30' : ''}`}>
                  <div className="flex items-center gap-3 w-full lg:w-auto mb-2 lg:mb-0 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                      {isBacklog ? <History size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <span className={`font-black text-[11px] uppercase tracking-tight truncate leading-none ${isExpanded ? 'text-emerald-600' : 'text-foreground'}`}>
                        {isExpanded ? item.taskName : truncateText(item.taskName, 45)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-2 lg:mb-0 text-[10px] font-bold">
                    <Calendar size={12} className="text-slate-400" />
                    <span className={isBacklog ? 'text-amber-600' : 'text-slate-500'}>{displayDate.toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="flex justify-center w-full lg:w-auto mb-2 lg:mb-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.frequency || 'Daily'} cycle</span>
                  </div>
                  <div className="flex justify-end w-full lg:w-auto">
                    <button onClick={(e) => { e.stopPropagation(); setActiveTask(item); setModalType("Checklist"); setShowModal(true); }} className={`px-4 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-md text-white ${isBacklog ? 'bg-amber-600' : 'bg-emerald-600'}`}>Submit</button>
                  </div>
                </div>
                {/* EXPANDED VIEW: CHECKLIST */}
                {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-emerald-50/10 animate-in slide-in-from-top-1 duration-200">
                        <div className="bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2 text-emerald-600"><FileSearch size={12} /><span className="text-[9px] font-black uppercase">Routine Guidelines</span></div>
                            <p className="text-slate-600 text-[11px] font-bold leading-relaxed italic">"{item.description || "Daily maintenance protocol requires strictly verified execution."}"</p>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                                <div><label className="text-[8px] font-black text-slate-400 uppercase block">Next Expected</label><span className="text-[10px] font-bold text-foreground">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'N/A'}</span></div>
                                <div><label className="text-[8px] font-black text-slate-400 uppercase block">Last Sync</label><span className="text-[10px] font-bold text-foreground">{item.lastCompleted ? new Date(item.lastCompleted).toLocaleDateString() : 'New Node'}</span></div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={40} className="mx-auto mb-4" /><p className="font-black uppercase text-[9px] tracking-[0.4em]">Protocol Sync Complete</p></div>
          )
        )}
      </div>

      {/* MISSION MODAL - Preservation logic maintained */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-foreground"><X size={24} /></button>
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mx-auto mb-4 ${activeTask?.isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-primary/10 border-primary/20 text-primary'}`}><Send size={24} /></div>
                <h3 className="text-foreground text-xl font-black uppercase tracking-tight">{activeTask?.isBacklog ? 'Catch-up Sync' : 'Update Protocol'}</h3>
                <p className="text-primary font-black text-[10px] uppercase mt-1 tracking-widest">{activeTask?.title || activeTask?.taskName}</p>
              </div>
              <textarea required placeholder="Mission remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full h-32 bg-background border border-border text-foreground p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
              <div className="relative border-2 border-dashed p-8 rounded-2xl text-center bg-background border-border hover:border-primary/50 transition-all">
                 <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                 <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                 <p className="text-[10px] font-black text-foreground uppercase">{selectedFile ? selectedFile.name : "Attach Payload"}</p>
              </div>
              <button disabled={uploading} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white shadow-lg ${activeTask?.isBacklog ? 'bg-amber-600' : 'bg-primary'}`}>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default DoerChecklist;