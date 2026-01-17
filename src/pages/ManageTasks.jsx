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
  FileText,
  MessageSquare,
  Image as ImageIcon,
  X,
  Maximize2,
  Paperclip,
  ShieldCheck,
  ClipboardList as LucideClipboard,
  Calendar,
  MoreVertical,
  Undo2,
  Target,
  FileSearch
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel'; 

/**
 * MANAGE TASKS: ASSIGNER COMMAND OVERVIEW v1.3
 * Purpose: Industrial surveillance of mission-critical delegations and node states.
 * Logic: Handles task verification protocols, rework triggers, and immutable audit synchronization.
 */
const ManageTasks = ({ assignerId, tenantId }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // --- DATA ACQUISITION: MISSION SYNCHRONIZATION ---
  const fetchData = useCallback(async () => {
    if (!currentAssignerId || !currentTenantId) return;
    try {
      setLoading(true);
      const [delegationRes, empRes] = await Promise.all([
        API.get(`/tasks/assigner/${currentAssignerId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);
      
      const delegationData = Array.isArray(delegationRes.data) 
        ? delegationRes.data 
        : (delegationRes.data?.tasks || delegationRes.data?.data || []);

      const employeeData = Array.isArray(empRes.data) 
        ? empRes.data 
        : (empRes.data?.employees || empRes.data?.data || []);

      const delegationOnly = delegationData.map(t => ({ ...t, taskType: 'Delegation' }));

      setTasks(delegationOnly.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      setEmployees(employeeData);
    } catch (err) {
      console.error("Mission Sync Failure:", err);
      setTasks([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId, currentTenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- COMMAND: VERIFICATION PROTOCOL ---
  const handleVerifyTask = async (taskId, isSatisfied) => {
    const status = isSatisfied ? 'Verified' : 'Accepted'; 
    const remarks = !isSatisfied ? prompt("Specify feedback for the rework cycle:") : "Node Handshake Complete: Task verified and closed.";
    
    if (!isSatisfied && !remarks) return;

    try {
      await API.put(`/tasks/respond`, {
        taskId,
        status,
        remarks,
        doerId: currentAssignerId 
      });
      alert(isSatisfied ? "Protocol Finalized: Asset verified." : "Handshake Transmitted: Rework cycle initiated.");
      fetchData();
    } catch (err) {
      alert("Verification Error: " + (err.response?.data?.message || err.message));
    }
  };

  // --- COMMAND: TERMINATE ASSIGNMENT ---
  const handleCancelTask = async (taskId) => {
    if (window.confirm("CRITICAL: Permanently decommission this mission asset? This action will be logged in the permanent ledger.")) {
      try {
        await API.delete(`/tasks/${taskId}`);
        fetchData();
      } catch (err) {
        alert("Termination Protocol Failed.");
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  // --- SKELETON LOADING VIEW (Adaptive Theme) ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[600px] gap-8 transition-colors duration-500 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={64} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase text-center">Syncing Mission Matrix...</p>
    </div>
  );

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 pb-24 selection:bg-primary/30">
      
      {/* --- BLUEPRINT ASSET PREVIEW --- */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-10 right-10 bg-white/10 hover:bg-rose-500 text-white p-4 rounded-full transition-all active:scale-90 border border-white/10 shadow-2xl shadow-black/50">
            <X size={28} />
          </button>
          <img src={previewImage} alt="Mission Blueprint" className="max-w-full max-h-[85vh] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner transition-all duration-500">
            <LucideClipboard size={36} className="text-primary" />
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Task Oversight</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Surveillance Grid: Monitoring Mission-Critical Delegations & Node States
            </p>
          </div>
        </div>
        <button onClick={fetchData} className="group bg-card hover:bg-background border border-border px-10 py-5 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Re-Sync Board
        </button>
      </div>
      
      {/* --- MISSION CONTROL LEDGER --- */}
      <div className="bg-card border border-border rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-500">
        
        {/* Table Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1.5fr] px-12 py-8 bg-background/50 backdrop-blur-md border-b border-border font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.3em]">
            <div>Mission Identification</div>
            <div>Directive Brief</div>
            <div>Execution Node</div>
            <div>Maturity</div>
            <div>Telemetry</div>
            <div className="text-right">Management</div>
        </div>

        <div className="flex flex-col divide-y divide-border/40">
            {safeTasks.map(task => {
            const isRevision = task.status === 'Revision Requested';
            const isExpanded = expandedTaskId === task._id;

            return (
                <div key={task._id} className={`group transition-all duration-500 ${isExpanded ? 'bg-background/60 shadow-inner' : 'hover:bg-background/50'}`}>
                
                {/* DATA ROW: Adaptive Matrix */}
                <div 
                    onClick={() => toggleExpand(task._id)} 
                    className={`
                    grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1.5fr] items-center px-10 lg:px-12 py-10 lg:py-8 cursor-pointer gap-8 lg:gap-0
                    ${isRevision ? 'border-l-4 border-l-amber-500 dark:border-l-amber-400 shadow-[inset_20px_0_40px_-20px_rgba(245,158,11,0.2)]' : 'border-l-4 border-l-transparent'}
                    `}
                >
                    {/* Mission Identification */}
                    <div className="flex items-center gap-6 min-w-0">
                        <div className={`p-2.5 rounded-xl border transition-all duration-500 ${isExpanded ? 'bg-primary text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'bg-background border-border text-slate-400'}`}>
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-foreground font-black text-lg lg:text-sm tracking-tight uppercase truncate group-hover:text-primary transition-colors">{task.title}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mt-2 text-slate-400">
                                <Layers size={12} className="text-primary" /> {task.taskType || 'Directive'}
                            </span>
                        </div>
                    </div>

                    {/* Objective Brief */}
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-bold lg:pr-14 italic truncate lg:line-clamp-1 opacity-80 border-l-2 border-border/40 lg:border-none pl-4 lg:pl-0">
                      {task.description || "Standard operating parameters recorded."}
                    </div>

                    {/* Execution Node */}
                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-black text-[11px] uppercase tracking-tighter bg-background border border-border px-5 py-2.5 rounded-xl w-fit shadow-inner">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] border border-primary/20">
                            {task.doerId?.name?.charAt(0) || "U"}
                        </div>
                        {task.doerId?.name || 'Unlinked Node'}
                    </div>

                    {/* Maturity Date */}
                    <div className="flex flex-col lg:block">
                        <label className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-2 tracking-[0.2em]">Maturity Target</label>
                        <span className="text-slate-500 font-black text-[11px] font-mono tracking-widest flex items-center gap-3 uppercase">
                            <Calendar size={16} className="text-slate-400 dark:text-slate-600" /> {task.deadline ? new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'INF'}
                        </span>
                    </div>

                    {/* Telemetry Status */}
                    <div>
                    <span className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full border font-black text-[9px] uppercase tracking-[0.15em] shadow-sm transition-all
                        ${task.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 
                        task.status === 'Completed' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 
                        task.status === 'Revision Requested' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20' : 
                        'bg-primary/10 text-primary border-primary/20'}`}>
                        {task.status || 'Active'}
                    </span>
                    </div>

                    {/* Management Actions */}
                    <div className="flex justify-end gap-4 pt-6 lg:pt-0 border-t lg:border-t-0 border-border/40 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 transform lg:translate-x-6 lg:group-hover:translate-x-0">
                    {task.status === 'Completed' && (
                        <div className="flex gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, true); }} className="p-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-90" title="Verify Node Protocol"><CheckCircle size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, false); }} className="p-4 bg-background text-rose-500 rounded-2xl border border-border hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-lg" title="Reject Handshake"><Undo2 size={20} /></button>
                        </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleCancelTask(task._id); }} className="p-4 bg-background text-slate-400 hover:text-rose-500 rounded-2xl border border-border hover:border-rose-500 transition-all active:scale-90 shadow-lg" title="Terminate Assignment"><Trash2 size={20} /></button>
                    </div>
                </div>

                {/* --- EXPANDED ASSET INTEL --- */}
                {isExpanded && (
                    <div className="bg-background/40 backdrop-blur-3xl p-10 lg:p-20 border-t border-border/60 animate-in slide-in-from-top-6 duration-700 shadow-inner">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                        
                        {/* FUNCTIONAL OVERVIEW */}
                        <div className="space-y-10">
                            <h4 className="text-foreground font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-4 px-3"><AlertTriangle size={20} className="text-primary" /> Functional Parameters</h4>
                            <div className="bg-card p-10 rounded-[3rem] border border-border space-y-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                   <Target size={180} className="text-primary" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <strong className="text-primary block text-[10px] font-black uppercase tracking-[0.25em]">Directive Narrative:</strong>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm font-bold leading-relaxed italic border-l-4 border-primary/20 pl-8 py-1">
                                        {task.description || "No manual directive parameters detected."}
                                    </p>
                                </div>

                                {/* Blueprints Grid */}
                                {Array.isArray(task.files) && task.files.some(f => !f.fileName.includes("Evidence")) && (
                                    <div className="space-y-5 pt-10 border-t border-border/50 relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Source Blueprints (Assigner):</p>
                                        <div className="flex flex-wrap gap-4">
                                            {task.files.filter(f => !f.fileName.includes("Evidence")).map((file, i) => (
                                                <button key={i} onClick={(e) => { e.stopPropagation(); if (file.fileUrl) setPreviewImage(file.fileUrl); }} className="bg-background border border-border hover:border-primary text-slate-700 dark:text-slate-400 hover:text-primary transition-all px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4 shadow-sm group/asset">
                                                    <Paperclip size={16} className="group-hover/asset:rotate-45 transition-transform" /> {file.fileName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AWS Evidence Loop */}
                                {(task.status === 'Completed' || task.status === 'Verified') && (
                                    <div className="space-y-6 pt-10 border-t border-border/50 relative z-10">
                                        <div className="flex items-center gap-4 px-1">
                                            <ShieldCheck size={20} className="text-emerald-500" />
                                            <h5 className="text-foreground font-black text-[10px] uppercase tracking-widest">Node Submission Verified</h5>
                                        </div>
                                        <div className="bg-emerald-500/5 p-8 rounded-3xl border border-emerald-500/20 shadow-inner">
                                            <p className="text-slate-600 dark:text-slate-400 text-sm font-bold leading-relaxed italic border-l-2 border-emerald-500/40 pl-6">
                                                "{task.remarks || "Work sequence finalized with zero supplemental briefing."}"
                                            </p>
                                            <div className="flex flex-wrap gap-4 mt-8">
                                                {Array.isArray(task.files) && task.files.filter(f => f.fileName.includes("Evidence")).map((file, i) => (
                                                    <button key={i} onClick={() => setPreviewImage(file.fileUrl)} className="bg-card hover:bg-emerald-600 dark:hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-4 border border-emerald-500/20 shadow-xl hover:shadow-emerald-500/20">
                                                        <FileSearch size={18} /> Verify S3 Document
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isRevision && <RevisionPanel task={task} employees={employees} assignerId={currentAssignerId} onSuccess={fetchData} />}
                        </div>

                        {/* IMMUTABLE SYSTEM LEDGER */}
                        <div className="space-y-10">
                            <h4 className="text-foreground font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-4 px-3"><History size={20} className="text-primary" /> Immutable Audit Ledger</h4>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar bg-card p-10 rounded-[3rem] border border-border space-y-10 shadow-inner">
                                {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().map((log, i) => (
                                    <div key={i} className="relative pl-10 border-l-2 border-border last:border-0 pb-4">
                                        <div className="absolute top-1.5 -left-[9px] w-4 h-4 rounded-full bg-card border-4 border-primary shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                                            <span className="text-primary font-black text-[9px] uppercase tracking-[0.2em] bg-primary/10 px-4 py-1.5 rounded-lg border border-primary/20">{log.action || 'System handshake'}</span>
                                            <span className="text-slate-400 font-black text-[10px] font-mono tracking-[0.25em] uppercase opacity-70">{log.timestamp ? new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}</span>
                                        </div>
                                        <div className="bg-background/50 p-6 rounded-[2rem] border border-border shadow-inner">
                                            <div className="flex gap-4">
                                                <MessageSquare size={16} className="text-slate-400 dark:text-slate-600 mt-1 shrink-0" />
                                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-bold italic opacity-80">
                                                    {log.remarks ? `"${log.remarks}"` : "Event timestamped and signed by system master node."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-32 text-center opacity-20 grayscale">
                                        <History size={64} className="mx-auto mb-6" />
                                        <p className="text-[12px] font-black uppercase tracking-[0.5em]">Protocol Sync Initialized</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>
                )}
                </div>
            );
            })}
            
            {/* --- EMPTY STATE REGISTRY --- */}
            {safeTasks.length === 0 && !loading && (
            <div className="py-48 text-center transition-all animate-in zoom-in-95 duration-1000">
                <div className="relative inline-block mb-10">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse"></div>
                    <LucideClipboard size={100} className="text-slate-100 dark:text-slate-800 relative z-10" />
                    <ShieldCheck size={36} className="absolute -bottom-2 -right-2 text-primary z-20" />
                </div>
                <p className="text-slate-400 dark:text-slate-600 font-black text-sm uppercase tracking-[0.6em] mb-3">Sector Ledger Dormant</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold opacity-60">No active mission assets detected in current node overview.</p>
            </div>
            )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}</style>
    </div>
  );
};

export default ManageTasks;