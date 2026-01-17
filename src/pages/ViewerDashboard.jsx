import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; 
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
  Activity,
  ChevronRight,
  TrendingUp,
  Clock,
  Target,
  Layout
} from 'lucide-react';

/**
 * VIEWER DASHBOARD: GLOBAL SURVEILLANCE TERMINAL v1.3
 * Purpose: Read-only oversight of factory integrity analytics and mission states.
 * Logic: Aggregates delegation and checklist telemetry for executive review.
 */
const ViewerDashboard = ({ tenantId }) => {
  const [data, setData] = useState({ delegationTasks: [], checklistTasks: [] });
  const [loading, setLoading] = useState(true);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // --- DATA ACQUISITION: FACTORY PULSE SYNCHRONIZATION ---
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
      console.error("Observer Telemetry Sync Error:", err);
      setData({ delegationTasks: [], checklistTasks: [] }); 
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- SKELETON LOADING VIEW (Adaptive Theme) ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[600px] gap-8 transition-all duration-700 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={64} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase text-center">Decrypting Factory Pulse...</p>
    </div>
  );

  const safeDelegations = Array.isArray(data.delegationTasks) ? data.delegationTasks : [];
  const safeChecklists = Array.isArray(data.checklistTasks) ? data.checklistTasks : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 pb-24 selection:bg-primary/30">
      
      {/* --- EXECUTIVE OBSERVER HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 bg-card backdrop-blur-xl p-10 md:p-12 rounded-[4rem] border border-border relative overflow-hidden group shadow-2xl transition-all duration-500">
        {/* Thematic Watermark */}
        <div className="absolute -right-20 -top-20 text-primary opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all duration-1000 pointer-events-none">
           <Eye size={320} />
        </div>
        
        <div className="relative z-10 flex items-center gap-8">
          <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 shadow-inner transition-transform group-hover:scale-105">
            <ShieldCheck size={40} className="text-primary" />
          </div>
          <div>
            <h1 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Observer Terminal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
                Read-Only Oversight: Factory Integrity & Operational Analytics
            </p>
          </div>
        </div>

        <button 
          onClick={fetchData}
          className="relative z-10 bg-foreground text-background dark:bg-primary dark:text-slate-950 hover:opacity-90 border border-border px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-2xl"
        >
          <RefreshCcw size={16} className="animate-spin-slow" /> Sync Intelligence
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12">
        
        {/* --- LEFT COLUMN: DELEGATION GRID FEED --- */}
        <section className="space-y-10">
          <div className="flex items-center gap-6 px-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner">
                <Layers size={24} className="text-primary" />
            </div>
            <h3 className="text-foreground font-black text-2xl tracking-tighter uppercase leading-none">Active Delegations</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {safeDelegations.map((task, idx) => (
              <div 
                key={task._id} 
                className="group bg-card backdrop-blur-xl p-8 md:p-10 rounded-[3rem] border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-10 hover:border-primary/40 transition-all duration-500 shadow-xl dark:shadow-none animate-in slide-in-from-left-4"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-black text-2xl tracking-tight mb-5 uppercase group-hover:text-primary transition-colors duration-300">{task.title}</h4>
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-4 bg-background border border-border px-5 py-2.5 rounded-2xl shadow-inner">
                        <User size={16} className="text-primary opacity-60" />
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{task.assignerId?.name || 'Assigner Node'}</span>
                        <ArrowRight size={14} className="text-slate-300 dark:text-slate-700" />
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">{task.doerId?.name || 'Execution Node'}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest font-mono bg-background border border-border px-4 py-2 rounded-xl">NODE: {task._id?.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto shrink-0">
                    <div className={`flex-1 md:flex-none text-center px-8 py-2.5 rounded-full border font-black text-[10px] uppercase tracking-[0.2em] shadow-sm transition-all ${
                        task.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        task.status === 'Completed' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-primary/10 text-primary border-primary/20'
                    }`}>
                        {task.status || 'Active'}
                    </div>
                    <div className="hidden lg:flex p-3 bg-background rounded-2xl border border-border text-slate-300 dark:text-slate-700 group-hover:text-primary group-hover:border-primary/30 transition-all duration-300 shadow-inner">
                        <ChevronRight size={22} />
                    </div>
                </div>
              </div>
            ))}
            
            {safeDelegations.length === 0 && (
                <div className="py-32 text-center border-4 border-dashed border-border rounded-[4rem] opacity-30 grayscale transition-all animate-in zoom-in-95">
                    <Activity size={80} className="mx-auto mb-8 text-slate-300 dark:text-slate-700" />
                    <p className="font-black text-sm uppercase tracking-[0.6em] text-slate-400">Delegation Grid Dormant</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-4 opacity-50">No mission data detected in current sector.</p>
                </div>
            )}
          </div>
        </section>

        {/* --- RIGHT COLUMN: FACTORY PULSE & RECURRING CYCLES --- */}
        <aside className="space-y-16">
          
          {/* Efficiency Index Module */}
          <div className="space-y-8">
            <div className="flex items-center gap-5 px-3">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-inner"><TrendingUp size={22} className="text-amber-500" /></div>
                <h3 className="text-foreground font-black text-[11px] uppercase tracking-[0.4em]">Operational Health Pulse</h3>
            </div>
            <div className="bg-card backdrop-blur-xl p-10 rounded-[3.5rem] border border-border shadow-2xl relative overflow-hidden transition-all duration-500 group/health">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/health:opacity-10 transition-opacity">
                    <ShieldCheck size={180} className="text-primary" />
                </div>
                <div className="relative z-10">
                    <ScoreBadge tenantId={currentTenantId} /> 
                </div>
            </div>
          </div>

          {/* Routine Protocol surveillance */}
          <section className="space-y-8">
            <div className="flex items-center gap-5 px-3">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner"><ClipboardCheck size={22} className="text-emerald-500" /></div>
                <h3 className="text-foreground font-black text-[11px] uppercase tracking-[0.4em]">Protocol Cycles</h3>
                <div className="h-px flex-1 bg-border/50" />
            </div>

            <div className="grid grid-cols-1 gap-5">
                {safeChecklists.map((task, cIdx) => (
                <div 
                  key={task._id} 
                  className="bg-card border border-border p-8 rounded-[2.5rem] flex justify-between items-center group hover:border-emerald-500/40 transition-all shadow-xl dark:shadow-none animate-in slide-in-from-right-4"
                  style={{ animationDelay: `${cIdx * 50}ms` }}
                >
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981]" />
                            <div className="absolute inset-0 bg-emerald-500 blur-md rounded-full animate-ping opacity-40" />
                        </div>
                        <div>
                            <h5 className="text-foreground font-black text-xl tracking-tighter m-0 uppercase leading-none">{task.taskName}</h5>
                            <div className="flex items-center gap-4 mt-3 opacity-70">
                                <span className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                    <Clock size={14} className="text-primary" /> Cycle Maturity: {task.nextDueDate ? new Date(task.nextDueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'INF'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:block">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.25em] border border-border px-6 py-2 rounded-full group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all shadow-inner bg-background/50">
                            Active Loop
                        </span>
                    </div>
                </div>
                ))}
                {safeChecklists.length === 0 && (
                    <div className="py-24 text-center border-4 border-dashed border-border rounded-[3rem] opacity-20 transition-all">
                         <Calendar size={64} className="mx-auto mb-6 text-slate-300 dark:text-slate-700" />
                         <p className="font-black text-[12px] uppercase tracking-[0.5em]">No Protocol Loops Active</p>
                    </div>
                )}
            </div>
          </section>

        </aside>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}</style>
    </div>
  );
};

export default ViewerDashboard;