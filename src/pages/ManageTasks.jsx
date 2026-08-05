import React, { useEffect, useState, useCallback } from 'react';
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
  ChevronDown
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel';
import CreateTask from './CreateTask';
import { useChat } from '../components/useChat';

const ManageTasks = ({ assignerId, tenantId }) => {
  const { openTaskThread } = useChat();
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

  // Edit task state
  const [editingTask, setEditingTask] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    doerId: '',
    deadline: '',
    priority: 'medium'
  });

  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

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
          ? API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
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
    const status = isSatisfied ? 'Verified' : 'Accepted';
    const remarks = !isSatisfied ? prompt("Tactical Feedback: Identify required corrections:") : "Directive evidence verified.";
    if (!isSatisfied && !remarks) return;
    try {
      await API.put('/tasks/respond', { taskId, status, remarks, doerId: currentAssignerId });
      alert(isSatisfied ? "Handshake Complete: Mission Verified." : "Correction Issued: Returning to Node.");
      fetchData();
    } catch { alert("Protocol Error: Status update failed."); }
  };

  const handleCancelTask = async (taskId) => {
    if (window.confirm("PERMANENT TERMINATION: Purge this mission node from the registry?")) {
      try { await API.delete(`/tasks/${taskId}`); fetchData(); }
      catch { alert("Action failed."); }
    }
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title || '',
      description: task.description || '',
      doerId: task.doerId?._id || task.doerId || '',
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      priority: task.priority || 'medium'
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await API.put(`/tasks/${editingTask._id}`, editFormData);
      alert("Success: Task updated successfully.");
      setIsEditOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error("Update error:", err);
      alert(err.response?.data?.message || "Failed to update task.");
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-8">
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <LucideClipboard size={32} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">Work Monitor</h2>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={fetchData} className="group flex-1 md:flex-none bg-card hover:bg-background border border-border px-6 py-3 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all">
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* ── FILTERS ROW — time filters + status dropdown + name search ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
        {/* Time filter buttons */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Today', 'Next 7 Days', 'Pending Work'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeFilter(range)}
              className={`px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-sm ${timeFilter === range
                ? 'bg-primary text-white border-primary shadow-primary/20'
                : 'bg-card text-slate-500 border-border hover:border-slate-400'
                }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Status Dropdown Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer shadow-sm"
          >
            <option value="All">Status: All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Verified">Verified</option>
          </select>
        </div>

        {/* Name / title search */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by name or title…"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {nameFilter && (
            <button onClick={() => setNameFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
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
              <div>#</div>
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
                      </div>
                      <div className="text-xs font-bold min-w-0 pr-2">
                        <span className="truncate block">{task.doerId?.name || 'Unassigned'}</span>
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-xs whitespace-normal break-words opacity-70 uppercase font-semibold">
                          {task.description || "No description provided."}
                        </p>
                      </div>
                      <div className="text-xs font-bold min-w-0">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'AWAITING'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] px-2 py-1 rounded bg-sky-500/10 font-semibold">{task.status}</span>
                      </div>
                      <div className="flex gap-1.5 justify-end items-center min-w-0">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }}
                          className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all active:scale-90" title="Edit Task">
                          <Edit3 size={14} />
                        </button>
                        {task.status === 'Revision Requested' && (
                          <button onClick={(e) => { e.stopPropagation(); setRevisionModalTask(task); }}
                            className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all active:scale-90" title="Revision Control">
                            <AlertTriangle size={14} />
                          </button>
                        )}
                        {task.status === 'Completed' && (<>
                          <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, true); }}
                            className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-90" title="Verify Task">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, false); }}
                            className="p-2 bg-red-500/5 text-red-600 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Reject Task">
                            <XCircle size={14} />
                          </button>
                        </>)}
                        <button onClick={(e) => {
                          e.stopPropagation();
                          openTaskThread({
                            taskId: task._id,
                            taskType: 'delegation',
                            taskTitle: task.title || task.taskTitle || 'Task',
                            participants: [task.doerId?._id, task.assignerId].filter(Boolean),
                          });
                        }}
                          className="flex items-center gap-1 text-[11px] px-2 py-2 rounded-xl border border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-all font-bold" title="Comments">
                          💬
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleCancelTask(task._id); }}
                          className="p-2 bg-background border border-border text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-90" title="Delete Task">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

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
                    type="date"
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
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
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