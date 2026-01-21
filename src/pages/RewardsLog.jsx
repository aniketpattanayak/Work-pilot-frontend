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
  BarChart3,
  Users,
  Target,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

/**
 * REWARDS LOG: PERFORMANCE ANALYTICS & AUDIT LEDGER v2.0
 * Purpose: Unified oversight for Admin global analytics and User point tracking.
 * Feature: Dynamic Daily/Weekly/Monthly work completion percentages.
 */
const RewardsLog = ({ userId, tenantId }) => {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('Daily'); // Daily, Weekly, Monthly

  const sessionUser = JSON.parse(localStorage.getItem('user'));
  const userRoles = Array.isArray(sessionUser?.roles) ? sessionUser.roles : [sessionUser?.role];
  const isAdmin = userRoles.includes('Admin');
  const currentUserId = userId || sessionUser?._id || sessionUser?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * DATA ACQUISITION: Unified Performance Engine
   */
  const fetchData = useCallback(async () => {
    if (!currentUserId || !currentTenantId) return;
    try {
      setLoading(true);
      
      // Fetch both tasks and global analytics in parallel
      const [tasksRes, analyticsRes] = await Promise.all([
        API.get(`/tasks/doer/${currentUserId}`),
        isAdmin ? API.get(`/tasks/overview/${currentTenantId}`) : Promise.resolve({ data: null })
      ]);
      
      const rawTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.tasks || []);
      const pointsHistory = [];
      
      // Parse Personal Reward Ledger
      rawTasks.forEach(task => {
        if (task?.history) {
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

      setLogs(pointsHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));
      
      // Calculate Frontend Performance Percentages
      if (isAdmin) {
          // Note: In a production environment, this math should move to the Backend Controller
          const now = new Date();
          const filterByRange = (date) => {
              const d = new Date(date);
              if (activeRange === 'Daily') return d.toDateString() === now.toDateString();
              if (activeRange === 'Weekly') {
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  return d >= weekAgo;
              }
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          };

          const stats = {
              doneOnTime: 0,
              doneLate: 0,
              missed: 0,
              total: rawTasks.length
          };

          rawTasks.filter(t => filterByRange(t.createdAt)).forEach(t => {
              if (t.status === 'Verified' || t.status === 'Completed') {
                  const completion = t.history.find(h => h.action === 'Completed')?.timestamp;
                  if (new Date(completion) <= new Date(t.deadline)) stats.doneOnTime++;
                  else stats.doneLate++;
              } else if (new Date(t.deadline) < now) {
                  stats.missed++;
              }
          });

          setAnalytics(stats);
      }
    } catch (err) {
      console.error("Ledger Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentTenantId, isAdmin, activeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <div className="relative">
        <RefreshCcw className="animate-spin text-amber-500" size={48} />
        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase">Decrypting Performance Ledger...</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-amber-500/30">
      
      {/* HEADER SECTION */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
            <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 shadow-xl shrink-0">
              <Trophy className="text-amber-600 dark:text-amber-400" size={36} />
            </div>
            <div className="min-w-0">
              <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">
                {isAdmin ? 'Factory Audit Intelligence' : 'Rewards Log'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">
                {isAdmin ? 'Monitoring global work-completion percentages' : 'Your personal point accrual ledger'}
              </p>
            </div>
        </div>

        {isAdmin && (
            <div className="flex bg-card p-1.5 rounded-2xl border border-border shadow-inner">
                {['Daily', 'Weekly', 'Monthly'].map(range => (
                    <button 
                        key={range}
                        onClick={() => setActiveRange(range)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRange === range ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-foreground'}`}
                    >
                        {range}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* ADMIN PERFORMANCE SCOREBOARD */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={60} /></div>
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Done On Time</span>
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tighter">
                    {analytics.total > 0 ? Math.round((analytics.doneOnTime / analytics.total) * 100) : 0}%
                </div>
            </div>
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-amber-500 group-hover:scale-110 transition-transform"><Clock size={60} /></div>
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Done Late</span>
                <div className="text-4xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tighter">
                    {analytics.total > 0 ? Math.round((analytics.doneLate / analytics.total) * 100) : 0}%
                </div>
            </div>
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 group-hover:scale-110 transition-transform"><AlertCircle size={60} /></div>
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Work Not Done</span>
                <div className="text-4xl font-black text-red-600 dark:text-red-500 mt-2 tracking-tighter">
                    {analytics.total > 0 ? Math.round((analytics.missed / analytics.total) * 100) : 0}%
                </div>
            </div>
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-primary group-hover:scale-110 transition-transform"><TrendingUp size={60} /></div>
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Total Integrity</span>
                <div className="text-4xl font-black text-foreground mt-2 tracking-tighter">
                    {analytics.total > 0 ? Math.round(((analytics.doneOnTime + analytics.doneLate) / analytics.total) * 100) : 0}%
                </div>
            </div>
        </div>
      )}

      {/* LEDGER LIST */}
      <h3 className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-8 ml-2">
        <HistoryIcon size={16} /> Audit Trail & Accrual History
      </h3>

      <div className="space-y-4">
        {logs.length > 0 ? logs.map((log, i) => {
          const pointStr = log.points || "";
          const isPositive = pointStr.includes('+');
          
          return (
            <div key={i} className="bg-card backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-amber-500/30 transition-all duration-500 shadow-xl gap-6">
              <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className={`p-4 rounded-2xl border shrink-0 transition-all duration-500 ${isPositive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                  {isPositive ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                </div>

                <div className="min-w-0">
                  <h4 className="text-foreground font-black text-base md:text-lg uppercase tracking-tight truncate group-hover:text-primary transition-colors">{log.taskTitle}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-lg border border-border text-[10px] text-slate-500 font-black uppercase tracking-widest shadow-inner">
                      <Calendar size={12} className="text-primary/50" /> {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-lg border border-border text-[10px] text-slate-500 font-black uppercase tracking-widest shadow-inner">
                      <Clock size={12} className="text-primary/50" /> {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-left sm:text-right border-t sm:border-t-0 border-border/50 pt-4 sm:pt-0 w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                <div className={`text-2xl md:text-3xl font-black tracking-tighter ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {pointStr.split('points')[0].trim()} <span className="text-[10px] md:text-xs font-black uppercase tracking-widest ml-1">pts</span>
                </div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] sm:mt-1.5">Operational Event</div>
              </div>
            </div>
          );
        }) : (
          <div className="py-24 text-center border-2 border-dashed border-border rounded-[3rem] group bg-background/50">
              <HistoryIcon size={64} className="text-slate-300 dark:text-slate-800 mx-auto mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px]">No Recorded Transactions Detected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsLog;