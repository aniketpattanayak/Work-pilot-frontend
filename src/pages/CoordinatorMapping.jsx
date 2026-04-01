import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { 
  UserCog, 
  Users, 
  Save, 
  CheckCircle2, 
  RefreshCcw,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  CheckSquare,
  Square,
  UserCheck,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

/**
 * COORDINATOR MAPPING: HIERARCHICAL ORCHESTRATOR v1.5
 * Purpose: Authorizes operational nodes to assign and monitor cross-departmental assets.
 * UI: Fully responsive and theme-adaptive (Light/Dark).
 */
const CoordinatorMapping = ({ tenantId }) => {
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(''); 
  const [selectedTargets, setSelectedTargets] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // --- DATA ACQUISITION: PERSONNEL REGISTRY ---
  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/superadmin/company-overview/${currentTenantId}`);
      const emps = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.employees || res.data?.data || []);
      setAllEmployees(emps); 
    } catch (err) {
      const errMsg = err.response?.data?.message || "Internal Server Error";
      console.error("Fetch Error:", errMsg);
      setError(`Hierarchy sync failure: ${errMsg}`);
      setAllEmployees([]); 
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // --- LOGIC: HYDRATE EXISTING MAPPINGS ---
  useEffect(() => {
    if (selectedSupervisor && Array.isArray(allEmployees)) {
      const supervisor = allEmployees.find(c => c._id === selectedSupervisor);
      const existing = Array.isArray(supervisor?.managedDoers) 
        ? supervisor.managedDoers.map(a => typeof a === 'object' ? a._id : a) 
        : [];
      setSelectedTargets(existing);
    } else {
      setSelectedTargets([]);
    }
  }, [selectedSupervisor, allEmployees]);

  // --- LOGIC: NODE SELECTION HANDSHAKE ---
  const handleToggle = (id) => {
    setSelectedTargets(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!Array.isArray(allEmployees)) return;
    const availableTargets = allEmployees.filter(e => e._id !== selectedSupervisor);
    if (selectedTargets.length === availableTargets.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(availableTargets.map(a => a._id));
    }
  };

  // --- COMMAND: COMMIT MAPPING TO LEDGER ---
  const handleSave = async () => {
    if (!selectedSupervisor) return alert("Identify a Supervisor node first.");
    setSaving(true);
    try {
      await API.put('/superadmin/update-mapping', {
        employeeId: selectedSupervisor,
        targetIds: selectedTargets,
        mappingType: 'managedDoers' 
      });
      alert("Success: Operational Linkage Synchronized.");
      fetchEmployees(); 
    } catch (err) { 
      console.error("Save Error:", err);
      alert("Mapping protocol failed: " + (err.response?.data?.message || err.message)); 
    } finally {
      setSaving(false);
    }
  };

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[600px] gap-8 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={56} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase leading-none">Loading...</p>
    </div>
  );

  const safeEmployees = Array.isArray(allEmployees) ? allEmployees : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 selection:bg-primary/30">
      
      {/* --- EXECUTIVE COMMAND HEADER (Responsive) --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <UserCog className="text-primary" size={32} />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter m-0 uppercase leading-none truncate">PC Flock Mapping</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80 leading-relaxed">
              Group System Wide Task To Be Viewed By Process Coordinator.
            </p>
          </div>
        </div>
        <button 
          onClick={fetchEmployees} 
          className="group w-full md:w-auto bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5"
        >
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-600 dark:text-rose-400 flex items-center gap-5 animate-in slide-in-from-top-4">
          <AlertCircle size={24} /> 
          <span className="text-xs font-black uppercase tracking-widest leading-none">{error}</span>
        </div>
      )}


<div className="bg-card backdrop-blur-xl 
p-6 md:p-8 
rounded-[2rem] md:rounded-[2.5rem] 
border border-border 
shadow-2xl space-y-8">

  {/* ================= STEP 1 ================= */}


  <div > 
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
        <ShieldCheck size={20} className="text-primary" />
      </div>
      <h4 className="font-black text-base md:text-lg uppercase tracking-tight">
        Select User
      </h4>
    </div>

    <div className="space-y-5">
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 mb-2 block">
          Coordinator
        </label>

        <select 
          value={selectedSupervisor}
          onChange={(e) => setSelectedSupervisor(e.target.value)}
          className="w-full px-5 py-4 bg-background border border-border rounded-xl 
          text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">-- Choose Staff --</option>
          {safeEmployees.map(c => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 bg-background/50 rounded-xl border border-border text-[10px] font-bold text-slate-500">
        ⚠ Coordinator can manage and monitor assigned team tasks.
      </div>
    </div>
  </div>

  {/* ================= STEP 2 ================= */}
  <div className={`
  relative rounded-[1.5rem] border border-border 
  p-5 md:p-6 shadow-inner overflow-hidden transition-all duration-500

  ${!selectedSupervisor 
    ? 'bg-background/20 backdrop-blur-md opacity-60 pointer-events-none' 
    : 'bg-background/40 backdrop-blur-xl opacity-100'
  }
`}>

  {/* GLOW (separate, not wrapping content) */}
  <div className="absolute -top-20 -right-20 w-60 h-60 
  bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

  {/* CONTENT */}
  <div className="relative z-10">

    {/* HEADER */}
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
          <Users size={20} className="text-emerald-500" />
        </div>
        <h4 className="font-black text-base md:text-lg uppercase tracking-tight">
          Select Targets
        </h4>
      </div>

      <span className="text-[10px] font-black text-emerald-500">
        {selectedTargets.length} Selected
      </span>
    </div>

    {/* TARGET LIST */}
    <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">

      {safeEmployees
        .filter(e => e._id !== selectedSupervisor)
        .map(a => (
          <div 
            key={a._id}
            onClick={() => selectedSupervisor && handleToggle(a._id)}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition backdrop-blur-sm
              ${selectedTargets.includes(a._id)
                ? 'bg-emerald-500/10 border-emerald-400 shadow-md'
                : 'bg-background/60 border-border hover:border-primary/40'
              }
            `}
          >
            <div className={`w-6 h-6 rounded-md border flex items-center justify-center
              ${selectedTargets.includes(a._id) ? 'bg-emerald-500 border-emerald-500' : ''}
            `}>
              {selectedTargets.includes(a._id) && <CheckCircle2 size={14} className="text-white" />}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{a.name}</div>
              <div className="text-[9px] text-slate-500 uppercase">
                {a.department || 'General'}
              </div>
            </div>
          </div>
        ))}

    </div>

  </div>
</div>

  {/* ================= ACTION ================= */}
  <button 
    onClick={handleSave} 
    disabled={saving || !selectedSupervisor}
    className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition
      ${!selectedSupervisor
        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
        : 'bg-primary text-white hover:bg-sky-400 active:scale-95'
      }
    `}
  >
    {saving ? 'Saving...' : 'Save Changes'}
  </button>

</div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default CoordinatorMapping;