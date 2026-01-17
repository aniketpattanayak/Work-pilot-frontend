import React, { useState, useEffect, useCallback } from "react";
import API from '../api/axiosConfig'; 
import {
  Paperclip,
  X,
  PlusCircle,
  User,
  Users, 
  ShieldCheck,
  Calendar,
  FileText,
  RefreshCcw,
  AlertCircle,
  Flag,
  ChevronDown,
  Layout,
  UserPlus,
  Target
} from "lucide-react";

/**
 * CREATE TASK: OPERATIONAL DIRECTIVE ENGINE v1.3
 * Purpose: Initializes high-priority tasks with complex node structures and AWS asset links.
 * Logic: Handles multipart/form-data for file uploads and dynamic helper-doer mapping.
 */
const CreateTask = ({ tenantId, assignerId, employees: initialEmployees }) => {
  const [task, setTask] = useState({
    title: "",
    description: "",
    doerId: "",
    coordinatorId: "",
    priority: "Medium",
    deadline: "",
    isRevisionAllowed: true,
    coworkers: [],
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [loading, setLoading] = useState(!initialEmployees || initialEmployees.length === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHelpers, setSelectedHelpers] = useState([]);

  const currentTenantId = tenantId || localStorage.getItem("tenantId");
  const sessionUser = JSON.parse(localStorage.getItem("user"));
  const currentAssignerId = assignerId || sessionUser?._id || sessionUser?.id;

  // --- DATA ACQUISITION: AUTHORIZED STAFF NODES ---
  const fetchMyTeam = useCallback(async () => {
    if (!currentAssignerId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/authorized-staff/${currentAssignerId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.doers || res.data?.data || []);
      setEmployees(data);
    } catch (err) {
      console.error("Team Synchronization Error:", err);
      setEmployees([]); 
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId]);

  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
      setLoading(false);
    } else {
      fetchMyTeam();
    }
  }, [currentAssignerId, initialEmployees, fetchMyTeam]);

  const handleFileChange = (e) => {
    setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  // --- COMMAND: DISPATCH MISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentTenantId || !currentAssignerId) {
      return alert("Session Failure: Assigner signature not detected. Please re-authenticate.");
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("tenantId", currentTenantId);
    formData.append("assignerId", currentAssignerId);
    formData.append("title", task.title);
    formData.append("description", task.description);
    formData.append("doerId", task.doerId);
    formData.append("priority", task.priority);
    formData.append("deadline", task.deadline);
    formData.append("isRevisionAllowed", task.isRevisionAllowed);
    formData.append("helperDoers", JSON.stringify(selectedHelpers));

    if (task.coordinatorId) formData.append("coordinatorId", task.coordinatorId);
    selectedFiles.forEach((file) => formData.append("taskFiles", file));

    try {
      await API.post("/tasks/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Mission Synchronized: Task dispatched to selected nodes.");
      setTask({ title: "", description: "", doerId: "", coordinatorId: "", priority: "Medium", deadline: "", isRevisionAllowed: true, coworkers: [] });
      setSelectedFiles([]);
      setSelectedHelpers([]);
    } catch (err) {
      alert("Dispatch Error: " + (err.response?.data?.error || "Check master server linkage."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI SUB-COMPONENT: SECTION LABEL
  const FormSectionLabel = ({ icon: Icon, text, colorClass = "text-primary" }) => (
    <div className="flex items-center gap-4 mb-8">
        <div className={`p-2.5 rounded-xl bg-background border border-border shadow-inner ${colorClass}`}>
            <Icon size={20} />
        </div>
        <h3 className="text-foreground font-black uppercase text-xs tracking-[0.3em]">{text}</h3>
        <div className="h-px flex-1 bg-border/50" />
    </div>
  );

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[600px] gap-8">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={64} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase text-center">Assembling Mission Assets...</p>
    </div>
  );

  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20 selection:bg-primary/30">
      
      {/* --- EXECUTIVE HEADER --- */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-[1.5rem] border border-primary/20 shadow-inner transition-all duration-500">
            <PlusCircle className="text-primary" size={36} />
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">
              Task Delegation
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Initialize Operational Directives & Support Node Structures
            </p>
          </div>
        </div>
        <div className="bg-card px-6 py-2.5 rounded-full border border-border shadow-sm">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">System Controller v1.3</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card backdrop-blur-xl p-8 md:p-16 rounded-[4rem] border border-border shadow-2xl space-y-16 transition-all duration-500">
        
        {/* SECTION 1: MISSION PARAMETERS */}
        <section className="animate-in slide-in-from-left-4 duration-500">
            <FormSectionLabel icon={FileText} text="Asset Intelligence" />
            <div className="space-y-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Mission Heading</label>
                    <input
                        type="text"
                        placeholder="Define the primary objective..."
                        required
                        value={task.title}
                        className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm uppercase tracking-tight shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
                        onChange={(e) => setTask({ ...task, title: e.target.value })}
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Operational Context</label>
                    <textarea
                        placeholder="Provide execution parameters, safety warnings, or technical specifications..."
                        value={task.description}
                        className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[160px] font-bold text-sm shadow-inner resize-none placeholder:text-slate-400 dark:placeholder:text-slate-700 leading-relaxed"
                        onChange={(e) => setTask({ ...task, description: e.target.value })}
                    />
                </div>
            </div>
        </section>

        {/* SECTION 2: TEAM ASSEMBLY */}
        <section className="animate-in slide-in-from-left-4 duration-500">
            <FormSectionLabel icon={Users} text="Node Assignment" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Lead Operational Doer</label>
                        <div className="relative group">
                            <select
                                required
                                value={task.doerId}
                                className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm appearance-none cursor-pointer shadow-inner uppercase tracking-tight"
                                onChange={(e) => setTask({ ...task, doerId: e.target.value })}
                            >
                                <option value="">Identify Responsible Staff</option>
                                {safeEmployees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name} — ({emp.department || 'Node'})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors" size={20} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Support Nodes (Helpers)</label>
                        <div className="bg-background border border-border rounded-[2.5rem] p-8 max-h-[260px] overflow-y-auto space-y-4 shadow-inner custom-scrollbar">
                            {safeEmployees
                            .filter((e) => e._id !== task.doerId)
                            .map((emp) => {
                                const isChecked = selectedHelpers.some((h) => h.helperId === emp._id);
                                return (
                                    <label key={emp._id} className={`flex items-center gap-5 p-5 rounded-2xl cursor-pointer border transition-all shadow-sm ${isChecked ? 'bg-card border-primary ring-2 ring-primary/20' : 'bg-card border-border hover:border-slate-300 dark:hover:border-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedHelpers([...selectedHelpers, { helperId: emp._id, name: emp.name }]);
                                                else setSelectedHelpers(selectedHelpers.filter((h) => h.helperId !== emp._id));
                                            }}
                                        />
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${isChecked ? "bg-primary border-primary text-white" : "bg-background border-border"}`}>
                                            {isChecked && <PlusCircle size={16}/>}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-[13px] font-black truncate tracking-tight uppercase ${isChecked ? 'text-primary' : 'text-foreground'}`}>{emp.name}</span>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{emp.department || 'General'}</span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Quality Coordinator (Observer)</label>
                        <div className="relative group">
                            <select
                                value={task.coordinatorId}
                                className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-sm appearance-none cursor-pointer shadow-inner uppercase tracking-tight"
                                onChange={(e) => setTask({ ...task, coordinatorId: e.target.value })}
                            >
                                <option value="">Self-Track Protocol</option>
                                {safeEmployees
                                    .filter((emp) => {
                                        const roles = Array.isArray(emp.roles) ? emp.roles : [emp.role];
                                        return roles.some((r) => ["Coordinator", "Admin"].includes(r));
                                    })
                                    .map((emp) => (
                                        <option key={emp._id} value={emp._id}>{emp.name} — Quality Sector</option>
                                    ))}
                            </select>
                            <ShieldCheck className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500/50 pointer-events-none group-hover:text-emerald-500 transition-colors" size={20} />
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 p-10 rounded-[2.5rem] border border-emerald-500/20 shadow-inner relative overflow-hidden h-fit">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                           <Target size={120} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-5 mb-5 relative z-10">
                            <ShieldCheck size={28} className="text-emerald-500" />
                            <h4 className="text-emerald-600 dark:text-emerald-400 font-black text-[11px] uppercase tracking-[0.3em]">Verification Logic</h4>
                        </div>
                        <p className="text-slate-500 dark:text-emerald-500/60 text-[11px] font-black uppercase tracking-widest leading-relaxed relative z-10">
                            Assigning a Quality Coordinator ensures a secondary node must verify work proof via the <span className="underline text-emerald-600 dark:text-emerald-400">AWS Document Pipeline</span> before finalization.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 3: LOGISTICS & SCHEDULE */}
        <section className="animate-in slide-in-from-left-4 duration-500">
            <FormSectionLabel icon={Calendar} text="Maturity & Urgency" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Target Completion</label>
                    <input
                        type="datetime-local"
                        required
                        value={task.deadline}
                        className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm shadow-inner uppercase tracking-tight"
                        onChange={(e) => setTask({ ...task, deadline: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-1 block">Priority Tier</label>
                    <div className="relative group">
                        <select
                            value={task.priority}
                            className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm appearance-none cursor-pointer shadow-inner uppercase tracking-tight"
                            onChange={(e) => setTask({ ...task, priority: e.target.value })}
                        >
                            <option value="Low">Low Efficiency Mode</option>
                            <option value="Medium">Standard Routine</option>
                            <option value="High">High Priority Delta</option>
                            <option value="Urgent">Critical Mission State</option>
                        </select>
                        <Flag className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none group-hover:text-primary transition-colors" size={20} />
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 4: DOCUMENTATION DROPZONE */}
        <section className="animate-in slide-in-from-left-4 duration-500">
            <FormSectionLabel icon={Paperclip} text="Digital Blueprint Link" />
            <div className="space-y-8">
                <div className="relative group/drop">
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-4 border-dashed border-border bg-background/50 p-16 rounded-[3rem] text-center group-hover/drop:border-primary/50 group-hover/drop:bg-primary/5 transition-all duration-500 relative shadow-inner overflow-hidden">
                        <div className="flex flex-col items-center gap-6 relative z-10">
                            <div className="p-5 bg-card border border-border rounded-[2rem] shadow-2xl transition-transform group-hover/drop:scale-110 group-hover/drop:rotate-6">
                                <Paperclip size={48} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground uppercase tracking-tighter leading-none">Deploy Assets</p>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-[0.25em]">Supports PDF, Industrial CADs, Data Images</p>
                            </div>
                        </div>
                    </div>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-4 animate-in zoom-in-95">
                        {selectedFiles.map((f, i) => (
                            <div key={i} className="bg-primary/5 border border-primary/20 pl-6 pr-4 py-3 rounded-full flex items-center gap-5 shadow-sm transition-all hover:bg-primary/10">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em] truncate max-w-[220px]">
                                    {f.name}
                                </span>
                                <button type="button" onClick={() => removeFile(i)} className="p-2 bg-card border border-border rounded-full text-rose-500 hover:scale-110 transition-transform shadow-md">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>

        {/* --- PROTOCOL: REVISION NEGOTIATION --- */}
        <div className="bg-background border border-border p-10 rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-8 transition-all group shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <RefreshCcw size={160} className="text-emerald-500" />
          </div>
          <div className="flex items-center gap-8 relative z-10">
            <div className={`p-5 rounded-[1.5rem] border transition-all shadow-2xl ${task.isRevisionAllowed ? "bg-emerald-500 border-emerald-400 text-white dark:text-slate-950 shadow-emerald-500/20" : "bg-rose-500 border-rose-400 text-white dark:text-slate-950 shadow-rose-500/20"}`}>
              <RefreshCcw size={32} className={task.isRevisionAllowed ? "animate-spin-slow" : ""} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-black text-foreground uppercase tracking-tight">Revision Negotiation Mode</p>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed max-w-md opacity-70">
                Authorized nodes may propose deadline optimizations based on ground-floor reality when this protocol is active.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer scale-150 relative z-10">
            <input type="checkbox" checked={task.isRevisionAllowed} onChange={(e) => setTask({ ...task, isRevisionAllowed: e.target.checked })} className="sr-only peer" />
            <div className="w-12 h-6 bg-card border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 after:peer-checked:bg-white shadow-inner"></div>
          </label>
        </div>

        {/* --- GLOBAL DISPATCH TRIGGER --- */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            group relative w-full py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-5 shadow-2xl
            ${isSubmitting 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-border" 
              : "bg-primary hover:bg-sky-400 text-white dark:text-slate-950 hover:shadow-primary/30 active:scale-95 cursor-pointer shadow-[0_20px_50px_rgba(56,189,248,0.3)]"
            }
          `}
        >
          {isSubmitting ? (
            <RefreshCcw className="animate-spin" size={26} />
          ) : (
            <UserPlus size={26} className="group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
          )}
          {isSubmitting ? "Syncing Global Telemetry..." : "Dispatch Mission Directive"}
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}</style>
    </div>
  );
};

export default CreateTask;