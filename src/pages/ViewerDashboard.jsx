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

/**
 * VIEWER DASHBOARD: OBSERVER TERMINAL v1.5
 * Purpose: Provides read-only oversight with adaptive Light/Dark support.
 * UI: Fully responsive grid with high-density technical telemetry.
 */
const ViewerDashboard = ({ tenantId }) => {
  const [data, setData] = useState({ delegationTasks: [], checklistTasks: [] });
  const [loading, setLoading] = useState(true);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * DATA ACQUISITION: Defensively synchronizing factory telemetry.
   */
  const fetchData = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      const res = await API.get(`/superadmin/company-overview/${currentTenantId}`);
      
      const fetchedData = res.data || {};
      setData({
        delegationTasks: Array.isArray(fetchedData.delegationTasks) ? fetchedData.delegationTasks : [],
        checklistTasks: Array.isArray(fetchedData.checklistTasks) ? fetchedData.checklistTasks : []
      });
    } catch (err) {
      console.error("Observer Data Fetch Error:", err);
      setData({ delegationTasks: [], checklistTasks: [] }); 
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={40} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase leading-none">Decrypting Factory Overview...</p>
    </div>
  );

  const safeDelegations = Array.isArray(data.delegationTasks) ? data.delegationTasks : [];
  const safeChecklists = Array.isArray(data.checklistTasks) ? data.checklistTasks : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* --- EXECUTIVE HEADER SECTION (Responsive) --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 bg-card backdrop-blur-xl p-8 rounded-[2rem] md:rounded-[2.5rem] border border-border relative overflow-hidden group transition-colors duration-500 shadow-xl">
        <div className="absolute -right-16 -top-16 text-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
           <Eye size={200} />
        </div>
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter m-0 uppercase leading-none truncate">Observer Terminal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Analyzing Factory Pulse & Operational Integrity.</p>
          </div>
        </div>

        <button 
          onClick={fetchData}
          className="group relative z-10 bg-background hover:bg-card border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-lg hover:shadow-primary/5"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh Live Feed
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 md:gap-12">
        
        {/* --- LEFT COLUMN: MISSION DELEGATIONS (Responsive List) --- */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2">
            <Layers size={20} className="text-primary" />
            <h3 className="text-foreground font-black text-xs uppercase tracking-[0.3em]">Active Delegations</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="flex flex-col gap-4">
            {safeDelegations.map(task => (
              <div key={task._id} className="bg-card backdrop-blur-xl p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-primary/30 transition-all group shadow-xl hover:shadow-primary/5">
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-black text-lg md:text-xl uppercase tracking-tight mb-3 group-hover:text-primary transition-colors truncate leading-tight">{task.title}</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-xl border border-border shadow-inner">
                        <User size={12} className="text-primary" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{task.assignerId?.name || 'Assigner'}</span>
                        <ArrowRight size={10} className="text-primary/30" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter">{task.doerId?.name || 'Doer Node'}</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest font-mono">ID: {task._id?.slice(-6).toUpperCase() || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                    <div className={`px-5 py-2 rounded-xl border font-black text-[9px] uppercase tracking-widest shadow-sm ${
                        task.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        task.status === 'Completed' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-primary/5 text-primary border-primary/20'
                    }`}>
                        {task.status || 'Provisioning'}
                    </div>
                </div>
              </div>
            ))}
            {safeDelegations.length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-background/50 group transition-colors duration-500">
                    <Activity size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-800 group-hover:scale-110 transition-transform" />
                    <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">No Active Delegations Detected</p>
                </div>
            )}
          </div>
        </section>

        {/* --- RIGHT COLUMN: CHECKLISTS & PERFORMANCE --- */}
        <aside className="space-y-12">
          
          {/* Performance Module: Adaptive Surface */}
          <div className="bg-card backdrop-blur-xl p-8 rounded-[2rem] md:rounded-[2.5rem] border border-border shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <ShieldCheck size={120} className="text-primary" />
             </div>
             <h3 className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-8 flex items-center gap-3 relative z-10">
               <Activity size={18} /> Efficiency Matrix
             </h3>
             <div className="relative z-10">
                <ScoreBadge employeeId={currentTenantId} /> 
             </div>
          </div>

          {/* Routine Status Loop */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 px-2">
                <ClipboardCheck size={20} className="text-emerald-500" />
                <h3 className="text-foreground font-black text-xs uppercase tracking-[0.3em]">Operational Loop</h3>
                <div className="h-px flex-1 bg-border/50" />
            </div>

            <div className="flex flex-col gap-4">
                {safeChecklists.map(task => (
                <div key={task._id} className="bg-card border border-border p-6 rounded-[1.5rem] sm:rounded-2xl flex justify-between items-center group hover:border-emerald-500/30 transition-all shadow-xl hover:shadow-emerald-500/5">
                    <div className="flex items-center gap-5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse shrink-0" />
                        <div className="min-w-0">
                            <h5 className="text-foreground font-black text-base tracking-tight m-0 uppercase truncate leading-none mb-2">{task.taskName}</h5>
                            <div className="flex items-center gap-2 opacity-60">
                                <Calendar size={12} className="text-primary/40" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    Sync: {task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'AWAITING'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-background px-4 py-2 rounded-xl border border-border shadow-inner group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all shrink-0 ml-4">
                        Active Node
                    </div>
                </div>
                ))}
                {safeChecklists.length === 0 && (
                    <div className="p-16 text-center bg-background/50 border-2 border-dashed border-border rounded-[2.5rem] opacity-30 grayscale transition-colors">
                      <p className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-500">Recursive Registry Offline</p>
                    </div>
                )}
            </div>
          </section>

        </aside>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default ViewerDashboard;