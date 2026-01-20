import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
import { 
  Trophy, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock, 
  Calendar, 
  RefreshCcw,
  History as HistoryIcon 
} from 'lucide-react';

/**
 * REWARDS LOG: PERFORMANCE AUDIT LEDGER v1.5
 * Purpose: Aggregates and displays point transactions with full theme support.
 * UI: Responsive, theme-adaptive (Light/Dark), and high-density typography.
 */
const RewardsLog = ({ userId, tenantId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Persistence for IDs
  const sessionUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = userId || sessionUser?._id || sessionUser?.id;

  /**
   * DATA ACQUISITION: Defensively parsing nested task history for point events.
   */
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
      console.error("Error fetching points history:", err);
      setLogs([]); 
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-amber-500" size={48} />
        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase leading-none">Auditing Reward Ledger...</span>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-amber-500/30">
      
      {/* HEADER SECTION (Responsive Scaling) */}
      <div className="mb-12 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.1)] shrink-0">
          <Trophy className="text-amber-600 dark:text-amber-400" size={36} />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">Rewards Log</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Point log view coming soon</p>
        </div>
      </div>

      {/* TRANSACTION LIST: Responsive Cards */}
      <div className="space-y-4">
        {Array.isArray(logs) && logs.length > 0 ? logs.map((log, i) => {
          const pointStr = log.points || "";
          const isPositive = pointStr.includes('+');
          
          return (
            <div 
              key={i} 
              className="bg-card backdrop-blur-xl p-5 md:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-amber-500/30 transition-all duration-500 animate-in slide-in-from-bottom-3 shadow-xl gap-6" 
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-6 w-full sm:w-auto">
                {/* Visual Type Indicator */}
                <div className={`p-4 rounded-2xl border shrink-0 transition-all duration-500 ${
                  isPositive 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' 
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-red-500/5'
                }`}>
                  {isPositive ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                </div>

                <div className="min-w-0">
                  <h4 className="text-foreground font-black text-base md:text-lg uppercase tracking-tight truncate group-hover:text-primary transition-colors">{log.taskTitle}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-lg border border-border text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest shadow-inner">
                      <Calendar size={12} className="text-primary/50" /> {log.date ? new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-lg border border-border text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest shadow-inner">
                      <Clock size={12} className="text-primary/50" /> {log.date ? new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Point Accrual Display */}
              <div className="text-left sm:text-right border-t sm:border-t-0 border-border/50 pt-4 sm:pt-0 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                <div className={`text-2xl md:text-3xl font-black tracking-tighter transition-all ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {pointStr.split('points')[0].trim()} <span className="text-[10px] md:text-xs font-black uppercase tracking-widest ml-1">pts</span>
                </div>
                <div className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.3em] sm:mt-1.5">Operational Event</div>
              </div>
            </div>
          );
        }) : (
          /* EMPTY STATE HANDLER */
          <div className="py-24 text-center border-2 border-dashed border-border rounded-[3rem] group bg-background/50 transition-colors duration-500">
              <div className="relative inline-block mb-6">
                <HistoryIcon size={64} className="text-slate-300 dark:text-slate-800 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute -top-2 -right-2 bg-amber-500/10 p-1.5 rounded-full border border-amber-500/20"><RefreshCcw size={16} className="text-amber-500" /></div>
              </div>
              <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.5em] text-[10px]">No Recorded Point Transactions Detected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsLog;