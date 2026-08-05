import React, { useEffect, useState, useCallback, useMemo } from "react";
import API from '../api/axiosConfig';
import RevisionPanel from '../components/RevisionPanel';
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
  CalendarClock,
  User
} from "lucide-react";

/**
 * DOER CHECKLIST: MISSION TERMINAL v3.5
 * Purpose: High-density Excel-style grid for Doer tasks + FMS Integration.
 */
const DoerChecklist = ({ doerId }) => {
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [checklist, setChecklist] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [fmsMissions, setFmsMissions] = useState([]);
  const [timeFilter, setTimeFilter] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All Data');
  const [loading, setLoading] = useState(true);

  // Custom Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [modalType, setModalType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const savedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentDoerId = doerId || savedUser._id || savedUser.id;

  const fetchAllTasks = useCallback(async () => {
    if (!currentDoerId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const userEmail = savedUser.email;
      const [checklistRes, delegationRes, fmsRes] = await Promise.all([
        API.get(`/tasks/checklist/${currentDoerId}`).catch(() => ({ data: [] })),
        API.get(`/tasks/doer/${currentDoerId}`).catch(() => ({ data: [] })),
        API.get(`/fms2/my-tasks-full/${currentDoerId}`).catch(() => ({ data: [] }))
      ]);

      const employeesRes = await API.get('/employees').catch(() => ({ data: [] }));
      setEmployees(employeesRes.data || []);

      const safeChecklist = Array.isArray(checklistRes.data) ? checklistRes.data : (checklistRes.data?.data || []);
      const safeDelegated = Array.isArray(delegationRes.data) ? delegationRes.data : (delegationRes.data?.tasks || delegationRes.data?.data || []);

      setChecklist(safeChecklist);
      setDelegatedTasks(safeDelegated);
      setFmsMissions(fmsRes.data || []);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDoerId, savedUser.email]);

  useEffect(() => { fetchAllTasks(); }, [fetchAllTasks]);

  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filterByDateAndStatus = (dateStr, isCompleted, isPendingWorkCondition) => {
      if (startDate || endDate) {
        if (!dateStr) return false;
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
        if (startDate && targetDate < new Date(startDate)) return false;
        if (endDate && targetDate > new Date(endDate)) return false;
        return true;
      }

      if (timeFilter === 'All') return true;
      if (timeFilter === 'Completed') return isCompleted;

      if (!dateStr) return false;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      if (timeFilter === 'Pending Work') {
        return target.getTime() < today.getTime() && isPendingWorkCondition;
      }
      if (timeFilter === 'Upcoming') {
        return target.getTime() > today.getTime();
      }
      if (timeFilter === 'Today') {
        return target.getTime() === today.getTime();
      }
      if (timeFilter === 'Next 7 Days') {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return target.getTime() > today.getTime() && target.getTime() <= nextWeek.getTime();
      }
      return true;
    };

    const filteredAssignments = delegatedTasks.filter(item => {
      const isCompleted = item.status === 'Completed' || item.status === 'Verified';
      const isPending = !isCompleted;
      return filterByDateAndStatus(item.deadline, isCompleted, isPending);
    });

    const filteredChecklist = checklist.filter(item => {
      const isCompleted = item.isDone;
      const isPending = !isCompleted;
      return filterByDateAndStatus(item.instanceDate || item.nextDueDate, isCompleted, isPending);
    });

    const filteredFms = fmsMissions.filter(item => {
      const isCompleted = item.status === 'completed';
      const isPending = !isCompleted;
      const deadlineDate = item.activeStep?.plannedDeadline || item.completedAt || item.plannedDeadline;
      return filterByDateAndStatus(deadlineDate, isCompleted, isPending);
    });

    return {
      routines: filteredChecklist,
      assignments: filteredAssignments,
      fms: filteredFms,
      all: [
        ...filteredChecklist.map(i => ({ ...i, dataType: 'Checklist', uniqueKey: `${i._id}-${i.instanceDate}`, title: i.taskName, description: i.description, deadlineDate: i.instanceDate || i.nextDueDate, statusLabel: i.isDone ? 'Completed' : 'Pending', assignerName: i.assignerId?.name || '-' })),
        ...filteredAssignments.map(i => ({ ...i, dataType: 'Delegation', uniqueKey: i._id, title: i.title, description: i.description, deadlineDate: i.deadline, statusLabel: i.status, assignerName: i.assignerId?.name || '-' })),
        ...filteredFms.map(i => ({
          ...i,
          dataType: 'FMS',
          uniqueKey: i.instanceId || i._id,
          title: `${i.activeStep?.nodeName || i.templateName || i.nodeName} (#${i.orderIdentifier})`,
          description: i.rawSheetData?.["Item Name"] || i.sheetData?.["Item Name"] ? `Item: ${i.rawSheetData?.["Item Name"] || i.sheetData?.["Item Name"]}` : 'FMS Mission Sequence',
          deadlineDate: i.activeStep?.plannedDeadline || i.completedAt || i.plannedDeadline,
          statusLabel: i.status || 'Active',
          assignerName: i.activeStep?.assignedToName || i.assignerName || 'System'
        }))
      ]
    };
  }, [checklist, delegatedTasks, fmsMissions, timeFilter, startDate, endDate]);

  const pendingRoutinesCount = checklist.filter(item => {
    if (item.isDone) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(item.instanceDate || item.nextDueDate);
    target.setHours(0, 0, 0, 0);
    return target.getTime() <= now.getTime();
  }).length;

  const pendingDelegationsCount = delegatedTasks.filter(t => t.status !== 'Completed' && t.status !== 'Verified').length;

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    const formData = new FormData();
    formData.append("remarks", remarks || "");

    try {
      setUploading(true);

      if (modalType === "Checklist") {
        formData.append("checklistId", activeTask._id);
        if (activeTask.instanceDate) {
          formData.append("instanceDate", activeTask.instanceDate);
        }
        if (selectedFile) formData.append("evidence", selectedFile);
        await API.post("/tasks/checklist-done", formData);
      } else if (modalType === "FMS") {
        formData.append("instanceId", activeTask.instanceId);
        formData.append("stepIndex", activeTask.stepIndex);
        if (selectedFile) formData.append("evidence", selectedFile);
        await API.put(`/fms/execute-step/${activeTask.instanceId}`, { remarks });
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);
        if (selectedFile) formData.append("evidence", selectedFile);
        await API.put(`/tasks/respond`, formData);
      }

      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      fetchAllTasks();

    } catch (err) {
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

  const isYesNo = activeTask?.inputType === "yesno";
  const isPaused = activeTask?.isPaused;

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 px-2 sm:px-6">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 py-4 border-b border-border gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shadow-inner">
            <ClipboardCheck size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-foreground text-lg md:text-xl font-black tracking-tighter uppercase leading-none">Task Hub</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">Session Active: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-card border border-border px-4 py-1.5 rounded-lg text-foreground font-black text-[12px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm">
          <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {/* CATEGORY TABS SEQUENCE */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <button
          onClick={() => { setActiveCategory('All Data'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'All Data' ? 'bg-slate-800 text-white border-slate-800 shadow-slate-800/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <LayoutGrid size={16} />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest">All Data</span>
        </button>

        <button
          onClick={() => { setActiveCategory('Checklist'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Checklist' ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Layers size={16} />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest">Checklist</span>
          {pendingRoutinesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
              {pendingRoutinesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('Delegation'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Delegation' ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Briefcase size={16} />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest">Delegation</span>
          {pendingDelegationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-md animate-bounce">
              {pendingDelegationsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('FMS'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'FMS' ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Activity size={16} className={activeCategory === 'FMS' ? 'animate-pulse' : ''} />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest">FMS Missions</span>
          {filteredData.fms.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md">
              {filteredData.fms.length}
            </span>
          )}
        </button>
      </div>

      {/* FILTERS & DATE RANGE INPUTS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-card/40 p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Completed', 'Today', 'Next 7 Days', 'Pending Work', 'Upcoming'].map(range => (
            <button
              key={range}
              onClick={() => { setTimeFilter(range); setStartDate(''); setEndDate(''); }}
              className={`px-3 py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${timeFilter === range ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-card text-slate-500 border-border hover:border-primary/40'}`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Date Filter From - To */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-lg">
            <span className="text-[8px] font-black uppercase text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setTimeFilter(''); }}
              className="bg-transparent text-xs text-foreground font-semibold outline-none"
            />
          </div>
          <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-lg">
            <span className="text-[8px] font-black uppercase text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setTimeFilter(''); }}
              className="bg-transparent text-xs text-foreground font-semibold outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setTimeFilter('All'); }}
              className="text-[9px] font-black uppercase text-red-500 hover:underline px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* EXCEL GRID HEADER WITH RESPONSIVE FLUID TRACKS */}
      <div className="hidden lg:grid grid-cols-[50px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] px-6 py-2.5 bg-slate-900 dark:bg-slate-950 rounded-t-lg border border-slate-800 font-black text-slate-400 text-[10px] uppercase tracking-[0.25em] items-center">
        <div>#</div>
        <div>Mission Identifier</div>
        <div className="text-center">Assigned By</div>
        <div className="text-center">Description</div>
        <div className="text-center">Protocol Date</div>
        <div className="text-center">Priority / Status</div>
        <div className="text-right pr-4">Registry Action</div>
      </div>

      {/* DATA TERMINAL */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-lg overflow-hidden shadow-xl w-full">
        {activeCategory === 'All Data' ? (
          filteredData.all.length > 0 ? filteredData.all.map((item, index) => {
            const isPastDue = item.deadlineDate && new Date(item.deadlineDate) < new Date();
            return (
              <div key={item.uniqueKey} className="flex flex-col lg:grid lg:grid-cols-[50px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-primary/[0.02]">
                <div className="text-xs font-black text-slate-400">
                  {index + 1}
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-black text-sm text-foreground whitespace-normal break-words block leading-tight">
                    {item.title}
                  </span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 w-fit">
                    Type: {item.dataType}
                  </span>
                </div>
                <div className="text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-full lg:w-auto mb-1 lg:mb-0 truncate px-1">
                  {item.assignerName || '-'}
                </div>
                <div className="text-xs opacity-70 uppercase font-semibold whitespace-normal break-words w-full lg:w-auto mb-1 lg:mb-0 pr-2">
                  {item.description || "No description provided."}
                </div>
                <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                  <Calendar size={12} className="text-primary/30 shrink-0" />
                  <p className="uppercase tracking-tighter text-slate-500 truncate">
                    {item.deadlineDate ? new Date(item.deadlineDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="flex justify-center items-center gap-2 w-full lg:w-auto mb-1 lg:mb-0">
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border text-primary border-primary/20 bg-primary/5">
                    {item.priority || item.dataType}
                  </span>
                  <span className="text-[7px] text-slate-400 font-black uppercase">/ {item.statusLabel || item.status}</span>
                </div>
                <div className="flex justify-end gap-2 w-full lg:w-auto">
                  {item.dataType === 'Delegation' && item.status === "Pending" && (
                    <button onClick={() => API.put(`/tasks/respond`, { taskId: item._id, status: 'Accepted', doerId: currentDoerId }).then(fetchAllTasks)} className="px-3 py-1 bg-primary text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Accept</button>
                  )}
                  {item.dataType === 'Delegation' && item.status === "Accepted" && (
                    <button onClick={() => { setActiveTask(item); setModalType("Delegation"); setShowModal(true); }} className="px-3 py-1 bg-emerald-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Complete</button>
                  )}
                  {item.dataType === 'Checklist' && !item.isDone && (
                    <button onClick={() => { setActiveTask(item); setModalType("Checklist"); setShowModal(true); }} className="px-4 py-1 rounded font-black text-[8px] uppercase tracking-widest shadow-md text-white bg-emerald-600">Submit</button>
                  )}
                  {item.dataType === 'FMS' && (
                    <button onClick={() => { setActiveTask(item); setModalType("FMS"); setShowModal(true); }} className="px-4 py-1 bg-slate-900 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Done</button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">No Consolidated Data Found</p></div>
          )
        ) : activeCategory === 'Delegation' ? (
          filteredData.assignments.length > 0 ? filteredData.assignments.map((task, index) => {
            const isPastDue = new Date(task.deadline) < new Date();

            return (
              <div key={task._id} className="flex flex-col lg:grid lg:grid-cols-[50px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-slate-50">
                <div className="text-xs font-black text-slate-400">
                  {index + 1}
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-black text-sm text-foreground whitespace-normal break-words block leading-tight">
                    {task.title}
                  </span>
                </div>
                <div className="text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-full lg:w-auto mb-1 lg:mb-0 truncate px-1">
                  {task.assignerId?.name || 'Registry Admin'}
                </div>
                <div className="text-xs opacity-70 uppercase font-semibold whitespace-normal break-words w-full lg:w-auto mb-1 lg:mb-0 pr-2">
                  {task.description || "No description provided."}
                </div>
                <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                  <Calendar size={12} className="text-primary/30 shrink-0" />
                  <p className={`uppercase tracking-tighter truncate ${isPastDue && task.status !== 'Completed' ? 'text-red-500' : 'text-slate-500'}`}>
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
                    <>
                      <button onClick={() => API.put(`/tasks/respond`, { taskId: task._id, status: 'Accepted', doerId: currentDoerId }).then(fetchAllTasks)} className="px-3 py-1 bg-primary text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Accept</button>
                      {task.isRevisionAllowed && (
                        <button onClick={() => { setSelectedTask(task); setShowRevisionModal(true); }} className="px-3 py-1 bg-yellow-500 text-white rounded font-black text-[8px]">Revise</button>
                      )}
                    </>
                  )}
                  {task.status === "Accepted" && (
                    <button onClick={() => { setActiveTask(task); setModalType("Delegation"); setShowModal(true); }} className="px-3 py-1 bg-emerald-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Complete</button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">Directives Synchronized</p></div>
          )
        ) : activeCategory === 'FMS' ? (
          filteredData.fms.length > 0 ? filteredData.fms.map((mission, index) => {
            const deadline = mission.activeStep?.plannedDeadline || mission.completedAt || mission.plannedDeadline;
            const isDelayed = deadline && mission.status === 'active' && new Date() > new Date(deadline);
            return (
              <div key={mission.instanceId || mission._id} className="flex flex-col lg:grid lg:grid-cols-[50px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-slate-50">
                <div className="text-xs font-black text-slate-400">
                  {index + 1}
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-black text-sm text-foreground whitespace-normal break-words block leading-tight">
                    {mission.activeStep?.nodeName || mission.templateName || mission.nodeName} <span className="text-slate-400 ml-2 font-bold opacity-60">#{mission.orderIdentifier}</span>
                  </span>
                </div>
                <div className="text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-full lg:w-auto mb-1 lg:mb-0 truncate px-1">
                  {mission.activeStep?.assignedToName || mission.assignerName || 'System'}
                </div>
                <div className="text-xs opacity-70 uppercase font-semibold whitespace-normal break-words w-full lg:w-auto mb-1 lg:mb-0 pr-2">
                  {mission.rawSheetData?.["Item Name"] || mission.sheetData?.["Item Name"] ? `Item: ${mission.rawSheetData?.["Item Name"] || mission.sheetData?.["Item Name"]}` : 'FMS Mission Sequence'}
                </div>
                <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                  <Clock size={12} className={isDelayed ? 'text-red-500' : 'text-primary/30 shrink-0'} />
                  <p className={`uppercase tracking-tighter truncate ${isDelayed ? 'text-red-500 font-black' : 'text-slate-500'}`}>
                    {deadline ? new Date(deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </p>
                </div>
                <div className="flex justify-center items-center gap-2 w-full lg:w-auto mb-1 lg:mb-0">
                  <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${mission.status === 'completed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : isDelayed ? 'text-red-600 border-red-200 bg-red-50' : 'text-sky-600 border-sky-200 bg-sky-50'}`}>
                    {mission.status === 'completed' ? 'COMPLETED' : isDelayed ? 'DELAYED' : 'ON TRACK'}
                  </span>
                </div>
                <div className="flex justify-end gap-2 w-full lg:w-auto">
                  <button onClick={() => { setActiveTask(mission); setModalType("FMS"); setShowModal(true); }} className="px-4 py-1 bg-slate-900 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Done</button>
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">Sequential Registry Synchronized</p></div>
          )
        ) : (
          filteredData.routines.length > 0 ? filteredData.routines.map((item, index) => {
            const displayDate = new Date(item.instanceDate || item.nextDueDate);
            displayDate.setHours(0, 0, 0, 0);
            const isBacklog = item.isBacklog;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isFuture = displayDate.getTime() > today.getTime();

            return (
              <div key={`${item._id}-${item.instanceDate}`} className="flex flex-col lg:grid lg:grid-cols-[50px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-slate-50">
                <div className="text-xs font-black text-slate-400">
                  {index + 1}
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-black text-sm text-foreground whitespace-normal break-words block leading-tight">
                    {item.taskName}
                  </span>
                  <span className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                    Registry Scope: {item.frequency || 'Daily'} Protocol
                  </span>
                </div>
                <div className="text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-full lg:w-auto mb-1 lg:mb-0 truncate px-1">
                  {item.assignerId?.name || 'System'}
                </div>
                <div className="text-xs opacity-70 uppercase font-semibold whitespace-normal break-words w-full lg:w-auto mb-1 lg:mb-0 pr-2">
                  {item.description || "No description provided."}
                </div>
                <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[10px] font-black">
                  <Calendar size={12} className="text-slate-400 shrink-0" />
                  <p className={`uppercase tracking-tighter truncate ${isBacklog ? 'text-amber-600' : 'text-slate-500'}`}>
                    {`${displayDate.toLocaleString('default', { month: 'short' }).toUpperCase()} ${String(displayDate.getDate()).padStart(2, '0')}, ${displayDate.getFullYear()}`}
                  </p>
                </div>
                <div className="flex justify-center w-full lg:w-auto mb-1 lg:mb-0">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.frequency || 'Daily'} CYCLE</span>
                </div>
                <div className="flex justify-end w-full lg:w-auto">
                  {item.isDone ? (
                    <span className="px-4 py-1.5 rounded font-black text-[8px] uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 shadow-sm flex items-center gap-2">
                      <CheckCircle size={10} className="text-emerald-500" /> Done
                    </span>
                  ) : (
                    <button
                      disabled={isFuture}
                      onClick={() => { setActiveTask(item); setModalType("Checklist"); setShowModal(true); }}
                      className={`px-4 py-1 rounded font-black text-[8px] uppercase tracking-widest shadow-md text-white transition-all ${isFuture ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'active:scale-95 ' + (isBacklog ? 'bg-amber-600' : 'bg-emerald-600')}`}
                    >
                      Submit
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">Registry Synchronized</p></div>
          )
        )}
      </div>

      {/* MISSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-foreground transition-all active:scale-90 cursor-pointer"><X size={24} /></button>
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mx-auto mb-4 ${modalType === 'FMS' ? 'bg-slate-900 border-slate-700 text-white' : activeTask?.isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-primary/10 border-primary/20 text-primary'}`}><Send size={24} /></div>
                <h3 className="text-foreground text-xl font-black uppercase tracking-tight">
                  {modalType === 'FMS' ? 'FMS Mission Sync' : activeTask?.isBacklog ? 'Backlog Sync' : 'Update Task'}
                </h3>
                <p className="text-primary font-black text-[10px] uppercase mt-1 tracking-widest px-4 whitespace-normal break-words">
                  {activeTask?.title || activeTask?.taskName || activeTask?.nodeName}
                </p>
              </div>
              <textarea required placeholder="Mission remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full h-32 bg-background border border-border text-foreground p-4 rounded-2xl outline-none font-bold text-[10px] uppercase shadow-inner" />
              <div className="relative border-2 border-dashed p-6 rounded-2xl text-center bg-background border-border hover:border-primary/50 transition-all">
                <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <Upload size={20} className="mx-auto text-slate-400 mb-2" />
                <p className="text-[9px] font-black text-foreground uppercase">{selectedFile ? selectedFile.name : "Attach Payload"}</p>
              </div>

              {modalType === "FMS" && isYesNo ? (
                <div className="space-y-4">
                  {!isPaused && (
                    <>
                      <button
                        type="button"
                        onClick={handleFinalSubmit}
                        className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest shadow-lg transition-all active:scale-95"
                      >
                        DONE
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!remarks || !remarks.trim()) {
                            alert("Remarks are mandatory for this step");
                            return;
                          }
                          await API.put(`/fms/execute-step/${activeTask.instanceId}`, {
                            decision: "No",
                            remarks
                          });
                          fetchAllTasks();
                          setShowModal(false);
                        }}
                        className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black tracking-widest shadow-lg transition-all active:scale-95"
                      >
                        ❌ NO – Pause Flow
                      </button>
                    </>
                  )}
                  {isPaused && (
                    <button
                      type="button"
                      onClick={async () => {
                        await API.put(`/fms/execute-step/${activeTask.instanceId}`, {
                          action: "continue"
                        });
                        fetchAllTasks();
                        setShowModal(false);
                      }}
                      className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-widest shadow-lg transition-all active:scale-95"
                    >
                      🔄 CONTINUE – Resume Flow
                    </button>
                  )}
                </div>
              ) : (
                <button
                  disabled={uploading}
                  className="w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] text-white shadow-lg active:scale-95 transition-all bg-slate-900"
                >
                  Finalize Result
                </button>
              )}
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

      {showRevisionModal && selectedTask && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-center p-6">
          <div className="bg-card w-full max-w-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowRevisionModal(false)}
              className="absolute top-4 right-4"
            >
              <X size={20} />
            </button>
            <RevisionPanel
              task={selectedTask}
              employees={employees}
              assignerId={currentDoerId}
              onSuccess={() => {
                setShowRevisionModal(false);
                fetchAllTasks();
              }}
              source="doer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DoerChecklist;