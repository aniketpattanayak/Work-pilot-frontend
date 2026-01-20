import React, { useEffect, useState } from 'react';
import API from '../api/axiosConfig'; // Using centralized API instance
import { 
  Trash2, 
  Edit3, 
  Users, 
  ShieldCheck, 
  Briefcase, 
  Info, 
  Phone, 
  UserCheck, 
  Layers,
  RefreshCcw,
  Mail,
  ChevronRight
} from 'lucide-react';

/**
 * EMPLOYEE TABLE: PERSONNEL REGISTRY v1.4
 * Purpose: Centralized staff management with adaptive Light/Dark themes.
 * Responsive: Optimized font scaling and horizontal overflow handling for mobile.
 */
const EmployeeTable = ({ tenantId, onEdit }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Switched to centralized API instance for AWS/Prod readiness
      const res = await API.get(`/superadmin/employees/${tenantId}`);
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [tenantId]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`SECURITY ALERT: Permanently remove ${name}? This will break all existing task linkages and organizational hierarchies.`)) {
      try {
        await API.delete(`/superadmin/employees/${id}`);
        alert("Success: Staff record decommissioned.");
        fetchEmployees(); 
      } catch (err) {
        alert("System Error: Deletion protocol failed.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCcw className="animate-spin text-primary" size={32} />
      <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.3em] uppercase leading-none">Syncing Personnel Registry...</p>
    </div>
  );

  return (
    <div className="mt-8 bg-card backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in fade-in duration-700 transition-colors duration-500">
      
      {/* --- TABLE HEADER SECTION --- */}
      <div className="px-5 py-6 sm:px-10 sm:py-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2.5 rounded-2xl border border-primary/20 shrink-0">
            <Users size={24} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-foreground text-lg sm:text-xl font-black tracking-tight m-0 uppercase leading-tight">
              Factory Personnel Registry
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-1 truncate">
              Manage staff permissions and organizational linkages.
            </p>
          </div>
        </div>
        <div className="bg-background px-4 py-2 rounded-full border border-border shadow-inner flex items-center gap-3">
           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Headcount:</span>
           <span className="text-primary font-black text-xs sm:text-sm">{employees.length}</span>
        </div>
      </div>

      {/* --- RESPONSIVE TABLE AREA --- */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="bg-background/50 border-b border-border font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.2em]">
              <th className="px-6 py-5 sm:px-10">Staff Identity / Dept</th>
              <th className="px-6 py-5">Access Clearances</th>
              <th className="px-6 py-5">Linkage States</th>
              <th className="px-6 py-5">Contact Node</th>
              <th className="px-6 py-5 sm:px-10 text-right">Intervention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map(emp => (
              <tr key={emp._id} className="group hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-300">
                
                {/* NAME & DEPT NODE */}
                <td className="px-6 py-6 sm:px-10">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary font-black text-sm group-hover:border-primary/30 transition-all shadow-sm">
                       {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground tracking-tight leading-none mb-1.5 truncate text-sm sm:text-base">{emp.name}</div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-tighter">
                        <Briefcase size={12} className="text-primary opacity-50" /> {emp.department || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* ACCESS BADGES */}
                <td className="px-6 py-6">
                  <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                    {(Array.isArray(emp.roles) ? emp.roles : [emp.role]).map((r, i) => (
                      <span key={i} className={`
                        text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border
                        ${r === 'Admin' 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-background border-border text-slate-500 dark:text-slate-400'
                        }
                      `}>
                        {r}
                      </span>
                    ))}
                  </div>
                </td>

                {/* HIERARCHICAL LINKAGE LOGIC */}
                <td className="px-6 py-6">
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {/* Assigner Telemetry */}
                    {emp.roles?.includes('Assigner') && (
                      <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit transition-all group-hover:border-emerald-500/40 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter">
                          {emp.managedDoers?.length || 0} Nodes Controlled
                        </span>
                      </div>
                    )}
                    
                    {/* Coordinator/Admin Telemetry */}
                    {(emp.roles?.includes('Coordinator') || emp.roles?.includes('Admin')) && (
                      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-lg w-fit transition-all group-hover:border-primary/40 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                          {emp.managedAssigners?.length || 0} Assigners Linked
                        </span>
                      </div>
                    )}

                    {/* Standard Member State */}
                    {!emp.roles?.includes('Assigner') && !emp.roles?.includes('Coordinator') && !emp.roles?.includes('Admin') && (
                      <div className="flex items-center gap-2 opacity-50">
                        <Layers size={11} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Standard Node</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* CONTACT NODE */}
                <td className="px-6 py-6">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                        <Mail size={12} className="text-primary/40" /> {emp.email || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600">
                        <Phone size={11} />
                        <span className="text-[10px] font-black font-mono tracking-tight">{emp.whatsappNumber || 'N/A'}</span>
                      </div>
                   </div>
                </td>

                {/* INTERVENTION ACTIONS */}
                <td className="px-6 py-6 sm:px-10">
                  <div className="flex justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => onEdit(emp)}
                      className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"
                      title="Modify Permissions"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button 
                      onClick={() => handleDelete(emp._id, emp.name)}
                      className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"
                      title="Terminate Node"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* EMPTY STATE PROTOCOL */}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" className="px-10 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30 grayscale transition-colors">
                    <Info size={40} className="text-primary" />
                    <p className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-500">Registry Ledger Empty</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Internal Custom Scrollbar Styling (Themed) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-primary);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default EmployeeTable;