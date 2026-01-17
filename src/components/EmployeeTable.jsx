import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; // Switched to centralized API instance
import { 
  Trash2, 
  Edit3, 
  Users, 
  Briefcase, 
  Info, 
  Phone, 
  Layers,
  RefreshCcw,
  MoreVertical,
  Mail,
  Shield,
  Activity,
  WifiOff
} from 'lucide-react';

const EmployeeTable = ({ tenantId, onEdit }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  /**
   * DATA ACQUISITION PROTOCOL
   * Optimized for multi-tenant AWS environment
   */
  const fetchEmployees = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setNetworkError(false);
    try {
      const res = await API.get(`/superadmin/employees/${tenantId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
      if (err.code === 'ERR_NETWORK') setNetworkError(true);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`SECURITY ALERT: Permanently remove ${name}? This will break all operational task linkages.`)) {
      try {
        await API.delete(`/superadmin/employees/${id}`);
        fetchEmployees(); 
      } catch (err) {
        alert("System Error: Deletion protocol failed. Node linkage protected.");
      }
    }
  };

  // --- SKELETON LOADING STATE (Adaptive) ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-8 transition-colors duration-500 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={56} />
        <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full"></div>
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] tracking-[0.5em] uppercase">Syncing Personnel Infrastructure...</p>
    </div>
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* --- NETWORK ERROR SHIELD --- */}
      {networkError && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-8 rounded-[2.5rem] text-center mb-6">
            <WifiOff className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-rose-900 dark:text-rose-400 font-black uppercase tracking-tight text-xl">Registry Link Severed</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">Unable to access the master employee database. Check your backend status.</p>
            <button onClick={fetchEmployees} className="mt-6 px-8 py-3 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all">Retry Handshake</button>
        </div>
      )}

      {/* --- HEADER COMMAND CARD --- */}
      <div className="relative overflow-hidden bg-card backdrop-blur-xl rounded-[3rem] border border-border shadow-xl transition-all duration-500">
        <div className="px-8 py-10 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-card p-4 rounded-2xl border border-border shadow-sm">
                <Users size={32} className="text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-foreground text-3xl font-black tracking-tighter uppercase">Factory Personnel</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1 opacity-70">Permission Management & Organizational Matrix</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-background px-8 py-4 rounded-2xl border border-border shadow-inner group/stat">
             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Active Headcount: </span>
             <span className="text-primary font-black text-2xl tracking-tighter group-hover/stat:scale-110 transition-transform">{employees.length}</span>
          </div>
        </div>

        {/* --- DESKTOP REGISTRY TABLE --- */}
        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-background/50 border-y border-border font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.3em]">
                <th className="px-12 py-6">Identity & Sector</th>
                <th className="px-8 py-6">Clearance Level</th>
                <th className="px-8 py-6">Linkage Analytics</th>
                <th className="px-8 py-6">Contact Node</th>
                <th className="px-12 py-6 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {employees.map((emp, idx) => (
                <tr key={emp._id} className="group hover:bg-background/50 transition-all duration-300">
                  
                  {/* IDENTITY & DEPARTMENT */}
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center text-primary font-black text-xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                         {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-foreground tracking-tight text-lg mb-1 uppercase">{emp.name}</div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">
                          <Briefcase size={12} className="text-primary/50" /> {emp.department || 'General Sector'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* CLEARANCE (ROLES) */}
                  <td className="px-8 py-8">
                    <div className="flex flex-wrap gap-2 max-w-[220px]">
                      {(emp.roles || [emp.role]).map((r, i) => (
                        <span key={i} className={`
                          text-[9px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-lg border shadow-sm
                          ${r === 'Admin' 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-background border-border text-slate-500 dark:text-slate-400'
                          }
                        `}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* LINKAGE ANALYTICS */}
                  <td className="px-8 py-8">
                    <div className="flex flex-col gap-2.5 min-w-[200px]">
                      {emp.roles?.includes('Assigner') && (
                        <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-xl w-fit">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                            {emp.managedDoers?.length || 0} Linked Doers
                          </span>
                        </div>
                      )}
                      {(emp.roles?.includes('Coordinator') || emp.roles?.includes('Admin')) && (
                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 px-4 py-2 rounded-xl w-fit">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#38bdf8]" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                            {emp.managedAssigners?.length || 0} Managed Nodes
                          </span>
                        </div>
                      )}
                      {!['Assigner', 'Coordinator', 'Admin'].some(r => emp.roles?.includes(r)) && (
                        <div className="flex items-center gap-3 px-1 opacity-40">
                          <Layers size={14} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Protocol: Doer Node</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* CONTACT NODE */}
                  <td className="px-8 py-8">
                     <div className="flex items-center gap-4 group/phone">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center group-hover/phone:bg-primary/10 group-hover/phone:border-primary/30 transition-all duration-500">
                          <Phone size={16} className="text-slate-400 group-hover/phone:text-primary transition-colors" />
                        </div>
                        <span className="text-sm font-black text-slate-500 dark:text-slate-400 font-mono tracking-tighter">
                          {emp.whatsappNumber || '--- --- ----'}
                        </span>
                     </div>
                  </td>

                  {/* OPERATIONAL ACTIONS */}
                  <td className="px-12 py-8">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => onEdit(emp)}
                        title="Update Node Parameters"
                        className="p-3.5 bg-card text-slate-500 dark:text-slate-400 rounded-2xl border border-border hover:border-primary hover:text-primary transition-all shadow-sm active:scale-90"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp._id, emp.name)}
                        title="Terminate Linkage"
                        className="p-3.5 bg-card text-slate-500 dark:text-slate-400 rounded-2xl border border-border hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm active:scale-90"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- MOBILE REGISTRY CARDS --- */}
        <div className="lg:hidden divide-y divide-border/40">
           {employees.map((emp, mIdx) => (
             <div key={emp._id} className="p-8 space-y-6 active:bg-background transition-colors animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${mIdx * 50}ms` }}>
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center text-primary font-black text-xl shadow-inner">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-foreground text-lg tracking-tighter uppercase">{emp.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{emp.department || 'General'}</p>
                      </div>
                   </div>
                   <div className="flex gap-2.5">
                      <button onClick={() => onEdit(emp)} className="p-3 text-slate-400 bg-background rounded-xl border border-border active:scale-90 transition-all"><Edit3 size={18}/></button>
                      <button onClick={() => handleDelete(emp._id, emp.name)} className="p-3 text-rose-400 bg-rose-500/5 rounded-xl border border-rose-500/20 active:scale-90 transition-all"><Trash2 size={18}/></button>
                   </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                   {(emp.roles || [emp.role]).map((r, i) => (
                      <span key={i} className="text-[9px] font-black uppercase bg-background text-slate-400 px-3.5 py-1.5 rounded-lg border border-border tracking-widest">{r}</span>
                   ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                   <div className="flex items-center gap-3 text-slate-400">
                      <Phone size={14} />
                      <span className="text-xs font-black font-mono tracking-tighter">{emp.whatsappNumber || 'N/A'}</span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-tighter">
                      <Activity size={12} /> {emp.managedDoers?.length || 0} Managed Nodes
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* --- EMPTY STATE TERMINAL --- */}
        {employees.length === 0 && !loading && (
          <div className="px-10 py-40 text-center animate-in zoom-in-95 duration-700">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse"></div>
              <Info size={80} className="text-slate-100 dark:text-slate-800 relative z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                 <Users size={32} className="text-slate-300 dark:text-slate-700" />
              </div>
            </div>
            <p className="font-black text-sm text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-2">Node Registry Inactive</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Awaiting factory personnel synchronization.</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default EmployeeTable;