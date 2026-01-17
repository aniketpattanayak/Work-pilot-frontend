import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; 
import { 
  Trash2, 
  Edit3, 
  RefreshCcw, 
  User, 
  Calendar, 
  Save, 
  X, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Settings,
  UserCheck
} from 'lucide-react';

/**
 * MANAGE CHECKLIST: PROTOCOL LEDGER REGISTRY v1.3
 * Purpose: Reconfigures active factory protocol loops and node triggers.
 * Logic: Synchronizes routine updates and termination sequences via centralized API.
 */
const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const [editData, setEditData] = useState({ doerId: '', taskName: '' });

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // --- DATA ACQUISITION: REGISTRY SYNCHRONIZATION ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkRes, empRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);

      const checkData = Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []);
      const empDataRaw = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || []);

      setChecklists(checkData);
      
      setEmployees(empDataRaw.filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));
    } catch (err) {
      console.error("Registry Sync Failure:", err);
      setChecklists([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditData({ 
        doerId: item.doerId?._id || item.doerId, 
        taskName: item.taskName 
    });
  };

  // --- COMMAND: UPDATE PROTOCOL ---
  const handleUpdate = async (id) => {
    try {
      await API.put(`/tasks/checklist-update/${id}`, editData);
      alert("Node Handshake: Checklist protocol synchronized.");
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Update Failure: " + (err.response?.data?.message || err.message));
    }
  };

  // --- COMMAND: TERMINATE ROUTINE ---
  const handleDelete = async (id, name) => {
    if (window.confirm(`SECURITY ALERT: Terminate recurring routine "${name}"? This will cease all future automated triggers.`)) {
      try {
        await API.delete(`/tasks/checklist-delete/${id}`);
        fetchData();
      } catch (err) {
        alert("Termination sequence failure.");
      }
    }
  };

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[600px] gap-8 transition-colors duration-500 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={64} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase">Accessing Ledger Registry...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 pb-20 selection:bg-primary/30">
      
      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner transition-all duration-500">
            <ClipboardList className="text-primary" size={36} />
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Routine Registry</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Reconfigure active factory protocol loops and personnel triggers.
            </p>
          </div>
        </div>
        <button onClick={fetchData} className="group bg-card hover:bg-background border border-border px-10 py-5 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Re-Sync Registry
        </button>
      </div>

      {/* --- MAIN LEDGER CONTAINER --- */}
      <div className="bg-card border border-border rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-500">
        
        {/* Table Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-12 py-8 bg-background/50 backdrop-blur-md border-b border-border font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.3em]">
            <div>Protocol Designation</div>
            <div>Authorized Node</div>
            <div>Cycle Frequency</div>
            <div>Next Maturity</div>
            <div className="text-right">Operational Actions</div>
        </div>

        <div className="flex flex-col divide-y divide-border/40">
            {checklists.map(item => {
            const isEditing = editingId === item._id;
            return (
                <div key={item._id} className={`group transition-all duration-500 ${isEditing ? 'bg-primary/5' : 'hover:bg-background/50'}`}>
                    
                    {/* DATA ROW: Adaptive Grid */}
                    <div className={`grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr] items-center px-10 lg:px-12 py-10 lg:py-8 gap-8 lg:gap-0`}>
                        
                        {/* Designation Column */}
                        <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner ${isEditing ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-background border-border text-primary'}`}>
                                {isEditing ? <Settings size={24} className="animate-spin-slow" /> : <CheckCircle2 size={24} />}
                            </div>
                            {isEditing ? (
                                <div className="flex-1">
                                    <label className="lg:hidden text-[9px] font-black text-primary uppercase mb-2 block tracking-widest">Protocol Name</label>
                                    <input 
                                        type="text" 
                                        value={editData.taskName} 
                                        onChange={(e) => setEditData({...editData, taskName: e.target.value})} 
                                        className="w-full bg-background border-2 border-primary/20 text-foreground px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight outline-none focus:border-primary transition-all shadow-inner" 
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="font-black text-foreground tracking-tighter text-lg lg:text-sm uppercase">{item.taskName}</span>
                                    <span className="lg:hidden text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-2">Node ID: {item._id.slice(-6).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        {/* Personnel Column */}
                        <div className="flex flex-col lg:block">
                            <label className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-3 tracking-[0.2em]">Operating Node</label>
                            {isEditing ? (
                                <div className="relative group">
                                    <select 
                                        value={editData.doerId} 
                                        onChange={(e) => setEditData({...editData, doerId: e.target.value})} 
                                        className="w-full appearance-none bg-background border-2 border-primary/20 text-foreground px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight outline-none cursor-pointer shadow-inner pr-12"
                                    >
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-primary rotate-90 pointer-events-none group-hover:scale-110 transition-transform" size={20} />
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 text-slate-500 font-black text-[11px] uppercase tracking-tighter bg-background border border-border px-5 py-2.5 rounded-xl w-fit shadow-inner">
                                    <User size={14} className="text-primary opacity-60" />
                                    {item.doerId?.name || 'Unassigned Node'}
                                </div>
                            )}
                        </div>

                        {/* Frequency Column */}
                        <div className="flex flex-col lg:block">
                            <label className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-3 tracking-[0.2em]">Temporal Cycle</label>
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-slate-400 dark:text-slate-600" />
                                <span className="text-slate-500 font-black uppercase tracking-[0.25em] text-[10px]">{item.frequency || 'MANUAL'}</span>
                            </div>
                        </div>

                        {/* Next Maturity Column */}
                        <div className="flex flex-col lg:block">
                            <label className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-3 tracking-[0.2em]">Cycle Maturity</label>
                            <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-slate-400 dark:text-slate-600" />
                                <span className="text-slate-500 font-black text-[11px] font-mono tracking-tighter uppercase">
                                    {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'PENDING'}
                                </span>
                            </div>
                        </div>

                        {/* Management Column */}
                        <div className="flex justify-end gap-4 pt-6 lg:pt-0 border-t lg:border-t-0 border-border/40">
                            {isEditing ? (
                                <>
                                    <button onClick={() => handleUpdate(item._id)} className="flex-1 lg:flex-none p-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer">
                                        <Save size={20} /> <span className="lg:hidden font-black uppercase text-xs tracking-widest">Commit Handshake</span>
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex-1 lg:flex-none p-4 bg-slate-900 text-white rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer">
                                        <X size={20} /> <span className="lg:hidden font-black uppercase text-xs tracking-widest">Abort Edit</span>
                                    </button>
                                </>
                            ) : (
                                <div className="flex justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 lg:translate-x-6 transition-all duration-500 w-full lg:w-auto">
                                    <button onClick={() => handleEditClick(item)} className="p-4 bg-background text-slate-500 dark:text-slate-400 rounded-2xl border border-border hover:border-primary hover:text-primary transition-all active:scale-90 shadow-sm" title="Synchronize Parameters">
                                        <Edit3 size={20} />
                                    </button>
                                    <button onClick={() => handleDelete(item._id, item.taskName)} className="p-4 bg-background text-slate-500 dark:text-slate-400 rounded-2xl border border-border hover:border-rose-500 hover:text-rose-500 transition-all active:scale-90 shadow-sm" title="Terminate Lifecycle">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
            })}

            {/* --- EMPTY REGISTRY STATE --- */}
            {(!checklists || checklists.length === 0) && !loading && (
            <div className="flex flex-col items-center justify-center py-40 px-12 text-center animate-in zoom-in-95 duration-700">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse"></div>
                    <ClipboardList size={100} className="text-slate-100 dark:text-slate-800 relative z-10" />
                    <AlertCircle size={36} className="absolute -bottom-2 -right-2 text-primary z-20" />
                </div>
                <p className="font-black text-sm text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em]">Routine Protocol Registry Dormant</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-4 font-bold opacity-60">Initialize new protocol cycles via the command center.</p>
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
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
      `}</style>
    </div>
  );
};

export default ManageChecklist;