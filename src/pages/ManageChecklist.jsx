import React, { useEffect, useState, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig'; 
import { 
  Trash2, 
  Edit3, 
  RefreshCcw, 
  User, 
  Calendar, 
  Save, 
  X, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Search,
  Building2,
  FileText,
  Target,
  ChevronDown,
  History
} from 'lucide-react';

/**
 * MANAGE CHECKLIST v5.2
 * FIXED: Timeline fallback for tasks with empty frequency configurations.
 * LOGIC: Ensures next 5 dates show even if multi-instance arrays are missing.
 */
const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantSettings, setTenantSettings] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const [editData, setEditData] = useState({ doerId: '', taskName: '', description: '' });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const frequencyTabs = ['All', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

  /**
   * LIVE LOOK-AHEAD TIMELINE ENGINE (v5.2)
   * FIXED: Added fallbacks for empty configuration arrays.
   */
  const getNextFiveDates = (item) => {
    const dates = [];
    const config = item.frequencyConfig || {};
    const frequency = item.frequency;
    
    // START FROM TODAY
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let pointer = new Date(today);

    const weekends = tenantSettings?.weekends || [0]; 
    const holidays = tenantSettings?.holidays || [];

    const isNonWorkingDay = (date) => {
      const dateStr = date.toISOString().split('T')[0];
      const isWeekend = weekends.includes(date.getDay()); 
      const isHoliday = holidays.some(h => new Date(h.date).toISOString().split('T')[0] === dateStr);
      return isWeekend || isHoliday;
    };

    /**
     * FALLBACK LOGIC
     * If the task is Weekly/Monthly but has no selected days/dates, 
     * use the day of the original nextDueDate as the single authorized point.
     */
    const matchesConfig = (date) => {
        if (frequency === 'Weekly') {
            const allowedDays = Array.isArray(config.daysOfWeek) && config.daysOfWeek.length > 0 
                ? config.daysOfWeek 
                : [new Date(item.nextDueDate).getDay()];
            return allowedDays.includes(date.getDay());
        }
        if (frequency === 'Monthly') {
            const allowedDates = Array.isArray(config.daysOfMonth) && config.daysOfMonth.length > 0 
                ? config.daysOfMonth 
                : [new Date(item.nextDueDate).getDate()];
            return allowedDates.includes(date.getDate());
        }
        return true; 
    };

    let loopSafety = 0;
    // Walk forward up to 1000 days to find 5 matches
    while (dates.length < 5 && loopSafety < 1000) {
      loopSafety++;
      
      if (matchesConfig(pointer) && !isNonWorkingDay(pointer)) {
        dates.push({
            label: dates.length === 0 ? "NEXT" : "FOLLOWING",
            date: new Date(pointer).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        });
      }
      pointer.setDate(pointer.getDate() + 1);
    }
    return dates;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkRes, empRes, settingsRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/settings/${currentTenantId}`).catch(() => ({ data: {} }))
      ]);

      const checkData = Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []);
      const empDataRaw = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || []);

      setChecklists(checkData);
      setEmployees(empDataRaw.filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));

      setTenantSettings(settingsRes.data?.settings || settingsRes.data || null);
    } catch (err) {
      console.error("Fetch error:", err);
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredChecklists = checklists.filter(item => {
    const matchesSearch = 
      item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.doerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.doerId?.department || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'All' || item.frequency === activeTab;
    const matchesDate = !selectedDate || (item.nextDueDate && 
      new Date(item.nextDueDate).toDateString() === new Date(selectedDate).toDateString());

    return matchesSearch && matchesTab && matchesDate;
  });

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingId(item._id);
    setEditData({ 
      doerId: item.doerId?._id || item.doerId, 
      taskName: item.taskName,
      description: item.description || ''
    });
  };

  const handleUpdate = async (id, e) => {
    e.stopPropagation();
    try {
      await API.put(`/tasks/checklist/${id}`, editData);
      alert("Success: Ledger updated.");
      setEditingId(null);
      fetchData();
    } catch (err) { alert("Update failed."); }
  };

  const handleDelete = async (id, taskName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${taskName}" from Registry?`)) return;
    try {
        await API.delete(`/tasks/checklist/${id}`);
        fetchData(); 
    } catch (err) { alert("Deletion error."); }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={50} />
      <p className="text-foreground font-black text-sm tracking-[0.4em] uppercase">Opening Registry...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1700px] mx-auto animate-in fade-in duration-700 pb-20 px-6 selection:bg-primary/30">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 shadow-inner">
            <ClipboardList className="text-primary" size={36} />
          </div>
          <div>
            <h2 className="text-foreground text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">Task Registry</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2 opacity-80 italic">Precision Operational Management Grid</p>
          </div>
        </div>
        <button onClick={fetchData} className="group bg-card hover:bg-background border border-border px-10 py-4 rounded-2xl text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
          <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Sync Data
        </button>
      </div>

      {/* FILTER & SEARCH TERMINAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 bg-card/50 p-8 rounded-[3rem] border border-border shadow-inner">
        <div className="relative group">
          <input 
            type="text" placeholder="Filter by Task, Personnel, Dept..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-14 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm shadow-inner"
          />
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
        </div>

        <div className="relative group">
          <input 
            type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-14 py-4 rounded-2xl outline-none font-black text-xs uppercase shadow-inner"
          />
          <Calendar size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex bg-background p-1.5 rounded-2xl border border-border overflow-x-auto custom-scrollbar shadow-inner">
          {frequencyTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'text-slate-500 hover:text-foreground'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {/* EXCEL GRID */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead>
              <tr className="bg-background/80 border-b border-border text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                <th className="px-8 py-6 border-r border-border text-center w-24">Pos.</th>
                <th className="px-8 py-6 border-r border-border">Directive Name</th>
                <th className="px-8 py-6 border-r border-border text-center">Dept.</th>
                <th className="px-8 py-6 border-r border-border">Personnel</th>
                <th className="px-8 py-6 border-r border-border min-w-[450px]">Technical Briefing</th>
                <th className="px-8 py-6 border-r border-border text-center">Cycle</th>
                <th className="px-8 py-6 border-r border-border">Future Schedule (From Today)</th>
                <th className="px-8 py-6 text-right pr-12">Registry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredChecklists.map((item, index) => {
                const isEditing = editingId === item._id;
                const schedule = getNextFiveDates(item);

                return (
                  <tr key={item._id} className={`transition-all ${isEditing ? 'bg-primary/5' : 'hover:bg-primary/[0.01]'}`}>
                    
                    <td className="px-8 py-6 border-r border-border text-center text-xs font-black text-slate-400">
                      #{String(index + 1).padStart(2, '0')}
                    </td>

                    <td className="px-8 py-6 border-r border-border">
                      {isEditing ? (
                        <input 
                          value={editData.taskName} onChange={(e) => setEditData({...editData, taskName: e.target.value})}
                          className="w-full bg-background border border-primary/30 p-3 rounded-xl font-black text-sm uppercase text-foreground"
                        />
                      ) : (
                        <span className="font-black text-foreground text-sm uppercase leading-tight block">{item.taskName}</span>
                      )}
                    </td>

                    <td className="px-8 py-6 border-r border-border text-center">
                       <span className="text-[9px] font-black uppercase text-slate-500 px-4 py-2 bg-background border border-border rounded-lg shadow-sm">
                         {item.doerId?.department || 'OPS'}
                       </span>
                    </td>

                    <td className="px-8 py-6 border-r border-border">
                      {isEditing ? (
                        <select value={editData.doerId} onChange={(e) => setEditData({...editData, doerId: e.target.value})} className="w-full bg-background border border-primary/30 p-3 rounded-xl font-black text-xs uppercase">
                          {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"><User size={18} className="text-primary" /></div>
                           <span className="text-foreground font-black text-sm uppercase whitespace-nowrap tracking-tight">{item.doerId?.name || 'UNMAPPED'}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-8 py-6 border-r border-border">
                      {isEditing ? (
                        <textarea value={editData.description} onChange={(e) => setEditData({...editData, description: e.target.value})} className="w-full bg-background border border-primary/30 p-3 rounded-xl text-sm font-bold text-foreground h-28 shadow-inner resize-none" />
                      ) : (
                        <p className="text-foreground text-sm font-bold leading-relaxed italic opacity-70 line-clamp-2">
                          {item.description || "Technical briefing not logged."}
                        </p>
                      )}
                    </td>

                    <td className="px-8 py-6 border-r border-border text-center">
                      <span className="text-primary text-[10px] font-black uppercase tracking-widest border-2 border-primary/20 bg-primary/5 px-4 py-2 rounded-xl shadow-sm">{item.frequency}</span>
                    </td>

                    {/* DYNAMIC FUTURE SCHEDULE (FIXED v5.2) */}
                    <td className="px-8 py-6 border-r border-border">
                       <div className="relative group">
                          <select className="w-full bg-background border border-border text-foreground font-black text-[11px] uppercase px-5 py-3 rounded-2xl appearance-none cursor-pointer hover:border-primary transition-all shadow-inner">
                             {schedule.length > 0 ? schedule.map((obj, dIdx) => (
                               <option key={dIdx} className="font-bold py-3 bg-card">
                                 {obj.label} → {obj.date}
                               </option>
                             )) : <option>Registry Synced (Check Config)</option>}
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors" />
                       </div>
                    </td>

                    <td className="px-8 py-6 text-right pr-12">
                      <div className="flex justify-end gap-4">
                        {isEditing ? (
                          <>
                            <button onClick={(e) => handleUpdate(item._id, e)} className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 shadow-2xl active:scale-90 transition-all"><Save size={20} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-4 bg-slate-200 dark:bg-slate-800 text-foreground rounded-2xl active:scale-90"><X size={20} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e) => handleEditClick(item, e)} className="p-4 bg-slate-950 dark:bg-slate-100 dark:text-slate-950 text-white rounded-2xl hover:scale-110 transition-all shadow-lg active:scale-90"><Edit3 size={18} /></button>
                            <button onClick={(e) => handleDelete(item._id, item.taskName, e)} className="p-4 bg-red-600 text-white rounded-2xl hover:bg-red-500 shadow-xl active:scale-90 transition-all"><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default ManageChecklist;