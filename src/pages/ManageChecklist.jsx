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
  History,
  Settings2,
  Check
} from 'lucide-react';

/**
 * MANAGE CHECKLIST v5.4
 * Purpose: Professional Ledger with Configuration Popup.
 * Updated: Modal-based frequency tuning for better UX.
 */
const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // MODAL STATE
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [editData, setEditData] = useState({
    doerId: '',
    taskName: '',
    description: '',
    frequency: 'Daily',
    frequencyConfig: { daysOfWeek: [], daysOfMonth: [] }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const frequencyTabs = ['All', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

  /**
   * TIMELINE ENGINE
   */
  const getNextFiveDates = (item) => {
    const dates = [];
    const config = item.frequencyConfig || {};
    const frequency = item.frequency;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let pointer = new Date(today);
    const weekends = tenantSettings?.weekends || [0];
    const holidays = tenantSettings?.holidays || [];

    const isNonWorkingDay = (date) => {
      const dateStr = date.toISOString().split('T')[0];
      return weekends.includes(date.getDay()) || holidays.some(h => new Date(h.date).toISOString().split('T')[0] === dateStr);
    };

    const matchesConfig = (date) => {
      if (frequency === 'Weekly') {
        const allowed = Array.isArray(config.daysOfWeek) && config.daysOfWeek.length > 0 ? config.daysOfWeek : [new Date(item.nextDueDate).getDay()];
        return allowed.includes(date.getDay());
      }
      if (frequency === 'Monthly') {
        const allowed = Array.isArray(config.daysOfMonth) && config.daysOfMonth.length > 0 ? config.daysOfMonth : [new Date(item.nextDueDate).getDate()];
        return allowed.includes(date.getDate());
      }
      return true;
    };

    let loopSafety = 0;
    while (dates.length < 5 && loopSafety < 1000) {
      loopSafety++;

      // ROBUST: Strictly skip Sundays if Sunday is in the weekend list
      if (pointer.getDay() === 0 && weekends.includes(0)) {
        pointer.setDate(pointer.getDate() + 1);
        continue;
      }

      if (matchesConfig(pointer) && !isNonWorkingDay(pointer)) {
        dates.push({ label: dates.length === 0 ? "NEXT" : "FOLLOWING", date: new Date(pointer).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) });
      }
      pointer.setDate(pointer.getDate() + 1);
    }
    return dates;
  };

  /**
   * MODAL TOGGLES
   */
  const toggleEditDay = (dayIndex) => {
    const current = [...editData.frequencyConfig.daysOfWeek];
    const idx = current.indexOf(dayIndex);
    if (idx > -1) current.splice(idx, 1);
    else current.push(dayIndex);
    setEditData({ ...editData, frequencyConfig: { ...editData.frequencyConfig, daysOfWeek: current.sort() } });
  };

  const toggleEditDate = (dateNum) => {
    const current = [...editData.frequencyConfig.daysOfMonth];
    const idx = current.indexOf(dateNum);
    if (idx > -1) current.splice(idx, 1);
    else current.push(dateNum);
    setEditData({ ...editData, frequencyConfig: { ...editData.frequencyConfig, daysOfMonth: current.sort((a, b) => a - b) } });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkRes, empRes, settingsRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/settings/${currentTenantId}`).catch(() => ({ data: {} }))
      ]);
      setChecklists(Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []));
      setEmployees((Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || [])).filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));
      setTenantSettings(settingsRes.data?.settings || settingsRes.data || null);
    } catch (err) { console.error("Fetch error:", err); } finally { setLoading(false); }
  }, [currentTenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredChecklists = checklists.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = item.taskName.toLowerCase().includes(term) || (item.doerId?.name || "").toLowerCase().includes(term);
    const matchesTab = activeTab === 'All' || item.frequency === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingId(item._id);
    setEditData({
      doerId: item.doerId?._id || item.doerId,
      taskName: item.taskName,
      description: item.description || '',
      frequency: item.frequency,
      frequencyConfig: item.frequencyConfig || { daysOfWeek: [], daysOfMonth: [] }
    });
  };

  const handleUpdate = async (id, e) => {
    e.stopPropagation();
    try {
      await API.put(`/tasks/checklist/${id}`, editData);
      alert("Success: Registry updated.");
      setEditingId(null);
      fetchData();
    } catch (err) { alert("Update failed."); }
  };

  const handleDelete = async (id, taskName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${taskName}"?`)) return;
    try { await API.delete(`/tasks/checklist/${id}`); fetchData(); } catch (err) { alert("Deletion error."); }
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

      {/* FILTER TERMINAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 bg-card/50 p-8 rounded-[3rem] border border-border shadow-inner">
        <div className="relative group">
          <input type="text" placeholder="Search by Personnel or Task..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background border border-border text-foreground px-14 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm shadow-inner" />
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
        </div>
        <div className="relative group"><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-background border border-border text-foreground px-14 py-4 rounded-2xl outline-none font-black text-xs uppercase shadow-inner" /><Calendar size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" /></div>
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
                <th className="px-8 py-6 border-r border-border">Personnel</th>
                <th className="px-8 py-6 border-r border-border min-w-[450px]">Technical Briefing</th>
                <th className="px-8 py-6 border-r border-border text-center">Cycle / Tuning</th>
                <th className="px-8 py-6 border-r border-border">Future Schedule</th>
                <th className="px-8 py-6 text-right pr-12">Registry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredChecklists.map((item, index) => {
                const isEditing = editingId === item._id;
                const schedule = getNextFiveDates(item);

                return (
                  <tr key={item._id} className={`transition-all ${isEditing ? 'bg-primary/5' : 'hover:bg-primary/[0.01]'}`}>
                    <td className="px-8 py-6 border-r border-border text-center text-xs font-black text-slate-400">#{String(index + 1).padStart(2, '0')}</td>

                    <td className="px-8 py-6 border-r border-border">
                      {isEditing ? <input value={editData.taskName} onChange={(e) => setEditData({ ...editData, taskName: e.target.value })} className="w-full bg-background border border-primary/30 p-3 rounded-xl font-black text-sm uppercase text-foreground" />
                        : <span className="font-black text-foreground text-sm uppercase leading-tight block">{item.taskName}</span>}
                    </td>

                    <td className="px-8 py-6 border-r border-border">
                      {isEditing ? (
                        <select value={editData.doerId} onChange={(e) => setEditData({ ...editData, doerId: e.target.value })} className="w-full bg-background border border-primary/30 p-3 rounded-xl font-black text-xs uppercase text-foreground">
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
                      {isEditing ? <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="w-full bg-background border border-primary/30 p-3 rounded-xl text-sm font-bold text-foreground h-24 shadow-inner resize-none" />
                        : <p className="text-foreground text-sm font-bold leading-relaxed italic opacity-70 line-clamp-2">{item.description || "No briefing."}</p>}
                    </td>

                    <td className="px-8 py-6 border-r border-border text-center">
                      <div className="flex flex-col items-center gap-3">
                        {isEditing ? (
                          <button
                            onClick={() => setIsConfigModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-md"
                          >
                            <Settings2 size={14} /> Tune Frequency
                          </button>
                        ) : (
                          <span className="text-primary text-[10px] font-black uppercase tracking-widest border-2 border-primary/20 bg-primary/5 px-4 py-2 rounded-xl shadow-sm">{item.frequency}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6 border-r border-border">
                      <div className="relative group">
                        <select className="w-full bg-background border border-border text-foreground font-black text-[11px] uppercase px-5 py-3 rounded-2xl appearance-none cursor-pointer hover:border-primary transition-all shadow-inner">
                          {schedule.length > 0 ? schedule.map((obj, dIdx) => (
                            <option key={dIdx} className="font-bold py-3 bg-card">{obj.label} → {obj.date}</option>
                          )) : <option>Registry Synced</option>}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-transform" />
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right pr-12">
                      <div className="flex justify-end gap-4">
                        {isEditing ? (
                          <>
                            <button onClick={(e) => handleUpdate(item._id, e)} className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 shadow-xl active:scale-90 transition-all"><Save size={20} /></button>
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

      {/* ADVANCED CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden relative animate-in zoom-in-95 duration-500">

            {/* MODAL HEADER */}
            <div className="px-10 py-8 bg-background/50 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20"><Settings2 className="text-primary" size={24} /></div>
                <div>
                  <h3 className="text-foreground font-black text-xl tracking-tighter uppercase">Frequency Tuning</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Adjust multi-instance parameters</p>
                </div>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-foreground transition-all"><X size={28} /></button>
            </div>

            <div className="p-10 space-y-10">
              {/* FREQUENCY SELECT */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lifecycle Cycle</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map(f => (
                    <button
                      key={f}
                      onClick={() => setEditData({ ...editData, frequency: f })}
                      className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${editData.frequency === f ? 'bg-primary text-white border-primary shadow-xl scale-105' : 'bg-background text-slate-400 border-border hover:border-primary/40'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONFIGURATION AREA */}
              <div className="bg-background/50 p-8 rounded-[2rem] border border-border border-dashed min-h-[150px] flex flex-col justify-center items-center">
                {editData.frequency === 'Weekly' && (
                  <div className="space-y-6 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorize Operational Days</span>
                    <div className="flex flex-wrap justify-center gap-3">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <button key={i} onClick={() => toggleEditDay(i)} className={`w-14 h-14 rounded-2xl font-black text-xs border transition-all ${editData.frequencyConfig.daysOfWeek.includes(i) ? 'bg-primary text-white border-primary shadow-lg scale-110' : 'bg-card text-slate-400 border-border'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}

                {editData.frequency === 'Monthly' && (
                  <div className="space-y-6 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorize Calendar Dates</span>
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <button key={d} onClick={() => toggleEditDate(d)} className={`w-10 h-10 rounded-xl font-black text-[10px] border transition-all ${editData.frequencyConfig.daysOfMonth.includes(d) ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-110' : 'bg-card text-slate-400 border-border'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}

                {!['Weekly', 'Monthly'].includes(editData.frequency) && (
                  <div className="text-center">
                    <CheckCircle2 className="text-primary/20 mx-auto mb-4" size={40} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Automatic anchoring active for {editData.frequency} cycles.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="w-full py-6 rounded-[1.5rem] bg-primary text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4"
              >
                <Check size={20} /> Apply Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default ManageChecklist;