import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axiosConfig"; // Centralized API instance
import {
  ShieldCheck,
  UserPlus,
  CheckSquare,
  Square,
  RefreshCcw,
  Briefcase,
  Link as LinkIcon,
  Mail,
  Phone,
  User,
  Lock,
  Layers,
  ChevronRight
} from "lucide-react";

/**
 * ADD EMPLOYEE: PERSONNEL PROVISIONING MODULE v1.5
 * Purpose: Handles multi-role registration and hierarchical mapping.
 * UI: Fully responsive and theme-adaptive (Light/Dark).
 */
const AddEmployee = ({
  tenantId: propTenantId,
  selectedEmployee,
  onSuccess,
}) => {
  const tenantId = propTenantId || localStorage.getItem("tenantId");
  const availableRoles = ["Doer", "Assigner", "Coordinator", "Viewer", "Admin"];

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    whatsappNumber: "",
    email: "",
    roles: ["Doer"], // DEFAULT: Set to Doer on initial load
    password: "Password@123",
    managedDoers: [],
    managedAssigners: [],
  });

  const [allEmployees, setAllEmployees] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * 1. FETCH STAFF (Logic Preserved)
   */
  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await API.get(`/superadmin/employees/${tenantId}`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.employees || res.data?.data || [];
      setAllEmployees(data);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setAllEmployees([]);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /**
   * 2. LOAD DATA (Logic Preserved & Robust)
   */
  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        ...selectedEmployee,
        roles: Array.isArray(selectedEmployee.roles)
          ? selectedEmployee.roles.length > 0
            ? selectedEmployee.roles
            : ["Doer"]
          : selectedEmployee.role
          ? [selectedEmployee.role]
          : ["Doer"],
        managedDoers: Array.isArray(selectedEmployee.managedDoers)
          ? selectedEmployee.managedDoers.map((d) =>
              typeof d === "object" ? d._id : d
            )
          : [],
        managedAssigners: Array.isArray(selectedEmployee.managedAssigners)
          ? selectedEmployee.managedAssigners.map((a) =>
              typeof a === "object" ? a._id : a
            )
          : [],
        password: "",
      });
      setIsEditing(true);
    } else {
      setFormData({
        name: "",
        department: "",
        whatsappNumber: "",
        email: "",
        roles: ["Doer"],
        password: "Password@123",
        managedDoers: [],
        managedAssigners: [],
      });
      setIsEditing(false);
    }
  }, [selectedEmployee]);

  /**
   * 3. LOGIC HANDLERS (Preserved)
   */
  const handleRoleToggle = (role) => {
    const currentRoles = [...formData.roles];
    if (currentRoles.includes(role)) {
      if (currentRoles.length === 1) return;
      setFormData({
        ...formData,
        roles: currentRoles.filter((r) => r !== role),
      });
    } else {
      setFormData({ ...formData, roles: [...currentRoles, role] });
    }
  };

  const handleCheckboxChange = (id, type) => {
    const currentSelection = formData[type] || [];
    const isSelected = currentSelection.includes(id);
    if (isSelected) {
      setFormData({
        ...formData,
        [type]: currentSelection.filter((item) => item !== id),
      });
    } else {
      setFormData({ ...formData, [type]: [...currentSelection, id] });
    }
  };

  /**
   * 4. SUBMIT HANDSHAKE (Logic Preserved)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalRoles = formData.roles.length > 0 ? formData.roles : ["Doer"];
      const submissionData = { ...formData, roles: finalRoles, tenantId };

      if (isEditing && !formData.password) {
        delete submissionData.password;
      }

      if (isEditing) {
        await API.put(
          `/superadmin/employees/${selectedEmployee._id}`,
          submissionData
        );
        alert("Success: Employee Profile Updated.");
      } else {
        await API.post("/superadmin/add-employee", submissionData);
        alert("Success: New Employee Registered.");
      }

      setFormData({
        name: "",
        department: "",
        whatsappNumber: "",
        email: "",
        roles: ["Doer"],
        password: "Password@123",
        managedDoers: [],
        managedAssigners: [],
      });
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("Protocol Error: " + (err.response?.data?.message || "Connection Failed"));
    } finally {
      setLoading(false);
    }
  };

  const InputLabel = ({ icon: Icon, label }) => (
    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">
      <Icon size={14} className="text-primary" /> {label}
    </label>
  );

  return (
    <div className="bg-card backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-border overflow-hidden shadow-2xl animate-in fade-in duration-700 transition-colors duration-500">
      
      {/* HEADER SECTION (Responsive Scaling) */}
      <div className="px-6 py-6 sm:px-10 sm:py-8 bg-primary/5 border-b border-border">
        <h2 className="text-primary m-0 flex items-center gap-3 text-lg sm:text-2xl font-black tracking-tighter uppercase leading-tight">
          <UserPlus size={24} className="sm:w-7 sm:h-7" />{" "}
          {isEditing
            ? `Modify: ${formData.name}`
            : "Add New Employees "}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-[10px] sm:text-sm font-medium uppercase tracking-tight opacity-80">
          Configure authentication, company roles and organizational reporting lines
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-10 flex flex-col gap-8">
        
        {/* IDENTITY BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col">
            <InputLabel icon={User} label="Full Name" />
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              required
              className="w-full px-5 py-4 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Briefcase} label="Sector / Department" />
            <input
              type="text"
              placeholder="e.g. Operations Control"
              value={formData.department}
              required
              className="w-full px-5 py-4 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
        </div>

        {/* COMMUNICATION BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col">
            <InputLabel icon={Mail} label="Email Address" />
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              required
              className="w-full px-5 py-4 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Phone} label="WhatsApp number" />
            <input
              type="text"
              placeholder="91XXXXXXXXXX"
              value={formData.whatsappNumber}
              required
              className="w-full px-5 py-4 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            />
          </div>
        </div>

        {/* SECURITY & PERMISSIONS BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col">
            <InputLabel
              icon={Lock}
              label={isEditing ? "Reset Access Cipher" : "system access password"}
            />
            <input
              type="text"
              placeholder={isEditing ? "Blank to maintain current" : "Minimum 8 characters"}
              value={formData.password}
              required={!isEditing}
              className="w-full px-5 py-4 bg-background border border-border text-foreground rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner font-mono"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Layers} label="Assigned Permissions" />
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleToggle(role)}
                  className={`px-4 py-2.5 rounded-xl cursor-pointer text-[9px] flex items-center gap-2 font-black transition-all border uppercase tracking-widest ${
                    formData.roles.includes(role)
                      ? "bg-primary/10 border-primary/50 text-primary shadow-lg shadow-primary/5"
                      : "bg-background border-border text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  {formData.roles.includes(role) ? (
                    <CheckSquare size={14} strokeWidth={3} />
                  ) : (
                    <Square size={14} strokeWidth={2} />
                  )}{" "}
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- DYNAMIC HIERARCHY MAPPING (Responsive Container) --- */}
        {formData.roles.includes("Assigner") && (
          <div className="bg-emerald-500/5 p-6 sm:p-8 rounded-[2rem] border border-emerald-500/20 border-l-4 border-l-emerald-500 animate-in slide-in-from-left-4">
            <h4 className="text-emerald-600 dark:text-emerald-400 m-0 mb-6 text-[10px] flex items-center gap-2 font-black uppercase tracking-[0.2em]">
              <LinkIcon size={16} /> Directive Control (Doer Mapping)
            </h4>
            <div className="max-h-[220px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2 custom-scrollbar">
              {Array.isArray(allEmployees) &&
                allEmployees
                  .filter((e) => {
                    const roles = Array.isArray(e.roles) ? e.roles : [e.role];
                    return (
                      roles.includes("Doer") &&
                      e._id !== (selectedEmployee?._id || formData._id)
                    );
                  })
                  .map((doer) => (
                    <label
                      key={doer._id}
                      className={`flex items-center justify-between gap-3 p-4 rounded-2xl cursor-pointer border transition-all shadow-sm ${
                        formData.managedDoers?.includes(doer._id)
                          ? "bg-card border-emerald-500/40 text-foreground"
                          : "bg-background border-border text-slate-400"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black truncate leading-tight uppercase tracking-tight">
                          {doer.name}
                        </span>
                        <span className="text-[9px] opacity-60 uppercase font-bold tracking-tighter mt-1">
                          Sector: {doer.department || 'N/A'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                        checked={formData.managedDoers?.includes(doer._id)}
                        onChange={() => handleCheckboxChange(doer._id, "managedDoers")}
                      />
                    </label>
                  ))}
            </div>
          </div>
        )}

        {(formData.roles.includes("Coordinator") || formData.roles.includes("Admin")) && (
          <div className="bg-primary/5 p-6 sm:p-8 rounded-[2rem] border border-primary/20 border-l-4 border-l-primary animate-in slide-in-from-left-4">
            <h4 className="text-primary m-0 mb-6 text-[10px] flex items-center gap-2 font-black uppercase tracking-[0.2em]">
              <ShieldCheck size={16} /> Oversight Tracking Scope
            </h4>
            <div className="max-h-[220px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2 custom-scrollbar">
              {Array.isArray(allEmployees) &&
                allEmployees
                  .filter((e) => {
                    const roles = Array.isArray(e.roles) ? e.roles : [e.role];
                    return (
                      roles.includes("Assigner") &&
                      e._id !== (selectedEmployee?._id || formData._id)
                    );
                  })
                  .map((assigner) => (
                    <label
                      key={assigner._id}
                      className={`flex items-center justify-between gap-3 p-4 rounded-2xl cursor-pointer border transition-all shadow-sm ${
                        formData.managedAssigners?.includes(assigner._id)
                          ? "bg-card border-primary/40 text-foreground"
                          : "bg-background border-border text-slate-400"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black truncate leading-tight uppercase tracking-tight">
                          {assigner.name}
                        </span>
                        <span className="text-[9px] opacity-60 uppercase font-bold tracking-tighter mt-1">
                          Sector: {assigner.department || 'N/A'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-primary shrink-0"
                        checked={formData.managedAssigners?.includes(assigner._id)}
                        onChange={() => handleCheckboxChange(assigner._id, "managedAssigners")}
                      />
                    </label>
                  ))}
            </div>
          </div>
        )}

        {/* --- EXECUTION BUTTON --- */}
        <button
          type="submit"
          disabled={loading}
          className={`group relative mt-4 py-5 px-8 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center gap-4 shadow-xl ${
            loading
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-sky-500 to-sky-600 text-white dark:text-slate-950 hover:shadow-primary/30 active:scale-95 cursor-pointer"
          }`}
        >
          {loading ? (
            <RefreshCcw className="animate-spin" size={20} />
          ) : (
            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
          )}
          {isEditing
            ? "Commit Multi-Role Updates"
            : "Finalize Employee Registration"}
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: var(--color-primary); 
        }
      `}</style>
    </div>
  );
};

export default AddEmployee;