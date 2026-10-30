import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api/axiosConfig';
import { fmtIST } from '../../utils/istTime';
import { X, Upload, Camera, AlertCircle, Calendar, Clock, User } from 'lucide-react';
import LocalFileThumb from '../LocalFileThumb';
import { useUploadLimit, checkFiles, uploadHint } from '../../utils/uploadLimit';
import { dialog } from '../Dialog';

const idOf = (v) => String((v && v._id) || v || '');
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => {
    if (!d) return '';
    const x = new Date(d);
    if (isNaN(x.getTime())) return '';
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

/**
 * "Send Back For Correction" modal:
 * - Displays both assignment date and deadline date.
 * - Dropdown of mapped users to reassign or keep with same user.
 * - Set a new deadline.
 * - What needs to be corrected remarks.
 * - Optional photo/file evidence (from storage or live camera).
 * - Pink/coral "SEND BACK TO DOER" / "REASSIGN TASK" action.
 */
export default function SendBackReassignModal({ task, assignerId, onClose, onDone }) {
    const currentDoerId = idOf(task?.doerId);
    const [staff, setStaff] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(true);
    const [who, setWho] = useState(currentDoerId);

    // Initial deadline: if current deadline is in the future, pre-fill it; otherwise tomorrow 18:00
    const [when, setWhen] = useState(() => {
        if (task?.deadline && new Date(task.deadline).getTime() > Date.now()) {
            return toLocalInput(task.deadline);
        }
        const tomorrow = new Date(Date.now() + 86400000);
        tomorrow.setHours(18, 0, 0, 0);
        return toLocalInput(tomorrow);
    });

    const [note, setNote] = useState('');
    const [files, setFiles] = useState([]);
    const [err, setErr] = useState('');
    const [bad, setBad] = useState(false);
    const [busy, setBusy] = useState(false);

    const maxFileMb = useUploadLimit();

    const addFiles = (list) => {
        const { ok, problems } = checkFiles(list, maxFileMb);
        if (problems.length) dialog.alert(problems.join('\n'), { tone: 'error', title: 'File not added' });
        if (ok.length) setFiles((prev) => [...prev, ...ok]);
    };

    useEffect(() => {
        let live = true;
        if (!assignerId) return;
        API.get(`/tasks/authorized-staff/${assignerId}?mappedOnly=1`)
            .then((r) => { if (live) setStaff((r.data && r.data.doers) || []); })
            .catch(() => { if (live) { setStaff([]); setErr('Could not load mapped staff. You can still send it to the same person.'); } })
            .finally(() => { if (live) setLoadingStaff(false); });
        return () => { live = false; };
    }, [assignerId]);

    // The current doer is always on the list; mapped staff are included
    const options = useMemo(() => {
        const list = [{
            _id: currentDoerId,
            name: (task?.doerId && task.doerId.name) || 'Current person',
            same: true,
        }];
        staff.forEach((s) => {
            if (idOf(s) !== currentDoerId) {
                list.push({ _id: idOf(s), name: s.name, department: s.department });
            }
        });
        return list;
    }, [staff, currentDoerId, task?.doerId]);

    const minNow = toLocalInput(new Date());

    const submit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setBad(true);
        setErr('');

        if (!who) {
            setErr('Please choose who gets the task.');
            return;
        }
        if (!when) {
            setErr('Please set the new deadline.');
            return;
        }
        if (new Date(when).getTime() <= Date.now()) {
            setErr('The new deadline must be in the future.');
            return;
        }
        if (!note.trim()) {
            setErr('Please describe what needs to be corrected.');
            return;
        }

        setBusy(true);
        try {
            const formData = new FormData();
            formData.append('taskId', task._id);
            formData.append('status', 'Accepted');
            formData.append('remarks', note.trim());
            formData.append('doerId', assignerId);
            formData.append('newDoerId', who);
            formData.append('newDeadline', new Date(when).toISOString());
            files.forEach((f) => formData.append('evidence', f));

            await API.put('/tasks/respond', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (onDone) onDone();
        } catch (e) {
            setErr((e.response && e.response.data && e.response.data.message) || 'Could not send the task. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const sameChosen = who === currentDoerId;

    return (
        <div className="fixed inset-0 z-[9995] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border flex-shrink-0">
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-widest text-red-600">
                            Send Back For Correction
                        </h3>
                        {task?.title && (
                            <p className="text-xs text-muted-foreground font-semibold mt-0.5 truncate max-w-sm">
                                {task.title}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={submit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {/* Display Task Dates: Assignment Date & Deadline Date */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="rounded-2xl border border-border bg-muted/20 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    <Calendar size={11} className="text-muted-foreground" /> Assignment Date
                                </p>
                                <p className="font-bold text-xs mt-1 text-foreground" data-testid="sb-given">
                                    {task?.createdAt ? fmtIST(task.createdAt) : '-'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-border bg-muted/20 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    <Clock size={11} className="text-muted-foreground" /> Deadline Date
                                </p>
                                <p className="font-bold text-xs mt-1 text-foreground" data-testid="sb-deadline">
                                    {task?.deadline ? fmtIST(task.deadline) : '-'}
                                </p>
                            </div>
                        </div>

                        {/* Map Users Dropdown: Reassign to mapped users or keep same person */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                Assign / Reassign To *
                            </label>
                            <div className="relative">
                                <select
                                    aria-label="Assign to"
                                    className={`w-full bg-background border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 disabled:opacity-50 appearance-none ${
                                        bad && !who ? 'border-red-500' : 'border-border'
                                    }`}
                                    value={who}
                                    onChange={(e) => setWho(e.target.value)}
                                    disabled={loadingStaff}
                                >
                                    {options.map((o) => (
                                        <option key={o._id} value={o._id}>
                                            {o.name}{o.same ? ' (same person)' : ''}{o.department ? ` · ${o.department}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                                    <User size={14} />
                                </div>
                            </div>
                            {!loadingStaff && options.length <= 1 && (
                                <p className="text-[10px] font-bold text-muted-foreground mt-1">
                                    No other mapped users found. Task will be reassigned to the same person.
                                </p>
                            )}
                        </div>

                        {/* Set a New Deadline */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                New Deadline *
                            </label>
                            <input
                                aria-label="New deadline"
                                type="datetime-local"
                                min={minNow}
                                required
                                className={`w-full bg-background border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 ${
                                    bad && !when ? 'border-red-500' : 'border-border'
                                }`}
                                value={when}
                                onChange={(e) => setWhen(e.target.value)}
                            />
                        </div>

                        {/* What Needs to Be Corrected? Textarea */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                What needs to be corrected? *
                            </label>
                            <textarea
                                required
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Describe the corrections needed — the doer will see this."
                                className={`w-full bg-background border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 resize-none ${
                                    bad && !note.trim() ? 'border-red-500' : 'border-border'
                                }`}
                            />
                        </div>

                        {/* Photo / File Evidence (Optional) */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                Photo / file evidence (optional)
                            </label>
                            <div className="flex gap-2">
                                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-red-400 hover:text-red-500 cursor-pointer transition-all">
                                    <Upload size={14} /> From storage
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                                    />
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-red-400 hover:text-red-500 cursor-pointer transition-all">
                                    <Camera size={14} /> Take photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                                    />
                                </label>
                            </div>
                            {files.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {files.map((f, i) => (
                                        <LocalFileThumb
                                            key={i}
                                            file={f}
                                            onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                                        />
                                    ))}
                                </div>
                            )}
                            <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                                {uploadHint(maxFileMb)}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {err && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{err}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer Submit Button matching screenshot */}
                    <div className="p-6 pt-2 flex-shrink-0">
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="sendback-submit"
                            className="w-full py-3.5 rounded-2xl bg-[#f87171] hover:bg-[#ef4444] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-md active:scale-[0.99]"
                        >
                            {busy ? 'Sending…' : sameChosen ? 'Send back to doer' : 'Reassign task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}