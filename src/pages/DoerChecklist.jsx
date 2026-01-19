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
  Users
} from "lucide-react";

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
   * 1. DATA FETCHING (Decoupled from filters to prevent infinite loops)
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
   * 2. FILTER ENGINE (useMemo ensures UI is fast and responsive)
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
      alert("Work submitted successfully!");
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();
    } catch (err) { alert("Submission failed."); } finally { setUploading(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase">Syncing Board...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20"><ClipboardCheck size={32} className="text-sky-400" /></div>
          <div>
            <h2 className="text-white text-3xl font-black tracking-tighter">Work Board</h2>
            <p className="text-slate-500 text-sm font-medium">Strict agenda for: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-2xl text-white font-bold transition-all active:scale-95 flex items-center gap-3">
          <RefreshCcw size={18} /> Sync Board
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 mb-10">
        {['All', 'Today', 'Next 7 Days', 'Next 1 Year'].map(range => (
          <button key={range} onClick={() => setTimeFilter(range)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${timeFilter === range ? 'bg-sky-500 text-slate-950 border-sky-500' : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
            {range}
          </button>
        ))}
      </div>

      {/* ASSIGNMENTS SECTION */}
      <section className="mb-12">
        <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
           <Briefcase size={18} className="text-sky-400" /> One-Time Assignments <div className="h-px flex-1 bg-slate-800/50" />
        </h3>
        <div className="flex flex-col gap-3">
          {filteredData.assignments.length > 0 ? filteredData.assignments.map((task) => {
            const isDueToday = isSameDayAsToday(task.deadline);
            return (
              <div key={task._id} className="bg-slate-900/40 p-6 border border-slate-800/60 rounded-3xl flex justify-between items-center shadow-lg group">
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg">{task.title}</h4>
                  <p className={`text-[10px] font-black uppercase mt-1 ${isDueToday ? 'text-sky-400' : 'text-slate-600'}`}>
                    Due: {new Date(task.deadline).toLocaleDateString()} {!isDueToday && "(Locked)"}
                  </p>
                </div>
                <div className="flex gap-2">
                   {task.status === "Pending" && <button disabled={!isDueToday} onClick={() => API.put(`/tasks/respond`, {taskId: task._id, status: 'Accepted', doerId: currentDoerId}).then(fetchAllTasks)} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${isDueToday ? 'bg-sky-500 text-slate-950 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}>Accept</button>}
                   {task.status === "Accepted" && <button disabled={!isDueToday} onClick={() => {setActiveTask(task); setModalType("Delegation"); setShowModal(true);}} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${isDueToday ? 'bg-emerald-500 text-slate-950 active:scale-95 shadow-lg' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}>Complete</button>}
                </div>
              </div>
            );
          }) : <div className="bg-slate-900/20 border border-slate-800/40 rounded-3xl p-10 text-center text-slate-700 font-bold uppercase text-xs tracking-widest">No directives in range</div>}
        </div>
      </section>

      {/* ROUTINE CHECKLIST SECTION */}
      <section>
        <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
           <CheckCircle2 size={18} className="text-emerald-400" /> Routine Checklist <div className="h-px flex-1 bg-slate-800/50" />
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {filteredData.routines.length > 0 ? filteredData.routines.map((item) => {
            const alreadyDone = isDoneToday(item.lastCompleted);
            const isDueToday = isSameDayAsToday(item.nextDueDate);
            return (
              <div key={item._id} className={`p-5 border flex justify-between items-center rounded-3xl transition-all ${alreadyDone ? "bg-slate-950/50 border-slate-800/50 opacity-60 grayscale" : "bg-slate-900/40 border-emerald-500/20 shadow-lg"}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl border ${alreadyDone ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {alreadyDone ? <Lock size={18} /> : <CheckCircle size={18} />}
                  </div>
                  <div>
                    <h4 className={`font-bold tracking-tight ${alreadyDone ? "text-slate-500" : "text-slate-100"}`}>{item.taskName}</h4>
                    <p className={`text-[10px] font-black uppercase mt-0.5 ${isDueToday ? 'text-emerald-500' : 'text-slate-600'}`}>Next: {new Date(item.nextDueDate).toLocaleDateString()} {!isDueToday && "(Locked)"}</p>
                  </div>
                </div>
                {!alreadyDone && <button disabled={!isDueToday} onClick={() => {setActiveTask(item); setModalType("Checklist"); setShowModal(true);}} className={`px-6 py-2 rounded-xl font-black text-xs uppercase shadow-lg transition-all ${isDueToday ? 'bg-emerald-500 text-slate-950 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}>Complete</button>}
                {alreadyDone && <span className="text-[9px] font-black text-slate-600 uppercase bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">Done Today</span>}
              </div>
            );
          }) : <div className="bg-slate-900/20 border border-slate-800/40 rounded-3xl p-10 text-center text-slate-700 font-bold uppercase text-xs tracking-widest">No routines scheduled</div>}
        </div>
      </section>

      {/* SUBMISSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors cursor-pointer"><X size={24} /></button>
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="mb-8 text-center">
                <h3 className="text-sky-400 text-2xl font-black tracking-tight flex items-center justify-center gap-3"><Send size={24} /> Verification</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium italic">Finalizing: {activeTask?.title || activeTask?.taskName}</p>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Execution Log</label>
                 <textarea required placeholder="What was achieved?" value={remarks} onChange={(e) => setRemarks(e.target.value)}
                   className="w-full h-32 bg-slate-950 border border-slate-800 text-slate-100 p-5 rounded-2xl focus:border-sky-500/50 outline-none transition-all font-medium resize-none placeholder:text-slate-800" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Evidence Blueprint</label>
                 <div className="relative group border-2 border-dashed p-8 rounded-2xl text-center bg-slate-950 border-slate-800 group-hover:border-sky-500/40 transition-all">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <Upload size={28} className={`mx-auto mb-2 ${selectedFile ? 'text-emerald-400' : 'text-slate-600 group-hover:text-sky-400'}`} />
                    <p className="text-xs font-bold text-slate-500">{selectedFile ? selectedFile.name : "Attach proof (Images/PDF)"}</p>
                 </div>
              </div>
              <button type="submit" disabled={uploading} className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 font-black text-sm uppercase shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                {uploading ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {uploading ? "Uploading..." : "Submit for Verification"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoerChecklist;