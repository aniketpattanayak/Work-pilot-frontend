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

/**
 * MANAGE TASKS: MISSION CONTROL MODULE v1.8
 * Updated: Integrated Assigner and History Performer names for maximum accountability.
 */
const ManageTasks = ({ assignerId, tenantId }) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [timeFilter, setTimeFilter] = useState('All');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);




  const [revisionModalTask, setRevisionModalTask] = useState(null);



  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  const applyTimeFilter = useCallback((range, allTasks = tasks) => {
    setTimeFilter(range);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = allTasks.filter(task => {
      if (!task.deadline || range === 'All') return true;

      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);

      if (range === 'Today') {
        return deadline.getTime() === now.getTime();
      }

      if (range === 'Next 7 Days') {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        return deadline >= now && deadline <= nextWeek;
      }

      if (range === 'Pending Work') {
        return deadline.getTime() < now.getTime() && task.status !== 'Verified' && task.status !== 'Completed';
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

      const delegationOnly = rawTaskData.map(t => ({ ...t, taskType: 'Delegation' }));
      const sorted = delegationOnly.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setTasks(sorted);
      setEmployees(employeeData);
      setFilteredTasks(sorted);
      setTimeFilter('All');
    } catch (err) {
      console.error("Fetch error:", err);
      setTasks([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId, currentTenantId, user?.role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    applyTimeFilter(timeFilter);
  }, [timeFilter, applyTimeFilter]);

  const handleVerifyTask = async (taskId, isSatisfied) => {
    const status = isSatisfied ? 'Verified' : 'Accepted';
    const remarks = !isSatisfied ? prompt("Tactical Feedback: Identify required corrections:") : "Directive evidence verified.";

    if (!isSatisfied && !remarks) return;

    try {
      await API.put(`/tasks/respond`, {
        taskId, status, remarks, doerId: currentAssignerId
      });
      alert(isSatisfied ? "Handshake Complete: Mission Verified." : "Correction Issued: Returning to Node.");
      fetchData();
    } catch (err) {
      alert("Protocol Error: Status update failed.");
    }
  };

  const handleCancelTask = async (taskId) => {
    if (window.confirm("PERMANENT TERMINATION: Purge this mission node from the registry?")) {
      try {
        await API.delete(`/tasks/${taskId}`);
        fetchData();
      } catch (err) {
        alert("Action failed.");
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Loading...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700  selection:bg-primary/30">

      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 bg-red-600 hover:bg-red-500 p-4 rounded-full text-white shadow-2xl transition-all active:scale-90 z-20 cursor-pointer" onClick={() => setPreviewImage(null)}><X size={28} /></button>
          <img src={previewImage} alt="Mission Evidence" className="max-w-full max-h-[90vh] rounded-[2rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-8">
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <LucideClipboard size={32} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">Work Monitor</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Track assigned work and check staff progress.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={fetchData} className="group flex-1 md:flex-none bg-card hover:bg-background border border-border px-6 py-3 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl hover:shadow-primary/5">
            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* TIME FILTERS */}
      <div className="flex flex-wrap gap-3 mb-10">
        {['All', 'Today', 'Next 7 Days', 'Pending Work'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeFilter(range)}
            className={`px-6 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-sm ${timeFilter === range
              ? 'bg-primary text-white dark:text-slate-950 border-primary shadow-primary/20'
              : 'bg-card text-slate-500 border-border hover:border-slate-400'
              }`}
          >
            {range}
          </button>
        ))}
      </div>



      <div className="h-[500px] flex flex-col overflow-hidden rounded-xl border border-border ">

<div className="w-full overflow-x-auto">
  <div className="min-w-[700px]">

    {/* GRID HEADER */}
    <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr] 
      px-6 lg:px-10 py-5 bg-card backdrop-blur-xl border border-border 
      font-black text-slate-400 text-[10px] lg:text-[11px]
      uppercase tracking-[0.2em] items-center 
      shadow-lg sticky top-0 z-20">

      <div>Task Name</div>
      <div>Assigned To</div>
      <div>Created At</div>
      <div>Deadline</div>
      <div>Status</div>
      <div className="text-right pr-2 lg:pr-4">Action</div>
    </div>
    
    {filteredTasks.map(task => {
      const isRevision = task.status === 'Revision Requested';
      const isExpanded = expandedTaskId === task._id;

      return (
        <div
          key={task._id}
          className="border-b border-border last:border-0"
        >
          {/* ROW */}
          <div
            onClick={() => toggleExpand(task._id)}
            className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr]  items-center px-6 py-5 cursor-pointer transition-all
            hover:bg-primary/[0.03]
            ${isExpanded ? 'bg-slate-100/60 dark:bg-primary/[0.08]' : ''}
            ${isRevision ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}
            `}
          >
            {/* TITLE */}
            <div className="flex items-center gap-3 min-w-0">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span className="font-black text-sm truncate">
                {task.title}
              </span>
            </div>

            {/* DOER */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                {task.doerId?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              {task.doerId?.name || 'Unassigned'}
            </div>

            <div className="text-xs font-bold text-muted-foreground">
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString("en-GB") : "—"}
            </div>

            {/* DEADLINE */}
            <div className="text-xs font-bold">
              {task.deadline
                ? new Date(task.deadline).toLocaleDateString()
                : 'AWAITING'}
            </div>

            {/* STATUS */}
            <div>
              <span className="text-[10px] px-2 py-1 rounded bg-sky-500/10">
                {task.status}
              </span>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2 justify-end">
              {task.status === 'Revision Requested' && (
                  <button
                      onClick={(e) => { e.stopPropagation(); setRevisionModalTask(task);}}
                      className="p-3 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all active:scale-90"
                    >
                      <AlertTriangle size={18} />
                  </button>
                  )}


              {task.status === 'Completed' && (
                <>
                  <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyTask(task._id, true);
                        }}
                    className="flex-1 lg:flex-none p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"
                  >
                  <CheckCircle size={18} />
                  </button>

                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyTask(task._id, false);
                      }}
                  className="flex-1 lg:flex-none p-3 bg-red-500/5 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"
                    >
                    <XCircle size={18} />
                  
                  </button>
                </>
              )}

              <button onClick={(e) => { e.stopPropagation(); handleCancelTask(task._id); }} className="flex-1 lg:flex-none p-3 bg-background border border-border text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-90">
                  <Trash2 size={18} />
                </button>
            </div>
          </div>

          {/* EXPANDED SECTION (keep yours same) */}
          {/* EXPANDED INTEL VIEW: UPDATED TO SHOW ASSIGNER AND PERFORMER NAMES */}
              {isExpanded && (
                  <div className="bg-background/80 backdrop-blur-xl border-t border-border animate-in slide-in-from-top-4 duration-500">
                   
                  {/* 🔥 HEADER INSIDE EXPAND */}
                  <div className="px-6 lg:px-10 pt-6 space-y-4">

  {/* TITLE */}
  <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight text-foreground truncate">
    {task.title}
  </h3>

  {/* META ROW */}
  <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">

    <div>
      Issued By: 
      <span className="text-primary ml-2">
        {task.assignerId?.name || "System"}
      </span>
    </div>

    <div>
      Assigned To: 
      <span className="text-foreground ml-2">
        {task.doerId?.name}
      </span>
    </div>

    <div>
      Deadline: 
      <span className="ml-2">
        {task.deadline
          ? new Date(task.deadline).toLocaleDateString()
          : "—"}
      </span>
    </div>

    <div>
      Status:
      <span className="ml-2 text-sky-500">
        {task.status}
      </span>
    </div>

  </div>
</div>
<div className="px-6 lg:px-10 mt-6 space-y-2">
  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
    Description
  </p>

  <p className="text-sm font-bold uppercase text-slate-700 dark:text-foreground leading-relaxed">
    {task.description || "No directives provided."}
  </p>
</div>


{Array.isArray(task.files) && task.files.some(f => !f.fileName.includes("Evidence")) && (
  <div className="px-6 lg:px-10 mt-6 space-y-2">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      Attachments
    </p>

    <div className="flex flex-wrap gap-3">
      {task.files
        .filter(f => !f.fileName.includes("Evidence"))
        .map((file, i) => (
          <button
            key={i}
            onClick={() => setPreviewImage(file.fileUrl)}
            className="px-3 py-1 border border-border rounded-lg text-[10px] font-black uppercase hover:border-primary"
          >
            {file.fileName}
          </button>
        ))}
    </div>
  </div>
)}


       {/* RIGHT */}
        <div className="px-6 lg:px-10 mt-10">

  <h4 className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-6">
    Action Timeline
  </h4>

  <div className="space-y-6 border-l border-border pl-6">

    {Array.isArray(task.history) && task.history.length > 0 ? (
      [...task.history].reverse().map((log, i) => (

        <div key={i} className="relative">

          {/* DOT */}
          <div className="absolute -left-[10px] top-2 w-1.5 h-1.5 bg-primary rounded-full"></div>

          {/* CONTENT */}
          <div className="space-y-1">

            <div className="flex flex-wrap justify-between text-[10px] font-black uppercase tracking-widest">
              
              <div className="flex gap-2 flex-wrap">
                <span className="text-primary">{log.action}</span>
                <span className="text-slate-400">BY</span>
                <span>{log.performedBy?.name || "System"}</span>
              </div>

              <span className="text-slate-500">
                {new Date(log.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>

            </div>

            <p className="text-sm font-bold uppercase text-slate-700 dark:text-foreground">
              "{log.remarks || "System update"}"
            </p>

          </div>
        </div>

      ))
    ) : (
      <p className="text-[10px] font-black uppercase opacity-50">
        No History
      </p>
    )}

  </div>
</div>
  </div>
)}
        </div>
      );
    })}
  </div>
</div>
      </div>



      {revisionModalTask && (
  <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    
    {/* Modal Box */}
    <div className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-border">
        <h3 className="font-black text-sm uppercase tracking-widest">
          Revision Control Panel
        </h3>

        <button
          onClick={() => setRevisionModalTask(null)}
          className="p-2 rounded-full hover:bg-red-500/20 text-red-500"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[70vh] overflow-y-auto">
        <RevisionPanel
          task={revisionModalTask}
          employees={employees}
          assignerId={currentAssignerId}
          onSuccess={() => {
            setRevisionModalTask(null);
            fetchData();
          }}
          source="manage"
        />
      </div>

    </div>
  </div>
)}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>

      {/* ── CREATE TASK MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
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
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors group"
              >
                <X size={15} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
            {/* Modal Body — render CreateTask form */}
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