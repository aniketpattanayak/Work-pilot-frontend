import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; 
import { 
  Trophy, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock, 
  Calendar, 
  RefreshCcw,
  History as HistoryIcon,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';

/**
 * REWARDS LOG: OPERATIONAL PERFORMANCE LEDGER v1.3
 * Purpose: Full performance audit of transactional point earnings and protocol penalties.
 * Logic: Extracts and sorts point-related events from the task telemetry history.
 */
const RewardsLog = ({ userId, tenantId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const sessionUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = userId || sessionUser?._id || sessionUser?.id;

  // --- DATA ACQUISITION: POINT TELEMETRY ---
  const fetchHistory = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/doer/${currentUserId}`);
      
      const rawTasks = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.tasks || res.data?.data || []);

      const pointsHistory = [];
      
      rawTasks.forEach(task => {
        if (task && Array.isArray(task.history)) {
          task.history.forEach(entry => {
            if (entry.action === 'Points Calculated' || entry.action === 'Points Awarded') {
              pointsHistory.push({
                taskTitle: task.title || "Routine Assignment",
                points: entry.remarks || "0 points",
                date: entry.timestamp,
                id: task._id
              });
            }
          });
        }
      });

      setLogs(pointsHistory.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
    } catch (err) {
      console.error("Ledger Sync Failure:", err);
      setLogs([]); 
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[600px] gap-8 transition-colors duration-500 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-amber-500" size={56} />
        <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
      </div>
      <span className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase">Auditing Reward Ledger...</span>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-1000 pb-24 selection:bg-amber-500/20">
      
      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-amber-500/20 blur-2xl group-hover:bg-amber-500/40 transition-all rounded-full" />
            <div className="relative bg-amber-500/10 p-5 rounded-[2rem] border border-amber-500/20 shadow-inner transition-all duration-500">
                <Trophy className="text-amber-500" size={36} />
            </div>
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Rewards Log</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
                Performance Audit: Transactional Merit Earnings & Protocol Penalties
            </p>
          </div>
        </div>
        <div className="bg-card px-8 py-4 rounded-2xl border border-border shadow-xl">
            <div className="flex items-center gap-4">
                <TrendingUp size={18} className="text-emerald-500" />
                <span className="text-[10px] font-black text-slate-500 dark:text-primary uppercase tracking-[0.25em]">Node Liquidity Active</span>
            </div>
        </div>
      </div>

      {/* --- TRANSACTIONAL LEDGER GRID --- */}
      <div className="space-y-5">
        {Array.isArray(logs) && logs.length > 0 ? logs.map((log, i) => {
          const pointStr = log.points || "";
          const isPositive = pointStr.includes('+');
          
          return (
            <div 
              key={i} 
              className="group bg-card backdrop-blur-xl p-6 md:p-10 rounded-[3rem] border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 hover:bg-background/50 hover:border-amber-500/30 transition-all duration-500 shadow-xl dark:shadow-none animate-in slide-in-from-bottom-4" 
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-8 w-full sm:w-auto">
                {/* Status Indicator Node */}
                <div className={`p-5 rounded-[1.5rem] border shrink-0 shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3 ${
                    isPositive 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}>
                  {isPositive ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="text-foreground font-black text-xl tracking-tight uppercase truncate group-hover:text-primary transition-colors duration-300">
                    {log.taskTitle}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2.5 bg-background border border-border px-4 py-1.5 rounded-xl shadow-inner">
                      <Calendar size={12} className="text-primary/60" /> {log.date ? new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2.5 bg-background border border-border px-4 py-1.5 rounded-xl shadow-inner">
                      <Clock size={12} className="text-primary/60" /> {log.date ? new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest font-mono">ID: {log.id?.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-10 pl-3 sm:pl-0">
                <div className="flex flex-col items-end">
                    <div className={`text-4xl font-black tracking-tighter leading-none flex items-baseline gap-1.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {pointStr.split('points')[0].trim()}
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-40 italic">pts</span>
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] mt-3">
                        {isPositive ? 'Protocol Merit' : 'Cycle Penalty'}
                    </div>
                </div>
                <div className="p-3 bg-background rounded-2xl border border-border text-slate-300 dark:text-slate-700 transition-all group-hover:text-primary group-hover:border-primary/30 group-hover:scale-110 shadow-inner">
                    <ChevronRight size={22} />
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="py-48 text-center transition-all animate-in zoom-in-95 duration-1000">
              <div className="relative inline-block mb-10">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse"></div>
                  <HistoryIcon size={100} className="text-slate-100 dark:text-slate-800 relative z-10" />
                  <ShieldCheck size={36} className="absolute -bottom-2 -right-2 text-primary z-20" />
              </div>
              <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.6em] text-sm">Ledger Sequence Dormant</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-4 opacity-60">No merit or penalty events detected in the current cycle.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsLog;