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
  ChevronDown,
  ChevronUp,
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
  Plus
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel';
import CreateTask from './CreateTask';
import { useChat } from '../components/useChat';

const ManageTasks = ({ assignerId, tenantId }) => {
  const { openTaskThread } = useChat();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [timeFilter, setTimeFilter] = useState('All');
  const [nameFilter, setNameFilter] = useState('');          // ← NEW
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revisionModalTask, setRevisionModalTask] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // ── Apply both time filter AND name filter ───────────────────────────────
  const applyFilters = useCallback((range, name, allTasks = tasks) => {
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
      // Name filter — matches task title OR assigned person name
      if (q) {
        const titleMatch = (task.title || '').toLowerCase().includes(q);
        const doerMatch  = (task.doerId?.name || '').toLowerCase().includes(q);
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
      setNameFilter('');
    } catch (err) {
      console.error("Fetch error:", err);
      setTasks([]); setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId, currentTenantId, user?.role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-apply filters whenever either filter changes
  useEffect(() => {
    applyFilters(timeFilter, nameFilter);
  }, [timeFilter, nameFilter, applyFilters]);

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

  const toggleExpand = (id) => setExpandedTaskId(expandedTaskId === id ? null : id);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={48} />
      <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Loading...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 selection:bg-primary/30">

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
            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Track assigned work and check staff progress.</p>
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

      {/* ── FILTERS ROW — time filters + name search ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
        {/* Time filter buttons */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Today', 'Next 7 Days', 'Pending Work'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeFilter(range)}
              className={`px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-sm ${
                timeFilter === range
                  ? 'bg-primary text-white border-primary shadow-primary/20'
                  : 'bg-card text-slate-500 border-border hover:border-slate-400'
              }`}
            >
              {range}
            </button>
          ))}
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
      {(nameFilter || timeFilter !== 'All') && (
        <p className="text-[10px] text-muted-foreground mb-4 font-medium">
          Showing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          {nameFilter && <> matching <span className="text-foreground font-semibold">"{nameFilter}"</span></>}
        </p>
      )}

      {/* TASK TABLE */}
      <div className="h-[500px] flex flex-col overflow-hidden rounded-xl border border-border">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[700px]">
            {/* HEADER */}
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr] px-6 lg:px-10 py-5 bg-card backdrop-blur-xl border border-border font-black text-slate-400 text-[10px] lg:text-[11px] uppercase tracking-[0.2em] items-center shadow-lg sticky top-0 z-20">
              <div>Task Name</div>
              <div>Assigned To</div>
              <div>Created At</div>
              <div>Deadline</div>
              <div>Status</div>
              <div className="text-right pr-2 lg:pr-4">Action</div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search size={32} className="text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No tasks found</p>
                {nameFilter && <p className="text-xs text-muted-foreground mt-1">Try a different name or clear the filter</p>}
              </div>
            ) : (
              filteredTasks.map(task => {
                const isRevision = task.status === 'Revision Requested';
                const isExpanded = expandedTaskId === task._id;

                return (
                  <div key={task._id} className="border-b border-border last:border-0">
                    <div
                      onClick={() => toggleExpand(task._id)}
                      className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr] items-center px-6 py-5 cursor-pointer transition-all hover:bg-primary/[0.03]
                        ${isExpanded ? 'bg-slate-100/60 dark:bg-primary/[0.08]' : ''}
                        ${isRevision ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        <span className="font-black text-sm truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                          {task.doerId?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        {task.doerId?.name || 'Unassigned'}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground">
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString("en-GB") : "—"}
                      </div>
                      <div className="text-xs font-bold">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'AWAITING'}
                      </div>
                      <div>
                        <span className="text-[10px] px-2 py-1 rounded bg-sky-500/10">{task.status}</span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {task.status === 'Revision Requested' && (
                          <button onClick={(e) => { e.stopPropagation(); setRevisionModalTask(task); }}
                            className="p-3 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all active:scale-90">
                            <AlertTriangle size={18} />
                          </button>
                        )}
                        {task.status === 'Completed' && (<>
                          <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, true); }}
                            className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-90">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, false); }}
                            className="p-3 bg-red-500/5 text-red-600 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90">
                            <XCircle size={18} />
                          </button>
                        </>)}
                        <button onClick={(e) => {
                            e.stopPropagation();
                            openTaskThread({
                              taskId:    task._id,
                              taskType:  'delegation',
                              taskTitle: task.title || task.taskTitle || 'Task',
                              participants: [task.doerId?._id, task.assignerId].filter(Boolean),
                            });
                          }}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-all">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          💬 Comments
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleCancelTask(task._id); }}
                          className="p-3 bg-background border border-border text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-90">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-background/80 backdrop-blur-xl border-t border-border animate-in slide-in-from-top-4 duration-500">
                        <div className="px-6 lg:px-10 pt-6 space-y-4">
                          <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight text-foreground truncate">{task.title}</h3>
                          <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div>Issued By: <span className="text-primary ml-2">{task.assignerId?.name || "System"}</span></div>
                            <div>Assigned To: <span className="text-foreground ml-2">{task.doerId?.name}</span></div>
                            <div>Deadline: <span className="ml-2">{task.deadline ? new Date(task.deadline).toLocaleDateString() : "—"}</span></div>
                            <div>Status: <span className="ml-2 text-sky-500">{task.status}</span></div>
                          </div>
                        </div>
                        <div className="px-6 lg:px-10 mt-6 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Description</p>
                          <p className="text-sm font-bold uppercase text-slate-700 dark:text-foreground leading-relaxed">{task.description || "No directives provided."}</p>
                        </div>
                        {Array.isArray(task.files) && task.files.some(f => !f.fileName.includes("Evidence")) && (
                          <div className="px-6 lg:px-10 mt-6 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachments</p>
                            <div className="flex flex-wrap gap-3">
                              {task.files.filter(f => !f.fileName.includes("Evidence")).map((file, i) => (
                                <button key={i} onClick={() => setPreviewImage(file.fileUrl)}
                                  className="px-3 py-1 border border-border rounded-lg text-[10px] font-black uppercase hover:border-primary">
                                  {file.fileName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="px-6 lg:px-10 mt-10">
                          <h4 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-6">Action Timeline</h4>
                          <div className="space-y-6 border-l border-border pl-6">
                            {Array.isArray(task.history) && task.history.length > 0 ? (
                              [...task.history].reverse().map((log, i) => (
                                <div key={i} className="relative">
                                  <div className="absolute -left-[10px] top-2 w-1.5 h-1.5 bg-primary rounded-full"></div>
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap justify-between text-[10px] font-black uppercase tracking-widest">
                                      <div className="flex gap-2 flex-wrap">
                                        <span className="text-primary">{log.action}</span>
                                        <span className="text-slate-400">BY</span>
                                        <span>{log.performedBy?.name || "System"}</span>
                                      </div>
                                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <p className="text-sm font-bold uppercase text-slate-700 dark:text-foreground">"{log.remarks || "System update"}"</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] font-black uppercase opacity-50">No History</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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

      <style dangerouslySetInnerHTML={{ __html: `
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