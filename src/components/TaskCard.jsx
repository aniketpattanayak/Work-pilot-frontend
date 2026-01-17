import React, { useState } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance for AWS compatibility
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  RefreshCcw, 
  Send,
  ClipboardList,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

/**
 * TASK CARD: MISSION INTERFACE
 * Purpose: Renders individual task data with responsive controls for acceptance or revision.
 */
const TaskCard = ({ task, doerId }) => {
  const [remarks, setRemarks] = useState('');
  const [newDate, setNewDate] = useState('');
  const [showReviseForm, setShowReviseForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGIC: SUBMIT RESPONSE ---
  const handleResponse = async (status) => {
    try {
      setIsSubmitting(true);
      await API.post('/tasks/respond', {
        taskId: task._id,
        doerId,
        status,
        revisedDeadline: newDate,
        remarks
      });
      alert(`Task protocol updated: ${status}`);
      // Logic Preserved: Manual refresh to sync state with server
      window.location.reload(); 
    } catch (err) {
      alert(err.response?.data?.message || "Operational Error: Could not update task status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modern Status Theming (Adaptive for Dark/Light surfaces)
  const getStatusStyles = () => {
    switch (task.status) {
      case 'Accepted': 
        return 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/20';
      case 'Completed': 
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'Pending': 
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      default: 
        return 'bg-background text-slate-500 dark:text-slate-400 border-border';
    }
  };

  return (
    <div className="group relative bg-card backdrop-blur-xl border border-border p-6 md:p-10 rounded-[3rem] hover:border-primary/40 transition-all duration-500 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      
      {/* Decorative Brand Watermark (Theme-Aware Opacity) */}
      <ClipboardList size={140} className="absolute -right-8 -bottom-8 text-slate-200 dark:text-primary opacity-10 dark:opacity-5 transition-transform duration-1000 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none" />

      {/* --- HEADER COMMAND SECTION --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-10 relative z-10">
        <div className="space-y-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] border shadow-sm ${getStatusStyles()}`}>
              {task.status || 'Active'}
            </span>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border" />
            <span className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.25em]">
              Node ID: {task._id.slice(-6).toUpperCase()}
            </span>
          </div>
          <h4 className="text-foreground text-3xl font-black tracking-tighter leading-none group-hover:text-primary transition-colors duration-300 uppercase">
            {task.title}
          </h4>
        </div>
        
        {/* Maturity/Deadline Module */}
        <div className="flex items-center gap-5 bg-background px-6 py-4 rounded-2xl border border-border shadow-inner w-full lg:w-auto">
           <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
             <Calendar size={20} className="text-primary" />
           </div>
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Maturity Date</span>
              <span className="text-base font-black text-foreground leading-none tracking-tight">
                {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
           </div>
        </div>
      </div>

      {/* --- NARRATIVE BRIEF --- */}
      <div className="mb-12 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-8 bg-primary/40" />
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Operational Context</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-bold border-l-4 border-border pl-6 py-1">
          {task.description || "No mission description provided for this node assignment."}
        </p>
      </div>

      {/* --- COMMAND ACTIONS --- */}
      {task.status === 'Pending' && (
        <div className="flex flex-col sm:flex-row gap-5 relative z-10">
          <button 
            onClick={() => handleResponse('Accepted')} 
            disabled={isSubmitting}
            className="group/btn flex-1 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.25em] py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 cursor-pointer"
          >
            {isSubmitting ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle2 size={18} className="group-hover/btn:scale-110 transition-transform" />}
            Confirm Mission
          </button>
          
          {task.isRevisionAllowed && (
            <button 
              onClick={() => setShowReviseForm(!showReviseForm)} 
              className={`
                flex-1 font-black text-xs uppercase tracking-[0.25em] py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer
                ${showReviseForm 
                  ? 'bg-slate-100 dark:bg-slate-800 text-foreground border border-border' 
                  : 'bg-background text-amber-600 dark:text-amber-500 border border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 shadow-sm'}
              `}
            >
              <RefreshCcw size={18} className={`${showReviseForm ? "rotate-180" : ""} transition-transform duration-500`} />
              {showReviseForm ? 'Abort Revision' : 'Negotiate Timeline'}
            </button>
          )}
        </div>
      )}

      {/* --- INTERACTIVE REVISION WORKFLOW --- */}
      {showReviseForm && (
        <div className="mt-10 p-8 md:p-10 bg-background/50 rounded-[2.5rem] border border-amber-500/30 animate-in slide-in-from-top-6 duration-500 relative z-10 shadow-inner">
          <div className="flex items-center gap-4 mb-8 text-amber-600 dark:text-amber-500 font-black text-[11px] uppercase tracking-[0.3em]">
            <AlertCircle size={18} /> Optimization Proposal Logic
          </div>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Proposed Fulfillment Date</label>
              <div className="relative group/input">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-primary transition-colors" size={20} />
                <input 
                  type="datetime-local" 
                  onChange={(e) => setNewDate(e.target.value)} 
                  className="w-full bg-card border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-xs shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Justification Protocol</label>
              <div className="relative group/input">
                <MessageSquare className="absolute left-5 top-5 text-slate-400 group-focus-within/input:text-primary transition-colors" size={20} />
                <textarea 
                  placeholder="Specify operational constraints necessitating this adjustment..." 
                  onChange={(e) => setRemarks(e.target.value)} 
                  className="w-full bg-card border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-xs min-h-[120px] resize-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-700"
                />
              </div>
            </div>

            <button 
              onClick={() => handleResponse('Revision Requested')} 
              disabled={isSubmitting || !newDate || !remarks}
              className="w-full bg-primary hover:bg-sky-400 text-white dark:text-slate-950 font-black text-[11px] uppercase tracking-[0.3em] py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
            >
              <Send size={18} /> Dispatch Proposal
            </button>
          </div>
        </div>
      )}

      {/* --- FOOTER ANALYTICS --- */}
      <div className="mt-10 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
         <div className="flex items-center gap-3 text-slate-400 dark:text-slate-600">
            <Clock size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] leading-none">Priority Status: Matrix Valid</span>
         </div>
         {task.isRevisionAllowed && task.status === 'Pending' && (
            <div className="flex items-center gap-3 text-emerald-600/80 dark:text-emerald-500/60 font-black text-[10px] uppercase tracking-[0.25em] bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/20">
               <RefreshCcw size={14} className="animate-spin-slow" /> Negotiable mission parameters
            </div>
         )}
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TaskCard;