import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosConfig';
import {
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCcw,
  User,
  History,
  Layers,
  Repeat,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  X,
  Maximize2,
  Paperclip,
  ShieldCheck,
  ClipboardList as LucideClipboard,
  Search,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Plus,
  Edit3,
  ChevronDown,
  Camera,
  Upload,
  Lock
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel';
import CreateTask from './CreateTask';
import { useChat } from '../components/useChat';
import { isViewerOnly } from '../utils/viewerMode';
import { dialog } from '../components/Dialog';
import ImageLightbox from '../components/ImageLightbox';
import TaskPhotoThumb from '../components/TaskPhotoThumb';
import { groupPhotosByHistory, allTaskPhotos } from '../utils/taskPhotos';

const ManageTasks = ({ assignerId, tenantId }) => {
  const { openTaskThread } = useChat();
  const navigate = useNavigate();
  const openTaskChat = useCallback(async (opts) => {
    const conv = await openTaskThread(opts);
    if (conv?._id) navigate(`/dashboard/chat?conv=${conv._id}`);
  }, [openTaskThread, navigate]);
  const isViewer = isViewerOnly();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [timeFilter, setTimeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // Status dropdown filter
  const [nameFilter, setNameFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revisionModalTask, setRevisionModalTask] = useState(null);

  // Reject-with-evidence modal state: rejecting (sending back for
  // correction) can now carry remarks AND photo(s) from storage or the
  // live camera, same as the doer's own "mark done" flow, instead of a
  // text-only prompt.
  const [rejectModalTask, setRejectModalTask] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejectFiles, setRejectFiles] = useState([]);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // History/files details modal: shared by the assigner and the doer side
  // (TaskCard.jsx below has its own copy) so either side can see every
  // uploaded photo and the full audit trail of who did what, when.
  const [detailsModalTask, setDetailsModalTask] = useState(null);
  // Full-screen zoomable photo GALLERY - shared by the History & Files
  // modal and the row-level "has photos" thumbnail, so every photo opens
  // the same popup, pre-loaded with ALL of that set's photos (not just the
  // one that was clicked) plus prev/next, a counter, and who/when/stage.
  const [gallery, setGallery] = useState(null); // { photos, startIndex, task } | null
  const openGallery = (photos, startIndex, task) => setGallery({ photos, startIndex, task });

  // Edit task state
  const [editingTask, setEditingTask] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    doerId: '',
    deadline: '',
    priority: 'Medium'
  });

  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const myRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
  const idOf = (v) => String((v && v._id) || v || '');
  // Someone who only passed the task on (not the original assigner, not an Admin) can follow
  // and verify it, but only the original assigner or an Admin may edit or delete it.
  const passedOnOnly = (t) =>
    !myRoles.includes('Admin') &&
    idOf(t.assignerId) !== String(currentAssignerId) &&
    (t.forwardChain || []).some(c => idOf(c.employeeId) === String(currentAssignerId));
  const chainText = (t) =>
    [t.assignerId?.name, ...(t.forwardChain || []).map(c => c.employeeId?.name), t.doerId?.name].filter(Boolean).join(' → ');

  // ── Apply time filter, status filter AND name filter ─────────────────────
  const applyFilters = useCallback((range, status, name, allTasks = tasks) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const q = (name || '').toLowerCase().trim();

    const filtered = allTasks.filter(task => {
      // Time filter
      if (task.deadline && range !== 'All') {
        const deadline = new Date(task.deadline);
        deadline.setHours(0, 0, 0, 0);
        if (range === 'Today' && deadline.getTime() !== now.getTime()) return false;
        if (range === 'Next 7 Days') {
          const nextWeek = new Date(now);
          nextWeek.setDate(now.getDate() + 7);
          if (!(deadline >= now && deadline <= nextWeek)) return false;
        }
        if (range === 'Pending Work' && !(deadline.getTime() < now.getTime() && task.status !== 'Verified' && task.status !== 'Completed')) return false;
      }

      // Status filter dropdown
      if (status !== 'All') {
        if ((task.status || '').toLowerCase() !== status.toLowerCase()) return false;
      }

      // Name filter — matches task title OR assigned person name
      if (q) {
        const titleMatch = (task.title || '').toLowerCase().includes(q);
        const doerMatch = (task.doerId?.name || '').toLowerCase().includes(q);
        if (!titleMatch && !doerMatch) return false;
      }
      return true;
    });

    setFilteredTasks(filtered);
  }, [tasks]);

  const fetchData = useCallback(async () => {
    if (!currentAssignerId || !currentTenantId) return;
    try {
      setLoading(true);
      const isEmployee = user?.role === 'employee';
      const taskEndpoint = isEmployee
        ? `/tasks/doer/${currentAssignerId}`
        : `/tasks/assigner/${currentAssignerId}`;

      const [taskRes, empRes] = await Promise.all([
        API.get(taskEndpoint).catch(() => ({ data: [] })),
        !isEmployee
          ? API.get(`/tasks/employees/${currentTenantId}`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);

      const rawTaskData = Array.isArray(taskRes.data)
        ? taskRes.data
        : (taskRes.data?.tasks || taskRes.data?.data || []);
      const employeeData = Array.isArray(empRes.data)
        ? empRes.data
        : (empRes.data?.employees || empRes.data?.data || []);

      const sorted = rawTaskData
        .map(t => ({ ...t, taskType: 'Delegation' }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setTasks(sorted);
      setEmployees(employeeData);
      setFilteredTasks(sorted);
      setTimeFilter('All');
      setStatusFilter('All');
      setNameFilter('');
    } catch (err) {
      console.error("Fetch error:", err);
      setTasks([]); setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId, currentTenantId, user?.role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-apply filters whenever filters change
  useEffect(() => {
    applyFilters(timeFilter, statusFilter, nameFilter);
  }, [timeFilter, statusFilter, nameFilter, applyFilters]);

  const handleVerifyTask = async (taskId, isSatisfied) => {
    if (isSatisfied) {
      const yes = await dialog.confirm('Mark this task as verified? This confirms the work was done to your satisfaction.', { title: 'Verify task', confirmText: 'Verify' });
      if (!yes) return;
      try {
        await API.put('/tasks/respond', { taskId, status: 'Verified', remarks: 'Directive evidence verified.', doerId: currentAssignerId });
        fetchData();
        dialog.alert('The task is verified.', { tone: 'success' });
      } catch (err) { dialog.alert(err.response?.data?.message || 'The status could not be updated.', { tone: 'error' }); }
      return;
    }
    // Rejecting ("send back for correction") now opens a modal instead of a
    // text-only prompt, so the assigner can also attach photo(s) - from
    // storage or the live camera - explaining what's wrong, same as the
    // doer's own evidence on completion.
    setRejectModalTask({ _id: taskId });
    setRejectRemarks('');
    setRejectFiles([]);
  };

  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!rejectModalTask || !rejectRemarks.trim()) return;
    setRejectSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('taskId', rejectModalTask._id);
      formData.append('status', 'Accepted'); // this app's existing "sent back for correction" status
      formData.append('remarks', rejectRemarks.trim());
      formData.append('doerId', currentAssignerId);
      rejectFiles.forEach((f) => formData.append('evidence', f));
      await API.put('/tasks/respond', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRejectModalTask(null);
      fetchData();
      dialog.alert('The task was sent back to the doer.', { tone: 'success' });
    } catch (err) {
      dialog.alert(err.response?.data?.message || 'The status could not be updated.', { tone: 'error' });
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleCancelTask = async (taskId, title) => {
    const yes = await dialog.confirm('Delete "' + (title || 'this task') + '"? This cannot be undone.', { title: 'Delete task', danger: true, confirmText: 'Delete' });
    if (!yes) return;
    try { await API.delete('/tasks/' + taskId); fetchData(); }
    catch (err) { dialog.alert(err.response?.data?.message || 'The task could not be deleted.', { tone: 'error' }); }
  };

  // Converts an ISO deadline to the local "YYYY-MM-DDTHH:mm" the
  // datetime-local input needs, preserving whatever time is already
  // stored (a brand-new task defaults to 23:59 at creation; editing an
  // older task just shows its real stored time, whatever that is).
  const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title || '',
      description: task.description || '',
      doerId: task.doerId?._id || task.doerId || '',
      deadline: toDatetimeLocal(task.deadline),
      priority: task.priority || 'Medium'
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await API.put(`/tasks/${editingTask._id}`, editFormData);
      setIsEditOpen(false);
      setEditingTask(null);
      fetchData();
      dialog.alert("The task was updated.", { tone: 'success' });
    } catch (err) {
      console.error("Update error:", err);
      dialog.alert(err.response?.data?.message || "The task could not be updated. Please try again.", { tone: 'error' });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={48} />
      <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Loading...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1700px] mx-auto animate-in fade-in duration-700 selection:bg-primary/30 px-6">

      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 bg-red-600 hover:bg-red-500 p-4 rounded-full text-white shadow-2xl transition-all active:scale-90 z-20 cursor-pointer" onClick={() => setPreviewImage(null)}><X size={28} /></button>
          <img src={previewImage} alt="Mission Evidence" className="max-w-full max-h-[90vh] rounded-[2rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <LucideClipboard size={20} className="text-primary shrink-0" />
          <h2 className="text-foreground text-xl font-black tracking-tight uppercase leading-none truncate">Work Monitor</h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={fetchData} className="group flex-1 md:flex-none bg-card hover:bg-background border border-border px-4 py-2 rounded-xl text-foreground font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
            <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
          </button>
          {!isViewer && (
            <button onClick={() => setIsCreateOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all">
              <Plus size={14} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* ── FILTERS ROW — time filters + status dropdown + name search ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3 items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          {['All', 'Today', 'Next 7 Days', 'Pending Work'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeFilter(range)}
              className={'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ' + (timeFilter === range ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-card text-slate-500 border-border hover:border-slate-400')}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="All">Status: All</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Revision Requested">Revision</option>
            <option value="Completed">Completed</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px] sm:max-w-xs ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by name or title…"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {nameFilter && (
            <button aria-label="Clear search" onClick={() => setNameFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      {(nameFilter || timeFilter !== 'All' || statusFilter !== 'All') && (
        <p className="text-[10px] text-muted-foreground mb-4 font-medium">
          Showing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          {nameFilter && <> matching <span className="text-foreground font-semibold">"{nameFilter}"</span></>}
        </p>
      )}

      {/* TASK TABLE */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-h-[550px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar w-full scrollbar-thin">
          <div className="w-[1050px] sm:w-full">
            {/* HEADER */}
            <div className="grid grid-cols-[60px_1.5fr_1.5fr_2fr_1fr_1fr_160px] px-6 py-4 bg-card backdrop-blur-xl border-b border-border font-black text-slate-400 text-[10px] lg:text-[11px] uppercase tracking-[0.2em] items-center sticky top-0 z-20">
              <div>S no.</div>
              <div>Task Name</div>
              <div>Assigned To</div>
              <div>Description</div>
              <div>Deadline</div>
              <div>Status</div>
              <div className="text-right pr-4">Action</div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search size={32} className="text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No tasks found</p>
                {nameFilter && <p className="text-xs text-muted-foreground mt-1">Try a different name or clear the filter</p>}
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const isRevision = task.status === 'Revision Requested';

                return (
                  <div key={task._id} className="border-b border-border/50 last:border-0">
                    <div
                      className={`grid grid-cols-[60px_1.5fr_1.5fr_2fr_1fr_1fr_160px] items-center px-6 py-4 transition-all hover:bg-muted/30 min-w-0
                        ${isRevision ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}`}
                    >
                      <div className="text-xs font-black text-slate-400">
                        {index + 1}
                      </div>
                      <div className="min-w-0 pr-2">
                        <span className="font-black text-sm whitespace-normal break-words block">{task.title}</span>
                        {(task.files || []).length > 0 && (() => {
                          // So anyone looking at the list — not just whoever opens
                          // History & files — can see at a glance that a photo was
                          // sent, by whom and at which stage. Click opens the FULL
                          // gallery of every photo on this task (not just this one),
                          // starting on the most recent, with prev/next + zoom.
                          const photos = allTaskPhotos(task);
                          const latest = photos[photos.length - 1];
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openGallery(photos, photos.length - 1, task); }}
                              className="mt-1.5 flex items-center gap-1.5 group/thumb"
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
                      <div className="text-xs font-bold min-w-0 pr-2">
                        <span className="truncate block">{task.doerId?.name || 'Unassigned'}</span>
                        {(task.forwardChain || []).length > 0 && (
  <span className="block text-[9px] font-semibold text-indigo-500 whitespace-normal break-words mt-1" title="Assignment chain">{chainText(task)}</span>
)}
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-xs whitespace-normal break-words opacity-70 uppercase font-semibold">
                          {task.description || "No description provided."}
                        </p>
                      </div>
                      <div className="text-xs font-bold min-w-0">
                        {task.deadline ? (
                          <>
                            {new Date(task.deadline).toLocaleDateString()}{' '}
                            <span className="text-muted-foreground font-semibold">
                              {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : 'AWAITING'}
                        {task.originalDeadline && (
                          <span className="block text-[9px] font-black uppercase text-amber-600 mt-1" title="The doer revised the deadline within the allowed days">
                            Revised &middot; was {new Date(task.originalDeadline).toLocaleDateString()} (+{Math.round((new Date(task.deadline) - new Date(task.originalDeadline)) / 86400000)}d)
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] px-2 py-1 rounded bg-sky-500/10 font-semibold">{task.status}</span>
                      </div>
                      <div className="flex gap-1.5 justify-end items-center min-w-0">
                        {!isViewer && !passedOnOnly(task) && !['Completed', 'Verified'].includes(task.status) && (
                          // Once the doer has marked the task done (Completed) or it's been
                          // Verified, the assigner can no longer edit it - the button is
                          // removed entirely rather than shown disabled.
<button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }}
                          title="Edit Task"
                          className="p-2 rounded-xl border transition-all active:scale-90 bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white">
                          <Edit3 size={14} />
                        </button>
                        )}
                        {!isViewer && task.status === 'Revision Requested' && (
                          <button onClick={(e) => { e.stopPropagation(); setRevisionModalTask(task); }}
                            className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all active:scale-90" title="Revision Control">
                            <AlertTriangle size={14} />
                          </button>
                        )}
                        {!isViewer && task.status === 'Completed' && (<>
                          <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, true); }}
                            className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-90" title="Verify Task">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, false); }}
                            className="p-2 bg-red-500/5 text-red-600 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Reject Task">
                            <XCircle size={14} />
                          </button>
                        </>)}
                        {!isViewer && (
<button onClick={(e) => {
                          e.stopPropagation();
                          openTaskChat({
                            taskId: task._id,
                            taskType: 'delegation',
                            taskTitle: task.title || task.taskTitle || 'Task',
                            // Bug fix: task.assignerId is a populated object here
                            // ({_id, name, ...}), not a plain id - pushing it
                            // straight into participants silently corrupted the
                            // thread's participant list. Always resolve to the id.
                            participants: [task.doerId?._id || task.doerId, task.assignerId?._id || task.assignerId].filter(Boolean),
                          });
                        }}
                          className="flex items-center gap-1 text-[11px] px-2 py-2 rounded-xl border border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-all font-bold" title="Comments">
                          💬
                        </button>
)}
                        <button onClick={(e) => { e.stopPropagation(); setDetailsModalTask(task); }}
                          className="p-2 bg-background border border-border text-slate-400 hover:border-violet-400 hover:text-violet-500 rounded-xl transition-all active:scale-90" title="History & files">
                          <History size={14} />
                        </button>
                        {!isViewer && !passedOnOnly(task) && !['Completed', 'Verified'].includes(task.status) && (
                          // Same rule as Edit above: once the doer has marked it done, the
                          // Delete button is removed entirely, not shown disabled.
<button onClick={(e) => { e.stopPropagation(); handleCancelTask(task._id, task.title); }}
                          title="Delete Task"
                          className="p-2 rounded-xl border transition-all active:scale-90 bg-background border-border text-slate-400 hover:bg-red-500/10 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* REJECT (SEND BACK) MODAL — remarks + photo evidence, from storage or live camera */}
      {rejectModalTask && (
        <div className="fixed inset-0 z-[9995] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReject} className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-black text-sm uppercase tracking-widest text-red-600">Send Back For Correction</h3>
              <button type="button" onClick={() => setRejectModalTask(null)} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">What needs to be corrected? *</label>
                <textarea
                  required
                  rows={4}
                  autoFocus
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Describe the corrections needed — the doer will see this."
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Photo evidence (optional)
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary/50 hover:text-primary cursor-pointer transition-all">
                    <Upload size={14} /> From storage
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setRejectFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                    />
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary/50 hover:text-primary cursor-pointer transition-all">
                    <Camera size={14} /> Take photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => setRejectFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                    />
                  </label>
                </div>
                {rejectFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {rejectFiles.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                        <button
                          type="button"
                          onClick={() => setRejectFiles((prev) => prev.filter((_, j) => j !== i))}
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
            </div>
            <div className="p-6 pt-0 flex-shrink-0">
              <button
                type="submit"
                disabled={rejectSubmitting || !rejectRemarks.trim()}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all"
              >
                {rejectSubmitting ? 'Sending…' : 'Send back to doer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORY & FILES MODAL — every uploaded photo and the full audit
          trail, visible to both the assigner and the doer (same data, same
          component used from TaskCard.jsx on the doer's side). */}
      {detailsModalTask && (
        <div className="fixed inset-0 z-[9994] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-black text-sm uppercase tracking-widest">History & Files</h3>
              <button onClick={() => setDetailsModalTask(null)} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Each history entry shows its OWN photos inline, right next to who
                  did it and when - instead of a disconnected gallery the viewer
                  had to match up by eye. groupPhotosByHistory (src/utils/taskPhotos.js)
                  handles every photo shape this app has ever stored: entries with
                  their own files[], older flat files tagged with stage/uploadedBy,
                  and fully legacy files with neither (matched to the nearest
                  history timestamp). Nothing is ever dropped - anything that
                  can't be confidently placed shows up in "Other photos" below. */}
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

      {revisionModalTask && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="font-black text-sm uppercase tracking-widest">Revision Control Panel</h3>
              <button onClick={() => setRevisionModalTask(null)} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><X size={18} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <RevisionPanel
                task={revisionModalTask}
                employees={employees}
                assignerId={currentAssignerId}
                onSuccess={() => { setRevisionModalTask(null); fetchData(); }}
                source="manage"
              />
            </div>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Edit3 size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">Edit Task</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">Update task parameters & details</p>
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors group">
                <X size={15} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Assigned To</label>
                  <select
                    value={editFormData.doerId}
                    onChange={e => setEditFormData({ ...editFormData, doerId: e.target.value })}
                    className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={editFormData.deadline}
                    onChange={e => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Priority</label>
                <select
                  value={editFormData.priority}
                  onChange={e => setEditFormData({ ...editFormData, priority: e.target.value })}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-black text-[11px] uppercase tracking-wider hover:bg-background transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-wider shadow-lg shadow-primary/25 hover:opacity-90 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      ` }} />

      {isCreateOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Plus size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">New Delegation Task</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">Create & assign work</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors group">
                <X size={15} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <CreateTask
                hideHeader
                tenantId={tenantId}
                assignerId={assignerId}
                onSuccess={() => { setIsCreateOpen(false); fetchData(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTasks;