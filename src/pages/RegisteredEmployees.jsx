import React from 'react';
import API from '../api/axiosConfig'; // Centralized API instance for production stability
import { 
  Trash2, 
  Pencil, 
  Users, 
  ShieldCheck, 
  Briefcase, 
  Mail, 
  Info, 
  UserCheck, 
  Phone, 
  Fingerprint,
  MoreVertical,
  Database
} from 'lucide-react';

/**
 * REGISTERED EMPLOYEES: PERSONNEL DIRECTORY v1.3
 * Purpose: Industrial directory of authenticated nodes and organizational link states.
 * Logic: Includes defensive rendering for complex hierarchy links and permanent decommissioning protocols.
 */
const RegisteredEmployees = ({ employees, onEdit, fetchEmployees }) => {
  
  // --- COMMAND: UNIFIED DECOMMISSION PROTOCOL ---
  const handleDelete = async (id, name) => {
    if (window.confirm(`CRITICAL SECURITY ALERT: Decommission node ${name}? This will terminate all active mission linkages and supervisor scopes in the master ledger.`)) {
      try {
        await API.delete(`/superadmin/employees/${id}`);
        fetchEmployees(); 
      } catch (err) {
        console.error("Decommission error:", err);
        alert("System Error: Termination sequence failed. Node integrity protected.");
      }
    }
  };

  /**
   * DEFENSIVE LINK RENDERING
   * Ensures the organizational matrix remains crash-proof regardless of data structure.
   */
  const renderTeamLinks = (emp) => {
    if (!emp) return null;
    
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    const displays = [];

    // --- ASSIGNER LOGIC ---
    if (roles.includes('Assigner')) {
      const doers = Array.isArray(emp.managedDoers) ? emp.managedDoers : [];
      const doerCount = doers.length;
      const doerNames = doers.map(d => d.name || "Unknown").join(', ');
      
      displays.push(
        <div key="assigner-links" className="mb-4 last:mb-0 group/link">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">
             <UserCheck size={12} className="group-hover/link:animate-pulse text-emerald-500" /> Authorized Doer Nodes ({doerCount})
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-2 italic border-l-2 border-emerald-500/30 pl-4 uppercase tracking-tight">
            {doerCount > 0 ? doerNames : 'Zero personnel nodes linked'}
          </div>
        </div>
      );
    }

    // --- COORDINATOR/ADMIN LOGIC ---
    if (roles.includes('Coordinator') || roles.includes('Admin')) {
      const assigners = Array.isArray(emp.managedAssigners) ? emp.managedAssigners : [];
      const assignerCount = assigners.length;
      const assignerNames = assigners.map(a => a.name || "Unknown").join(', ');

      displays.push(
        <div key="coord-links" className="group/link">
          <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">
             <ShieldCheck size={12} className="group-hover/link:animate-pulse text-primary" /> Tracking Surveillance Scope ({assignerCount})
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-2 italic border-l-2 border-primary/30 pl-4 uppercase tracking-tight">
            {assignerCount > 0 ? assignerNames : 'Zero assigners monitored'}
          </div>
        </div>
      );
    }

    return displays.length > 0 ? displays : (
      <div className="flex items-center gap-3 opacity-40 py-1">
        <Fingerprint size={16} className="text-slate-400" />
        <span className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Standard Endpoint Node</span>
      </div>
    );
  };

  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <div className="bg-card backdrop-blur-xl rounded-[3.5rem] border border-border shadow-2xl overflow-hidden animate-in fade-in duration-1000 transition-all">
      
      {/* --- EXECUTIVE HEADER SECTION --- */}
      <div className="px-10 py-10 md:px-14 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner">
            <Users size={36} className="text-primary" />
          </div>
          <div>
            <h3 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Personnel Registry</h3>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
              Directory of authenticated hardware nodes and organizational link states.
            </p>
          </div>
        </div>
        <div className="bg-background px-8 py-4 rounded-2xl border border-border shadow-inner group/stat">
           <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Active Nodes: </span>
           <span className="text-primary font-black text-2xl tracking-tighter group-hover/stat:scale-110 transition-transform">{safeEmployees.length}</span>
        </div>
      </div>
      
      {/* --- RESPONSIVE DATA MATRIX --- */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-background/50 backdrop-blur-md border-b border-border font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.3em]">
              <th className="px-12 py-8">Identity Cluster</th>
              <th className="px-10 py-8">Communication Telemetry</th>
              <th className="px-10 py-8">Functional Clearances</th>
              <th className="px-10 py-8">Organizational Linkage</th>
              <th className="px-12 py-8 text-right">Operational Intervene</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 transition-colors">
            {safeEmployees.map((emp, idx) => {
               const empRoles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : ['Node']);
               
               return (
                <tr key={emp._id} className="group hover:bg-background/50 transition-all duration-300 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 40}ms` }}>
                  
                  {/* IDENTITY COLUMN */}
                  <td className="px-12 py-10">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center text-primary font-black text-xl shadow-inner transition-all group-hover:scale-110 group-hover:-rotate-3 group-hover:border-primary/40">
                          {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-foreground tracking-tight text-lg mb-1 uppercase truncate leading-none">{emp.name || 'Unnamed Staff Node'}</div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.25em] mt-2">
                          <Briefcase size={12} className="text-primary/50" /> {emp.department || 'General Sector'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* COMMUNICATION COLUMN */}
                  <td className="px-10 py-10">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-tight">
                          <Mail size={14} className="text-primary/40" /> {emp.email || '---'}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest font-mono">
                          <Phone size={14} className="text-emerald-500/40" /> {emp.whatsappNumber || 'N/A'}
                        </div>
                    </div>
                  </td>

                  {/* CLEARANCES COLUMN */}
                  <td className="px-10 py-10">
                    <div className="flex flex-wrap gap-2 max-w-[220px]">
                      {empRoles.map((r, i) => (
                        <span key={i} className={`
                          text-[9px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-lg border shadow-sm transition-all
                          ${r === 'Admin' 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-background border-border text-slate-500 dark:text-slate-400 group-hover:border-slate-300 dark:group-hover:border-slate-700'
                          }
                        `}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  
                  {/* LINKAGE COLUMN */}
                  <td className="px-10 py-10 min-w-[320px]">
                    <div className="bg-background/50 p-6 rounded-[2.5rem] border border-border group-hover:border-primary/20 group-hover:bg-background transition-all shadow-inner relative overflow-hidden">
                      {renderTeamLinks(emp)}
                    </div>
                  </td>

                  {/* MANAGEMENT COLUMN */}
                  <td className="px-12 py-10">
                    <div className="flex justify-end gap-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 transform lg:translate-x-6 lg:group-hover:translate-x-0">
                      <button 
                        onClick={() => onEdit(emp)} 
                        className="p-4 bg-card text-slate-500 dark:text-slate-400 rounded-2xl border border-border hover:border-primary hover:text-primary transition-all active:scale-90 shadow-lg"
                        title="Optimize Node Permissions"
                      >
                        <Pencil size={20} />
                      </button>

                      <button 
                        onClick={() => handleDelete(emp._id, emp.name)} 
                        className="p-4 bg-card text-slate-500 dark:text-slate-400 rounded-2xl border border-border hover:border-rose-500 hover:text-rose-500 transition-all active:scale-90 shadow-lg"
                        title="Decommission Access"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
               );
            })}
          </tbody>
        </table>
      </div>

      {/* --- EMPTY REGISTRY STATE --- */}
      {safeEmployees.length === 0 && (
        <div className="py-48 text-center flex flex-col items-center justify-center transition-all animate-in zoom-in-95 duration-1000">
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse"></div>
                <Users size={100} className="text-slate-100 dark:text-slate-800 relative z-10" />
                <Database size={36} className="absolute -bottom-2 -right-2 text-primary z-20" />
            </div>
            <p className="font-black text-sm text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-3">Personnel Registry Offline</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold opacity-60">Awaiting master node synchronization with the employee database.</p>
        </div>
      )}

      {/* --- INDUSTRIAL SCROLLBAR --- */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default RegisteredEmployees;