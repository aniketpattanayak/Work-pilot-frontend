import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; // Switched to centralized API instance
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
  ChevronRight
} from 'lucide-react';

const CoordinatorMapping = ({ tenantId }) => {
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(''); 
  const [selectedTargets, setSelectedTargets] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures allEmployees is always an array to prevent crashes.
   */
  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    setError(null);
    try {
      // Switched to centralized API instance
      const res = await API.get(`/superadmin/company-overview/${currentTenantId}`);
      
      // Safety: Handle nested data structure { employees: [...] }
      const emps = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.employees || res.data?.data || []);
        
      setAllEmployees(emps); 
      
    } catch (err) {
      const errMsg = err.response?.data?.message || "Internal Server Error";
      console.error("Fetch Error:", errMsg);
      setError(`Backend Connection Failure: ${errMsg}`);
      setAllEmployees([]); // Fallback
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Sync selection when the supervisor changes
  useEffect(() => {
    if (selectedSupervisor && Array.isArray(allEmployees)) {
      const supervisor = allEmployees.find(c => c._id === selectedSupervisor);
      
      // SAFETY: Ensure we handle mapped managedDoers correctly
      const existing = Array.isArray(supervisor?.managedDoers) 
        ? supervisor.managedDoers.map(a => typeof a === 'object' ? a._id : a) 
        : [];
      setSelectedTargets(existing);
    } else {
      setSelectedTargets([]);
    }
  }, [selectedSupervisor, allEmployees]);

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

  const handleSave = async () => {
    if (!selectedSupervisor) return alert("Please identify a Supervisor node first.");
    setSaving(true);
    try {
      // Switched to centralized API instance
      await API.put('/superadmin/update-mapping', {
        employeeId: selectedSupervisor,
        targetIds: selectedTargets,
        mappingType: 'managedDoers' 
      });
      alert("Operational Linkage Synchronized Successfully!");
      fetchEmployees(); 
    } catch (err) { 
      console.error("Save Error:", err);
      alert("Error saving: " + (err.response?.data?.message || err.message)); 
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase">Syncing Factory Hierarchy...</p>
    </div>
  );

  /**
   * DEFENSIVE RENDER HELPERS
   */
  const safeEmployees = Array.isArray(allEmployees) ? allEmployees : [];

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-white text-3xl font-black tracking-tighter flex items-center gap-4">
            <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
              <UserCog className="text-sky-400" size={32} />
            </div>
            Universal Mapping
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1 ml-1">
            Authorize any node to assign and monitor tasks for any other staff member.
          </p>
        </div>
        <button 
          onClick={fetchEmployees} 
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-3 rounded-2xl text-slate-300 font-bold text-xs transition-all flex items-center gap-3 active:scale-95 shadow-lg group"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> Refresh Personnel Registry
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 animate-bounce">
          <AlertCircle size={20} /> <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8">
        
        {/* STEP 1: SUPERVISOR SELECTION */}
        <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800/60 h-fit shadow-2xl">
          <h4 className="flex items-center gap-3 text-slate-100 font-bold text-lg mb-6">
            <ShieldCheck size={22} className="text-sky-400" /> 1. Identify Supervisor
          </h4>
          
          <div className="relative group">
            <select 
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full appearance-none px-6 py-4 bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl cursor-pointer outline-none focus:border-sky-500/50 transition-all font-bold text-sm pr-12"
            >
              <option value="">-- Choose Any Staff Node --</option>
              {/* FIX: Using safeEmployees for map */}
              {safeEmployees.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({Array.isArray(c.roles) ? c.roles.join(', ') : (c.role || 'Node')})
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 rotate-90 pointer-events-none" size={18} />
          </div>

          <div className="mt-8 p-6 bg-slate-950/50 rounded-2xl border border-slate-800/40">
             <p className="text-slate-500 text-[11px] font-bold leading-relaxed">
               <span className="text-sky-400 font-black">UNIVERSAL MAPPING:</span> Linking a staff member here grants the Supervisor authority to assign them tasks, view their "My Tasks" board, and verify their results.
             </p>
          </div>
        </div>

        {/* STEP 2: ASSIGNER MAPPING */}
        <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800/60 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
            <h4 className="flex items-center gap-3 text-slate-100 font-bold text-lg">
              <Users size={22} className="text-emerald-400" /> 2. Scope of Authority
            </h4>
            
            <div className="flex items-center gap-4">
                <button 
                  onClick={handleSelectAll}
                  disabled={!selectedSupervisor || safeEmployees.length <= 1}
                  className="text-sky-400 hover:text-sky-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {selectedTargets.length === (safeEmployees.length - 1) && safeEmployees.length > 0 ? <Square size={14}/> : <CheckSquare size={14}/>}
                  {selectedTargets.length === (safeEmployees.length - 1) && safeEmployees.length > 0 ? "Deselect All" : "Select All Staff"}
                </button>
                <span className="bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800 text-emerald-400 font-black text-[10px] tracking-tighter">
                  {selectedTargets.length} NODES LINKED
                </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
            {safeEmployees.length > 0 ? safeEmployees
              .filter(e => e._id !== selectedSupervisor) 
              .map(a => (
              <div 
                key={a._id} 
                onClick={() => selectedSupervisor && handleToggle(a._id)}
                className={`
                  p-4 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-4 border
                  ${!selectedSupervisor ? 'opacity-30 cursor-not-allowed grayscale' : 'opacity-100'}
                  ${selectedTargets.includes(a._id) 
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }
                `}
              >
                <div className={`
                  w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-300
                  ${selectedTargets.includes(a._id) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-800'}
                `}>
                  {selectedTargets.includes(a._id) && <CheckCircle2 size={14} className="text-slate-950" strokeWidth={3} />}
                </div>
                <div className="overflow-hidden">
                  <div className={`text-sm font-bold truncate ${selectedTargets.includes(a._id) ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {a.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                    <Briefcase size={10} /> {a.department} | {Array.isArray(a.roles) ? a.roles.join(', ') : (a.role || 'Member')}
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
                 <UserCheck size={48} />
                 <p className="text-xs font-black uppercase mt-4 tracking-widest">Personnel Registry Empty</p>
              </div>
            )}
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving || !selectedSupervisor} 
            className={`
              mt-10 w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 relative z-10
              ${!selectedSupervisor 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] active:scale-95'
              }
            `}
          >
            {saving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Processing Global Linkage...' : 'Confirm Operational Mapping'}
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CoordinatorMapping;