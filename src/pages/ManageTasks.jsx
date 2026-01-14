import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; // Unified config for AWS deployment
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
  Calendar 
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel'; 

const ManageTasks = ({ assignerId, tenantId }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * UPDATED FETCH DATA
   * Includes robust unwrapping to prevent '.map is not a function' errors 
   * during AWS/Modular backend transitions.
   */
  const fetchData = useCallback(async () => {
    if (!currentAssignerId || !currentTenantId) return;
    try {
      setLoading(true);
      
      const [delegationRes, empRes] = await Promise.all([
        API.get(`/tasks/assigner/${currentAssignerId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);
      
      // Robust unwrapping: handles both flat arrays and nested objects
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
      console.error("General Fetch error:", err);
      setTasks([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId, currentTenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerifyTask = async (taskId, isSatisfied) => {
    const status = isSatisfied ? 'Verified' : 'Accepted'; 
    const remarks = !isSatisfied ? prompt("Enter feedback for the Doer to fix this task:") : "Task verified and closed.";
    
    if (!isSatisfied && !remarks) return;

    try {
      // Switched to centralized API instance
      await API.put(`/tasks/respond`, {
        taskId,
        status,
        remarks,
        doerId: currentAssignerId 
      });
      alert(isSatisfied ? "Task officially verified!" : "Task sent back for rework.");
      fetchData();
    } catch (err) {
      alert("Verification failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelTask = async (taskId) => {
    if (window.confirm("CRITICAL ACTION: Cancel this task permanently? This cannot be undone.")) {
      try {
        // Switched to centralized API instance
        await API.delete(`/tasks/${taskId}`);
        fetchData();
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase leading-none">Assembling Task Matrix...</p>
    </div>
  );

  // Defensive check for rendering the main list
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-sky-500/30">
      
      {/* --- UNIVERSAL PREVIEW MODAL --- */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-xl transition-all active:scale-90 cursor-pointer" onClick={() => setPreviewImage(null)}>
            <X size={24} />
          </button>
          <img src={previewImage} alt="Task Proof" className="max-w-full max-h-full rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
            <LucideClipboard size={32} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-white text-3xl font-black tracking-tighter">Factory Task Monitor</h2>
            <p className="text-slate-500 text-sm font-medium">Real-time surveillance of delegated tasks and one-time assignments.</p>
          </div>
        </div>
        <button onClick={fetchData} className="group bg-slate-900 hover:bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all flex items-center gap-3 active:scale-95">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Sync Board
        </button>
      </div>
      
      {/* MONITOR GRID HEADER */}
      <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1.5fr] px-8 py-5 bg-slate-900/80 backdrop-blur-md rounded-t-3xl border border-slate-800 border-b-0 font-black text-slate-500 text-[10px] uppercase tracking-widest items-center">
        <div>Title / Category</div>
        <div>Objective Overview</div>
        <div>Operational Doer</div>
        <div>Deadline</div>
        <div>System Status</div>
        <div className="text-right">Intervention</div>
      </div>

      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-b-3xl overflow-hidden shadow-2xl">
        {/* SAFE MAP CALL */}
        {safeTasks.map(task => {
          const isRevision = task.status === 'Revision Requested';
          const isExpanded = expandedTaskId === task._id;

          return (
            <div key={task._id} className="flex flex-col border-b border-slate-800/50 last:border-0 group">
              {/* ROW ITEM */}
              <div 
                onClick={() => toggleExpand(task._id)} 
                className={`
                  grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1.5fr] items-center px-8 py-6 cursor-pointer transition-all hover:bg-slate-900/40
                  ${isExpanded ? 'bg-slate-900' : ''}
                  ${isRevision ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}
                `}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronUp size={18} className="text-sky-400" /> : <ChevronDown size={18} className="text-slate-600" />}
                  <div className="flex flex-col overflow-hidden">
                      <span className="text-slate-100 font-bold tracking-tight truncate">{task.title}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5 text-sky-400">
                          <Layers size={10} /> {task.taskType}
                      </span>
                  </div>
                </div>

                <div className="text-slate-400 text-xs font-medium truncate pr-10 italic">
                  {task.description || "No description provided."}
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 font-black text-[9px]">
                        {task.doerId?.name?.charAt(0) || "U"}
                    </div>
                    {task.doerId?.name || 'Unassigned'}
                </div>

                <div className="text-slate-500 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-700" /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No Date'}
                    </span>
                </div>

                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-tighter border
                    ${task.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      task.status === 'Completed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      task.status === 'Revision Requested' ? 'bg-amber-500/5 text-amber-600 border-amber-500/30' : 
                      'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                    {task.status || 'Active'}
                  </span>
                </div>

                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.status === 'Completed' && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, true); }} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(task._id, false); }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><XCircle size={18} /></button>
                    </>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleCancelTask(task._id); }} className="p-2 bg-slate-900 text-slate-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {isExpanded && (
                <div className="bg-slate-900/60 backdrop-blur-xl p-8 border-t border-slate-800 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    
                    {/* SCOPE & EVIDENCE */}
                    <div className="space-y-6">
                        <h4 className="text-sky-400 font-black text-xs uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={16} /> Asset Overview</h4>
                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                <strong className="text-sky-400/80 block text-[10px] uppercase mb-1">Detailed Directive:</strong>
                                {task.description || "No manual parameters provided."}
                            </p>

                            {/* Reference Files */}
                            {Array.isArray(task.files) && task.files.some(f => !f.fileName.includes("Evidence")) && (
                                <div className="space-y-3 pt-4 border-t border-slate-800">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigner References:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {task.files.filter(f => !f.fileName.includes("Evidence")).map((file, i) => (
                                            <button key={i} onClick={(e) => { e.stopPropagation(); if (file.fileUrl) setPreviewImage(file.fileUrl); }} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-sky-400 flex items-center gap-2 transition-all active:scale-95">
                                                <Paperclip size={14} /> {file.fileName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Evidence Files */}
                            {(task.status === 'Completed' || task.status === 'Verified') && (
                                <div className="space-y-3 pt-4 border-t border-slate-800">
                                    <h5 className="text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2"><ShieldCheck size={14} /> Personnel Submission Proof</h5>
                                    <p className="text-slate-400 text-xs italic">"{task.remarks || "Work finalized without additional remarks."}"</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.isArray(task.files) && task.files.filter(f => f.fileName.includes("Evidence")).map((file, i) => (
                                            <button key={i} onClick={() => setPreviewImage(file.fileUrl)} className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2 border border-emerald-500/20">
                                                <Maximize2 size={12} /> View Proof
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {isRevision && <RevisionPanel task={task} employees={employees} assignerId={currentAssignerId} onSuccess={fetchData} />}
                    </div>

                    {/* AUDIT TRAIL */}
                    <div className="space-y-6">
                        <h4 className="text-sky-400 font-black text-xs uppercase tracking-widest flex items-center gap-2"><History size={16} /> Immutable System Log</h4>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
                            {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().map((log, i) => (
                                <div key={i} className="relative pl-6 border-l border-slate-800 last:border-0 pb-1">
                                    <div className="absolute top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-sky-500/50" />
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sky-400 font-black text-[9px] uppercase">{log.action}</span>
                                        <span className="text-slate-600 font-bold text-[9px]">{log.timestamp ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium italic">{log.remarks ? `"${log.remarks}"` : "Event timestamped by system."}</p>
                                </div>
                            )) : <p className="text-slate-700 text-xs font-bold uppercase text-center py-10">No history available</p>}
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {safeTasks.length === 0 && !loading && (
           <div className="p-20 text-center text-slate-500 font-black text-xs uppercase tracking-[0.4em]">No Tasks in Current Sector</div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManageTasks;