import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import {
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCcw,
  Tag,
  Paperclip,
  History,
  Building2,
  Repeat
} from 'lucide-react';
import TaskPhotoThumb from './TaskPhotoThumb';
import ImageLightbox from './ImageLightbox';
import { fmtIST } from '../utils/istTime';
import { getPctStyle } from '../utils/reviewScore';

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TaskDetailsModal = ({ taskId, taskType = 'Delegation', instanceDate, fallbackRow, dynamicColors, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lightboxPhotos, setLightboxPhotos] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      if (!taskId) return;
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({ type: taskType });
        if (instanceDate) queryParams.set('instanceDate', new Date(instanceDate).toISOString());
        const res = await API.get(`/tasks/detailed-view/${taskId}?${queryParams.toString()}`);
        if (isMounted && res.data) {
          setData(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Detailed view endpoint 404s or fails (e.g. if not yet deployed on remote API or model lookup)
        console.warn('Detailed view endpoint returned error, using fallback resolution:', err.message);
      }

      // ─── GRACEFUL FALLBACK RESOLUTION ───────────────────────────────────────
      try {
        const currentTenantId = localStorage.getItem('tenantId');
        const isChk = (taskType || '').toLowerCase() === 'checklist';
        const isDel = !isChk && (taskType || '').toLowerCase() !== 'fms';

        if (isChk) {
          // Look up from existing checklist routes
          let foundTask = null;
          try {
            const chkRes = await API.get(`/tasks/checklist-all/${currentTenantId}`);
            const list = Array.isArray(chkRes.data) ? chkRes.data : (chkRes.data?.data || []);
            foundTask = list.find(t => String(t._id) === String(taskId));
          } catch (e) { /* ignore */ }

          if (foundTask && isMounted) {
            const history = foundTask.history || [];
            const completedEntries = history.filter(h => h && (h.action === 'Completed' || h.action === 'Administrative Completion'));
            const targetDate = instanceDate ? new Date(instanceDate) : null;
            let matchedDone = null;
            if (targetDate && !isNaN(targetDate.getTime())) {
              const targetStr = targetDate.toDateString();
              matchedDone = completedEntries.find(h => {
                const d = new Date(h.instanceDate || h.timestamp);
                return d.toDateString() === targetStr;
              });
            }
            const latestDone = matchedDone || (completedEntries.length ? completedEntries[completedEntries.length - 1] : null);

            setData({
              type: 'Checklist',
              _id: foundTask._id,
              title: foundTask.taskName || foundTask.title || fallbackRow?.name || 'Checklist Directive',
              description: foundTask.description || fallbackRow?.remarks || '',
              frequency: foundTask.frequency || 'Daily',
              frequencyConfig: foundTask.frequencyConfig || {},
              status: fallbackRow?.status || foundTask.status || 'Active',
              startDate: foundTask.startDate,
              nextDueDate: foundTask.nextDueDate || fallbackRow?.deadline,
              lastCompleted: foundTask.lastCompleted || fallbackRow?.completedAt,
              createdAt: foundTask.createdAt,
              department: foundTask.doerId?.department || fallbackRow?.department || '',
              assigner: foundTask.createdBy ? {
                name: foundTask.createdBy.name,
                email: foundTask.createdBy.email
              } : (foundTask.assignerId ? {
                name: foundTask.assignerId.name
              } : { name: fallbackRow?.assignedBy || 'Admin' }),
              doer: foundTask.doerId ? {
                name: foundTask.doerId.name,
                email: foundTask.doerId.email,
                department: foundTask.doerId.department
              } : { name: fallbackRow?.assignedTo || 'Assigned Staff' },
              customFields: foundTask.customFields || {},
              files: [],
              subTasks: [],
              completion: latestDone ? {
                completedAt: latestDone.timestamp,
                completedBy: foundTask.doerId?.name || fallbackRow?.assignedTo || 'Doer',
                remarks: latestDone.remarks || fallbackRow?.remarks || 'Directive Completed',
                files: latestDone.attachmentUrl ? [{ fileName: 'Evidence', fileUrl: latestDone.attachmentUrl }] : []
              } : (fallbackRow?.completedAt ? {
                completedAt: fallbackRow.completedAt,
                completedBy: fallbackRow.assignedTo || 'Doer',
                remarks: fallbackRow.remarks || 'Completed'
              } : null),
              verification: null,
              rejections: [],
              history: history.map(h => ({
                action: h.action,
                timestamp: h.timestamp,
                instanceDate: h.instanceDate,
                performedBy: foundTask.doerId?.name || 'Staff',
                remarks: h.remarks || '',
                files: h.attachmentUrl ? [{ fileName: 'Evidence', fileUrl: h.attachmentUrl }] : []
              }))
            });
            setLoading(false);
            return;
          }
        } else if (isDel) {
          try {
            const delRes = await API.get(`/tasks/${taskId}`);
            if (delRes.data && isMounted) {
              const dt = delRes.data;
              setData({
                type: 'Delegation',
                _id: dt._id,
                title: dt.title || fallbackRow?.name || 'Delegation Task',
                description: dt.description || '',
                priority: dt.priority || 'Medium',
                status: dt.status || fallbackRow?.status || 'Pending',
                deadline: dt.deadline || fallbackRow?.deadline,
                originalDeadline: dt.originalDeadline,
                createdAt: dt.createdAt,
                assigner: dt.assignerId ? { name: dt.assignerId.name } : { name: fallbackRow?.assignedBy || 'Assigner' },
                doer: dt.doerId ? { name: dt.doerId.name } : { name: fallbackRow?.assignedTo || 'Doer' },
                followers: dt.followers || [],
                files: dt.files || [],
                subTasks: [],
                completion: fallbackRow?.completedAt ? {
                  completedAt: fallbackRow.completedAt,
                  completedBy: fallbackRow.assignedTo || 'Doer',
                  remarks: fallbackRow.remarks || 'Completed'
                } : null,
                history: dt.history || []
              });
              setLoading(false);
              return;
            }
          } catch (e) { /* ignore */ }
        }
      } catch (fallbackErr) {
        console.warn('Fallback fetch failed:', fallbackErr);
      }

      // ─── FINAL CLIENT FALLBACK: Render clean details using Global View row data ─
      if (fallbackRow && isMounted) {
        setData({
          type: fallbackRow.type || taskType || 'Task',
          _id: taskId,
          title: fallbackRow.name || fallbackRow.title || 'Task Details',
          description: fallbackRow.description || fallbackRow.remarks || 'Task record from Company Review sheet.',
          status: fallbackRow.status || 'Active',
          deadline: fallbackRow.deadline,
          completedAt: fallbackRow.completedAt,
          assigner: { name: fallbackRow.assignedBy || 'Admin' },
          doer: { name: fallbackRow.assignedTo || 'Assigned Staff' },
          completion: fallbackRow.completedAt ? {
            completedAt: fallbackRow.completedAt,
            completedBy: fallbackRow.assignedTo || 'Doer',
            remarks: fallbackRow.remarks || 'Completed'
          } : null,
          history: fallbackRow.completedAt ? [{
            action: 'Completed',
            timestamp: fallbackRow.completedAt,
            performedBy: fallbackRow.assignedTo || 'Doer',
            remarks: fallbackRow.remarks || ''
          }] : [],
          files: [],
          subTasks: []
        });
        setError(null);
      } else if (isMounted) {
        setError('Task details could not be loaded.');
      }

      if (isMounted) setLoading(false);
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [taskId, taskType, instanceDate, fallbackRow]);

  const task = data || fallbackRow || {};
  const isChecklist = (taskType || '').toLowerCase() === 'checklist';
  const isFms = (taskType || '').toLowerCase() === 'fms';
  const isDelegation = !isChecklist && !isFms;

  // Subtasks info
  const subTasks = data?.subTasks || [];
  const completedSubTasks = subTasks.filter(st => st.isCompleted || ['Completed', 'Verified'].includes(st.status));
  const subTaskProgressPct = subTasks.length > 0 ? Math.round((completedSubTasks.length / subTasks.length) * 100) : null;

  // Status Tone
  const rawStatus = (task.status || '').toUpperCase();
  const isCompleted = ['COMPLETED', 'VERIFIED'].includes(rawStatus);
  const isRevision = ['REVISION REQUESTED', 'SENT BACK'].includes(rawStatus);
  const isOverdue = rawStatus === 'OVERDUE' || (task.deadline && !isCompleted && new Date(task.deadline) < new Date());

  const statusBadge = (() => {
    if (isCompleted) {
      return {
        label: task.status === 'Verified' ? 'VERIFIED' : 'COMPLETED',
        cls: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-500/20',
        icon: CheckCircle
      };
    }
    if (isRevision) {
      return {
        label: task.status || 'REVISION REQUESTED',
        cls: 'bg-rose-500/10 text-rose-600 border border-rose-500/30 dark:bg-rose-500/20',
        icon: AlertTriangle
      };
    }
    if (isOverdue) {
      return {
        label: 'OVERDUE',
        cls: 'bg-red-500/10 text-red-600 border border-red-500/30 dark:bg-red-500/20 font-black',
        icon: AlertTriangle
      };
    }
    return {
      label: task.status || 'PENDING',
      cls: 'bg-sky-500/10 text-sky-600 border border-sky-500/30 dark:bg-sky-500/20',
      icon: Clock
    };
  })();

  const StatusIcon = statusBadge.icon;

  // Priority Tone
  const priority = task.priority || 'Medium';
  const priorityCls = {
    Urgent: 'bg-red-500/10 text-red-600 border border-red-500/20',
    High: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
    Medium: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    Low: 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
  }[priority] || 'bg-slate-500/10 text-slate-600 border border-slate-500/20';

  // Stepper Calculation
  const isCreated = true;
  const isInProgress = !isCompleted;
  const isSubmitted = isCompleted || !!data?.completion;
  const isVerified = (task.status || '').toLowerCase() === 'verified' || !!data?.verification;

  // Evidence Photos Collection
  const allEvidencePhotos = [];
  if (data?.completion?.files && Array.isArray(data.completion.files)) {
    data.completion.files.forEach(f => {
      if (f?.fileUrl) allEvidencePhotos.push({ ...f, stage: 'Completion Evidence', uploadedBy: { name: data.completion.completedBy } });
    });
  }
  if (data?.files && Array.isArray(data.files)) {
    data.files.forEach(f => {
      if (f?.fileUrl && !allEvidencePhotos.some(x => x.fileUrl === f.fileUrl)) {
        allEvidencePhotos.push(f);
      }
    });
  }
  if (data?.history && Array.isArray(data.history)) {
    data.history.forEach(h => {
      (h.files || []).forEach(f => {
        if (f?.fileUrl && !allEvidencePhotos.some(x => x.fileUrl === f.fileUrl)) {
          allEvidencePhotos.push({ ...f, stage: h.action, uploadedAt: h.timestamp, uploadedBy: { name: h.performedBy } });
        }
      });
    });
  }

  const openGallery = (photos, idx) => {
    setLightboxPhotos(photos);
    setLightboxIndex(idx);
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="no-auto-sheet relative w-full max-w-4xl h-full sm:h-auto max-h-full sm:max-h-[92vh] bg-card border-0 sm:border border-border rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* HEADER BAR */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                isDelegation ? 'bg-purple-600 text-white' : isChecklist ? 'bg-sky-600 text-white' : 'bg-orange-500 text-white'
              }`}>
                {taskType}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${statusBadge.cls}`}>
                <StatusIcon size={11} /> {statusBadge.label}
              </span>
              {isDelegation && (
                <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${priorityCls}`}>
                  {priority} Priority
                </span>
              )}
              {isChecklist && data?.frequency && (
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-700 border border-sky-500/20 inline-flex items-center gap-1">
                  <Repeat size={10} /> {data.frequency}
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-black text-foreground uppercase tracking-tight leading-snug line-clamp-2">
              {task.title || task.name || 'Task Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border bg-background hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* PROGRESS STEPPER & KPI BAR */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-border bg-background/60 flex flex-col gap-2.5 flex-shrink-0">
          {/* Visual 4-Step Stepper with connecting line */}
          <div className="relative">
            <div className="absolute top-2.5 sm:top-3 left-[12%] right-[12%] h-0.5 bg-border -z-0" />
            <div className="grid grid-cols-4 gap-1 sm:gap-2 items-center text-center relative z-10">
              {/* Step 1: Created */}
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black mb-1 transition-all ${
                  isCreated ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-background' : 'bg-muted text-slate-400 ring-2 ring-background'
                }`}>
                  ✓
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider text-foreground truncate max-w-full">Created</span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate max-w-full">{fmtDate(task.createdAt)}</span>
              </div>

              {/* Step 2: In Progress / Active */}
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black mb-1 transition-all ${
                  isSubmitted ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-background' : 'bg-primary text-white ring-2 ring-primary/30 animate-pulse'
                }`}>
                  {isSubmitted ? '✓' : '2'}
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider text-foreground truncate max-w-full">In Progress</span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate max-w-full">Due {fmtDate(task.deadline || task.nextDueDate)}</span>
              </div>

              {/* Step 3: Submitted / Done */}
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black mb-1 transition-all ${
                  isSubmitted ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-background' : 'bg-muted text-slate-400 ring-2 ring-background'
                }`}>
                  {isSubmitted ? '✓' : '3'}
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider text-foreground truncate max-w-full">Completed</span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate max-w-full">
                  {task.completedAt || data?.completion?.completedAt ? fmtDate(task.completedAt || data?.completion?.completedAt) : 'Pending'}
                </span>
              </div>

              {/* Step 4: Verified / Reviewed */}
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black mb-1 transition-all ${
                  isVerified ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-background' : isRevision ? 'bg-rose-500 text-white ring-2 ring-background' : 'bg-muted text-slate-400 ring-2 ring-background'
                }`}>
                  {isVerified ? '✓' : isRevision ? '!' : '4'}
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider text-foreground truncate max-w-full">
                  {isRevision ? 'Revision' : 'Verified'}
                </span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate max-w-full">
                  {isVerified ? 'Approved' : isRevision ? 'Sent Back' : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Subtask Completion Bar (if any subtasks exist) */}
          {subTasks.length > 0 && (
            <div className="bg-muted/40 p-2 sm:p-2.5 rounded-xl border border-border flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers size={13} className="text-primary shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-foreground truncate">
                  Subtask Progress: {completedSubTasks.length} of {subTasks.length}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-[120px] sm:max-w-xs shrink-0">
                <div className="w-full bg-border rounded-full h-1.5 sm:h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${subTaskProgressPct || 0}%` }}
                  />
                </div>
                <span className="text-[9.5px] sm:text-[10px] font-black tabular-nums text-foreground">{subTaskProgressPct}%</span>
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="w-full min-w-0 flex items-center border-b border-border bg-card px-3 sm:px-6 gap-1.5 sm:gap-2.5 overflow-x-auto flex-nowrap flex-shrink-0 scrollbar-none py-2">
          {[
            { id: 'overview', shortLabel: 'Overview', label: 'Overview & Details', icon: FileText },
            { id: 'subtasks', shortLabel: `Subtasks (${subTasks.length})`, label: `Subtasks (${subTasks.length})`, icon: Layers },
            { id: 'evidence', shortLabel: `Evidence (${allEvidencePhotos.length})`, label: `Evidence & Proof (${allEvidencePhotos.length})`, icon: Paperclip },
            { id: 'history', shortLabel: `History (${(data?.history || []).length})`, label: `Activity History (${(data?.history || []).length})`, icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none ${
                  active
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={12} className="shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest">
              <RefreshCcw className="animate-spin text-primary" size={24} />
              Loading task details...
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-center text-xs font-bold">
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
                  {/* Task Description */}
                  <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                      <FileText size={13} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Description / Briefing</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                      {task.description || 'No detailed description provided for this task.'}
                    </p>
                  </div>

                  {/* Assignment Flow & Team */}
                  <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-2.5">
                      <User size={13} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Assignment & Team</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Assigner */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                          A
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase text-foreground truncate">{task.assigner?.name || fallbackRow?.assignedBy || 'Admin'}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Original Assigner</p>
                        </div>
                      </div>

                      {/* Lead Doer */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                          D
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase text-foreground truncate">{task.doer?.name || fallbackRow?.assignedTo || 'Doer'}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{task.doer?.department || task.department || 'Primary Doer'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Forward Chain (if passed on) */}
                    {Array.isArray(data?.forwardChain) && data.forwardChain.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Delegation Chain</span>
                        {data.forwardChain.map((fc, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <ArrowRight size={12} className="text-primary shrink-0" />
                            <span className="font-bold text-foreground">{fc.employee?.name || 'Staff'}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">passed on {fmtDate(fc.forwardedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Followers & Watchers */}
                    {Array.isArray(data?.followers) && data.followers.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-border/60">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Followers</span>
                        <div className="flex flex-wrap gap-1.5">
                          {data.followers.map(f => (
                            <span key={f._id} className="px-2 py-0.5 rounded-lg bg-muted border border-border text-[9.5px] font-bold text-foreground">
                              👤 {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {data?.coordinator && (
                      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Coordinator</span>
                        <span className="font-bold text-foreground">{data.coordinator.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Dates & Timeline Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="p-3 rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar size={11} className="text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Created</span>
                      </div>
                      <p className="text-xs font-black text-foreground">{fmtDate(task.createdAt)}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Clock size={11} className="text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Deadline</span>
                      </div>
                      <p className="text-xs font-black text-foreground">{fmtDateTime(task.deadline || task.nextDueDate)}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar size={11} className="text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Original Due</span>
                      </div>
                      <p className="text-xs font-black text-foreground">
                        {task.originalDeadline ? fmtDate(task.originalDeadline) : 'Unchanged'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Completed</span>
                      </div>
                      <p className="text-xs font-black text-foreground">
                        {task.completedAt || data?.completion?.completedAt ? fmtDateTime(task.completedAt || data?.completion?.completedAt) : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Custom Fields (if configured) */}
                  {data?.customFields && Object.keys(data.customFields).length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Custom Fields</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(data.customFields).map(([k, v]) => (
                          <div key={k} className="p-2.5 rounded-xl bg-muted/40 border border-border">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{k}</span>
                            <span className="text-xs font-black text-foreground mt-0.5 block">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SUBTASKS */}
              {activeTab === 'subtasks' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Total Subtasks: {subTasks.length}
                    </p>
                    {subTasks.length > 0 && (
                      <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {completedSubTasks.length} Completed
                      </span>
                    )}
                  </div>

                  {subTasks.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold text-xs bg-muted/20 border border-border rounded-2xl">
                      No subtasks assigned under this parent directive.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {subTasks.map((st, i) => {
                        const done = st.isCompleted || ['Completed', 'Verified'].includes(st.status);
                        return (
                          <div
                            key={st._id || i}
                            className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              done
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-card border-border hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 font-black text-xs ${
                                done ? 'bg-emerald-600 text-white' : 'border border-border text-slate-400'
                              }`}>
                                {done ? '✓' : i + 1}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-black uppercase tracking-tight ${done ? 'line-through text-slate-400' : 'text-foreground'}`}>
                                  {st.title}
                                </p>
                                {st.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{st.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]">
                                  <span className="font-bold text-slate-400">Assignee: {st.doer?.name || 'Unassigned'}</span>
                                  {st.deadline && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-bold text-slate-400">Due: {fmtDate(st.deadline)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              done ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                            }`}>
                              {done ? 'DONE' : st.status || 'PENDING'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EVIDENCE & VERIFICATION */}
              {activeTab === 'evidence' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* DOER SUBMISSION CARD */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Doer Completion & Submission</h4>
                      </div>
                      {data?.completion?.completedAt && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {fmtDateTime(data.completion.completedAt)}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Submitted Remarks</p>
                      <p className="text-xs sm:text-sm text-foreground font-medium bg-muted/40 p-3 rounded-xl border border-border whitespace-pre-wrap">
                        {data?.completion?.remarks || (isCompleted ? 'Marked complete without additional text remarks.' : 'Not submitted yet.')}
                      </p>
                    </div>

                    {data?.completion?.completedBy && (
                      <p className="text-[10px] font-bold text-slate-400">
                        Submitted by: <span className="font-black text-foreground uppercase">{data.completion.completedBy}</span>
                      </p>
                    )}
                  </div>

                  {/* REVIEWER VERIFICATION CARD */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className={isVerified ? 'text-emerald-500' : 'text-slate-400'} />
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Assigner Verification</h4>
                      </div>
                      {data?.verification?.verifiedAt && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {fmtDateTime(data.verification.verifiedAt)}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Verification Status & Feedback</p>
                      <div className={`p-3 rounded-xl border ${
                        isVerified
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : isRevision
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                            : 'bg-muted/30 border-border text-slate-400'
                      }`}>
                        <p className="text-xs font-bold leading-relaxed">
                          {isVerified
                            ? (data?.verification?.remarks || 'Directive verified and confirmed by assigner.')
                            : isRevision
                              ? (data?.rejections?.[0]?.remarks || 'Task sent back with revisions requested.')
                              : 'Awaiting completion before review can be performed.'}
                        </p>
                      </div>
                    </div>

                    {data?.verification?.verifiedBy && (
                      <p className="text-[10px] font-bold text-slate-400">
                        Verified by: <span className="font-black text-foreground uppercase">{data.verification.verifiedBy}</span>
                      </p>
                    )}
                  </div>

                  {/* EVIDENCE FILES GALLERY */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                      <Paperclip size={14} className="text-primary" />
                      Uploaded Documents & Proof Photos ({allEvidencePhotos.length})
                    </p>

                    {allEvidencePhotos.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed border-border rounded-xl">
                        No image proof or files uploaded for this task.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {allEvidencePhotos.map((f, fi) => (
                          <div key={fi} className="flex flex-col items-center">
                            <TaskPhotoThumb
                              file={f}
                              className="w-20 h-20"
                              onClick={() => openGallery(allEvidencePhotos, fi)}
                            />
                            <span className="text-[9px] font-black uppercase text-slate-400 mt-1 max-w-[80px] truncate text-center">
                              {f.stage || f.fileName || 'Proof'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACTIVITY & AUDIT TRAIL */}
              {activeTab === 'history' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Chronological Activity Timeline
                  </p>

                  {(!data?.history || data.history.length === 0) ? (
                    <div className="py-16 text-center text-slate-400 font-bold text-xs bg-muted/20 border border-border rounded-2xl">
                      No activity history logged for this record.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {data.history.map((h, i) => (
                        <div key={i} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm" />
                          <div className="bg-card border border-border rounded-xl p-3.5 flex-1 shadow-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground">
                                {h.action}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {h.timestamp ? fmtIST(h.timestamp) : ''}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-primary mb-1">
                              By: {h.performedBy || 'System'}
                            </p>
                            {h.remarks && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-pre-wrap">
                                {h.remarks}
                              </p>
                            )}
                            {Array.isArray(h.files) && h.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                                {h.files.map((f, fi) => (
                                  <TaskPhotoThumb
                                    key={fi}
                                    file={f}
                                    className="w-14 h-14"
                                    onClick={() => openGallery(h.files, fi)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              WorkPilot Inspector
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
          >
            Close
          </button>
        </div>

      </div>

      {/* FULL-SCREEN IMAGE LIGHTBOX */}
      {lightboxPhotos && (
        <ImageLightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          task={task}
          onClose={() => setLightboxPhotos(null)}
        />
      )}
    </div>
  );
};

export default TaskDetailsModal;

