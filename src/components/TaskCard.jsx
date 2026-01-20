import React, { useState } from 'react';
import API from '../api/axiosConfig'; // Using centralized API instance
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  RefreshCcw, 
  ChevronRight,
  Send,
  ClipboardList,
  Maximize2
} from 'lucide-react';

/**
 * TASK CARD: ADAPTIVE MISSION MODULE v1.3
 * Purpose: Handles individual task interactions for Doers with full theme support.
 * Logic: Manages status transitions, revision requests, and theme-aware styling.
 */
const TaskCard = ({ task, doerId }) => {
  const [remarks, setRemarks] = useState('');
  const [newDate, setNewDate] = useState('');
  const [showReviseForm, setShowReviseForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- COMMAND: SUBMIT RESPONSE PROTOCOL ---
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
      alert(`Handshake Successful: Task marked as ${status}`);
      window.location.reload(); 
    } catch (err) {
      alert(err.response?.data?.message || "Protocol Error: Unable to synchronize task state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * STATUS-BASED THEME ENGINE
   * Returns semantic color tokens based on the current mission state.
   */
  const getStatusStyles = () => {
    switch (task.status) {
      case 'Accepted': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'Completed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Verified': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      default: return 'bg-background text-slate-500 border-border';
    }
  };

  return (
    <div className="group relative bg-card backdrop-blur-xl border border-border p-6 md:p-8 rounded-[2.5rem] hover:border-primary/40 transition-all duration-500 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      
      {/* --- DECORATIVE WATERMARK --- */}
      <ClipboardList size={120} className="absolute -right-8 -bottom-8 text-primary/5 opacity-0 group-hover:opacity-10 transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 pointer-events-none" />

      {/* --- EXECUTIVE HEADER AREA --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 relative z-10">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] border shadow-sm ${getStatusStyles()}`}>
              {task.status || 'Active Node'}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="text-slate-400 dark:text-slate-600 font-black text-[10px] uppercase tracking-widest font-mono">ID: {task._id?.slice(-6).toUpperCase()}</span>
          </div>
          <h4 className="text-foreground text-2xl font-black tracking-tighter leading-tight group-hover:text-primary transition-colors duration-300 uppercase">
            {task.title || 'Untitled Directive'}
          </h4>
        </div>
        
        {/* Deadline Metadata Badge */}
        <div className="flex items-center gap-4 bg-background p-3 rounded-2xl border border-border shadow-inner group/date transition-all hover:border-primary/20">
           <div className="bg-primary/10 p-2 rounded-xl">
              <Calendar size={18} className="text-primary" />
           </div>
           <div className="flex flex-col pr-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Target Deadline</span>
              <span className="text-xs font-black text-foreground leading-none tracking-tight">
                {task.deadline ? new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
              </span>
           </div>
        </div>
      </div>

      {/* --- MISSION DESCRIPTION BODY --- */}
      <div className="mb-10 relative z-10">
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-bold uppercase tracking-tight opacity-90 italic border-l-4 border-primary/20 pl-6 py-1">
          {task.description || "No tactical instructions provided for this node."}
        </p>
      </div>

      {/* --- OPERATIONAL ACTION SUITE (For Pending State) --- */}
      {task.status === 'Pending' && (
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <button 
            onClick={() => handleResponse('Accepted')} 
            disabled={isSubmitting}
            className="flex-[1.5] bg-emerald-600 hover:bg-emerald-500 text-white dark:text-slate-950 font-black text-[11px] uppercase tracking-[0.3em] py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Accept Assignment
          </button>
          
          {task.isRevisionAllowed && (
            <button 
              onClick={() => setShowReviseForm(!showReviseForm)} 
              className={`
                flex-1 font-black text-[11px] uppercase tracking-[0.3em] py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer shadow-lg
                ${showReviseForm 
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border' 
                  : 'bg-background text-amber-600 dark:text-amber-500 border border-amber-500/30 hover:bg-amber-500/5'
                }
              `}
            >
              <RefreshCcw size={18} className={showReviseForm ? "rotate-180 transition-transform duration-500" : ""} />
              {showReviseForm ? 'Abort Request' : 'Request Revision'}
            </button>
          )}
        </div>
      )}

      {/* --- REVISION PROPOSAL FORM --- */}
      {showReviseForm && (
        <div className="mt-8 p-8 bg-background border border-amber-500/30 rounded-[2rem] animate-in slide-in-from-top-6 duration-500 relative z-10 shadow-inner">
          <div className="flex items-center gap-3 mb-6 text-amber-600 dark:text-amber-500 font-black text-[11px] uppercase tracking-[0.4em]">
            <AlertCircle size={16} /> Schedule Adjustment Proposal
          </div>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 block">Proposed New Deadline</label>
              <div className="relative group">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="datetime-local" 
                  onChange={(e) => setNewDate(e.target.value)} 
                  className="w-full bg-card border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm uppercase shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 block">Reasoning & Logistics</label>
              <div className="relative group">
                <MessageSquare className="absolute left-5 top-5 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                <textarea 
                  placeholder="Identify blockers or logistical requirements..." 
                  onChange={(e) => setRemarks(e.target.value)} 
                  className="w-full bg-card border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm min-h-[120px] resize-none uppercase tracking-tight"
                />
              </div>
            </div>

            <button 
              onClick={() => handleResponse('Revision Requested')} 
              disabled={isSubmitting || !newDate || !remarks}
              className="w-full bg-primary hover:opacity-90 text-white dark:text-slate-950 font-black text-[11px] uppercase tracking-[0.3em] py-5 rounded-2xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-2xl shadow-primary/20"
            >
              <Send size={16} /> Transmit Request to Command
            </button>
          </div>
        </div>
      )}

      {/* --- FOOTER PROTOCOL INFO --- */}
      <div className="mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
         <div className="flex items-center gap-3 text-slate-400 dark:text-slate-600">
            <Clock size={16} className="text-primary/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] leading-none">Operational Priority Protocol Active</span>
         </div>
         {task.isRevisionAllowed && task.status === 'Pending' && (
            <div className="flex items-center gap-2 bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 font-black text-[10px] uppercase tracking-widest shadow-inner animate-pulse">
               <RefreshCcw size={12} /> Revision Node Valid
            </div>
         )}
      </div>
    </div>
  );
};

export default TaskCard;