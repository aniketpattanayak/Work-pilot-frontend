import React, { useState } from 'react';
import API from '../api/axiosConfig';

import axios from 'axios';
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

const RevisionPanel = ({ task, employees, assignerId, onSuccess }) => {
  const [newDoerId, setNewDoerId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Approve the Doer's requested deadline (Logic Preserved)
  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      
      // Safety Guard: Extract the date from the remarks string
      let proposedDate = task.deadline; 
      if (task.remarks && task.remarks.includes("Proposed Deadline:")) {
          const extractedDate = task.remarks.split("Proposed Deadline: ")[1]?.split(".")[0];
          if (extractedDate) proposedDate = extractedDate;
      }
      
      await axios.put(`/tasks/handle-revision`, {
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

  // 2. Reassign the task to a different Doer (Logic Preserved)
  const handleReassign = async () => {
    if (!newDoerId) return alert("Please select a new Doer for reassignment.");
    
    try {
      setIsProcessing(true);
      await axios.put(`/tasks/handle-revision`, {
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
    <div className="mt-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Header Banner */}
      <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={18} />
            <h4 className="text-amber-500 text-xs font-black uppercase tracking-[0.2em] m-0">Intervention Protocol: Revision Request</h4>
        </div>
        <div className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/20">
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Pending Decision</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Request Details Block */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-amber-500/10 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <MessageSquare size={12} className="text-amber-500" /> Doer's Statement
            </div>
            <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
                "{task.remarks || "Standard revision requested without additional context."}"
            </p>
        </div>

        {/* Action Choice 1: Approve */}
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Option A: Accept Proposal</label>
            <button 
                disabled={isProcessing}
                onClick={handleApprove}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10"
            >
                {isProcessing ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Authorize Proposed Deadline
            </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">OR RE-ROUTE</span>
            <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Action Choice 2: Reassign */}
        <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Option B: Task Rerouting</label>
            
            <div className="grid grid-cols-1 gap-3">
                <div className="relative group">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sky-400 transition-colors" size={16} />
                    <select 
                        value={newDoerId} 
                        onChange={(e) => setNewDoerId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-12 pr-10 py-3.5 rounded-xl text-xs font-bold outline-none focus:border-sky-500/50 transition-all cursor-pointer appearance-none"
                    >
                        <option value="">Select Alternative Doer</option>
                        {employees
                        .filter(emp => (emp.roles?.includes('Doer') || emp.role === 'Doer') && emp._id !== task.doerId?._id)
                        .map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>
                        ))
                        }
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 rotate-90 pointer-events-none" size={16} />
                </div>

                <div className="relative group">
                    <History className="absolute left-4 top-4 text-slate-700 group-focus-within:text-sky-400 transition-colors" size={16} />
                    <textarea 
                        placeholder="Reason for rerouting (to be shown to new doer)..." 
                        value={reassignRemarks}
                        onChange={(e) => setReassignRemarks(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-12 pr-5 py-3.5 rounded-xl text-xs font-medium outline-none focus:border-sky-500/50 transition-all min-h-[80px] resize-none"
                    />
                </div>

                <button 
                    disabled={isProcessing || !newDoerId}
                    onClick={handleReassign}
                    className={`
                        w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3
                        ${!newDoerId ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/10'}
                    `}
                >
                    {isProcessing ? <RefreshCcw size={18} className="animate-spin" /> : <UserPlus size={18} />}
                    Execute Reroute
                </button>
            </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="px-6 py-3 bg-amber-500/5 border-t border-amber-500/10 flex items-center gap-2">
         <History size={12} className="text-amber-500/60" />
         <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest leading-none">
            Intervention will be logged in the permanent task history.
         </span>
      </div>
    </div>
  );
};

export default RevisionPanel;