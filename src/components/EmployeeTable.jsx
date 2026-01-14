import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  RefreshCcw
} from 'lucide-react';
import API from '../api/axiosConfig';

const EmployeeTable = ({ tenantId, onEdit }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/superadmin/employees/${tenantId}`);
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
        await axios.delete(`/superadmin/employees/${id}`);
        alert("Staff record decommissioned successfully.");
        fetchEmployees(); 
      } catch (err) {
        alert("System Error: Deletion protocol failed.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={32} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase leading-none">Syncing Personnel Registry...</p>
    </div>
  );

  return (
    <div className="mt-8 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 shadow-2xl overflow-hidden animate-in fade-in duration-700">
      
      {/* Table Header Section */}
      <div className="px-10 py-8 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-2.5 rounded-2xl border border-sky-500/20">
            <Users size={28} className="text-sky-400" />
          </div>
          <div>
            <h3 className="text-white text-xl font-black tracking-tight m-0">Factory Personnel Registry</h3>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Manage staff permissions and view organizational reporting links.</p>
          </div>
        </div>
        <div className="bg-slate-950 px-5 py-2 rounded-full border border-slate-800 shadow-inner">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Headcount: </span>
           <span className="text-sky-400 font-black text-sm">{employees.length}</span>
        </div>
      </div>

      {/* Responsive Table Area */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 font-black text-slate-500 text-[10px] uppercase tracking-widest">
              <th className="px-10 py-5">Staff Identity / Dept</th>
              <th className="px-8 py-5">Access Clearances</th>
              <th className="px-8 py-5">Organizational Linkage</th>
              <th className="px-8 py-5">Contact Node</th>
              <th className="px-10 py-5 text-right">Intervention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {employees.map(emp => (
              <tr key={emp._id} className="group hover:bg-slate-900/30 transition-all duration-300">
                
                {/* NAME & DEPT */}
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400 font-black text-sm group-hover:border-sky-500/30 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all">
                       {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 tracking-tight leading-none mb-1.5">{emp.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                        <Briefcase size={12} className="text-slate-600" /> {emp.department}
                      </div>
                    </div>
                  </div>
                </td>

                {/* MULTI-ROLE BADGES */}
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                    {(emp.roles || [emp.role]).map((r, i) => (
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

                {/* TEAM & LINKAGE COUNTS (Logic Preserved) */}
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {/* Assigner Links */}
                    {emp.roles?.includes('Assigner') && (
                      <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit transition-all group-hover:border-emerald-500/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                          {emp.managedDoers?.length || 0} Doers Authorized
                        </span>
                      </div>
                    )}
                    
                    {/* Coordinator/Admin Links */}
                    {(emp.roles?.includes('Coordinator') || emp.roles?.includes('Admin')) && (
                      <div className="flex items-center gap-2 bg-sky-500/5 border border-sky-500/20 px-3 py-1.5 rounded-lg w-fit transition-all group-hover:border-sky-500/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-tighter">
                          {emp.managedAssigners?.length || 0} Assigners Linked
                        </span>
                      </div>
                    )}

                    {/* Standard Doer State */}
                    {!emp.roles?.includes('Assigner') && !emp.roles?.includes('Coordinator') && !emp.roles?.includes('Admin') && (
                      <div className="flex items-center gap-2 opacity-40">
                        <Layers size={12} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Standard Doer</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* CONTACT */}
                <td className="px-8 py-6">
                   <div className="flex items-center gap-3 text-slate-400">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <Phone size={14} className="text-slate-600" />
                      </div>
                      <span className="text-xs font-bold font-mono tracking-tight">{emp.whatsappNumber || 'N/A'}</span>
                   </div>
                </td>

                {/* ACTIONS */}
                <td className="px-10 py-6">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => onEdit(emp)}
                      className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-slate-950 transition-all active:scale-90"
                      title="Edit Profile"
                    >
                      <Edit3 size={18} />
                    </button>

                    <button 
                      onClick={() => handleDelete(emp._id, emp.name)}
                      className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                      title="Remove Staff"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* EMPTY STATE */}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" className="px-10 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                    <Info size={48} className="text-slate-500" />
                    <p className="font-black text-xs uppercase tracking-[0.3em]">No Active Personnel Found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

export default EmployeeTable;