import React from 'react';
import API from '../api/axiosConfig'; // Switched to centralized API instance
import { Trash2, Pencil, Users, ShieldCheck, Briefcase, Mail, Info, UserCheck } from 'lucide-react';

const RegisteredEmployees = ({ employees, onEdit, fetchEmployees }) => {
  
  /**
   * UPDATED: Unified Delete Protocol
   * Uses the centralized API instance for AWS production compatibility.
   */
  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT ACTION: Remove ${name}? This will terminate all active task linkages and coordinator scopes.`)) {
      try {
        // Switched to centralized API instance
        await API.delete(`/superadmin/employees/${id}`);
        fetchEmployees(); 
      } catch (err) {
        console.error("Deletion error:", err);
        alert("System Error: Deletion protocol failed.");
      }
    }
  };

  /**
   * UPDATED: Defensive Link Rendering
   * Ensures .map and .length checks don't crash on null/undefined values.
   */
  const renderTeamLinks = (emp) => {
    if (!emp) return null;
    
    // Safety check for roles
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    const displays = [];

    if (roles.includes('Assigner')) {
      const doers = Array.isArray(emp.managedDoers) ? emp.managedDoers : [];
      const doerCount = doers.length;
      const doerNames = doers.map(d => d.name || "Unknown Staff").join(', ');
      
      displays.push(
        <div key="assigner-links" className="mb-2 last:mb-0">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
             <UserCheck size={12} /> Authorized Doers ({doerCount})
          </div>
          <div className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
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
          <div className="flex items-center gap-1.5 text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">
             <ShieldCheck size={12} /> Tracking Scope ({assignerCount})
          </div>
          <div className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
            {assignerCount > 0 ? assignerNames : 'No assigners monitored'}
          </div>
        </div>
      );
    }

    return displays.length > 0 ? displays : <span className="text-slate-700 text-[10px] font-black uppercase tracking-widest">— Standard Member —</span>;
  };

  // Safe check for the main list
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 shadow-2xl overflow-hidden animate-in fade-in duration-700">
      
      {/* Table Header Section */}
      <div className="px-10 py-8 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-2.5 rounded-2xl border border-sky-500/20">
            <Users size={28} className="text-sky-400" />
          </div>
          <div>
            <h3 className="text-white text-xl font-black tracking-tight m-0">List of Employees</h3>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Directory of authenticated personnel and organizational link states.</p>
          </div>
        </div>
        <div className="bg-slate-950 px-5 py-2 rounded-full border border-slate-800 shadow-inner">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee Count: </span>
           <span className="text-sky-400 font-black text-sm">{safeEmployees.length}</span>
        </div>
      </div>
      
      {/* Responsive Table Container */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 font-black text-slate-500 text-[10px] uppercase tracking-widest">
              <th className="px-10 py-5">Staff Identity</th>
              <th className="px-8 py-5">Email & Contact</th>
              <th className="px-8 py-5">Access Roles</th>
              <th className="px-8 py-5">Eligible Doer Names</th>
              <th className="px-10 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {safeEmployees.map(emp => {
               // Defensive Check for Roles in JSX
               const empRoles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : ['Node']);
               
               return (
                <tr key={emp._id} className="group hover:bg-slate-900/30 transition-all duration-300">
                  {/* NAME & DEPT */}
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400 font-black text-sm group-hover:border-sky-500/30 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all">
                        {emp.name ? emp.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 tracking-tight leading-none mb-1.5">{emp.name || 'Unnamed Staff'}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                          <Briefcase size={12} className="text-slate-600" /> {emp.department || 'General'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* EMAIL */}
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                          <Mail size={12} className="text-slate-600" /> {emp.email || 'No Email'}
                        </div>
                        <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                          WhatsApp: {emp.whatsappNumber || 'N/A'}
                        </div>
                    </div>
                  </td>

                  {/* MULTI-ROLE BADGES */}
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {empRoles.map((r, i) => (
                        <span key={i} className={`
                          text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border
                          ${r === 'Admin' 
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                          }
                        `}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  
                  {/* TEAM / LINKS */}
                  <td className="px-8 py-6 min-w-[250px]">
                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40 group-hover:border-slate-800 group-hover:bg-slate-950 transition-all">
                      {renderTeamLinks(emp)}
                    </div>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-10 py-6">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => onEdit(emp)} 
                        className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-slate-950 transition-all active:scale-90"
                        title="Modify Permissions"
                      >
                        <Pencil size={18} />
                      </button>

                      <button 
                        onClick={() => handleDelete(emp._id, emp.name)} 
                        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                        title="Revoke Access"
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

      {safeEmployees.length === 0 && (
        <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30 grayscale">
            <Info size={48} />
            <p className="font-black text-xs uppercase tracking-[0.3em]">Registry Database Empty</p>
        </div>
      )}

      {/* Internal Custom Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default RegisteredEmployees;