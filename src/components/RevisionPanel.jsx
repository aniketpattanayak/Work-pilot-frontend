import React, { useState } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance for AWS/Prod
import { dialog } from './Dialog';
import DateReasonFields from './mytasks/DateReasonFields';
import useDateReasons from '../hooks/useDateReasons';
import { reasonError } from '../utils/dateReasonCheck';
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
const RevisionPanel = ({ task, employees, assignerId, onSuccess, source }) => {


  const revisionLog = task?.history
    ?.filter(h => h.action === "Revision Requested")
    ?.slice(-1)[0];

  const reason = revisionLog?.remarks || "No reason provided";


  const [newDoerId, setNewDoerId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);



  const user = JSON.parse(localStorage.getItem("user")) || {};
  const currentUserId = user._id || user.id;


  const isDoer = source === "doer";
  const isAssigner = source === "manage";

  // Date the assigner will authorize. Starts as the doer's proposed date; the assigner can change it.
  const toYmd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const doerProposedYmd = (() => {
    if (task?.proposedDeadline) return new Date(task.proposedDeadline).toISOString().slice(0, 10);
    const mt = /Proposed Deadline:\s*(\d{4}-\d{2}-\d{2})/.exec(reason);
    return mt ? mt[1] : '';
  })();
  const [approveDate, setApproveDate] = useState(doerProposedYmd);


  const { required: reasonRequired } = useDateReasons();
  const [rs, setRs] = useState({ reason: '', note: '' });
  const [showErr, setShowErr] = useState(false);
  const [proposedDeadline, setProposedDeadline] = useState(() => {
    if (!task?.deadline) return '';
    const d = new Date(task.deadline);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });





  // Assigner set a day limit: the doer can only pick one of the days right after the deadline.
  const maxExt = Number(task?.maxExtensionDays) || 0;
  const limited = maxExt > 0 && !!task?.deadline;
  const [extDays, setExtDays] = useState('');
  const fmtDay = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const extOptions = limited ? Array.from({ length: maxExt }, (_, i) => ({ k: i + 1, date: new Date(new Date(task.deadline).getTime() + (i + 1) * 86400000) })) : [];

  const handleLimitedRevision = async () => {
    setShowErr(true);
    const re = reasonError(rs, reasonRequired);
    if (re) return dialog.alert(re);
    if (!extDays) return dialog.alert("Please choose the new date.");
    if (!rs.reason && !rs.note.trim()) return dialog.alert("Please write the reason.");
    const pickedDay = extOptions.find((o) => String(o.k) === String(extDays));
    const okLimited = await dialog.confirm("Move the deadline to " + fmtDay(pickedDay.date) + "? This is applied straight away and your assigner is informed.", { title: 'Change deadline?' });
    if (!okLimited) return;
    try {
      setIsProcessing(true);
      const picked = extOptions.find((o) => String(o.k) === String(extDays));
      await API.post('/tasks/handle-revision', {
        taskId: task._id,
        action: 'Request',
        remarks: [rs.reason, rs.note.trim()].filter(Boolean).join(' - '),
        reason: rs.reason,
        reasonNote: rs.note.trim(),
        proposedDeadline: picked.date.toISOString()
      });
      dialog.alert("Done. The deadline is now " + fmtDay(picked.date) + ". Your assigner has been informed.");
      onSuccess();
    } catch (err) {
      dialog.alert(err.response?.data?.message || "Could not change the deadline. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (limited) return handleLimitedRevision();
    setShowErr(true);
    const re = reasonError(rs, reasonRequired);
    if (re) return dialog.alert(re);
    if (!proposedDeadline) return dialog.alert("Please choose the proposed deadline.");
    if (!rs.reason && !rs.note.trim()) return dialog.alert("Please write the reason.");
    const okReq = await dialog.confirm("Send this revision request to your assigner?", { title: 'Request revision?' });
    if (!okReq) return;

    try {
      setIsProcessing(true);

      const finalRemarks = `${[rs.reason, rs.note.trim()].filter(Boolean).join(' - ')}. Proposed Deadline: ${proposedDeadline}`;

      await API.post('/tasks/handle-revision', {
        taskId: task._id,
        action: 'Request',
        remarks: finalRemarks,
        reason: rs.reason,
        reasonNote: rs.note.trim(),
        proposedDeadline: new Date(proposedDeadline)
      });

      /*await API.post('/tasks/handle-revision', {
        taskId: task._id,
        action: 'Notify'
      });*/

      dialog.alert("Revision request sent");
      onSuccess();
    } catch (err) {
      console.error(err);
      dialog.alert("Failed");
    } finally {
      setIsProcessing(false);
    }
  };






  // --- COMMAND: AUTHORIZE PROPOSED DEADLINE ---
  const handleApprove = async () => {
    try {
      setIsProcessing(true);

      // Safety Guard: Extract the date from the remarks string
      //let proposedDate = task.deadline; 
      if (!approveDate) { dialog.alert("Please choose the new deadline date."); return; }
      // keep the task's original time of day, so choosing a date does not move the deadline to early morning
      const baseTime = task?.deadline ? new Date(task.deadline) : new Date();
      const [yy, mm, dd] = approveDate.split('-').map(Number);
      const finalDeadline = new Date(yy, mm - 1, dd, baseTime.getHours(), baseTime.getMinutes(), 0, 0);

      await API.post(`/tasks/handle-revision`, {
        taskId: task._id,
        action: 'Approve',
        newDeadline: finalDeadline,
        assignerId: assignerId
      });

      dialog.alert("Handshake Successful: New deadline updated to 'Accepted' status.");
      onSuccess();
    } catch (err) {
      console.error("Approval Error:", err);
      dialog.alert("System Error: Approval protocol failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- COMMAND: EXECUTE TASK REROUTING ---
  const handleReassign = async () => {
    if (!newDoerId) return dialog.alert("Identify an alternative Doer node first.");

    try {
      setIsProcessing(true);
      await API.post(`/tasks/handle-revision`, {
        taskId: task._id,
        action: 'Reassign',
        newDoerId: newDoerId,
        remarks: reassignRemarks || "Task reassigned due to deadline conflict.",
        assignerId: assignerId
      });
      dialog.alert("Success: Task rerouted to new node.");
      onSuccess();
    } catch (err) {
      console.error("Reassignment Error:", err);
      dialog.alert("System Error: Rerouting failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-6 bg-amber-50/50 dark:bg-amber-500/5 rounded-[2rem] border border-amber-500/20 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl">
      {isDoer && (
        <div className="p-6 space-y-6">

          <h4 className="text-xs font-black uppercase">Request Revision</h4>

          <DateReasonFields value={rs} onChange={setRs} invalid={showErr} />

          {limited ? (
            <>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">New deadline (up to {maxExt} day{maxExt > 1 ? 's' : ''} after {fmtDay(task.deadline)})</label>
              <select
                value={extDays}
                onChange={(e) => setExtDays(e.target.value)}
                className="w-full p-4 border rounded-xl bg-background text-foreground"
              >
                <option value="">Choose the new date…</option>
                {extOptions.map((o) => (<option key={o.k} value={o.k}>{fmtDay(o.date)} (+{o.k} day{o.k > 1 ? 's' : ''})</option>))}
              </select>
              <p className="text-[10px] font-bold text-slate-500 ml-2">The new date is applied at once, no approval needed. A deadline can be changed only once.</p>
            </>
          ) : (
            <>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Proposed Deadline</label>
              <input
                type="date"
                value={proposedDeadline}
                placeholder="Proposed deadline"
                onChange={(e) => setProposedDeadline(e.target.value)}
                className="w-full p-4 border rounded-xl"
              />
            </>
          )}

          <button
            onClick={handleRequestRevision}
            disabled={isProcessing}
            className="w-full bg-yellow-500 text-white py-3 rounded-xl disabled:opacity-60"
          >
            {limited ? 'Change Deadline' : 'Submit Revision Request'}
          </button>

        </div>
      )}
      {/* Header Banner: Adaptive Alert State */}
      {isAssigner && (<>
        <div className="px-6 py-5 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-500" size={20} />
            <h4 className="text-amber-700 dark:text-amber-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] m-0 leading-tight">Intervention: Revision Request Raised</h4>
          </div>
          <div className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/20 shrink-0">
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Decision Pending</span>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">

          {/* Request Details Block */}
          <div className="bg-background/80 backdrop-blur-sm p-5 rounded-2xl border border-amber-500/10 space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <MessageSquare size={12} className="text-amber-500" /> Doer Statement To Revise
            </div>
            <p className="text-slate-600 dark:text-slate-500 text-xs md:text-sm font-bold leading-relaxed italic uppercase tracking-tight">
              {/*"{task.remarks || "Standard revision requested without additional context."}"*/}
              {reason}
            </p>
          </div>

          {/* Action Choice 1: Approve Proposal */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Option A: Accept Proposal</label>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 ml-2">
                Doer proposed: {doerProposedYmd || 'not specified'} — you can change the date before authorizing.
              </p>
              <input
                type="date"
                value={approveDate}
                min={toYmd(new Date())}
                onChange={(e) => setApproveDate(e.target.value)}
                className="w-full p-4 border border-border rounded-xl bg-background text-foreground text-sm font-bold"
              />
            </div>
            <button
              disabled={isProcessing}
              onClick={handleApprove}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white dark:text-slate-950 py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20"
            >
              {isProcessing ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Authorize This Deadline
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
                  {(employees || [])
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
                  placeholder="Add message To The New Doer..."
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
                    : 'bg-primary hover:bg-violet-400 text-white dark:text-slate-950 shadow-primary/20'
                  }
                    `}
              >
                {isProcessing ? <RefreshCcw size={20} className="animate-spin" /> : <UserPlus size={20} />}
                Execute Reroute
              </button>
            </div>
          </div>
        </div>
      </>)}

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