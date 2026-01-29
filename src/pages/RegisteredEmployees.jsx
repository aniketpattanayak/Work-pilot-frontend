import React, { useState, useMemo } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
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
  Search, 
  Filter,
  X,
  Plane, 
  Calendar as CalendarIcon,
  UserCircle,
  Save,
  RefreshCcw,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

/**
 * REGISTERED EMPLOYEES: PERSONNEL DIRECTORY v2.3
 * Purpose: Provides a themed ledger with real-time Search, Role filtering, and SEARCHABLE BUDDY CONFIG.
 * UI FIX: Defaults to 'On Leave' (true) upon opening the configurator for any staff member.
 */
const RegisteredEmployees = ({ employees, onEdit, fetchEmployees }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');

  // Leave Modal States
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [leaveData, setLeaveData] = useState({
    onLeave: true, // Master Default State
    startDate: '',
    endDate: '',
    buddyId: ''
  });
  
  // Buddy Search States
  const [buddySearchQuery, setBuddySearchQuery] = useState('');
  const [isUpdatingLeave, setIsUpdatingLeave] = useState(false);

  const rolesList = ['All', 'Admin', 'Assigner', 'Doer', 'Coordinator', 'Viewer'];

  /**
   * 1. SEARCHABLE BUDDY LOGIC
   */
  const eligibleBuddies = useMemo(() => {
    if (!selectedEmp) return [];
    return employees.filter(emp => 
      emp._id !== selectedEmp._id && 
      emp.name.toLowerCase().includes(buddySearchQuery.toLowerCase())
    );
  }, [employees, buddySearchQuery, selectedEmp]);

  const openLeaveManager = (emp) => {
    setSelectedEmp(emp);
    setBuddySearchQuery(''); 
    setLeaveData({
      // LOGIC: Default to 'true' (On Leave) whenever the modal is opened
      onLeave: true, 
      startDate: emp.leaveStatus?.startDate ? emp.leaveStatus.startDate.split('T')[0] : '',
      endDate: emp.leaveStatus?.endDate ? emp.leaveStatus.endDate.split('T')[0] : '',
      buddyId: emp.leaveStatus?.buddyId || ''
    });
    setShowLeaveModal(true);
  };

  const handleUpdateLeave = async () => {
    if (!selectedEmp) return;
    try {
      setIsUpdatingLeave(true);
      await API.put(`/superadmin/employees/${selectedEmp._id}`, {
        ...selectedEmp,
        leaveStatus: leaveData
      });
      alert(`Success: Buddy Protocol for ${selectedEmp.name} synchronized.`);
      setShowLeaveModal(false);
      fetchEmployees(); 
    } catch (err) {
      alert("Error: Failed to update substitution protocol.");
    } finally {
      setIsUpdatingLeave(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT ACTION: Remove ${name}? This will terminate all active task linkages.`)) {
      try {
        await API.delete(`/superadmin/employees/${id}`);
        fetchEmployees(); 
      } catch (err) {
        alert("System Error: Deletion failed.");
      }
    }
  };

  const renderTeamLinks = (emp) => {
    if (!emp) return null;
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    const displays = [];
    if (roles.includes('Assigner')) {
      const doers = Array.isArray(emp.managedDoers) ? emp.managedDoers : [];
      displays.push(
        <div key="assigner-links" className="mb-2 last:mb-0">
          <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
             <UserCheck size={12} /> Authorized Doers ({doers.length})
          </div>
          <div className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
            {doers.length > 0 ? doers.map(d => d.name).join(', ') : 'No personnel linked'}
          </div>
        </div>
      );
    }
    if (roles.includes('Coordinator') || roles.includes('Admin')) {
      const assigners = Array.isArray(emp.managedAssigners) ? emp.managedAssigners : [];
      displays.push(
        <div key="coord-links">
          <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest mb-1">
             <ShieldCheck size={12} /> Tracking Scope ({assigners.length})
          </div>
          <div className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
            {assigners.length > 0 ? assigners.map(a => a.name).join(', ') : 'No assigners monitored'}
          </div>
        </div>
      );
    }
    return displays.length > 0 ? displays : (
      <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">— Standard Member Node —</span>
    );
  };

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const filteredEmployees = safeEmployees.filter(emp => {
    const matchesSearch = (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const empRoles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    return matchesSearch && (selectedRole === 'All' || empRoles.includes(selectedRole));
  });

  return (
    <>
      <div className="mt-8 bg-card backdrop-blur-xl rounded-[1.5rem] border border-border shadow-2xl overflow-hidden animate-in fade-in duration-700">
        
        {/* HEADER SECTION */}
        <div className="px-6 py-8 border-b border-border flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-sm"><Users size={28} className="text-primary" /></div>
            <div>
              <h3 className="text-foreground text-xl font-black tracking-tight m-0 uppercase leading-none truncate">Staff Directory</h3>
              <p className="text-slate-500 text-[10px] font-medium mt-2 uppercase tracking-tight">Authenticated personnel and substitution states</p>
            </div>
          </div>
          <div className="bg-background px-5 py-2 rounded-full border border-border flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Population: </span>
              <span className="text-primary font-black text-base">{filteredEmployees.length}</span>
          </div>
        </div>

        {/* SEARCH TOOLBAR */}
        <div className="p-4 sm:p-6 bg-background/30 border-b border-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <input type="text" placeholder="Search by Identity, Email, or Sector..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background border border-border text-foreground pl-12 pr-10 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner" />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary" />
          </div>
          <div className="flex flex-wrap gap-2 p-1.5 bg-card border border-border rounded-2xl overflow-x-auto shadow-inner">
            {rolesList.map(role => (
              <button key={role} onClick={() => setSelectedRole(role)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${selectedRole === role ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>{role}</button>
            ))}
          </div>
        </div>
        
        {/* DATA TABLE */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left min-w-[1200px]">
            <thead>
              <tr className="bg-background/50 border-b border-border font-black text-slate-400 text-[9px] uppercase tracking-[0.25em]">
                <th className="px-10 py-5">Staff Identity</th>
                <th className="px-8 py-5">Operational Status</th>
                <th className="px-8 py-5">Access Roles</th>
                <th className="px-8 py-5">Authority Scope</th>
                <th className="px-10 py-5 text-right pr-12">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredEmployees.map(emp => {
                const isOnLeave = emp.leaveStatus?.onLeave;
                return (
                  <tr key={emp._id} className="group hover:bg-primary/[0.02] transition-all duration-300">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-5">
                        <div className={`w-11 h-11 rounded-2xl bg-background border flex items-center justify-center font-black text-base shadow-inner ${isOnLeave ? 'border-amber-500 text-amber-500' : 'border-border text-primary'}`}>
                          {emp.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-foreground tracking-tight mb-2 truncate text-sm uppercase">{emp.name}</div>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-tighter opacity-70">
                            <Briefcase size={12} className="text-primary/60 shrink-0" /> {emp.department || 'General Sector'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-7">
                      {isOnLeave ? (
                        <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl space-y-2 animate-in slide-in-from-left-2">
                          <div className="flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                            <Plane size={12} className="animate-pulse" /> ON LEAVE (AWAY)
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                            <CalendarIcon size={10} /> {new Date(emp.leaveStatus.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(emp.leaveStatus.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="bg-amber-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                            <UserCircle size={10} className="text-amber-600" />
                            <span className="text-[8px] font-black uppercase text-amber-700">Buddy: {safeEmployees.find(e => e._id === emp.leaveStatus.buddyId)?.name || 'UNMAPPED'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active at work</span>
                        </div>
                      )}
                    </td>

                    <td className="px-8 py-7">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {(Array.isArray(emp.roles) ? emp.roles : [emp.role]).map((r, i) => (
                          <span key={i} className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${r === 'Admin' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-slate-500'}`}>{r}</span>
                        ))}
                      </div>
                    </td>
                    
                    <td className="px-8 py-7 min-w-[280px]">
                      <div className="bg-background/80 p-4 rounded-2xl border border-border shadow-inner group-hover:border-primary/20 transition-all">{renderTeamLinks(emp)}</div>
                    </td>

                    <td className="px-10 py-7 pr-12">
                      <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {/* Labeled Button Trigger */}
                        <button 
                          onClick={() => openLeaveManager(emp)} 
                          className="px-4 py-2 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-90"
                        >
                          BUDDY CONFIG
                        </button>

                        <button onClick={() => onEdit(emp)} className="p-2.5 bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(emp._id, emp.name)} className="p-2.5 bg-red-500/10 text-red-600 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PORTAL AREA */}
      {showLeaveModal && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-950/90 z-[999999] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 lg:p-12 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setShowLeaveModal(false)} 
                className="absolute top-8 right-8 text-slate-400 hover:text-foreground p-2 hover:bg-slate-800 rounded-full transition-all"
              >
                <X size={24} />
              </button>
              
              <div className="mb-10">
                 <h3 className="text-amber-500 text-2xl font-black uppercase flex items-center gap-3">
                   <Plane size={28} /> Buddy Config
                 </h3>
                 <p className="text-slate-500 text-xs font-bold uppercase mt-2 italic tracking-widest">Protocol for: {selectedEmp?.name}</p>
              </div>

              <div className="space-y-8">
                 <div className="flex items-center justify-between p-5 bg-background border border-border rounded-2xl shadow-inner">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Leave Status</span>
                    {/* TOGGLE LOGIC (Defaults to On Leave) */}
                    <button 
                      onClick={() => setLeaveData({...leaveData, onLeave: !leaveData.onLeave})}
                      className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-md active:scale-95 ${leaveData.onLeave ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-200 text-slate-500 border-slate-300'}`}
                    >
                      {leaveData.onLeave ? "On Leave" : "At Work"}
                    </button>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Leave Start</label>
                       <input 
                         type="date" 
                         value={leaveData.startDate} 
                         onChange={(e) => setLeaveData({...leaveData, startDate: e.target.value})} 
                         className="w-full bg-background border border-border text-foreground p-4 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/10" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Leave End</label>
                       <input 
                         type="date" 
                         value={leaveData.endDate} 
                         onChange={(e) => setLeaveData({...leaveData, endDate: e.target.value})} 
                         className="w-full bg-background border border-border text-foreground p-4 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/10" 
                       />
                    </div>
                 </div>

                 {/* SEARCHABLE BUDDY SELECTION */}
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Substitute Buddy</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder="Type name to search staff..."
                        value={buddySearchQuery}
                        onChange={(e) => setBuddySearchQuery(e.target.value)}
                        className="w-full bg-background border border-border text-foreground pl-10 pr-4 py-4 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-amber-500/10 transition-all shadow-inner"
                      />
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>

                    <div className="max-h-[160px] overflow-y-auto custom-scrollbar border border-border rounded-2xl bg-background/50 p-2 space-y-1">
                      {eligibleBuddies.length > 0 ? eligibleBuddies.map(emp => (
                        <button
                          key={emp._id}
                          onClick={() => {
                            setLeaveData({...leaveData, buddyId: emp._id});
                            setBuddySearchQuery(emp.name); 
                          }}
                          className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-between ${leaveData.buddyId === emp._id ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-card hover:text-primary'}`}
                        >
                          {emp.name}
                          {leaveData.buddyId === emp._id && <CheckCircle2 size={12} />}
                        </button>
                      )) : (
                        <div className="py-8 text-center opacity-30 italic text-[10px] uppercase font-bold">No matching personnel found</div>
                      )}
                    </div>
                 </div>

                 <button 
                   onClick={handleUpdateLeave} 
                   disabled={isUpdatingLeave} 
                   className="w-full py-5 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                 >
                    {isUpdatingLeave ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />} Update Buddy Configuration
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 5px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </>
  );
};

export default RegisteredEmployees;