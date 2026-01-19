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
  Calendar 
} from 'lucide-react';
import RevisionPanel from '../components/RevisionPanel'; 

const ManageTasks = ({ assignerId, tenantId }) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]); 
  const [timeFilter, setTimeFilter] = useState('All');    
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const currentAssignerId = assignerId || user?._id || user?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * FILTER LOGIC: Updates the list based on time range
   */
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
      
      if (range === 'Next 1 Year') {
        const nextYear = new Date(now);
        nextYear.setFullYear(now.getFullYear() + 1);
        return deadline >= now && deadline <= nextYear;
      }
      
      return true;
    });

    setFilteredTasks(filtered);
  }, [tasks]);

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
      const sorted = delegationOnly.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setTasks(sorted);
      setEmployees(employeeData);
      
      // Sync the initial view
      setFilteredTasks(sorted);
      setTimeFilter('All');
    } catch (err) {
      console.error("Fetch error:", err);
      setTasks([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId, currentTenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-filter when the filter tab is changed manually
  useEffect(() => {
    applyTimeFilter(timeFilter);
  }, [timeFilter, applyTimeFilter]);

  const handleVerifyTask = async (taskId, isSatisfied) => {
    const status = isSatisfied ? 'Verified' : 'Accepted'; 
    const remarks = !isSatisfied ? prompt("Enter feedback for the worker to fix this:") : "Task checked and verified.";
    
    if (!isSatisfied && !remarks) return;

    try {
      await API.put(`/tasks/respond`, {
        taskId, status, remarks, doerId: currentAssignerId 
      });
      alert(isSatisfied ? "Task verified!" : "Task sent back for correction.");
      fetchData();
    } catch (err) {
      alert("Action failed.");
    }
  };

  const handleCancelTask = async (taskId) => {
    if (window.confirm("Are you sure? This will delete the task permanently.")) {
      try {
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
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Task List...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* IMAGE PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 bg-red-500 p-3 rounded-full text-white shadow-xl cursor-pointer" onClick={() => setPreviewImage(null)}><X size={24} /></button>
          <img src={previewImage} alt="Proof" className="max-w-full max-h-full rounded-2xl border border-slate-800" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20"><LucideClipboard size={32} className="text-sky-400" /></div>
          <div>
            <h2 className="text-white text-3xl font-black tracking-tighter">Work Monitor</h2>
            <p className="text-slate-500 text-sm font-medium">Track assigned work and check staff progress.</p>
          </div>
        </div>
        <button onClick={fetchData} className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-3 shadow-lg">
          <RefreshCcw size={18} /> Refresh Board
        </button>
      </div>

      {/* TIME FILTERS */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['All', 'Today', 'Next 7 Days', 'Next 1 Year'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeFilter(range)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              timeFilter === range 
              ? 'bg-sky-500 text-slate-950 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
              : 'bg-slate-900/50 text-slate-500 border-slate-800'
            }`}
          >
            {range}
          </button>
        ))}
      </div>
      
      {/* GRID HEADER */}
      <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1.5fr] px-8 py-5 bg-slate-900/80 backdrop-blur-md rounded-t-3xl border border-slate-800 font-black text-slate-500 text-[10px] uppercase tracking-widest items-center">
        <div>Task Name</div>
        <div>Description</div>
        <div>Assigned To</div>
        <div>Deadline</div>
        <div>Status</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-b-3xl overflow-hidden shadow-2xl">
        {filteredTasks.map(task => {
          const isRevision = task.status === 'Revision Requested';
          const isExpanded = expandedTaskId === task._id;

          return (
            <div key={task._id} className="flex flex-col border-b border-slate-800/50 last:border-0 group">
              <div 
                onClick={() => toggleExpand(task._id)} 
                className={`grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1.5fr] items-center px-8 py-6 cursor-pointer transition-all hover:bg-slate-900/40 ${isExpanded ? 'bg-slate-900' : ''} ${isRevision ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronUp size={18} className="text-sky-400" /> : <ChevronDown size={18} className="text-slate-600" />}
                  <span className="text-slate-100 font-bold truncate">{task.title}</span>
                </div>

                <div className="text-slate-400 text-xs truncate pr-10 italic">{task.description || "No description."}</div>

                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold truncate">
                  <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 text-[8px]">{task.doerId?.name?.charAt(0) || "U"}</div>
                  {task.doerId?.name || 'Unassigned'}
                </div>

                <div className="text-slate-500 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</span>
                </div>

                <div>
                  <span className={`inline-flex px-3 py-1 rounded-lg font-black text-[9px] uppercase border ${
                    task.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    task.status === 'Completed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
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

              {isExpanded && (
                <div className="bg-slate-900/60 p-8 border-t border-slate-800 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-sky-400 font-black text-xs uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={16} /> Task Details</h4>
                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                            <p className="text-slate-300 text-sm font-medium">
                                <strong className="text-sky-400 block text-[10px] uppercase mb-1">Description:</strong>
                                {task.description || "No extra notes provided."}
                            </p>

                            {/* Reference Files */}
                            {Array.isArray(task.files) && task.files.some(f => !f.fileName.includes("Evidence")) && (
                                <div className="space-y-2 pt-4 border-t border-slate-800">
                                    <p className="text-[10px] font-black text-slate-500 uppercase">Attached Files:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {task.files.filter(f => !f.fileName.includes("Evidence")).map((file, i) => (
                                            <button key={i} onClick={() => setPreviewImage(file.fileUrl)} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-400 flex items-center gap-2 hover:border-sky-500/40">
                                                <Paperclip size={12} /> {file.fileName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Work Proof */}
                            {(task.status === 'Completed' || task.status === 'Verified') && (
                                <div className="space-y-2 pt-4 border-t border-slate-800">
                                    <h5 className="text-emerald-400 text-[10px] font-black uppercase">Proof of Work:</h5>
                                    <p className="text-slate-400 text-xs italic">"{task.remarks || "No remarks."}"</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {Array.isArray(task.files) && task.files.filter(f => f.fileName.includes("Evidence")).map((file, i) => (
                                            <button key={i} onClick={() => setPreviewImage(file.fileUrl)} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-500 hover:text-slate-950 transition-all">
                                                <Maximize2 size={12} /> View Work Image
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {isRevision && <RevisionPanel task={task} employees={employees} assignerId={currentAssignerId} onSuccess={fetchData} />}
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-sky-400 font-black text-xs uppercase tracking-widest flex items-center gap-2"><History size={16} /> History</h4>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
                            {Array.isArray(task.history) && task.history.length > 0 ? [...task.history].reverse().map((log, i) => (
                                <div key={i} className="relative pl-6 border-l border-slate-800 flex flex-col gap-1 pb-1">
                                    <div className="absolute top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-sky-500/50" />
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                        <span className="text-sky-400">{log.action}</span>
                                        <span className="text-slate-600">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 italic">"{log.remarks || "System update."}"</p>
                                </div>
                            )) : <p className="text-slate-700 text-xs font-bold uppercase text-center py-10">No history found</p>}
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManageTasks;