import React, { useState, useEffect, useCallback } from "react";
import API from '../api/axiosConfig'; 
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
 * ADD EMPLOYEE: NODE PROVISIONING ENGINE
 * Purpose: Handles authentication and permission matrix for factory personnel.
 * Logic: Supports multi-role assignments and dynamic linkage for Assigners/Coordinators.
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
    roles: ["Doer"], 
    password: "Password@123",
    managedDoers: [],
    managedAssigners: [],
  });

  const [allEmployees, setAllEmployees] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- DATA ACQUISITION PROTOCOL ---
  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await API.get(`/superadmin/employees/${tenantId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      setAllEmployees(data);
    } catch (err) {
      console.error("Staff Registry Fetch Error:", err);
      setAllEmployees([]);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // --- SESSION HYDRATION (EDIT MODE) ---
  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        ...selectedEmployee,
        roles: Array.isArray(selectedEmployee.roles) 
          ? selectedEmployee.roles 
          : selectedEmployee.role 
            ? [selectedEmployee.role] 
            : ["Doer"],
        managedDoers: Array.isArray(selectedEmployee.managedDoers) 
          ? selectedEmployee.managedDoers.map((d) => (typeof d === 'object' ? d._id : d)) 
          : [],
        managedAssigners: Array.isArray(selectedEmployee.managedAssigners) 
          ? selectedEmployee.managedAssigners.map((a) => (typeof a === 'object' ? a._id : a)) 
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

  // --- LOGIC: PERMISSION TOGGLE ---
  const handleRoleToggle = (role) => {
    const currentRoles = [...formData.roles];
    if (currentRoles.includes(role)) {
      if (currentRoles.length === 1) return; 
      setFormData({ ...formData, roles: currentRoles.filter((r) => r !== role) });
    } else {
      setFormData({ ...formData, roles: [...currentRoles, role] });
    }
  };

  // --- LOGIC: NODE LINKAGE ---
  const handleCheckboxChange = (id, type) => {
    const currentSelection = formData[type] || [];
    const isSelected = currentSelection.includes(id);
    if (isSelected) {
      setFormData({ ...formData, [type]: currentSelection.filter((item) => item !== id) });
    } else {
      setFormData({ ...formData, [type]: [...currentSelection, id] });
    }
  };

  // --- COMMAND: SUBMIT REGISTRY ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submissionData = { ...formData, tenantId };
      if (isEditing && !formData.password) delete submissionData.password;

      if (isEditing) {
        await API.put(`/superadmin/employees/${selectedEmployee._id}`, submissionData);
        alert("Personnel parameters synchronized successfully.");
      } else {
        await API.post("/superadmin/add-employee", submissionData);
        alert("New authentication node established.");
      }

      setFormData({
        name: "", department: "", whatsappNumber: "", email: "",
        roles: ["Doer"], password: "Password@123", managedDoers: [], managedAssigners: [],
      });
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("Encryption Failure: " + (err.response?.data?.message || "Check master server link."));
    } finally {
      setLoading(false);
    }
  };

  // --- UI SUB-COMPONENT: LABEL ---
  const InputLabel = ({ icon: Icon, label }) => (
    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-[0.3em]">
      <Icon size={14} className="text-primary" /> {label}
    </label>
  );

  return (
    <div className="bg-card backdrop-blur-xl rounded-[3rem] border border-border overflow-hidden shadow-2xl transition-all duration-500">
      
      {/* --- EXECUTIVE HEADER --- */}
      <div className="px-8 py-10 md:px-12 bg-background/50 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
            <h2 className="text-foreground m-0 flex items-center gap-4 text-3xl font-black tracking-tighter uppercase">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <UserPlus size={28} className="text-primary" />
              </div>
              {isEditing ? "Modify Personnel" : "Provision Staff"}
            </h2>
            <p className="text-slate-500 font-black mt-2 text-[10px] uppercase tracking-[0.25em]">
              {isEditing ? `Refining access parameters for node: ${formData.name}` : "Establishing new authentication credentials."}
            </p>
        </div>
        <div className="bg-card px-6 py-2.5 rounded-full border border-border shadow-sm">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">M-Tenant Secure Protocol</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
        
        {/* ROW 1: IDENTITY MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-1">
            <InputLabel icon={User} label="Personnel Identity" />
            <input
              type="text"
              placeholder="Full Legal Identification"
              value={formData.name}
              required
              className="w-full px-6 py-5 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-sm"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <InputLabel icon={Briefcase} label="Department Sector" />
            <input
              type="text"
              placeholder="e.g. Logic & Maintenance"
              value={formData.department}
              required
              className="w-full px-6 py-5 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-sm"
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
        </div>

        {/* ROW 2: COMMUNICATION NODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-1">
            <InputLabel icon={Mail} label="Access Email" />
            <input
              type="email"
              placeholder="auth@factory.node"
              value={formData.email}
              required
              className="w-full px-6 py-5 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-sm"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <InputLabel icon={Phone} label="WA Telemetry Node" />
            <input
              type="text"
              placeholder="91XXXXXXXXXX"
              value={formData.whatsappNumber}
              required
              className="w-full px-6 py-5 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-sm"
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            />
          </div>
        </div>

        {/* ROW 3: SECURITY & CLEARANCES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-1">
            <InputLabel icon={Lock} label={isEditing ? "Access Reset" : "Master Cipher"} />
            <input
              type="text"
              placeholder={isEditing ? "Leave blank to preserve current" : "Security sequence"}
              value={formData.password}
              required={!isEditing}
              className="w-full px-6 py-5 bg-background border border-border text-foreground rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-mono shadow-sm"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <InputLabel icon={Layers} label="Functional Clearances" />
            <div className="flex flex-wrap gap-2.5">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleToggle(role)}
                  className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] flex items-center gap-2 font-black transition-all border uppercase tracking-[0.15em] ${
                    formData.roles.includes(role) 
                    ? "bg-primary text-white dark:text-slate-950 border-primary shadow-lg shadow-primary/20" 
                    : "bg-background border-border text-slate-400 dark:text-slate-600 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {formData.roles.includes(role) ? <CheckSquare size={14} /> : <Square size={14} />} {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- DYNAMIC LINKAGE: DOERS --- */}
        {formData.roles.includes("Assigner") && (
          <div className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/20 border-l-4 border-l-emerald-500 animate-in slide-in-from-left-4 duration-500">
            <h4 className="text-emerald-600 dark:text-emerald-400 m-0 mb-6 text-[10px] flex items-center gap-3 font-black uppercase tracking-[0.3em]">
              <LinkIcon size={18} /> Operational Node Linkage
            </h4>
            <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-3 custom-scrollbar">
              {allEmployees
                .filter((e) => {
                  const roles = Array.isArray(e.roles) ? e.roles : [e.role];
                  return roles.includes("Doer") && e._id !== (selectedEmployee?._id || formData._id);
                })
                .map((doer) => (
                  <label 
                    key={doer._id} 
                    className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer border transition-all shadow-sm ${
                      formData.managedDoers?.includes(doer._id) 
                      ? "bg-card border-emerald-500 ring-2 ring-emerald-500/20" 
                      : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.managedDoers?.includes(doer._id)}
                      onChange={() => handleCheckboxChange(doer._id, "managedDoers")}
                    />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${formData.managedDoers?.includes(doer._id) ? "bg-emerald-500 border-emerald-500 text-white" : "bg-background border-border"}`}>
                        {formData.managedDoers?.includes(doer._id) && <CheckSquare size={16}/>}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[13px] font-black tracking-tight truncate ${formData.managedDoers?.includes(doer._id) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{doer.name}</span>
                      <span className="text-[9px] opacity-60 uppercase font-black tracking-widest text-slate-500 mt-0.5">{doer.department || 'General'}</span>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* --- DYNAMIC LINKAGE: ASSIGNERS --- */}
        {(formData.roles.includes("Coordinator") || formData.roles.includes("Admin")) && (
          <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/20 border-l-4 border-l-primary animate-in slide-in-from-right-4 duration-500">
            <h4 className="text-primary m-0 mb-6 text-[10px] flex items-center gap-3 font-black uppercase tracking-[0.3em]">
              <ShieldCheck size={18} /> Supervisor Monitoring Scope
            </h4>
            <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-3 custom-scrollbar">
              {allEmployees
                .filter((e) => {
                   const roles = Array.isArray(e.roles) ? e.roles : [e.role];
                   return roles.includes("Assigner") && e._id !== (selectedEmployee?._id || formData._id);
                })
                .map((assigner) => (
                  <label 
                    key={assigner._id} 
                    className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer border transition-all shadow-sm ${
                      formData.managedAssigners?.includes(assigner._id) 
                      ? "bg-card border-primary ring-2 ring-primary/20" 
                      : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.managedAssigners?.includes(assigner._id)}
                      onChange={() => handleCheckboxChange(assigner._id, "managedAssigners")}
                    />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${formData.managedAssigners?.includes(assigner._id) ? "bg-primary border-primary text-white" : "bg-background border-border"}`}>
                        {formData.managedAssigners?.includes(assigner._id) && <CheckSquare size={16}/>}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[13px] font-black tracking-tight truncate ${formData.managedAssigners?.includes(assigner._id) ? "text-primary" : "text-foreground"}`}>{assigner.name}</span>
                      <span className="text-[9px] opacity-60 uppercase font-black tracking-widest text-slate-500 mt-0.5">{assigner.department || 'General'}</span>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* GLOBAL COMMAND ACTION */}
        <button
          type="submit"
          disabled={loading}
          className={`
            group relative w-full mt-6 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-4 shadow-xl
            ${loading 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed" 
              : "bg-primary hover:bg-sky-400 text-white dark:text-slate-950 hover:shadow-primary/30 active:scale-95 cursor-pointer"
            }
          `}
        >
          {loading ? <RefreshCcw className="animate-spin" size={20} /> : <UserPlus size={22} className="group-hover:scale-125 transition-transform duration-500" />}
          {isEditing ? "Synchronize Parameters" : "Provision Authentication Node"}
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default AddEmployee;