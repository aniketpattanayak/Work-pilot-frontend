import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance for AWS compatibility
import ScoreBadge from '../components/ScoreBadge';
import { 
  Eye, 
  Layers, 
  ClipboardCheck, 
  RefreshCcw, 
  User, 
  ArrowRight, 
  Calendar,
  ShieldCheck,
  Activity
} from 'lucide-react';

const ViewerDashboard = ({ tenantId }) => {
  const [data, setData] = useState({ delegationTasks: [], checklistTasks: [] });
  const [loading, setLoading] = useState(true);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * UPDATED: Defensive Data Fetching
   * Uses the API instance and ensures state properties are forced into arrays.
   */
  const fetchData = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      // Switched to centralized API instance
      const res = await API.get(`/superadmin/company-overview/${currentTenantId}`);
      
      // Safety: Extract arrays and provide fallbacks to prevent .map crashes
      const fetchedData = res.data || {};
      setData({
        delegationTasks: Array.isArray(fetchedData.delegationTasks) ? fetchedData.delegationTasks : [],
        checklistTasks: Array.isArray(fetchedData.checklistTasks) ? fetchedData.checklistTasks : []
      });
    } catch (err) {
      console.error("Observer Data Fetch Error:", err);
      setData({ delegationTasks: [], checklistTasks: [] }); // Fallback on error
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={32} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase">Decrypting Factory Overview...</p>
    </div>
  );

  // Defensive Helpers for JSX rendering
  const safeDelegations = Array.isArray(data.delegationTasks) ? data.delegationTasks : [];
  const safeChecklists = Array.isArray(data.checklistTasks) ? data.checklistTasks : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-sky-500/30">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/60 backdrop-blur-md relative overflow-hidden group">
        <div className="absolute -right-16 -top-16 text-sky-500/5 group-hover:scale-110 transition-transform duration-1000">
           <Eye size={200} />
        </div>
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
            <ShieldCheck size={32} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-white text-3xl font-black tracking-tighter m-0 uppercase">Observer Terminal</h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide mt-1">Read-Only Oversight: Analyzing Factory Pulse & Operational Integrity.</p>
          </div>
        </div>

        <button 
          onClick={fetchData}
          className="relative z-10 bg-slate-950 hover:bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95"
        >
          <RefreshCcw size={14} /> Refresh Live Feed
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10">
        
        {/* --- LEFT COLUMN: DELEGATION TASKS --- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Layers size={18} className="text-sky-400" />
            <h3 className="text-slate-100 font-black text-xs uppercase tracking-[0.2em]">Active Delegations</h3>
            <div className="h-px flex-1 bg-slate-800/50" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* FIX: Using safe array for mapping */}
            {safeDelegations.map(task => (
              <div key={task._id} className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-sky-500/30 transition-colors group">
                <div className="flex-1">
                  <h4 className="text-slate-100 font-bold text-lg tracking-tight mb-2 group-hover:text-sky-400 transition-colors">{task.title}</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/50">
                        <User size={12} className="text-sky-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{task.assignerId?.name || 'Assigner'}</span>
                        <ArrowRight size={10} className="text-slate-700" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{task.doerId?.name || 'Doer'}</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ID: {task._id?.slice(-6) || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className={`px-4 py-1.5 rounded-lg border font-black text-[10px] uppercase tracking-widest ${
                        task.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        task.status === 'Completed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                        {task.status || 'Pending'}
                    </div>
                </div>
              </div>
            ))}
            {safeDelegations.length === 0 && (
                <div className="py-20 text-center opacity-30 grayscale flex flex-col items-center gap-4">
                    <Activity size={48} />
                    <p className="font-black text-xs uppercase tracking-widest">No Active Delegations</p>
                </div>
            )}
          </div>
        </section>

        {/* --- RIGHT COLUMN: CHECKLISTS & PERFORMANCE --- */}
        <aside className="space-y-10">
          
          {/* Performance Module */}
          <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800/60 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck size={80} />
             </div>
             <h3 className="text-sky-400 font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <Activity size={16} /> Efficiency Index
             </h3>
             <div className="relative z-10">
                <ScoreBadge tenantId={currentTenantId} /> 
             </div>
          </div>

          {/* Checklist Status */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
                <ClipboardCheck size={18} className="text-emerald-400" />
                <h3 className="text-slate-100 font-black text-xs uppercase tracking-[0.2em]">Routine Progress</h3>
                <div className="h-px flex-1 bg-slate-800/50" />
            </div>

            <div className="flex flex-col gap-3">
                {/* FIX: Using safe array for mapping */}
                {safeChecklists.map(task => (
                <div key={task._id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        <div>
                            <h5 className="text-slate-200 font-bold text-sm tracking-tight m-0">{task.taskName}</h5>
                            <div className="flex items-center gap-2 mt-1 opacity-50">
                                <Calendar size={10} />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    Due: {task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded border border-slate-800 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all">
                        Active Loop
                    </div>
                </div>
                ))}
                {safeChecklists.length === 0 && (
                    <p className="text-center text-slate-700 font-bold uppercase text-[10px] py-10 tracking-[0.2em]">No Recurring Tasks Active</p>
                )}
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
};

export default ViewerDashboard;