import React, { useState, useEffect, useCallback, forwardRef, useRef } from "react";
import API from '../api/axiosConfig'; 
import DatePicker from "react-datepicker"; 
import "react-datepicker/dist/react-datepicker.css"; 
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
  CalendarDays,
  ChevronRight,
  Search
} from "lucide-react";

/**
 * CREATE TASK: DIRECTIVE PROVISIONING MODULE v1.6
 * UPDATED: Integrated Searchable Doer Dropdown & Follower Filtering.
 * UI: Fully responsive and theme-adaptive (Light/Dark).
 */
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative group cursor-pointer" onClick={onClick} ref={ref}>
    <input
      value={value}
      readOnly
      placeholder="Select Deadline Date & Time"
      className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold cursor-pointer placeholder:text-slate-500 shadow-inner"
    />
    <CalendarDays className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none" size={18} />
  </div>
));

const CreateTask = ({ tenantId, assignerId, employees: initialEmployees }) => {
  const [task, setTask] = useState({
    title: "",
    description: "",
    doerId: "",
    coordinatorId: "",
    priority: "Medium",
    deadline: null, 
    isRevisionAllowed: true,
    coworkers: [],
  });

  // Search & UI States
  const [doerSearch, setDoerSearch] = useState('');
  const [followerSearch, setFollowerSearch] = useState('');
  const [showDoerDropdown, setShowDoerDropdown] = useState(false);
  const doerDropdownRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [loading, setLoading] = useState(!initialEmployees || initialEmployees.length === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHelpers, setSelectedHelpers] = useState([]);

  const currentTenantId = tenantId || localStorage.getItem("tenantId");
  const sessionUser = JSON.parse(localStorage.getItem("user"));
  const currentAssignerId = assignerId || sessionUser?._id || sessionUser?._id;

  // Handle outside click for Doer dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (doerDropdownRef.current && !doerDropdownRef.current.contains(event.target)) {
        setShowDoerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMyTeam = useCallback(async () => {
    if (!currentAssignerId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/authorized-staff/${currentAssignerId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.doers || res.data?.data || []);
      setEmployees(data);
    } catch (err) {
      console.error("Error loading team:", err);
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

  // Filtering Logic
  const filteredDoers = employees.filter(emp => 
    emp.name.toLowerCase().includes(doerSearch.toLowerCase())
  );

  const filteredFollowers = employees.filter(emp => 
    emp._id !== task.doerId && 
    emp.name.toLowerCase().includes(followerSearch.toLowerCase())
  );

  const handleSelectDoer = (emp) => {
    setTask({ ...task, doerId: emp._id });
    setDoerSearch(emp.name);
    setShowDoerDropdown(false);
  };

  const handleFileChange = (e) => {
    setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.doerId) return alert("Please search and select a Primary Doer (Lead).");
    if (!task.deadline) return alert("Please select a completion deadline.");

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("tenantId", currentTenantId);
    formData.append("assignerId", currentAssignerId);
    formData.append("title", task.title);
    formData.append("description", task.description);
    formData.append("doerId", task.doerId);
    formData.append("priority", task.priority);
    formData.append("deadline", task.deadline.toISOString()); 
    formData.append("isRevisionAllowed", task.isRevisionAllowed);
    formData.append("helperDoers", JSON.stringify(selectedHelpers));

    if (task.coordinatorId) formData.append("coordinatorId", task.coordinatorId);
    selectedFiles.forEach((file) => formData.append("taskFiles", file));

    try {
      await API.post("/tasks/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Success: Mission Assigned Successfully!");
      setTask({ title: "", description: "", doerId: "", coordinatorId: "", priority: "Medium", deadline: null, isRevisionAllowed: true, coworkers: [] });
      setSelectedFiles([]);
      setSelectedHelpers([]);
      setDoerSearch('');
      setFollowerSearch('');
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Task Creation Failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={40} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Synchronizing Nodes...</p>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
        <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
          <PlusCircle className="text-primary" size={32} />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Delegate New Task</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Assign work, set deadlines, and build your support team.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-border shadow-2xl space-y-8 transition-colors duration-500">
        
        {/* Task Title */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <FileText size={14} className="text-primary" /> Task Title
          </label>
          <input
            type="text" placeholder="What needs to be done?" required
            value={task.title}
            className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-500 shadow-inner"
            onChange={(e) => setTask({ ...task, title: e.target.value })}
          />
        </div>

        {/* Task Description */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <AlertCircle size={14} className="text-primary" />  Task Description
          </label>
          <textarea
            placeholder="Provide specific instructions or goals... "
            value={task.description}
            className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all min-h-[120px] font-medium placeholder:text-slate-500 shadow-inner resize-none"
            onChange={(e) => setTask({ ...task, description: e.target.value })}
          />
        </div>

        {/* SEARCHABLE PRIMARY DOER SELECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3 relative" ref={doerDropdownRef}>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
              <User size={14} className="text-primary" /> Primary Doer (Lead)
            </label>
            <div className="relative group">
              <input 
                type="text"
                placeholder="Search staff by name..."
                value={doerSearch}
                onFocus={() => setShowDoerDropdown(true)}
                onChange={(e) => { setDoerSearch(e.target.value); setShowDoerDropdown(true); }}
                className={`w-full bg-background border ${task.doerId ? 'border-emerald-500/50' : 'border-border'} text-foreground px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner uppercase text-xs`}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              {doerSearch && (
                <button type="button" onClick={() => { setDoerSearch(''); setTask({...task, doerId: ''}); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"><X size={16} /></button>
              )}
            </div>

            {showDoerDropdown && (
              <div className="absolute z-[100] w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                {filteredDoers.map(emp => (
                  <div key={emp._id} onClick={() => handleSelectDoer(emp)} className="px-6 py-4 hover:bg-primary/10 cursor-pointer flex flex-col border-b border-border/50 last:border-0 transition-colors">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{emp.name}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{emp.department || 'General Sector'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
              <ShieldCheck size={14} className="text-primary" /> Priority
            </label>
            <div className="relative">
              <select
                value={task.priority}
                className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold appearance-none cursor-pointer shadow-inner uppercase tracking-tight"
                onChange={(e) => setTask({ ...task, priority: e.target.value })}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={20} />
            </div>
          </div>
        </div>

        {/* Deadline Protocol */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <Calendar size={14} className="text-primary" /> due date
          </label>
          <DatePicker
            selected={task.deadline}
            onChange={(date) => setTask({ ...task, deadline: date })}
            showTimeSelect
            minDate={new Date()}
            dateFormat="dd MMMM, yyyy h:mm aa"
            customInput={<CustomDateInput />}
            calendarClassName="work-pilot-dark-calendar"
          />
        </div>

        {/* SEARCHABLE FOLLOWERS */}
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex justify-between items-center px-1">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
              <Users size={14} className="text-primary" /> Support Followers
            </label>
            <div className="relative w-48">
               <input 
                 type="text"
                 placeholder="Filter list..."
                 value={followerSearch}
                 onChange={(e) => setFollowerSearch(e.target.value)}
                 className="w-full bg-background border border-border text-[10px] font-bold px-8 py-2 rounded-full outline-none focus:border-primary transition-all"
               />
               <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div className="bg-background border border-border rounded-2xl p-4 max-h-[180px] overflow-y-auto space-y-2 custom-scrollbar shadow-inner">
            {filteredFollowers.map((emp) => (
              <label key={emp._id} className="flex items-center justify-between gap-3 p-3 hover:bg-primary/5 rounded-xl cursor-pointer transition-all group/helper border border-transparent hover:border-primary/20">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-foreground uppercase tracking-tight truncate">{emp.name}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">Sector: {emp.department || 'N/A'}</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedHelpers.some((h) => h.helperId === emp._id)}
                  onChange={(e) => {
                    if (e.target.checked) { setSelectedHelpers([...selectedHelpers, { helperId: emp._id, name: emp.name }]); } 
                    else { setSelectedHelpers(selectedHelpers.filter((h) => h.helperId !== emp._id)); }
                  }}
                  className="w-4 h-4 rounded accent-primary bg-background border-border shrink-0"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Blueprint & Reference Attachment Node */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <Paperclip size={14} className="text-primary" /> Documentation and Blueprints references
          </label>
          <div className="border-2 border-dashed border-border bg-background/50 p-8 rounded-[2rem] text-center group hover:border-primary/40 transition-all relative overflow-hidden">
            <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="" />
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-primary/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                <Paperclip size={32} className="text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground uppercase tracking-tight">Synchronize Assets</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Supports PDF, Images, and CAD Docs</p>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {selectedFiles.map((f, i) => (
                <div key={i} className="bg-background border border-border px-4 py-2.5 rounded-xl flex items-center gap-3 animate-in zoom-in-75 shadow-sm">
                  <span className="text-[11px] font-black text-foreground uppercase tracking-tight truncate max-w-[150px]">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:bg-red-500/10 p-1 rounded-lg transition-all"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revision Node Logic */}
        <div className="bg-background border border-border p-6 rounded-2xl flex items-center justify-between group shadow-inner transition-colors duration-500">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-xl transition-all duration-700 ${task.isRevisionAllowed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
              <RefreshCcw size={20} className={task.isRevisionAllowed ? "animate-spin-slow" : ""} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-foreground uppercase tracking-tight leading-none">Allow doer to request due date adjustments</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" checked={task.isRevisionAllowed} onChange={(e) => setTask({ ...task, isRevisionAllowed: e.target.checked })} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
          </label>
        </div>

        {/* EXECUTION HANDSHAKE */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white dark:text-slate-950 font-black text-xs sm:text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
        >
          {isSubmitting ? <RefreshCcw className="animate-spin" size={20} /> : <PlusCircle size={20} className="group-hover:scale-110 transition-transform duration-500" />}
          {isSubmitting ? "Encrypting & Notifying Team Nodes..." : "Create Deligate task"}
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
};

export default CreateTask;