import API from '../api/axiosConfig';
import React, { useState } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  RefreshCcw, 
  ChevronRight,
  Send,
  ClipboardList
} from 'lucide-react';

const TaskCard = ({ task, doerId }) => {
  const [remarks, setRemarks] = useState('');
  const [newDate, setNewDate] = useState('');
  const [showReviseForm, setShowReviseForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResponse = async (status) => {
    try {
      setIsSubmitting(true);
      await axios.post('/tasks/respond', {
        taskId: task._id,
        doerId,
        status,
        revisedDeadline: newDate,
        remarks
      });
      alert(`Task ${status}!`);
      window.location.reload(); // Logic Preserved: Refresh to update status
    } catch (err) {
      alert(err.response?.data?.message || "Error updating task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status-based theming
  const getStatusStyles = () => {
    switch (task.status) {
      case 'Accepted': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-[2rem] hover:border-sky-500/30 transition-all duration-300 shadow-xl overflow-hidden">
      
      {/* Decorative Background Icon */}
      <ClipboardList size={100} className="absolute -right-6 -bottom-6 text-sky-500/5 transition-transform duration-700 group-hover:scale-110 pointer-events-none" />

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest border ${getStatusStyles()}`}>
              {task.status}
            </span>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">ID: {task._id.slice(-6)}</span>
          </div>
          <h4 className="text-white text-xl font-black tracking-tight leading-tight group-hover:text-sky-400 transition-colors">
            {task.title}
          </h4>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-950/50 px-4 py-2 rounded-2xl border border-slate-800/40">
           <Calendar size={14} className="text-sky-400" />
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1">Target Deadline</span>
              <span className="text-xs font-bold text-slate-200 leading-none">
                {new Date(task.deadline).toLocaleDateString([], { dateStyle: 'medium' })}
              </span>
           </div>
        </div>
      </div>

      {/* Description Body */}
      <div className="mb-8 relative z-10">
        <p className="text-slate-400 text-sm leading-relaxed font-medium">
          {task.description}
        </p>
      </div>

      {/* Action Suite (Pending Logic Preserved) */}
      {task.status === 'Pending' && (
        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
          <button 
            onClick={() => handleResponse('Accepted')} 
            disabled={isSubmitting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            {isSubmitting ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Accept Assignment
          </button>
          
          {task.isRevisionAllowed && (
            <button 
              onClick={() => setShowReviseForm(!showReviseForm)} 
              className={`
                flex-1 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer
                ${showReviseForm ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-950/50 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10'}
              `}
            >
              <RefreshCcw size={16} className={showReviseForm ? "rotate-180 transition-transform" : ""} />
              {showReviseForm ? 'Close Request' : 'Request Revision'}
            </button>
          )}
        </div>
      )}

      {/* Revision Form (Logic Preserved) */}
      {showReviseForm && (
        <div className="mt-6 p-6 bg-slate-950/80 rounded-2xl border border-amber-500/20 animate-in slide-in-from-top-4 duration-500 relative z-10">
          <div className="flex items-center gap-2 mb-4 text-amber-500 font-black text-[10px] uppercase tracking-widest">
            <AlertCircle size={14} /> Schedule Adjustment Proposal
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Proposed New Deadline</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-sky-400 transition-colors" size={16} />
                <input 
                  type="datetime-local" 
                  onChange={(e) => setNewDate(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 text-white pl-12 pr-5 py-3 rounded-xl outline-none focus:border-sky-500/50 transition-all font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Reason for Adjustment</label>
              <div className="relative group">
                <MessageSquare className="absolute left-4 top-4 text-slate-700 group-focus-within:text-sky-400 transition-colors" size={16} />
                <textarea 
                  placeholder="Explain why this change is necessary..." 
                  onChange={(e) => setRemarks(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 text-white pl-12 pr-5 py-3 rounded-xl outline-none focus:border-sky-500/50 transition-all font-medium text-xs min-h-[80px] resize-none"
                />
              </div>
            </div>

            <button 
              onClick={() => handleResponse('Revision Requested')} 
              disabled={isSubmitting || !newDate || !remarks}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <Send size={14} /> Transmit Request to Assigner
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 pt-6 border-t border-slate-800/40 flex justify-between items-center relative z-10">
         <div className="flex items-center gap-2 text-slate-500">
            <Clock size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Standard Priority Protocol</span>
         </div>
         {task.isRevisionAllowed && task.status === 'Pending' && (
            <div className="flex items-center gap-1.5 text-emerald-500/60 font-black text-[9px] uppercase tracking-widest">
               <RefreshCcw size={10} /> Revision Enabled
            </div>
         )}
      </div>
    </div>
  );
};

export default TaskCard;