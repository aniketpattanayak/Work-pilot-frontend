import React from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
import { Trash2, Pencil, Users, ShieldCheck, Briefcase, Mail, Info, UserCheck, Phone } from 'lucide-react';

/**
 * REGISTERED EMPLOYEES: PERSONNEL DIRECTORY v1.5
 * Purpose: Provides a themed, responsive ledger of authenticated staff nodes.
 * UI: Fully adaptive Light/Dark support with mobile-optimized horizontal scrolling.
 */
const RegisteredEmployees = ({ employees, onEdit, fetchEmployees }) => {
  
  /**
   * UPDATED: Unified Delete Protocol (Preserved Logic)
   */
  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT ACTION: Remove ${name}? This will terminate all active task linkages and coordinator scopes.`)) {
      try {
        await API.delete(`/superadmin/employees/${id}`);
        fetchEmployees(); 
      } catch (err) {
        console.error("Deletion error:", err);
        alert("System Error: Deletion protocol failed.");
      }
    }
  };

  /**
   * UPDATED: Defensive Link Rendering (Preserved Logic)
   */
  const renderTeamLinks = (emp) => {
    if (!emp) return null;
    
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    const displays = [];

    if (roles.includes('Assigner')) {
      const doers = Array.isArray(emp.managedDoers) ? emp.managedDoers : [];
      const doerCount = doers.length;
      const doerNames = doers.map(d => d.name || "Unknown Staff").join(', ');
      
      displays.push(
        <div key="assigner-links" className="mb-2 last:mb-0">
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
             <UserCheck size={12} /> Authorized Doers ({doerCount})
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2 italic">
            {doerCount > 0 ? doerNames : 'No personnel linked'}
          </div>
        </div>
      );
    }

    if (roles.includes('Coordinator') || roles.includes('Admin')) {
      const assigners = Array.isArray(emp.managedAssigners) ? emp.managedAssigners : [];
      const assignerCount = assigners.length;
      const assignerNames = assigners.map(a => a.name || "Unknown Assigner").join(', ');

      displays.push(
        <div key="coord-links">
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest mb-1">
             <ShieldCheck size={12} /> Tracking Scope ({assignerCount})
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2 italic">
            {assignerCount > 0 ? assignerNames : 'No assigners monitored'}
          </div>
        </div>
      );
    }

    return displays.length > 0 ? displays : (
      <span className="text-slate-400 dark:text-slate-600 text-[9px] font-black uppercase tracking-widest">
        — Standard Member Node —
      </span>
    );
  };

  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <div className="mt-8 bg-card backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in fade-in duration-700 transition-colors duration-500">
      
      {/* --- TABLE HEADER SECTION --- */}
      <div className="px-6 py-6 sm:px-10 sm:py-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shrink-0 shadow-sm">
            <Users size={28} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-foreground text-lg sm:text-xl font-black tracking-tight m-0 uppercase leading-none truncate">
              List of Employees
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-2 opacity-80 uppercase tracking-tight">
              Directory of authenticated employee and organizational link states
            </p>
          </div>
        </div>
        <div className="bg-background px-5 py-2 rounded-full border border-border shadow-inner flex items-center gap-3">
           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee count: </span>
           <span className="text-primary font-black text-sm sm:text-base">{safeEmployees.length}</span>
        </div>
      </div>
      
      {/* --- RESPONSIVE DATA TABLE --- */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left min-w-[900px]">
          <thead>
            <tr className="bg-background/50 border-b border-border font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.25em]">
              <th className="px-10 py-5">Staff Identity</th>
              <th className="px-8 py-5">Emails & Contacts </th>
              <th className="px-8 py-5">Access Roles</th>
              <th className="px-8 py-5">Eligible Doer names</th>
              <th className="px-10 py-5 text-right pr-12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {safeEmployees.map(emp => {
               const empRoles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : ['Node']);
               
               return (
                <tr key={emp._id} className="group hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04] transition-all duration-300">
                  
                  {/* IDENTITY COLUMN */}
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center text-primary font-black text-base group-hover:border-primary/30 transition-all shadow-inner">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-foreground tracking-tight leading-none mb-2 truncate text-sm sm:text-base uppercase">{emp.name || 'Unnamed Staff'}</div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-tighter opacity-70">
                          <Briefcase size={12} className="text-primary/60 shrink-0" /> {emp.department || 'General Sector'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* CONTACT COLUMN */}
                  <td className="px-8 py-7">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold truncate">
                          <Mail size={12} className="text-primary/40 shrink-0" /> {emp.email || 'Awaiting Sync'}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest font-mono">
                          <Phone size={10} /> {emp.whatsappNumber || '---'}
                        </div>
                    </div>
                  </td>

                  {/* CLEARANCE COLUMN */}
                  <td className="px-8 py-7">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {empRoles.map((r, i) => (
                        <span key={i} className={`
                          text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm
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
                  
                  {/* AUTHORITY SCOPE COLUMN */}
                  <td className="px-8 py-7 min-w-[280px]">
                    <div className="bg-background/80 p-4 rounded-2xl border border-border shadow-inner group-hover:border-primary/20 transition-all">
                      {renderTeamLinks(emp)}
                    </div>
                  </td>

                  {/* INTERVENTION ACTIONS */}
                  <td className="px-10 py-7 pr-12">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => onEdit(emp)} 
                        className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"
                        title="Modify Node Permissions"
                      >
                        <Pencil size={18} />
                      </button>

                      <button 
                        onClick={() => handleDelete(emp._id, emp.name)} 
                        className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"
                        title="Terminate Node Connection"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* EMPTY STATE HANDLER */}
      {safeEmployees.length === 0 && (
        <div className="p-24 text-center flex flex-col items-center gap-6 opacity-30 grayscale transition-colors">
            <Info size={56} className="text-primary" />
            <p className="font-black text-[10px] uppercase tracking-[0.5em] text-slate-500">Registry Database Offline / Empty</p>
        </div>
      )}

      {/* Internal Custom Scrollbar Styling (Theme-Aware) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 5px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default RegisteredEmployees;