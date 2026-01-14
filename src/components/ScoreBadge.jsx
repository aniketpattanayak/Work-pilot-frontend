import React, { useEffect, useState } from 'react';
import API from '../api/axiosConfig';
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
  ShieldCheck
} from 'lucide-react';

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

  if (!stats || loading) return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
        <RefreshCcw size={16} className="text-slate-600 animate-spin" />
      </div>
      {!minimalist && <div className="h-4 w-24 bg-slate-800 rounded-md"></div>}
    </div>
  );

  const numericScore = Number(stats.score) || 0;
  const isHighPerformer = numericScore > 75;
  const currentPoints = Number(stats.totalPoints) || 0; 
  const earnedBadges = stats.earnedBadges || [];

  // --- MINIMALIST HEADER VIEW ---
  if (minimalist) {
    return (
      <div className="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl p-2 pr-4 gap-4 h-12 shadow-xl shadow-black/20 min-w-fit overflow-visible">
        {/* Efficiency Circle Container */}
        <div className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" className="stroke-slate-800 fill-none" strokeWidth="4" />
            <circle
              cx="20" cy="20" r="18"
              className={`fill-none transition-all duration-1000 ${isHighPerformer ? 'stroke-sky-500' : 'stroke-amber-500'}`}
              strokeWidth="4"
              strokeDasharray="113.1"
              strokeDashoffset={113.1 - (113.1 * numericScore) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] font-black leading-none text-white whitespace-nowrap">
              {Math.round(numericScore)}%
            </span>
          </div>
        </div>

        {/* Separated Points Display */}
        <div className="flex flex-col border-l border-slate-800 pl-4 h-8 justify-center min-w-[50px]">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
                <Trophy size={12} className={currentPoints > 0 ? "text-amber-500 shrink-0" : "text-slate-600 shrink-0"} />
                <span className="text-white font-black text-sm leading-none">{currentPoints}</span>
            </div>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.15em] mt-0.5 leading-none">Points</span>
        </div>
      </div>
    );
  }

  // --- FULL DASHBOARD VIEW ---
  return (
    <div className={`
      relative overflow-hidden group p-6 md:p-8 rounded-[2.5rem] border transition-all duration-700
      ${isHighPerformer ? 'bg-emerald-500/[0.03] border-emerald-500/20' : 'bg-amber-500/[0.03] border-amber-500/20'}
    `}>
      <TrendingUp size={140} className={`absolute -right-8 -bottom-8 opacity-[0.03] transition-transform group-hover:scale-110 pointer-events-none ${isHighPerformer ? 'text-emerald-500' : 'text-amber-500'}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10 items-center">
        {/* Left: Efficiency Metrics */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${isHighPerformer ? 'text-emerald-500' : 'text-amber-500'}`}>Operational Pulse</span>
            <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isHighPerformer ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'}`} />
          </div>
          
          <h3 className="text-white text-5xl font-black tracking-tighter leading-none flex items-baseline">
            {Math.round(numericScore)}<span className="text-2xl ml-1 opacity-30">%</span>
          </h3>

          <div className="flex items-center gap-3">
             <Target size={16} className="text-slate-700 shrink-0" />
             <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap">
               Quota: <span className="text-slate-100">{stats.onTimeTasks}</span> <span className="text-slate-800 mx-1">/</span> <span className="text-slate-500">{stats.totalTasks}</span>
             </p>
          </div>

          {/* BADGE GALLERY */}
          {earnedBadges.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-6 border-t border-slate-800/40 pt-5">
              {earnedBadges.map((badge, i) => {
                const IconComponent = badgeIconMap[badge.iconName] || Star;
                return (
                  <div key={i} title={badge.name} className="p-2 rounded-xl border border-white/5 transition-all hover:scale-110 shrink-0" style={{ backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}30` }}>
                    <IconComponent size={18} color={badge.color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Point Wallet (Node Earnings Fixed) */}
        <div className="flex items-center gap-5 bg-slate-950/80 p-6 rounded-[2rem] border border-slate-800/60 shadow-2xl transition-all duration-500 overflow-hidden min-h-[100px]">
            <div className={`p-4 rounded-2xl shrink-0 ${currentPoints > 0 ? 'bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'bg-slate-900 border border-slate-800'}`}>
                <Trophy className={currentPoints > 0 ? 'text-amber-400' : 'text-slate-800'} size={32} />
            </div>
            <div className="flex flex-col min-w-0">
                <p className="text-slate-600 font-black text-[9px] uppercase tracking-[0.2em] leading-none mb-2 whitespace-nowrap">Node Earnings</p>
                <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className="text-3xl font-black text-white leading-none tracking-tighter truncate leading-none">
                      {currentPoints.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black text-amber-500 uppercase shrink-0">Pts</span>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="mt-10 flex flex-col md:flex-row gap-6 items-center justify-between relative z-10 border-t border-slate-800/30 pt-8">
        <div className="w-full md:max-w-xs space-y-3">
            <div className="flex justify-between items-end whitespace-nowrap">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Efficiency Barometer</span>
                <span className={`text-[10px] font-black ${isHighPerformer ? 'text-emerald-500' : 'text-amber-400'}`}>
                    {numericScore.toFixed(1)}% Accuracy
                </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full border border-slate-900 p-0.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-[2000ms] ease-out ${isHighPerformer ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${numericScore}%` }} />
            </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/80 px-5 py-3 rounded-2xl border border-slate-800/50 shadow-xl shrink-0">
            {isHighPerformer ? <Zap className="text-emerald-400 animate-pulse shrink-0" size={18} fill="currentColor" /> : <AlertCircle className="text-amber-600 shrink-0" size={18} />}
            <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${isHighPerformer ? 'text-emerald-400' : 'text-amber-600'}`}>
                {isHighPerformer ? 'System Optimal' : 'Tuning Required'}
            </span>
        </div>
      </div>
    </div>
  );
};

export default ScoreBadge;