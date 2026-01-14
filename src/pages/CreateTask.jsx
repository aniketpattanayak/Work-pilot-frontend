import React, { useState, useEffect, useCallback } from "react";
import API from '../api/axiosConfig'; // Centralized API instance
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
} from "lucide-react";

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
  const [loading, setLoading] = useState(
    !initialEmployees || initialEmployees.length === 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NEW: State to track multiple helper doers
  const [selectedHelpers, setSelectedHelpers] = useState([]);

  const currentTenantId = tenantId || localStorage.getItem("tenantId");
  const sessionUser = JSON.parse(localStorage.getItem("user"));
  const currentAssignerId =
    assignerId ||
    sessionUser?._id ||
    sessionUser?.id;

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures 'employees' is always an array to prevent .filter crashes.
   */
  const fetchMyTeam = useCallback(async () => {
    if (!currentAssignerId) return;
    try {
      setLoading(true);
      // Switched to centralized API instance
      const res = await API.get(`/tasks/authorized-staff/${currentAssignerId}`);
      
      // Safety: Unwrap data if it's nested in an object (e.g. res.data.doers)
      const data = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.doers || res.data?.data || []);
        
      setEmployees(data);
    } catch (err) {
      console.error("Error loading team:", err);
      setEmployees([]); // Fallback
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentTenantId || !currentAssignerId) {
      return alert(
        "Error: Assigner Session not found. Please refresh the page."
      );
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

    // Append Helper Doers to FormData
    formData.append("helperDoers", JSON.stringify(selectedHelpers));

    if (task.coordinatorId) {
      formData.append("coordinatorId", task.coordinatorId);
    }

    selectedFiles.forEach((file) => {
      formData.append("taskFiles", file);
    });

    try {
      // Switched to centralized API instance
      await API.post("/tasks/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Task Created Successfully with Support Team!");

      setTask({
        title: "",
        description: "",
        doerId: "",
        coordinatorId: "",
        priority: "Medium",
        deadline: "",
        isRevisionAllowed: true,
        coworkers: [],
      });
      setSelectedFiles([]);
      setSelectedHelpers([]); // Reset helpers
    } catch (err) {
      console.error("Frontend Error:", err);
      alert("Error: " + (err.response?.data?.error || "Task Creation Failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCcw className="animate-spin text-sky-400" size={32} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          Assembling Your Team...
        </p>
      </div>
    );

  // Helper for safety checks in JSX
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10 flex items-center gap-4">
        <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
          <PlusCircle className="text-sky-400" size={32} />
        </div>
        <div>
          <h2 className="text-white text-3xl font-black tracking-tighter">
            Delegate New Task
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Assign work, set deadlines, and build your support team.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-slate-800/60 shadow-2xl space-y-8"
      >
        {/* Task Title */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <FileText size={14} className="text-sky-400" /> Task Heading
          </label>
          <input
            type="text"
            placeholder="What needs to be done?"
            required
            value={task.title}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold placeholder:text-slate-700"
            onChange={(e) => setTask({ ...task, title: e.target.value })}
          />
        </div>

        {/* Task Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <AlertCircle size={14} className="text-sky-400" /> Operational
            Context
          </label>
          <textarea
            placeholder="Provide specific instructions or goals..."
            value={task.description}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all min-h-[120px] font-medium placeholder:text-slate-700"
            onChange={(e) => setTask({ ...task, description: e.target.value })}
          />
        </div>

        {/* Assignment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <User size={14} className="text-sky-400" /> Primary Doer (Lead)
              </label>
              <select
                required
                value={task.doerId}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold appearance-none cursor-pointer"
                onChange={(e) => setTask({ ...task, doerId: e.target.value })}
              >
                <option value="">Select Responsible Staff</option>
                {safeEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department} - {Array.isArray(emp.roles) ? emp.roles.join(", ") : emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Helper Doers Multi-Select Section */}
            <div className="space-y-2 animate-in fade-in duration-500">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <Users size={14} className="text-sky-400" /> Support Team /
                Helpers
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-[160px] overflow-y-auto space-y-2 scrollbar-hide">
                {safeEmployees
                  .filter((e) => e._id !== task.doerId) // Prevent Lead from being a Helper
                  .map((emp) => (
                    <label
                      key={emp._id}
                      className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group/helper"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHelpers.some(
                          (h) => h.helperId === emp._id
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHelpers([
                              ...selectedHelpers,
                              { helperId: emp._id, name: emp.name },
                            ]);
                          } else {
                            setSelectedHelpers(
                              selectedHelpers.filter(
                                (h) => h.helperId !== emp._id
                              )
                            );
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-xs font-bold text-slate-400 group-hover/helper:text-slate-200 transition-colors">
                        {emp.name}{" "}
                        <span className="text-[10px] text-slate-600">
                          ({emp.department})
                        </span>
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <ShieldCheck size={14} className="text-emerald-400" /> Quality
              Coordinator
            </label>
            <select
              value={task.coordinatorId}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold appearance-none cursor-pointer"
              onChange={(e) =>
                setTask({ ...task, coordinatorId: e.target.value })
              }
            >
              <option value="">None (Self-Track)</option>
              {safeEmployees
                .filter((emp) => {
                  const roles = Array.isArray(emp.roles) ? emp.roles : [emp.role];
                  return roles.some((r) => ["Coordinator", "Admin"].includes(r));
                })
                .map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Deadline & Priority Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <Calendar size={14} className="text-sky-400" /> Expected
              Completion
            </label>
            <input
              type="datetime-local"
              required
              value={task.deadline}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold"
              onChange={(e) => setTask({ ...task, deadline: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <Flag size={14} className="text-sky-400" /> Urgency Level
            </label>
            <select
              value={task.priority}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold appearance-none cursor-pointer"
              onChange={(e) => setTask({ ...task, priority: e.target.value })}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Urgent">Urgent / Critical</option>
            </select>
          </div>
        </div>

        {/* FILE UPLOAD SECTION */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <Paperclip size={14} className="text-sky-400" /> Documentation &
            Blueprint References
          </label>
          <div className="border-2 border-dashed border-slate-800 bg-slate-950/50 p-8 rounded-[2rem] text-center group hover:border-sky-500/50 transition-colors relative">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <Paperclip
                size={32}
                className="text-slate-600 group-hover:text-sky-400 transition-colors"
              />
              <p className="text-sm font-bold text-slate-400">
                Click or drag files to attach
              </p>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Supports PDF, Images, and Docs
              </p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-3 animate-in zoom-in-75 duration-300"
                >
                  <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revision Toggle */}
        <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded-lg transition-colors ${
                task.isRevisionAllowed
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <RefreshCcw
                size={20}
                className={task.isRevisionAllowed ? "animate-spin-slow" : ""}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">
                Revision Protocol
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Allow Doer to request deadline adjustments based on ground
                reality.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={task.isRevisionAllowed}
              onChange={(e) =>
                setTask({ ...task, isRevisionAllowed: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <RefreshCcw className="animate-spin" size={20} />
          ) : (
            <PlusCircle
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
          )}
          {isSubmitting
            ? "Encrypting & Notifying Team..."
            : "Initialize Task & Sync WhatsApp"}
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CreateTask;