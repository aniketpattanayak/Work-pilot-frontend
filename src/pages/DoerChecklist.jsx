import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosConfig';
import RevisionPanel from '../components/RevisionPanel';
import { dialog } from '../components/Dialog';
import { TaskCard, sheetDisplayRows } from './FlowMyTasks';
import { useChat } from '../components/useChat';
import ImageLightbox from '../components/ImageLightbox';
import TaskPhotoThumb from '../components/TaskPhotoThumb';
import { groupPhotosByHistory, allTaskPhotos } from '../utils/taskPhotos';
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
  Camera,
  MessageSquare,
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
import MobileFilters from '../components/MobileFilters';

/**
 * DOER CHECKLIST: MISSION TERMINAL v3.5
 * Purpose: High-density Excel-style grid for Doer tasks + FMS Integration.
 */
// What the order is about, taken from the columns this step is meant to show (see FlowMyTasks).
const fmsDescription = (m) => {
  const rows = sheetDisplayRows(m).slice(0, 4);
  return rows.length ? rows.map(r => `${r.label}: ${r.value}`).join(' · ') : (m?.nodeConfig?.question || 'No order details');
};

const DoerChecklist = ({ doerId }) => {
  const { openTaskThread } = useChat();
  const navigate = useNavigate();
  const openTaskChat = useCallback(async (opts) => {
    const conv = await openTaskThread(opts);
    if (conv?._id) navigate(`/dashboard/chat?conv=${conv._id}`);
  }, [openTaskThread, navigate]);
  // History/files details modal: mirrors the assigner-side one in
  // ManageTasks.jsx so the doer can see every uploaded photo and the full
  // audit trail (including rejection remarks) for a delegation task.
  const [detailsModalTask, setDetailsModalTask] = useState(null);
  // Full-screen zoomable photo GALLERY - shared by the History & Files
  // modal and the row-level "has photos" thumbnail, same as ManageTasks.jsx.
  const [gallery, setGallery] = useState(null); // { photos, startIndex, task } | null
  const openGallery = (photos, startIndex, task) => setGallery({ photos, startIndex, task });
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
  // Multiple evidence photos for marking a Delegation task done - picked
  // from device storage or captured live from the camera (requirement: the
  // doer must be able to choose either source, and attach more than one).
  const [delegationFiles, setDelegationFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const savedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentDoerId = doerId || savedUser._id || savedUser.id;
  // ── Assign a received task onward ──
  const [onwardTask, setOnwardTask] = useState(null);
  const [onwardStaff, setOnwardStaff] = useState([]);
  const [onwardPick, setOnwardPick] = useState('');
  const [onwardNote, setOnwardNote] = useState('');
  const [onwardBusy, setOnwardBusy] = useState(false);
  const [onwardErr, setOnwardErr] = useState('');
  const myRoles = Array.isArray(savedUser.roles) ? savedUser.roles : (savedUser.role ? [savedUser.role] : []);
  const idOf = (v) => String((v && v._id) || v || '');
  // A task I handed to someone else: I can follow it here but not work on it
  const isPassedOn = (t) =>
    idOf(t.doerId) !== String(currentDoerId) &&
    (t.forwardChain || []).some(c => idOf(c.employeeId) === String(currentDoerId));
  const canForward = (t) =>
    myRoles.includes('Assigner') &&
    (t.status === 'Pending' || t.status === 'Accepted') &&
    idOf(t.doerId) === String(currentDoerId);
  const openOnward = async (t) => {
    setOnwardTask(t); setOnwardPick(''); setOnwardNote(''); setOnwardErr(''); setOnwardStaff([]);
    try {
      const r = await API.get(`/tasks/authorized-staff/${currentDoerId}`);
      const taken = new Set([String(currentDoerId), idOf(t.assignerId), ...(t.forwardChain || []).map(c => idOf(c.employeeId))]);
      setOnwardStaff((r.data?.doers || []).filter(d => !taken.has(String(d._id))));
    } catch {
      setOnwardErr('Could not load your team. Please try again.');
    }
  };
  const submitOnward = async () => {
    if (!onwardPick) { setOnwardErr('Please choose who to assign this to.'); return; }
    try {
      setOnwardBusy(true); setOnwardErr('');
      await API.post('/tasks/assign-onward', { taskId: onwardTask._id, newDoerId: onwardPick, remarks: onwardNote.trim() });
      setOnwardTask(null);
      fetchAllTasks();
    } catch (err) {
      setOnwardErr(err.response?.data?.message || 'Could not assign this task onward.');
    } finally {
      setOnwardBusy(false);
    }
  };


  const fetchAllTasks = useCallback(async () => {
    if (!currentDoerId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const userEmail = savedUser.email;
      const [checklistRes, delegationRes, fmsRes] = await Promise.all([
        API.get(`/tasks/checklist/${currentDoerId}?includeDone=1`).catch(() => ({ data: [] })),
        API.get(`/tasks/doer/${currentDoerId}?includePassedOn=1`).catch(() => ({ data: [] })),
        API.get(`/fms2/my-tasks-full/${currentDoerId}`).catch(() => ({ data: [] }))
      ]);

      const employeesRes = await API.get('/tasks/employees').catch(() => ({ data: [] }));
      setEmployees(employeesRes.data || []);

      const safeChecklist = Array.isArray(checklistRes.data) ? checklistRes.data : (checklistRes.data?.data || []);
      const safeDelegated = Array.isArray(delegationRes.data) ? delegationRes.data : (delegationRes.data?.tasks || delegationRes.data?.data || []);

      setChecklist(safeChecklist);
      setDelegatedTasks(safeDelegated);
      setFmsMissions(Array.isArray(fmsRes.data) ? fmsRes.data : []);
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
        ...filteredChecklist.map(i => ({ ...i, dataType: 'Checklist', uniqueKey: `${i._id}-${i.instanceDate}`, title: i.taskName, description: i.description, deadlineDate: i.instanceDate || i.nextDueDate, statusLabel: i.isDone ? 'Completed' : 'Pending', assignerName: i.createdBy?.name || i.assignerId?.name || 'Not recorded' })),
        ...filteredAssignments.map(i => ({ ...i, dataType: 'Delegation', uniqueKey: i._id, title: i.title, description: i.description, deadlineDate: i.deadline, statusLabel: i.status, assignerName: i.assignerId?.name || '-' })),
        ...filteredFms.map(i => ({
          ...i,
          dataType: 'FMS',
          uniqueKey: i.instanceId || i._id,
          title: `${i.activeStep?.nodeName || i.templateName || i.nodeName} (#${i.orderIdentifier})`,
          description: fmsDescription(i),
          deadlineDate: i.activeStep?.plannedDeadline || i.completedAt || i.plannedDeadline,
          statusLabel: i.isOverdue ? 'Delayed' : 'On track',
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

  const pendingDelegationsCount = delegatedTasks.filter(t => t.status !== 'Completed' && t.status !== 'Verified' && !isPassedOn(t)).length;

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
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);
        // Multiple files (storage picks and/or live camera captures) all go
        // up as separate "evidence" fields - the backend's /respond route
        // now accepts an array (routes/taskRoutes.js: useUpload(_upload.array('evidence', 6))).
        delegationFiles.forEach((f) => formData.append("evidence", f));
        await API.put(`/tasks/respond`, formData);
      }

      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      setDelegationFiles([]);
      fetchAllTasks();

    } catch (err) {
      console.error("Submission Error Details:", err.response?.data || err.message);
      await dialog.alert(err.response?.data?.message || "Could not submit. Please try again.", { tone: "error", title: "Not submitted" });
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
      <div className="flex flex-row justify-between items-center mb-3 py-2 border-b border-border gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shadow-inner shrink-0">
            <ClipboardCheck size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-lg sm:text-xl font-black tracking-tighter uppercase leading-none truncate">Task Hub</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1 opacity-60 truncate">Session Active: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <button onClick={fetchAllTasks} className="group bg-card border border-border px-3 sm:px-4 py-1.5 min-h-[44px] lg:min-h-[40px] rounded-lg text-foreground font-black text-[10px] sm:text-[12px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm shrink-0">
          <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {/* CATEGORY TABS SEQUENCE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <button
          onClick={() => { setActiveCategory('All Data'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm overflow-hidden ${activeCategory === 'All Data' ? 'bg-slate-800 text-white border-slate-800 shadow-slate-800/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <LayoutGrid size={16} className="shrink-0" />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate">All Data</span>
        </button>

        <button
          onClick={() => { setActiveCategory('Checklist'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm overflow-hidden ${activeCategory === 'Checklist' ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Layers size={16} className="shrink-0" />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate">Checklist</span>
          {pendingRoutinesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
              {pendingRoutinesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('Delegation'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm overflow-hidden ${activeCategory === 'Delegation' ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Briefcase size={16} className="shrink-0" />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate">Delegation</span>
          {pendingDelegationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-md animate-bounce">
              {pendingDelegationsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('FMS'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm overflow-hidden ${activeCategory === 'FMS' ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Activity size={16} className={`shrink-0 ${activeCategory === 'FMS' ? 'animate-pulse' : ''}`} />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate">FMS Missions</span>
          {filteredData.fms.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md">
              {filteredData.fms.length}
            </span>
          )}
        </button>
      </div>

      {/* FILTERS & DATE RANGE — collapsed behind Filters on phones */}
      <div className="mb-6">
        <MobileFilters
          activeCount={[timeFilter && timeFilter !== 'All', !!startDate, !!endDate].filter(Boolean).length}
          onClear={() => { setTimeFilter('All'); setStartDate(''); setEndDate(''); }}
          className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border"
        >
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Completed', 'Today', 'Next 7 Days', 'Pending Work', 'Upcoming'].map(range => (
              <button
                key={range}
                onClick={() => { setTimeFilter(range); setStartDate(''); setEndDate(''); }}
                className={`px-3 py-1.5 min-h-[44px] lg:min-h-[36px] rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all active:scale-95 ${timeFilter === range ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-card text-slate-500 border-border hover:border-primary/40'}`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Date Filter From - To */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setTimeFilter(''); }}
                className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[108px] sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setTimeFilter(''); }}
                className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[108px] sm:w-auto"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setTimeFilter('All'); }}
                className="text-[9px] font-black uppercase text-red-500 hover:underline px-2 shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </MobileFilters>
      </div>

      {/* EXCEL GRID HEADER WITH RESPONSIVE FLUID TRACKS */}
      <div className="hidden lg:grid grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_170px] px-6 py-2.5 bg-slate-900 dark:bg-slate-950 rounded-t-lg border border-slate-800 font-black text-slate-400 text-[10px] uppercase tracking-[0.25em] items-center">
        <div>S. no.</div>
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
              <div key={item.uniqueKey} className="flex flex-col lg:grid lg:grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_170px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-muted/40 dark:hover:bg-primary/[0.02]">
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
                  {(item.files || []).length > 0 && (() => {
                    const photos = allTaskPhotos(item);
                    const latest = photos[photos.length - 1];
                    return (
                      <button
                        type="button"
                        onClick={() => openGallery(photos, photos.length - 1, item)}
                        className="mt-1.5 flex items-center gap-1.5 group/thumb w-fit"
                        title="View uploaded photos"
                      >
                        <TaskPhotoThumb file={latest} className="w-7 h-7" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover/thumb:text-primary">
                          {photos.length > 1 ? `+${photos.length} photos` : '1 photo'}
                        </span>
                      </button>
                    );
                  })()}
                </div>
                <div className="text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-full lg:w-auto mb-1 lg:mb-0 truncate px-1">
                  {item.assignerName || '-'}
                </div>
                <div className="text-xs opacity-70 uppercase font-semibold whitespace-normal break-words w-full lg:w-auto mb-1 lg:mb-0 pr-2">
                  {item.description || "No description provided."}
                  {item.dataType === 'Delegation' && item.remarks && (
                    <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-black normal-case tracking-tight not-italic">
                      {item.status === 'Accepted' ? 'Sent back — ' : 'Note — '}{item.remarks}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                  <Calendar size={12} className="text-primary/30 shrink-0" />
                  <p className="uppercase tracking-tighter text-slate-500 truncate">
                    {item.deadlineDate ? `${new Date(item.deadlineDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(item.deadlineDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                  </p>
                </div>
                <div className="flex justify-center items-center gap-2 w-full lg:w-auto mb-1 lg:mb-0">
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border text-primary border-primary/20 bg-primary/5">
                    {item.priority || item.dataType}
                  </span>
                  <span className="text-[7px] text-slate-400 font-black uppercase">/ {item.statusLabel || item.status}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-2 w-full lg:w-auto">
                  {item.dataType === 'Delegation' && isPassedOn(item) && (<span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Passed to {item.doerId?.name || 'someone'}</span>)}
                  {canForward(item) && (
                    <button onClick={() => openOnward(item)} className="px-3 py-1 bg-indigo-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Assign Onward</button>
                  )}
                  {item.dataType === 'Delegation' && (item.status === "Pending" || item.status === "Accepted") && !isPassedOn(item) && (
                    <button onClick={() => { setActiveTask(item); setModalType("Delegation"); setDelegationFiles([]); setShowModal(true); }} className="px-3 py-1 bg-emerald-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Complete</button>
                  )}
                  {item.dataType === 'Delegation' && !isPassedOn(item) && (
                    <>
                      <button onClick={() => openTaskChat({
                        taskId: item._id,
                        taskType: 'delegation',
                        taskTitle: item.title,
                        participants: [idOf(item.doerId) || currentDoerId, idOf(item.assignerId)].filter(Boolean),
                      })} className="p-1.5 bg-background border border-border text-slate-400 hover:border-blue-400 hover:text-blue-500 rounded-lg transition-all active:scale-90" title="Message">
                        <MessageSquare size={12} />
                      </button>
                      <button onClick={() => setDetailsModalTask(item)} className="p-1.5 bg-background border border-border text-slate-400 hover:border-violet-400 hover:text-violet-500 rounded-lg transition-all active:scale-90" title="History & files">
                        <History size={12} />
                      </button>
                    </>
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
              <div key={task._id} className="flex flex-col lg:grid lg:grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_170px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-muted/40">
                <div className="text-xs font-black text-slate-400">
                  {index + 1}
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-black text-sm text-foreground whitespace-normal break-words block leading-tight">
                    {task.title}
                  </span>
                  {(task.files || []).length > 0 && (() => {
                    const photos = allTaskPhotos(task);
                    const latest = photos[photos.length - 1];
                    return (
                      <button
                        type="button"
                        onClick={() => openGallery(photos, photos.length - 1, task)}
                        className="mt-1.5 flex items-center gap-1.5 group/thumb w-fit"
                        title="View uploaded photos"
                      >
                        <TaskPhotoThumb file={latest} className="w-7 h-7" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover/thumb:text-primary">
                          {photos.length > 1 ? `+${photos.length} photos` : '1 photo'}
                        </span>
                      </button>
                    );
                  })()}
                </div>
                <div className="text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-full lg:w-auto mb-1 lg:mb-0 truncate px-1">
                  {task.assignerId?.name || 'Registry Admin'}
                </div>
                <div className="text-xs opacity-70 uppercase font-semibold whitespace-normal break-words w-full lg:w-auto mb-1 lg:mb-0 pr-2">
                  {task.description || "No description provided."}
                  {task.remarks && (
                    <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-black normal-case tracking-tight not-italic">
                      {task.status === 'Accepted' ? 'Sent back — ' : 'Note — '}{task.remarks}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 w-full lg:w-auto mb-1 lg:mb-0 text-[9px] font-bold">
                  <Calendar size={12} className="text-primary/30 shrink-0" />
                  <p className={`uppercase tracking-tighter truncate ${isPastDue && task.status !== 'Completed' ? 'text-red-500' : 'text-slate-500'}`}>
                    {new Date(task.deadline).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                    {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {task.originalDeadline && (
                    <span className="basis-full text-center text-[8px] font-black uppercase text-amber-600" title="The deadline was revised">
                      Revised &middot; was {new Date(task.originalDeadline).toLocaleDateString([], { day: '2-digit', month: 'short' })} (+{Math.round((new Date(task.deadline) - new Date(task.originalDeadline)) / 86400000)}d)
                    </span>
                  )}
                </div>
                <div className="flex justify-center items-center gap-2 w-full lg:w-auto mb-1 lg:mb-0">
                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${isPastDue ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-primary border-primary/20 bg-primary/5'}`}>
                    {task.priority || 'Standard'}
                  </span>
                  <span className="text-[7px] text-slate-400 font-black uppercase">/ {task.status}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-2 w-full lg:w-auto">
                  {isPassedOn(task) && (<span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Passed to {task.doerId?.name || 'someone'}</span>)}
                  {canForward(task) && (
                    <button onClick={() => openOnward(task)} className="px-3 py-1 bg-indigo-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Assign Onward</button>
                  )}
                  {(task.status === "Pending" || task.status === "Accepted") && !isPassedOn(task) && (
                    <>
                      {task.isRevisionAllowed && !isPastDue && !(task.history || []).some(h => h.action === 'Deadline Approved' || h.action === 'Deadline Revised') && (
                        <button onClick={() => { setSelectedTask(task); setShowRevisionModal(true); }} className="px-3 py-1 bg-yellow-500 text-white rounded font-black text-[8px]">Revise</button>
                      )}
                      <button onClick={() => { setActiveTask(task); setModalType("Delegation"); setDelegationFiles([]); setShowModal(true); }} className="px-3 py-1 bg-emerald-600 text-white rounded font-black text-[8px] uppercase tracking-widest shadow-md">Complete</button>
                    </>
                  )}
                  {!isPassedOn(task) && (
                    <>
                      <button onClick={() => openTaskChat({
                        taskId: task._id,
                        taskType: 'delegation',
                        taskTitle: task.title,
                        participants: [idOf(task.doerId) || currentDoerId, idOf(task.assignerId)].filter(Boolean),
                      })} className="p-1.5 bg-background border border-border text-slate-400 hover:border-blue-400 hover:text-blue-500 rounded-lg transition-all active:scale-90" title="Message">
                        <MessageSquare size={12} />
                      </button>
                      <button onClick={() => setDetailsModalTask(task)} className="p-1.5 bg-background border border-border text-slate-400 hover:border-violet-400 hover:text-violet-500 rounded-lg transition-all active:scale-90" title="History & files">
                        <History size={12} />
                      </button>
                    </>
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
            const isDelayed = !!mission.isOverdue || (!!deadline && mission.status !== 'completed' && new Date() > new Date(deadline));
            return (
              <div key={mission.instanceId || mission._id} className="flex flex-col lg:grid lg:grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_170px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-muted/40">
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
                  {fmsDescription(mission)}
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
                <div className="flex flex-wrap justify-end gap-2 w-full lg:w-auto">
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
              <div key={`${item._id}-${item.instanceDate}`} className="flex flex-col lg:grid lg:grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_170px] items-start lg:items-center px-4 py-3 lg:px-6 border-b border-border last:border-0 hover:bg-muted/40">
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
                  {item.createdBy?.name || item.assignerId?.name || 'Not recorded'}
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
            {modalType === 'FMS' ? (
              <div className="max-h-[78vh] overflow-y-auto pr-1 -mr-1">
                <h3 className="text-foreground text-lg font-black uppercase tracking-tight text-center mb-4">FMS Task</h3>
                <TaskCard
                  task={activeTask}
                  onComplete={() => { setShowModal(false); fetchAllTasks(); }}
                />
              </div>
            ) : (
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
              {modalType === "Delegation" ? (
                // Delegation completion: the doer must be able to choose
                // storage or a live camera photo, and attach more than one.
                <div>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border-2 border-dashed border-border text-[9px] font-black uppercase text-slate-400 hover:border-primary/50 hover:text-primary cursor-pointer transition-all">
                      <Upload size={16} /> From storage
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => setDelegationFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                      />
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border-2 border-dashed border-border text-[9px] font-black uppercase text-slate-400 hover:border-primary/50 hover:text-primary cursor-pointer transition-all">
                      <Camera size={16} /> Take photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => setDelegationFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                      />
                    </label>
                  </div>
                  {delegationFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {delegationFiles.map((f, i) => (
                        <div key={i} className="relative">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                          <button
                            type="button"
                            onClick={() => setDelegationFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]"
                            aria-label={`Remove ${f.name}`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative border-2 border-dashed p-6 rounded-2xl text-center bg-background border-border hover:border-primary/50 transition-all">
                  <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <Upload size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-[9px] font-black text-foreground uppercase">{selectedFile ? selectedFile.name : "Attach Payload"}</p>
                </div>
              )}

                <button
                  disabled={uploading}
                  className="w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] text-white shadow-lg active:scale-95 transition-all bg-slate-900"
                >
                  Finalize Result
                </button>
            </form>
            )}
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

      {onwardTask && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-center p-6">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 relative border border-border">
            <button onClick={() => setOnwardTask(null)} className="absolute top-4 right-4"><X size={20} /></button>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Assign Onward</h3>
            <p className="text-xs text-muted-foreground mb-4 break-words">{onwardTask.title}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              {[onwardTask.assignerId?.name, ...(onwardTask.forwardChain || []).map(c => c.employeeId?.name), 'You'].filter(Boolean).join(' → ')} → <span className="text-indigo-500">New person</span>
            </p>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Assign to</label>
            <select value={onwardPick} onChange={(e) => setOnwardPick(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm">
              <option value="">Select a person…</option>
              {onwardStaff.map(d => <option key={d._id} value={d._id}>{d.name}{d.department ? ` (${d.department})` : ''}</option>)}
            </select>
            {onwardStaff.length === 0 && !onwardErr && (
              <p className="text-xs text-amber-600 mb-3">No one is mapped under you yet. Ask your Admin to map team members to you.</p>
            )}
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Note (optional)</label>
            <textarea value={onwardNote} onChange={(e) => setOnwardNote(e.target.value)} rows={2} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm" placeholder="Anything they should know" />
            {onwardErr && <p className="text-xs text-red-500 mb-3">{onwardErr}</p>}
            <p className="text-[10px] text-muted-foreground mb-4">The person you pick becomes the doer and marks it done. You and the original assigner are both told when it is completed.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOnwardTask(null)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
              <button onClick={submitOnward} disabled={onwardBusy} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{onwardBusy ? 'Assigning…' : 'Assign Onward'}</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY & FILES MODAL — same data/shape as the assigner-side one in
          ManageTasks.jsx, so the doer can see every uploaded photo plus the
          full audit trail, including any rejection/send-back remarks. */}
      {detailsModalTask && (
        <div className="fixed inset-0 z-[9994] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-black text-sm uppercase tracking-widest">History & Files</h3>
              <button onClick={() => setDetailsModalTask(null)} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {detailsModalTask.remarks && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  Latest remarks: {detailsModalTask.remarks}
                </div>
              )}
              {/* Each history entry shows its OWN photos inline, right next to who
                  did it and when. groupPhotosByHistory (src/utils/taskPhotos.js,
                  shared with ManageTasks.jsx) handles every photo shape this app
                  has ever stored and never drops a photo - anything it can't
                  confidently place shows up in "Other photos" below instead. */}
              {(() => {
                const { entries, otherPhotos } = groupPhotosByHistory(detailsModalTask);
                const reversed = entries.slice().reverse();
                const MAX_THUMBS = 3;
                return (
                  <>
                    {reversed.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No history yet.</p>
                    ) : reversed.map((h, i) => (
                      <div key={i} className="text-xs border-l-2 border-border pl-3 pb-1">
                        <div className="font-bold text-foreground">{h.action} <span className="text-muted-foreground font-normal">— {h.performedBy?.name || 'System'}</span></div>
                        {h.remarks && <div className="text-muted-foreground mt-0.5">{h.remarks}</div>}
                        <div className="text-[10px] text-slate-400 mt-0.5">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</div>
                        {h.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {h.photos.slice(0, MAX_THUMBS).map((f, fi) => (
                              <TaskPhotoThumb
                                key={fi}
                                file={f}
                                className="w-16 h-16"
                                onClick={() => openGallery(h.photos, fi, detailsModalTask)}
                              />
                            ))}
                            {h.photos.length > MAX_THUMBS && (
                              <button
                                type="button"
                                onClick={() => openGallery(h.photos, MAX_THUMBS, detailsModalTask)}
                                className="w-16 h-16 rounded-xl border border-border bg-background hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center text-[10px] font-black uppercase tracking-tight transition-all"
                              >
                                +{h.photos.length - MAX_THUMBS} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {otherPhotos.length > 0 && (
                      <div className="text-xs border-l-2 border-dashed border-amber-400/50 pl-3 pb-1">
                        <div className="font-bold text-amber-600 dark:text-amber-400">Other photos</div>
                        <div className="text-muted-foreground mt-0.5">Couldn't confidently match these to a specific step, so they're still shown here rather than hidden.</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {otherPhotos.slice(0, MAX_THUMBS).map((f, fi) => (
                            <TaskPhotoThumb
                              key={fi}
                              file={f}
                              className="w-16 h-16"
                              onClick={() => openGallery(otherPhotos, fi, detailsModalTask)}
                            />
                          ))}
                          {otherPhotos.length > MAX_THUMBS && (
                            <button
                              type="button"
                              onClick={() => openGallery(otherPhotos, MAX_THUMBS, detailsModalTask)}
                              className="w-16 h-16 rounded-xl border border-border bg-background hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center text-[10px] font-black uppercase tracking-tight transition-all"
                            >
                              +{otherPhotos.length - MAX_THUMBS} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <ImageLightbox photos={gallery?.photos} startIndex={gallery?.startIndex} task={gallery?.task} onClose={() => setGallery(null)} />

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