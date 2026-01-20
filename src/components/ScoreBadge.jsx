import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Target, 
  Zap, 
  AlertCircle, 
  TrendingUp, 
  RefreshCcw, 
  Trophy,
  Star,
  Medal,
  Flame,
  Rocket,
  Award,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';

/**
 * SCORE BADGE: THEME-AWARE PERFORMANCE MODULE
 * Purpose: Analyzes and renders node efficiency with adaptive Light/Dark surfaces.
 * Responsive: Scales typography and layout for mobile/desktop parity.
 */
const ScoreBadge = ({ employeeId, minimalist = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const badgeIconMap = {
    Star, Trophy, Medal, Zap, ShieldCheck, Flame, Target, Rocket, Award
  };

  useEffect(() => {
    const fetchScore = async () => {
      if (!employeeId) return; 
      try {
        setLoading(true);
        const res = await axios.get(`/tasks/score/${employeeId}`);
        setStats(res.data);
      } catch (err) {
        console.error("Score fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [employeeId]);

  // --- SKELETON LOADING STATE (Adaptive) ---
  if (!stats || loading) return (
    <div className="flex items-center gap-3 animate-pulse px-4 py-2 bg-card/50 border border-border rounded-2xl w-fit">
      <div className="w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center">
        <RefreshCcw size={14} className="text-primary animate-spin" />
      </div>
      {!minimalist && <div className="h-3 w-20 bg-background rounded-md"></div>}
    </div>
  );

  const numericScore = Number(stats.score) || 0;
  const isHighPerformer = numericScore > 75;
  const currentPoints = Number(stats.totalPoints) || 0; 
  const earnedBadges = stats.earnedBadges || [];

  // --- MINIMALIST HEADER VIEW (True Adaptive Light/Dark) ---
  if (minimalist) {
    return (
      <div className="flex items-center bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-1.5 pr-4 gap-3 h-11 shadow-sm transition-all duration-500 hover:scale-105 active:scale-95 cursor-default group">
        <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" className="stroke-border fill-none" strokeWidth="4" />
            <circle
              cx="20" cy="20" r="18"
              className={`fill-none transition-all duration-1000 ${isHighPerformer ? 'stroke-emerald-500' : 'stroke-amber-500'}`}
              strokeWidth="4"
              strokeDasharray="113.1"
              strokeDashoffset={113.1 - (113.1 * numericScore) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-black leading-none text-foreground">
              {Math.round(numericScore)}%
            </span>
          </div>
        </div>

        <div className="flex flex-col border-l border-border pl-3 h-7 justify-center">
            <div className="flex items-center gap-1">
                <Trophy size={11} className={`${currentPoints > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"} transition-colors`} />
                <span className="text-foreground font-black text-xs leading-none">{currentPoints}</span>
            </div>
            <span className="text-[6px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-0.5">Points</span>
        </div>
      </div>
    );
  }

  // --- FULL DASHBOARD VIEW (Responsive Industrial Layout) ---
  return (
    <div className={`
      relative overflow-hidden group p-6 md:p-10 rounded-[3rem] border transition-all duration-700 shadow-xl
      ${isHighPerformer 
        ? 'bg-emerald-50/50 dark:bg-emerald-500/[0.03] border-emerald-100 dark:border-emerald-500/20' 
        : 'bg-amber-50/50 dark:bg-amber-500/[0.03] border-amber-100 dark:border-amber-500/20'
      }
    `}>
      {/* Decorative Branding Icon */}
      {isHighPerformer ? (
        <TrendingUp size={160} className="absolute -right-8 -bottom-8 text-emerald-500 opacity-[0.05] dark:opacity-[0.08] transition-transform group-hover:scale-110 pointer-events-none" />
      ) : (
        <TrendingDown size={160} className="absolute -right-8 -bottom-8 text-amber-500 opacity-[0.05] dark:opacity-[0.08] transition-transform group-hover:scale-110 pointer-events-none" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 relative z-10 items-center">
        
        {/* Metric Intelligence Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isHighPerformer ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`}>
              Operational Pulse
            </span>
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isHighPerformer ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'}`} />
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-foreground text-5xl md:text-7xl font-black tracking-tighter leading-none flex items-baseline">
              {Math.round(numericScore)}<span className="text-2xl md:text-3xl ml-1 opacity-20 dark:opacity-40">%</span>
            </h3>
            <div className="flex items-center gap-2.5 mt-4 px-1">
               <Target size={14} className="text-slate-400 dark:text-slate-600 shrink-0" />
               <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest">
                 Success Matrix: <span className="text-foreground">{stats.onTimeTasks}</span> 
                 <span className="mx-2 opacity-30">/</span> 
                 <span className="text-slate-400 dark:text-slate-600">{stats.totalTasks} Assets Detected</span>
               </p>
            </div>
          </div>

          {/* MILESTONE RECOGNITION (Adaptive Cards) */}
          {earnedBadges.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-10 border-t border-border/60 pt-8">
              {earnedBadges.map((badge, i) => {
                const IconComponent = badgeIconMap[badge.iconName] || Star;
                return (
                  <div 
                    key={i} 
                    title={badge.name} 
                    className="p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:scale-110 hover:shadow-lg shrink-0" 
                    style={{ borderBottom: `3px solid ${badge.color}` }}
                  >
                    <IconComponent size={22} color={badge.color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NODE REWARDS CENTER (Wallet Aesthetic) */}
        <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl transition-all duration-500 hover:shadow-primary/5">
            <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl shrink-0 ${currentPoints > 0 ? 'bg-amber-500/10 border border-amber-500/20 shadow-inner' : 'bg-background border border-border'}`}>
                    <Trophy className={currentPoints > 0 ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'} size={40} />
                </div>
                <div className="flex flex-col min-w-0">
                    <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] leading-none mb-3">Stored Earnings</p>
                    <div className="flex items-baseline gap-2 overflow-hidden">
                        <span className="text-3xl md:text-4xl font-black text-foreground leading-none tracking-tighter truncate">
                          {currentPoints.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pts</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* PERFORMANCE BAROMETER (Adaptive Scale) */}
      <div className="mt-12 flex flex-col md:flex-row gap-8 items-center justify-between relative z-10 border-t border-border/50 pt-8">
        <div className="w-full md:max-w-md space-y-4">
            <div className="flex justify-between items-end px-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Efficiency Scale</span>
                <span className={`text-[11px] font-black ${isHighPerformer ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {numericScore.toFixed(1)}% Benchmark
                </span>
            </div>
            <div className="w-full bg-background h-3.5 rounded-full border border-border p-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-[2000ms] ease-out ${isHighPerformer ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'}`} 
                  style={{ width: `${numericScore}%` }} 
                />
            </div>
        </div>

        <div className={`
          flex items-center gap-3.5 px-8 py-4 rounded-2xl border transition-all shrink-0
          ${isHighPerformer 
            ? 'bg-emerald-50 dark:bg-slate-950 border-emerald-100 dark:border-emerald-500/30 shadow-emerald-500/5' 
            : 'bg-amber-50 dark:bg-slate-950 border-amber-100 dark:border-amber-500/30 shadow-amber-500/5'
          }
        `}>
            {isHighPerformer 
              ? <Zap className="text-emerald-500 animate-pulse shrink-0" size={22} fill="currentColor" /> 
              : <AlertCircle className="text-amber-500 shrink-0" size={22} />
            }
            <span className={`text-[11px] font-black uppercase tracking-[0.25em] whitespace-nowrap ${isHighPerformer ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'}`}>
                {isHighPerformer ? 'System Optimal' : 'Tuning Required'}
            </span>
        </div>
      </div>
    </div>
  );
};

export default ScoreBadge;