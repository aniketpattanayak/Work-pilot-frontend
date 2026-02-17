import React from 'react';
import { CheckCircle, Clock, AlertCircle, Hash } from 'lucide-react';

const FmsTaskCard = ({ mission, onComplete, loading }) => {
  const isDelayed = mission.plannedDeadline && new Date() > new Date(mission.plannedDeadline);

  return (
    <div className={`bg-white p-6 rounded-[2rem] border-2 shadow-xl transition-all space-y-6 ${isDelayed ? 'border-red-100' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isDelayed ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FMS Mission</span>
          </div>
          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{mission.nodeName}</h4>
          <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase">
            <Hash size={12} /> {mission.orderIdentifier}
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-xl border font-black text-[9px] uppercase tracking-widest ${isDelayed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {isDelayed ? 'Delayed' : 'On Track'}
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-primary" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase">Target Deadline</span>
            <span className="text-xs font-black text-slate-700">
              {new Date(mission.plannedDeadline).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onComplete(mission.instanceId, mission.stepIndex)}
        disabled={loading}
        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <CheckCircle size={18} /> Mark Phase as Done
      </button>
    </div>
  );
};

export default FmsTaskCard;