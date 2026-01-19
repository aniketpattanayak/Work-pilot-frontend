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

const RewardsLog = ({ userId, tenantId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Persistence for IDs
  const sessionUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = userId || sessionUser?._id || sessionUser?.id;

  /**
   * UPDATED: Defensive Data Fetching
   * Uses the API instance and ensures nested history is parsed safely.
   */
  const fetchHistory = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      // Switched to centralized API instance
      const res = await API.get(`/tasks/doer/${currentUserId}`);
      
      // Safety: Unwrap data (handles both flat arrays and {tasks: []} structures)
      const rawTasks = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.tasks || res.data?.data || []);

      // Extract only the point-related history entries
      const pointsHistory = [];
      
      rawTasks.forEach(task => {
        // Defensive check: Ensure task.history exists and is an array
        if (task && Array.isArray(task.history)) {
          task.history.forEach(entry => {
            // Filtering for specific point-award actions
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

      // Sort by most recent transaction first
      setLogs(pointsHistory.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
    } catch (err) {
      console.error("Error fetching points history:", err);
      setLogs([]); // Fallback
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-amber-500" size={40} />
      <span className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase leading-none">Auditing Reward Ledger...</span>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* Header Section */}
      <div className="mb-10 flex items-center gap-4">
        <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.1)]">
          <Trophy className="text-amber-400" size={32} />
        </div>
        <div>
          <h2 className="text-white text-3xl font-black tracking-tighter">Rewards Log</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Point logs view coming soon... </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* FIX: Using Array.isArray and length check for safety */}
        {Array.isArray(logs) && logs.length > 0 ? logs.map((log, i) => {
          // Safety on remarks string
          const pointStr = log.points || "";
          const isPositive = pointStr.includes('+');
          
          return (
            <div 
              key={i} 
              className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/60 flex items-center justify-between group hover:border-sky-500/20 transition-all animate-in slide-in-from-bottom-2 duration-300" 
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-6">
                <div className={`p-3 rounded-xl border ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {isPositive ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                </div>
                <div>
                  <h4 className="text-white font-bold text-base group-hover:text-sky-400 transition-colors">{log.taskTitle}</h4>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                      <Calendar size={12} className="text-slate-700" /> {log.date ? new Date(log.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                      <Clock size={12} className="text-slate-700" /> {log.date ? new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-black tracking-tighter ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {/* Defensive splitting of the point string */}
                  {pointStr.split('points')[0].trim()} <span className="text-[10px] font-bold uppercase tracking-widest">pts</span>
                </div>
                <div className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">Performance Event</div>
              </div>
            </div>
          );
        }) : (
          <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] group">
              <HistoryIcon size={48} className="mx-auto text-slate-800 mb-4 group-hover:text-slate-700 transition-colors" />
              <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No recorded point transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsLog;