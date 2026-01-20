import React, { useState } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance for AWS/Prod
import { 
  UserPlus, 
  CheckCircle, 
  RefreshCcw, 
  Calendar, 
  AlertTriangle,
  History,
  UserCheck,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

/**
 * REVISION PANEL: INTERVENTION PROTOCOL v1.3
 * Purpose: Handles deadline approvals or task reassignments with full theme adaptivity.
 * Logic: Includes automated date extraction from history remarks.
 */
const RevisionPanel = ({ task, employees, assignerId, onSuccess }) => {
  const [newDoerId, setNewDoerId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- COMMAND: AUTHORIZE PROPOSED DEADLINE ---
  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      
      // Safety Guard: Extract the date from the remarks string
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
      
      alert("Handshake Successful: New deadline updated to 'Accepted' status.");
      onSuccess();
    } catch (err) {
      console.error("Approval Error:", err);
      alert("System Error: Approval protocol failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- COMMAND: EXECUTE TASK REROUTING ---
  const handleReassign = async () => {
    if (!newDoerId) return alert("Identify an alternative Doer node first.");
    
    try {
      setIsProcessing(true);
      await API.put(`/tasks/handle-revision`, {
        taskId: task._id,
        action: 'Reassign',
        newDoerId: newDoerId,
        remarks: reassignRemarks || "Task reassigned due to deadline conflict.",
        assignerId: assignerId
      });
      alert("Success: Task rerouted to new node.");
      onSuccess();
    } catch (err) {
      console.error("Reassignment Error:", err);
      alert("System Error: Rerouting failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-6 bg-amber-50/50 dark:bg-amber-500/5 rounded-[2rem] border border-amber-500/20 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl">
      
      {/* Header Banner: Adaptive Alert State */}
      <div className="px-6 py-5 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-500" size={20} />
            <h4 className="text-amber-700 dark:text-amber-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] m-0 leading-tight">Intervention Protocol: Revision Request</h4>
        </div>
        <div className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/20 shrink-0">
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Decision Pending</span>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {/* Request Details Block */}
        <div className="bg-background/80 backdrop-blur-sm p-5 rounded-2xl border border-amber-500/10 space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <MessageSquare size={12} className="text-amber-500" /> Doer Node Statement
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm font-bold leading-relaxed italic uppercase tracking-tight">
                "{task.remarks || "Standard revision requested without additional context."}"
            </p>
        </div>

        {/* Action Choice 1: Approve Proposal */}
        <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Option A: Accept Proposal</label>
            <button 
                disabled={isProcessing}
                onClick={handleApprove}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white dark:text-slate-950 py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20"
            >
                {isProcessing ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Authorize Proposed Deadline
            </button>
        </div>

        {/* Tactical Divider */}
        <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.4em]">OR REROUTE NODE</span>
            <div className="flex-grow border-t border-border/50"></div>
        </div>

        {/* Action Choice 2: Reassign Terminal */}
        <div className="space-y-6">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Option B: Task Rerouting</label>
            
            <div className="grid grid-cols-1 gap-4">
                <div className="relative group">
                    <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                    <select 
                        value={newDoerId} 
                        onChange={(e) => setNewDoerId(e.target.value)}
                        className="w-full bg-background border border-border text-foreground pl-14 pr-12 py-4 rounded-2xl text-[11px] md:text-xs font-black uppercase tracking-tight outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none shadow-inner"
                    >
                        <option value="">Select Alternative Doer Node</option>
                        {employees
                        .filter(emp => {
                          const empRoles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
                          return (empRoles.includes('Doer')) && emp._id !== (task.doerId?._id || task.doerId);
                        })
                        .map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name} — ({emp.department || 'General Sector'})</option>
                        ))
                        }
                    </select>
                    <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18} />
                </div>

                <div className="relative group">
                    <History className="absolute left-5 top-5 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                    <textarea 
                        placeholder="Log reasoning for rerouting (transmitted to new node)..." 
                        value={reassignRemarks}
                        onChange={(e) => setReassignRemarks(e.target.value)}
                        className="w-full bg-background border border-border text-foreground pl-14 pr-6 py-4 rounded-2xl text-[11px] md:text-xs font-black uppercase tracking-tight outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[100px] resize-none shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    />
                </div>

                <button 
                    disabled={isProcessing || !newDoerId}
                    onClick={handleReassign}
                    className={`
                        w-full py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-4 shadow-2xl
                        ${!newDoerId 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-border cursor-not-allowed opacity-50' 
                          : 'bg-primary hover:bg-sky-400 text-white dark:text-slate-950 shadow-primary/20'
                        }
                    `}
                >
                    {isProcessing ? <RefreshCcw size={20} className="animate-spin" /> : <UserPlus size={20} />}
                    Execute Reroute
                </button>
            </div>
        </div>
      </div>

      {/* Footer Meta Protocol */}
      <div className="px-8 py-4 bg-background/50 border-t border-amber-500/10 flex items-center gap-3">
         <History size={14} className="text-amber-500/40" />
         <span className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-amber-500/40 uppercase tracking-[0.2em] leading-none">
            Intervention will be recorded in the permanent mission audit ledger.
         </span>
      </div>
    </div>
  );
};

export default RevisionPanel;