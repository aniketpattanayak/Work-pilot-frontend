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
} from "lucide-react";

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
   * 2. LOAD DATA (Logic Updated for Doer Default and Array Mapping)
   */
  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        ...selectedEmployee,
        // Ensure roles is always an array; fallback to ["Doer"]
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
      // RESET: Ensure roles resets to ["Doer"] for new registration
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
   * 3. ROLE TOGGLE (Updated: Prevents removing 'Doer' if it's the last role)
   */
  const handleRoleToggle = (role) => {
    const currentRoles = [...formData.roles];
    if (currentRoles.includes(role)) {
      // Prevent removing if it's the only role
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
   * 4. SUBMIT (Updated: Force 'Doer' if roles array is empty)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure roles is NEVER empty before sending to server
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
        alert("Employee Profile Updated Successfully!");
      } else {
        await API.post("/superadmin/add-employee", submissionData);
        alert("New Employee Registered with Multi-Roles!");
      }

      // RESET STATE: Keep Doer as default
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
      alert("Error: " + (err.response?.data?.message || "Check Connection"));
    } finally {
      setLoading(false);
    }
  };

  // Tailwind Version of InputLabel (Preserved)
  const InputLabel = ({ icon: Icon, label }) => (
    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
      <Icon size={14} className="text-sky-400" /> {label}
    </label>
  );

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/60 overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="px-10 py-8 bg-sky-500/5 border-b border-slate-800/60">
        <h2 className="text-sky-400 m-0 flex items-center gap-3 text-2xl font-black tracking-tight">
          <UserPlus size={28} />{" "}
          {isEditing
            ? `Modify Profile: ${formData.name}`
            : "Add New Employee"}
        </h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Configure authentication, Company roles, and organizational reporting
          lines.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-10 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <InputLabel icon={User} label="Full Official Name" />
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              required
              className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Briefcase} label="Department" />
            <input
              type="text"
              placeholder="e.g. Quality Control"
              value={formData.department}
              required
              className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <InputLabel icon={Mail} label="Email Address" />
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              required
              className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Phone} label="WhatsApp Number" />
            <input
              type="text"
              placeholder="91XXXXXXXXXX"
              value={formData.whatsappNumber}
              required
              className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              onChange={(e) =>
                setFormData({ ...formData, whatsappNumber: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <InputLabel
              icon={Lock}
              label={
                isEditing
                  ? "Reset Password (Optional)"
                  : "System Access Password"
              }
            />
            <input
              type="text"
              placeholder={
                isEditing
                  ? "Leave blank to keep current"
                  : "Minimum 8 characters"
              }
              value={formData.password}
              required={!isEditing}
              className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-sm outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700 font-mono"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
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
                  className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] flex items-center gap-2 font-black transition-all border uppercase tracking-widest ${
                    formData.roles.includes(role)
                      ? "bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                      : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                >
                  {formData.roles.includes(role) ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}{" "}
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Mapping Sections - Preserved with logic fixes */}
        {formData.roles.includes("Assigner") && (
          <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/20 border-l-4 border-l-emerald-500 animate-in slide-in-from-left-4">
            <h4 className="text-emerald-400 m-0 mb-4 text-[10px] flex items-center gap-2 font-black uppercase tracking-widest">
              <LinkIcon size={16} /> Doer Authorization (Linkage)
            </h4>
            <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2 custom-scrollbar">
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
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                        formData.managedDoers?.includes(doer._id)
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                          : "bg-slate-950 border-slate-800 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-emerald-500"
                        checked={formData.managedDoers?.includes(doer._id)}
                        onChange={() =>
                          handleCheckboxChange(doer._id, "managedDoers")
                        }
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight">
                          {doer.name}
                        </span>
                        <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">
                          {doer.department}
                        </span>
                      </div>
                    </label>
                  ))}
            </div>
          </div>
        )}

        {(formData.roles.includes("Coordinator") ||
          formData.roles.includes("Admin")) && (
          <div className="bg-sky-500/5 p-6 rounded-2xl border border-sky-500/20 border-l-4 border-l-sky-500 animate-in slide-in-from-left-4">
            <h4 className="text-sky-400 m-0 mb-4 text-[10px] flex items-center gap-2 font-black uppercase tracking-widest">
              <ShieldCheck size={16} /> Coordinator Tracking Scope
            </h4>
            <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2 custom-scrollbar">
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
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                        formData.managedAssigners?.includes(assigner._id)
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-200"
                          : "bg-slate-950 border-slate-800 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-sky-500"
                        checked={formData.managedAssigners?.includes(
                          assigner._id
                        )}
                        onChange={() =>
                          handleCheckboxChange(assigner._id, "managedAssigners")
                        }
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight">
                          {assigner.name}
                        </span>
                        <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">
                          {assigner.department}
                        </span>
                      </div>
                    </label>
                  ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`group relative mt-2 py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-4 ${
            loading
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] active:scale-95 cursor-pointer"
          }`}
        >
          {loading ? (
            <RefreshCcw className="animate-spin" size={20} />
          ) : (
            <UserPlus
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
          )}
          {isEditing
            ? "Update Multi-Role Profile"
            : "Finalize Employee Registration"}
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default AddEmployee;
