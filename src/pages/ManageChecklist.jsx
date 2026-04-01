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
  Check,
  Plus
} from 'lucide-react';
import CreateChecklist from './CreateChecklist';

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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




const [selectedEmployee, setSelectedEmployee] = useState(null);





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

    /*
    const isNonWorkingDay = (date) => {
      const dateStr = date.toISOString().split('T')[0];
      return weekends.includes(date.getDay()) || holidays.some(h => new Date(h.date).toISOString().split('T')[0] === dateStr);
    };
    */




    const normalizeDate = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const holidaySet = new Set(
  (holidays || []).map(h => normalizeDate(h.date))
);

const isNonWorkingDay = (date) => {
  const time = normalizeDate(date);
  return weekends.includes(date.getDay()) || holidaySet.has(time);
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



    if (['Yearly', 'Half-Yearly', 'Quarterly'].includes(frequency)) {
  const baseDate = new Date(item.nextDueDate || today);

  const incrementMap = {
    'Yearly': 1,
    'Half-Yearly': 0.5,
    'Quarterly': 0.25
  };

  let count = 0;
  let pointer = new Date(baseDate);

  while (dates.length < 5 && count < 10) {
    count++;

    // increment based on type
    if (frequency === 'Yearly') pointer.setFullYear(pointer.getFullYear() + 1);
    if (frequency === 'Half-Yearly') pointer.setMonth(pointer.getMonth() + 6);
    if (frequency === 'Quarterly') pointer.setMonth(pointer.getMonth() + 3);

    // skip holidays/weekends
    while (isNonWorkingDay(pointer)) {
      pointer.setDate(pointer.getDate() + 1);
    }

    dates.push({
      label: dates.length === 0 ? "NEXT" : "FOLLOWING",
      date: new Date(pointer).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    });
  }

  return dates;
}





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


    const emp = employees.find(e => e._id === (item.doerId?._id || item.doerId));
    setSelectedEmployee(emp);


    setEditingId(item._id);
    setEditData({
      doerId: item.doerId?._id || item.doerId,
      taskName: item.taskName,
      description: item.description || '',
      frequency: item.frequency,
      frequencyConfig: item.frequencyConfig || { daysOfWeek: [], daysOfMonth: [] },
      createdAt: item.createdAt 
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

{/*

    useEffect(() => {
  if (selectedEmployee && !selectedEmployee.workOnSunday) {
    setEditData(prev => ({
      ...prev,
      frequencyConfig: {
        ...prev.frequencyConfig,
        daysOfWeek: prev.frequencyConfig.daysOfWeek.filter(d => d !== 0)
      }
    }));
  }
}, [selectedEmployee]);


*/}

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={50} />
      <p className="text-foreground font-black text-sm tracking-[0.4em] uppercase">Opening Registry...</p>
    </div>
  );
  

  return (
 <div className="w-full max-w-[1700px] mx-auto animate-in fade-in duration-700  px-6 selection:bg-primary/30">
      {/* ================= HEADER ================= */}
<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">

  <div className="flex items-center gap-4">
    <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
      <ClipboardList className="text-primary" size={24} />
    </div>

    <div>
      <h2 className="text-foreground text-xl md:text-2xl font-black tracking-tight uppercase leading-tight">
        Task Registry
      </h2>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest opacity-70">
        Operational Grid
      </p>
    </div>
  </div>

  <div className="flex items-center gap-3">
  <button
    onClick={fetchData}
    className="group bg-card hover:bg-background border border-border px-5 py-2 rounded-xl text-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md active:scale-95 transition"
  >
    <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500 text-primary" />
    Refresh
  </button>
  <button
    onClick={() => setIsCreateOpen(true)}
    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-md shadow-primary/25 hover:opacity-90 active:scale-95 transition"
  >
    <Plus size={14} />
    New Task
  </button>
  </div>
</div>


{/* ================= FILTER BAR ================= */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-card/40 p-4 rounded-2xl border border-border">

  {/* SEARCH */}
  <div className="relative group">
    <input
      type="text"
      placeholder="Search..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full bg-background border border-border text-foreground px-10 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary/10 text-sm font-semibold"
    />
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" />
  </div>

  {/* DATE */}
  {/*<div className="relative group">
    <input
      type="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="w-full bg-background border border-border text-foreground px-10 py-2 rounded-xl text-xs font-semibold"
    />
    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
  </div>
  */}

  {/* TABS */}
  <div className="flex bg-background p-1 rounded-xl border border-border overflow-x-auto custom-scrollbar">
    {frequencyTabs.map(tab => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`flex-1 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition whitespace-nowrap ${
          activeTab === tab
            ? 'bg-primary text-primary-foreground shadow'
            : 'text-slate-500 hover:text-foreground'
        }`}
      >
        {tab}
      </button>
    ))}
  </div>

</div>

      {/* EXCEL GRID */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-h-[550px] flex flex-col overflow-hidden">

  {/* SCROLL AREA */}
  <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar  w-full scrollbar-thin">

    {/* TABLE */}
    <div className="w-[900px] sm:w-full text-sm">

      {/* HEADER */}
      <div className="grid grid-cols-[60px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-border sticky top-0 bg-card z-10">
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Assigned to</span>
        <span >Description</span>
        <span className="text-center">Cycle</span>
        <span>Schedule</span>
        <span className="text-right">Actions</span>
      </div>

      {/* ROWS */}
      {filteredChecklists.map((item, index) => {
        const isEditing = editingId === item._id;
        const schedule = getNextFiveDates(item);

        return (
          <div
            key={item._id}
            className={`grid grid-cols-[60px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px] items-center px-6 py-3 border-b border-border/50 hover:bg-muted/30 transition min-w-0 ${
              isEditing ? 'bg-primary/5' : ''
            }`}
          >

            {/* POS */}
            <span className="text-center text-xs font-black text-slate-400">
              #{String(index + 1).padStart(2, '0')}
            </span>

            {/* NAME */}
            <div className="min-w-0">
              {isEditing ? (
                <input
                  value={editData.taskName}
                  onChange={(e) => setEditData({ ...editData, taskName: e.target.value })}
                  className="w-full bg-background border border-primary/30 p-2 rounded-lg text-sm font-bold"
                />
              ) : (
                <span className="font-bold text-sm truncate block">
                  {item.taskName}
                </span>
              )}
            </div>

            {/* PERSON */}
            <div className="min-w-0">
              {isEditing ? (
                <select
                  value={editData.doerId}
                  onChange={(e) => {
  const emp = employees.find(emp => emp._id === e.target.value);
  setSelectedEmployee(emp); // ✅
  setEditData({ ...editData, doerId: e.target.value });
}}

                  className="w-full bg-background border border-primary/30 p-2 rounded-lg text-xs"
                >
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              ) : (
                <span className="truncate block text-sm font-semibold">
                  {item.doerId?.name || 'UNMAPPED'}
                </span>
              )}
            </div>

            {/* DESCRIPTION */}
            <div className="min-w-0">
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full bg-background border border-primary/30 p-2 rounded-lg text-xs h-16 resize-none"
                />
              ) : (
                <p className="text-xs truncate opacity-70">
                  {item.description || "No briefing."}
                </p>
              )}
            </div>

            {/* FREQUENCY */}
            <div className="text-center min-w-0">
              {isEditing ? (
                <button
                  onClick={(e) => {
  e.stopPropagation();
  setEditingId(item._id); // ensure editing row
  setEditData({
    ...item,
    frequency: item.frequency,
    frequencyConfig: item.frequencyConfig || {
      daysOfWeek: [],
      daysOfMonth: []
    }
  });
  setIsConfigModalOpen(true);
}}
                  className="text-[9px] px-3 py-1 bg-primary/10 border rounded-lg"
                >
                  {item.frequency}
                </button>
              ) : (
                <span className="text-[10px] font-bold text-primary truncate">
                  {item.frequency}
                </span>
              )}
            </div>

            {/* SCHEDULE */}
            <div className="min-w-0">
              <select className="w-full text-xs bg-background border border-border p-2 rounded-lg">
                {schedule.length > 0 ? schedule.map((obj, i) => (
                  <option key={i}>{obj.label} → {obj.date}</option>
                )) : <option>Synced</option>}
              </select>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 min-w-0">
              {isEditing ? (
                <>
                  <button onClick={(e) => handleUpdate(item._id, e)} className="p-2 bg-emerald-600 text-white rounded-lg">
                    <Save size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2 bg-slate-400 rounded-lg">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={(e) => handleEditClick(item, e)} className="p-2 bg-slate-800 text-white rounded-lg">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(item._id, item.taskName, e)} className="p-2 bg-red-600 text-white rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>

          </div>
        );
      })}

    </div>
  </div>
</div>

{isConfigModalOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">

    <div className="bg-card border border-border w-full max-w-lg md:max-w-xl rounded-[2rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">

      {/* HEADER */}
      <div className="px-6 md:px-8 py-5 bg-background/60 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
            <Settings2 className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="text-foreground font-black text-lg uppercase tracking-tight">
              Frequency Tuning
            </h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Adjust parameters
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsConfigModalOpen(false)}
          className="text-slate-400 hover:text-foreground transition"
        >
          <X size={22} />
        </button>
      </div>
      {/* BODY */}
      <div className="p-6 md:p-8 space-y-8">
        {/* FREQUENCY SELECT */}
        <div className="space-y-3">



{/*
          
<div className="space-y-2">
  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
    Start Date
  </label>

  <input
    type="date"
    value={editData.createdAt ? editData.createdAt.split('T')[0] : ''}
    onChange={(e) =>
      setEditData({ ...editData, createdAt: e.target.value })
    }
    className="w-full bg-background border border-border p-3 rounded-xl text-sm font-semibold"
  />
</div>

*/}

          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Lifecycle
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map(f => (
              <button
                key={f}
                onClick={() => setEditData({ ...editData, frequency: f })}
                className={`py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border transition ${
                  editData.frequency === f
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-background text-slate-400 border-border hover:border-primary/40'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* CONFIG AREA */}
        <div className="bg-background/40 p-5 rounded-xl border border-border border-dashed min-h-[120px] flex flex-col justify-center items-center">

          {/* WEEKLY */}
          {editData.frequency === 'Weekly' && (
            <div className="space-y-4 text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Select Days
              </span>

              <div className="flex flex-wrap justify-center gap-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
  const isSunday = i === 0;
  const isDisabled = isSunday && selectedEmployee && !selectedEmployee.workOnSunday;

  return (
    <button
      key={i}
      disabled={isDisabled}
      onClick={() => !isDisabled && toggleEditDay(i)}
      className={`w-10 h-10 rounded-lg text-[10px] font-black border transition
        ${editData.frequencyConfig.daysOfWeek.includes(i)
          ? 'bg-primary text-white border-primary'
          : 'bg-card text-slate-400 border-border'}
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      title={isDisabled ? "Employee doesn't work on Sundays" : ""}
    >
      {d}
    </button>
  );
})}
              </div>
            </div>
          )}

          {/* MONTHLY */}
          {editData.frequency === 'Monthly' && (
            <div className="space-y-4 text-center w-full">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Select Dates
              </span>

              <div className="grid grid-cols-7 gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <button
                    key={d}
                    onClick={() => toggleEditDate(d)}
                    className={`h-8 rounded text-[10px] font-black border transition ${
                      editData.frequencyConfig.daysOfMonth.includes(d)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-card text-slate-400 border-border'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OTHER */}
          {!['Weekly', 'Monthly'].includes(editData.frequency) && (
            <div className="text-center">
              <CheckCircle2 className="text-primary/30 mx-auto mb-2" size={30} />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Auto mode active
              </p>
            </div>
          )}
        </div>

        {/* ACTION */}
        <button
          onClick={() => setIsConfigModalOpen(false)}
          className="w-full py-4 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition"
        >
          Apply
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

      {/* ── CREATE CHECKLIST MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Plus size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">New Checklist Task</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">Create & assign a recurring task</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors group"
              >
                <X size={15} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
            {/* Modal Body — renders the full CreateChecklist form */}
            <div className="overflow-y-auto flex-1">
              <CreateChecklist
                tenantId={currentTenantId}
                onSuccess={() => { setIsCreateOpen(false); fetchData(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
};

export default ManageChecklist;