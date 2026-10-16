import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
 * REWARDS LOG
 * Everyone: the points history of the tasks they worked on.
 * Admin: the same, plus company-wide done-on-time / late / not-done percentages (Daily / Weekly / Monthly).
 */
const parseHistoryPoints = (text) => {
  const m = String(text || '').match(/([+-]?\d+)\s*$/);
  const n = m ? parseInt(m[1], 10) : 0;
  const lead = String(text || '').match(/\(([^)]+)\)/);
  return { n, lead: lead ? lead[1] : '' };
};

const RewardsLog = ({ userId, tenantId }) => {
  const [allLogs, setAllLogs] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeRange, setActiveRange] = useState('Daily'); // Daily, Weekly, Monthly

  let sessionUser = null;
  try { sessionUser = JSON.parse(localStorage.getItem('user')); } catch (e) { sessionUser = null; }
  const userRoles = Array.isArray(sessionUser?.roles) ? sessionUser.roles : [sessionUser?.role];
  const isAdmin = userRoles.includes('Admin');
  const currentUserId = userId || sessionUser?._id || sessionUser?.id;
  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  const fetchData = useCallback(async () => {
    if (!currentUserId) { setLoading(false); return; }
    try {
      setLoading(true);
      setLoadError('');
      const [tasksRes, allRes] = await Promise.all([
        API.get(`/tasks/doer/${currentUserId}`),
        // The company-wide figures need every task in the company; the assigner list returns that for an Admin.
        isAdmin ? API.get(`/tasks/assigner/${currentUserId}`).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);

      const rawTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.tasks || []);
      const pointsHistory = [];
      // An Admin sees the whole company's point entries; everyone else sees only their own tasks'
      const everyoneForLog = isAdmin ? (Array.isArray(allRes.data) ? allRes.data : (allRes.data?.tasks || null)) : null;
      (everyoneForLog || rawTasks).forEach(task => {
        (task?.history || []).forEach(entry => {
          if (entry.action === 'Points Calculated' || entry.action === 'Points Awarded') {
            const { n, lead } = parseHistoryPoints(entry.remarks);
            pointsHistory.push({ taskTitle: task.title || 'Routine Assignment', pts: n, lead, date: entry.timestamp, id: `${task._id}-${entry._id || entry.timestamp}` });
          }
        });
      });
      setAllLogs(pointsHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));

      const everyone = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.tasks || null);
      setAllTasks(everyone || rawTasks);
    } catch (err) {
      console.error('Ledger Sync Error:', err);
      setLoadError(err?.response?.data?.message || 'Could not load your points. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData, currentTenantId]);

  const analytics = useMemo(() => {
    if (!isAdmin) return null;
    const now = new Date();
    const inRange = (date) => {
      const d = new Date(date);
      if (activeRange === 'Daily') return d.toDateString() === now.toDateString();
      if (activeRange === 'Weekly') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const stats = { doneOnTime: 0, doneLate: 0, missed: 0, total: 0 };
    allTasks.filter((t) => inRange(t.createdAt)).forEach((t) => {
      stats.total++;
      if (t.status === 'Verified' || t.status === 'Completed') {
        const completion = (t.history || []).find((h) => h.action === 'Completed')?.timestamp;
        if (completion && new Date(completion) > new Date(t.deadline)) stats.doneLate++;
        else stats.doneOnTime++;
      } else if (new Date(t.deadline) < now) {
        stats.missed++;
      }
    });
    return stats;
  }, [allTasks, activeRange, isAdmin]);

  // The history follows the Daily / Weekly / Monthly tab, the same way the cards above do
  const logs = useMemo(() => {
    const now = new Date();
    return allLogs.filter((l) => {
      const d = new Date(l.date);
      if (activeRange === 'Daily') return d.toDateString() === now.toDateString();
      if (activeRange === 'Weekly') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [allLogs, activeRange]);
  const netPoints = logs.reduce((sum, l) => sum + l.pts, 0);
  const pct = (n) => (analytics && analytics.total > 0 ? Math.round((n / analytics.total) * 100) : 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[300px] gap-4">
      <RefreshCcw className="animate-spin text-amber-500" size={36} />
      <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.3em] uppercase">Loading points…</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-500 pb-16 selection:bg-amber-500/30">

      {/* HEADER: icon and title are the same height */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 w-10 h-10 flex items-center justify-center rounded-xl border border-amber-500/20 shrink-0">
            <Trophy className="text-amber-600 dark:text-amber-400" size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-xl font-black tracking-tight uppercase leading-none">
              {isAdmin ? 'Factory Audit Intelligence' : 'Rewards Log'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide mt-1.5 opacity-80">
              {isAdmin ? 'Monitoring global work-completion percentages' : 'Your personal point accrual ledger'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex bg-card p-1 rounded-xl border border-border">
            {['Daily', 'Weekly', 'Monthly'].map(range => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeRange === range ? 'bg-primary text-white shadow' : 'text-slate-500 hover:text-foreground'}`}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-xs font-bold">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {loadError}</span>
          <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-widest">Try again</button>
        </div>
      )}

      {/* ADMIN PERFORMANCE SCOREBOARD */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Done On Time', v: pct(analytics.doneOnTime), cls: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle2 },
            { label: 'Done Late', v: pct(analytics.doneLate), cls: 'text-amber-600 dark:text-amber-400', Icon: Clock },
            { label: 'Work Not Done', v: pct(analytics.missed), cls: 'text-red-600 dark:text-red-500', Icon: AlertCircle },
            { label: 'Total Integrity', v: pct(analytics.doneOnTime + analytics.doneLate), cls: 'text-foreground', Icon: TrendingUp },
          ].map(({ label, v, cls, Icon }) => (
            <div key={label} className="bg-card px-4 py-3 rounded-2xl border border-border relative overflow-hidden">
              <div className={`absolute top-2 right-3 opacity-10 ${cls}`}><Icon size={32} /></div>
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.25em]">{label}</span>
              <div className={`text-2xl font-black mt-1 tracking-tighter ${cls}`}>{v}%</div>
            </div>
          ))}
          <p className="col-span-2 md:col-span-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest -mt-1 ml-1">Based on {analytics.total} task{analytics.total === 1 ? '' : 's'} created in this period.</p>
        </div>
      )}

      {/* LEDGER */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 ml-1">
        <h3 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.3em]">
          <HistoryIcon size={14} /> Points history
        </h3>
        {logs.length > 0 && (
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {logs.length} entr{logs.length === 1 ? 'y' : 'ies'} · Net <span className={netPoints >= 0 ? 'text-emerald-600' : 'text-red-600'}>{netPoints > 0 ? '+' : ''}{netPoints} pts</span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        {logs.length > 0 ? logs.map((log) => {
          const positive = log.pts > 0;
          const negative = log.pts < 0;
          return (
            <div key={log.id} className="bg-card px-4 py-3 rounded-2xl border border-border flex items-center justify-between gap-4 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl border shrink-0 ${positive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : negative ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-slate-500/10 text-slate-500 border-border'}`}>
                  {negative ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-foreground font-black text-sm uppercase tracking-tight truncate">{log.taskTitle}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-primary/50" /> {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Clock size={11} className="text-primary/50" /> {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {log.lead && <span>Lead: {log.lead}</span>}
                  </div>
                </div>
              </div>
              <div className={`text-xl font-black tracking-tighter shrink-0 ${positive ? 'text-emerald-600 dark:text-emerald-500' : negative ? 'text-red-600 dark:text-red-500' : 'text-slate-500'}`}>
                {positive ? '+' : ''}{log.pts} <span className="text-[10px] font-black uppercase tracking-widest">pts</span>
              </div>
            </div>
          );
        }) : (
          !loadError && (
            <div className="py-12 text-center border-2 border-dashed border-border rounded-2xl bg-background/50 px-4">
              <HistoryIcon size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[11px]">{allLogs.length > 0 ? 'No points recorded in this period' : 'No points recorded yet'}</p>
              <p className="text-slate-400 font-bold text-xs mt-2 max-w-md mx-auto">Points are added to the lead doer when a delegation task is completed. If nothing ever appears here, ask your Admin to switch the Performance Engine on in Settings.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default RewardsLog;