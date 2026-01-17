import React, { useState } from 'react';
import API from '../api/axiosConfig'; // Centralized API for AWS/Production
import { 
  UserPlus, 
  CheckCircle, 
  RefreshCcw, 
  AlertTriangle,
  History,
  UserCheck,
  ChevronRight,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

/**
 * REVISION PANEL: MANUAL INTERVENTION MODULE
 * Purpose: Handles 'Revision' status tasks by allowing deadline approval or node reassignment.
 */
const RevisionPanel = ({ task, employees, assignerId, onSuccess }) => {
  const [newDoerId, setNewDoerId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- 1. APPROVE LOGIC (Preserved Exactly) ---
  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      let proposedDate = task.deadline; 
      if (task.remarks && task.remarks.includes("Proposed Deadline:")) {
          const extractedDate = task.remarks.split("Proposed Deadline: ")[1]?.split(".")[0];
          if (extractedDate) proposedDate = extractedDate;
      }
      
      await API.put(`/tasks/handle-revision`, {
        taskId: task._id,
        action: 'Approve',
        newDeadline: proposedDate, 
        assignerId: assignerId
      });
      
      alert("New deadline has been updated and task is back to 'Accepted' status.");
      onSuccess();
    } catch (err) {
      console.error("Approval Error:", err);
      alert("Approval failed. Check system logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. REASSIGN LOGIC (Preserved Exactly) ---
  const handleReassign = async () => {
    if (!newDoerId) return alert("Please select a new Doer for reassignment.");
    
    try {
      setIsProcessing(true);
      await API.put(`/tasks/handle-revision`, {
        taskId: task._id,
        action: 'Reassign',
        newDoerId: newDoerId,
        remarks: reassignRemarks || "Task reassigned due to deadline conflict.",
        assignerId: assignerId
      });
      alert("Task successfully moved to another Doer.");
      onSuccess();
    } catch (err) {
      console.error("Reassignment Error:", err);
      alert("Reassignment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-8 bg-amber-50/30 dark:bg-amber-500/5 rounded-[2.5rem] border border-amber-200 dark:border-amber-500/20 overflow-hidden shadow-sm dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-700">
      
      {/* --- HEADER COMMAND BANNER --- */}
      <div className="px-8 py-6 bg-amber-100/40 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                <ShieldAlert className="text-amber-600 dark:text-amber-500" size={24} />
            </div>
            <div>
                <h4 className="text-amber-900 dark:text-amber-500 text-[11px] font-black uppercase tracking-[0.3em] m-0">Protocol: Revision Request</h4>
                <p className="text-amber-700/60 dark:text-amber-500/40 text-[10px] font-black uppercase tracking-widest mt-0.5">Manual Decision Required</p>
            </div>
        </div>
        <div className="bg-card px-5 py-2 rounded-full border border-amber-200 dark:border-amber-500/20 shadow-sm">
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Awaiting Command</span>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10">
        
        {/* REQUEST SUBMISSION BLOCK */}
        <div className="bg-card p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-amber-500/10 space-y-4 shadow-inner">
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                <MessageSquare size={16} className="text-amber-500" /> Doer Transmission
            </div>
            <p className="text-foreground text-sm font-bold leading-relaxed italic border-l-4 border-amber-500/40 pl-6 py-1">
                "{task.remarks || "Standard revision requested. Context: Deadline adjustment required for operational continuity."}"
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            
            {/* ACTION ALPHA: APPROVAL */}
            <div className="space-y-6">
                <div className="flex flex-col gap-1.5 ml-1">
                    <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Option Alpha</label>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Authorize Proposed Deadline Change</span>
                </div>
                <button 
                    disabled={isProcessing}
                    onClick={handleApprove}
                    className="group w-full bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white dark:text-slate-950 py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 dark:shadow-emerald-500/10 cursor-pointer"
                >
                    {isProcessing ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />}
                    Authorize Update
                </button>
            </div>

            {/* ACTION BETA: REASSIGNMENT */}
            <div className="space-y-6">
                <div className="flex flex-col gap-1.5 ml-1">
                    <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Option Beta</label>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Reroute Mission to Alternate Node</span>
                </div>
                
                <div className="space-y-4">
                    {/* Select Alternative Node */}
                    <div className="relative group">
                        <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 group-focus-within:text-primary transition-colors" size={18} />
                        <select 
                            value={newDoerId} 
                            onChange={(e) => setNewDoerId(e.target.value)}
                            className="w-full bg-card border border-border text-foreground pl-14 pr-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                        >
                            <option value="">Choose Alternative Node</option>
                            {employees
                                .filter(emp => (emp.roles?.includes('Doer') || emp.role === 'Doer') && emp._id !== task.doerId?._id)
                                .map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.name} — {emp.department}</option>
                                ))
                            }
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                    </div>

                    {/* Reroute Remarks */}
                    <div className="relative group">
                        <History className="absolute left-5 top-5 text-slate-400 dark:text-slate-700 group-focus-within:text-primary transition-colors" size={18} />
                        <textarea 
                            placeholder="Reason for Mission Reroute..." 
                            value={reassignRemarks}
                            onChange={(e) => setReassignRemarks(e.target.value)}
                            className="w-full bg-card border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[120px] resize-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                    </div>

                    <button 
                        disabled={isProcessing || !newDoerId}
                        onClick={handleReassign}
                        className={`
                            w-full py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer
                            ${!newDoerId 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-border cursor-not-allowed opacity-50' 
                                : 'bg-primary hover:bg-sky-400 text-white dark:text-slate-950 shadow-xl shadow-primary/20'
                            }
                        `}
                    >
                        {isProcessing ? <RefreshCcw size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        Execute Reroute
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* --- AUDIT TRAIL FOOTER --- */}
      <div className="px-8 py-5 bg-background/50 border-t border-border flex items-center gap-4">
         <History size={16} className="text-amber-600 dark:text-amber-500/40" />
         <span className="text-[10px] font-black text-slate-500 dark:text-amber-500/40 uppercase tracking-[0.25em]">
            Permanent Ledger: This intervention will be logged as a protocol override.
         </span>
      </div>
    </div>
  );
};

export default RevisionPanel;