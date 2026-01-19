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
 * COORDINATOR MAPPING: HIERARCHICAL ORCHESTRATOR v1.3
 * Purpose: Authorizes operational nodes to assign and monitor cross-departmental assets.
 * Logic: Synchronizes 'managedDoers' linkage via centralized API.
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
      alert("Operational Linkage Synchronized Successfully!");
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
    <div className="flex flex-col justify-center items-center h-[600px] gap-8 transition-colors duration-500 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={56} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase">Recalibrating Hierarchy Matrix...</p>
    </div>
  );

  const safeEmployees = Array.isArray(allEmployees) ? allEmployees : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 pb-20 selection:bg-primary/30">
      
      {/* --- EXECUTIVE COMMAND HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner">
            <UserCog className="text-primary" size={36} />
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Universal Mapping</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Authorize operational nodes to delegate and monitor cross-departmental assets.
            </p>
          </div>
        </div>
        <button 
          onClick={fetchEmployees} 
          className="group bg-card hover:bg-background border border-border px-10 py-5 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-4 active:scale-95 shadow-xl hover:shadow-primary/5"
        >
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Sync Registry
        </button>
      </div>

      {error && (
        <div className="mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-600 dark:text-rose-400 flex items-center gap-5 animate-in slide-in-from-top-4">
          <AlertCircle size={24} /> 
          <span className="text-xs font-black uppercase tracking-widest leading-none">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-12 items-start">
        
        {/* --- STEP 1: SUPERVISOR SELECTION TERMINAL --- */}
        <div className="bg-card backdrop-blur-xl p-10 rounded-[3rem] border border-border shadow-2xl transition-all duration-500">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner">
                <ShieldCheck size={24} className="text-primary" />
            </div>
            <h4 className="text-foreground font-black text-xl tracking-tighter uppercase">1. Identify Subject</h4>
          </div>
          
          <div className="space-y-8">
            <div className="relative group">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 mb-3 block">Supervisor Node</label>
                <select 
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="w-full appearance-none px-8 py-6 bg-background text-foreground border border-border rounded-2xl cursor-pointer outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm pr-14 shadow-inner"
                >
                <option value="">-- Choose Any Staff Node --</option>
                {safeEmployees.map(c => (
                    <option key={c._id} value={c._id}>
                    {c.name} — ({Array.isArray(c.roles) ? c.roles.join(', ') : (c.role || 'Node')})
                    </option>
                ))}
                </select>
                <ChevronRight className="absolute right-6 top-[3.75rem] text-slate-400 dark:text-slate-600 rotate-90 pointer-events-none" size={24} />
            </div>

            <div className="p-8 bg-background/50 rounded-[2rem] border border-border shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <Fingerprint size={80} className="text-primary" />
                </div>
                <div className="flex gap-5 relative z-10">
                    <AlertCircle className="text-primary shrink-0" size={22} />
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black leading-relaxed uppercase tracking-widest">
                    <span className="text-primary font-black mr-2">Core Logic:</span> 
                    Linking staff here grants the Subject authority to delegate tasks and execute verification protocols for the chosen targets.
                    </p>
                </div>
            </div>
          </div>
        </div>

        {/* --- STEP 2: SCOPE OF AUTHORITY (TARGETS) --- */}
        <div className="bg-card backdrop-blur-xl p-10 rounded-[3rem] border border-border shadow-2xl relative overflow-hidden group transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity duration-1000" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-8 relative z-10">
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <Users size={24} className="text-emerald-500" />
                </div>
                <h4 className="text-foreground font-black text-xl tracking-tighter uppercase">2. Authority Scope</h4>
            </div>
            
            <div className="flex items-center gap-5 w-full sm:w-auto">
                <button 
                  onClick={handleSelectAll}
                  disabled={!selectedSupervisor || safeEmployees.length <= 1}
                  className="flex-1 sm:flex-none text-primary hover:text-sky-400 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {selectedTargets.length === (safeEmployees.length - 1) && safeEmployees.length > 0 ? <Square size={18}/> : <CheckSquare size={18}/>}
                  {selectedTargets.length === (safeEmployees.length - 1) && safeEmployees.length > 0 ? "Deselect All" : "Select All Nodes"}
                </button>
                <div className="bg-background px-6 py-2.5 rounded-full border border-border text-emerald-500 font-black text-[10px] tracking-[0.2em] shadow-inner uppercase">
                  {selectedTargets.length} Targets
                </div>
            </div>
          </div>

          {/* TARGET GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[550px] overflow-y-auto pr-4 custom-scrollbar relative z-10">
            {safeEmployees.length > 0 ? safeEmployees
              .filter(e => e._id !== selectedSupervisor) 
              .map(a => (
              <div 
                key={a._id} 
                onClick={() => selectedSupervisor && handleToggle(a._id)}
                className={`
                  p-6 rounded-[2rem] cursor-pointer transition-all duration-500 flex items-center gap-6 border shadow-sm
                  ${!selectedSupervisor ? 'opacity-20 cursor-not-allowed grayscale pointer-events-none' : 'opacity-100'}
                  ${selectedTargets.includes(a._id) 
                    ? 'bg-emerald-500/5 border-emerald-500 shadow-xl shadow-emerald-500/5' 
                    : 'bg-background border-border hover:border-primary'
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-700 shadow-inner
                  ${selectedTargets.includes(a._id) ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-background border-border'}
                `}>
                  {selectedTargets.includes(a._id) && <CheckCircle2 size={18} className="text-white dark:text-slate-950" strokeWidth={3} />}
                </div>
                <div className="overflow-hidden">
                  <div className={`text-base font-black truncate tracking-tight uppercase ${selectedTargets.includes(a._id) ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {a.name}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-2">
                    <Briefcase size={12} className="shrink-0 text-primary/50" /> {a.department || 'General'} <span className="opacity-30">|</span> {Array.isArray(a.roles) ? a.roles[0] : (a.role || 'Member')}
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-30 animate-in zoom-in-95">
                 <UserCheck size={80} className="text-slate-400" />
                 <p className="text-[12px] font-black uppercase mt-8 tracking-[0.5em]">Personnel Registry Offline</p>
              </div>
            )}
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving || !selectedSupervisor} 
            className={`
              mt-12 w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-5 relative z-10 shadow-2xl
              ${!selectedSupervisor 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-border cursor-not-allowed' 
                : 'bg-primary hover:bg-sky-400 text-white dark:text-slate-950 hover:shadow-primary/30 active:scale-95'
              }
            `}
          >
            {saving ? <RefreshCcw className="animate-spin" size={24} /> : <Save size={24} />}
            {saving ? 'Transmitting Hierarchical Updates...' : 'Commit Operational Mapping'}
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default CoordinatorMapping;