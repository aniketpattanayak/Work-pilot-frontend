import React, { useEffect, useState, useCallback } from 'react';
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
  AlertCircle,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';

/**
 * MANAGE CHECKLIST: RECURRING PROTOCOL ORCHESTRATOR v1.6
 * Purpose: Reconfigures active factory routines with full search and multi-filter suite.
 * UI: Responsive table with high-end industrial typography and dynamic filtering.
 */
const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const [editData, setEditData] = useState({ doerId: '', taskName: '' });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const frequencyTabs = ['All', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkRes, empRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);

      const checkData = Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []);
      const empDataRaw = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || []);

      setChecklists(checkData);
      setEmployees(empDataRaw.filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      setChecklists([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Logic: Filtering Engine
  const filteredChecklists = checklists.filter(item => {
    const matchesSearch = 
      item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.doerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'All' || item.frequency === activeTab;
    
    const matchesDate = !selectedDate || (item.nextDueDate && 
      new Date(item.nextDueDate).toDateString() === new Date(selectedDate).toDateString());

    return matchesSearch && matchesTab && matchesDate;
  });

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditData({ 
        doerId: item.doerId?._id || item.doerId, 
        taskName: item.taskName 
    });
  };

  const handleUpdate = async (id) => {
    try {
      await API.put(`/tasks/checklist-update/${id}`, editData);
      alert("Success: Checklist configuration updated.");
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Protocol Error: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT TERMINATION: Decommission routine "${name}"?`)) {
      try {
        await API.delete(`/tasks/checklist-delete/${id}`);
        fetchData();
      } catch (err) {
        alert("Action failed: Node deletion error.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={40} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase leading-none">Accessing Routine Registry...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-8">
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <ClipboardList className="text-primary" size={32} />
          </div>
          <div>
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Manage Recurring Routines</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Reconfigure active factory checklists and triggers.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <button onClick={fetchData} className="flex-1 xl:flex-none group bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
            <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> refresh
          </button>
        </div>
      </div>

      {/* FILTER BAR SUITE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-card p-6 rounded-[2.5rem] border border-border shadow-xl">
        {/* Search Engine */}
        <div className="relative group">
          <input 
            type="text"
            placeholder="Search by task or staff name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-500 shadow-inner"
          />
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors" />
        </div>

        {/* Date Filter */}
        <div className="relative group">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold cursor-pointer shadow-inner uppercase text-xs"
          />
          <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none" />
          {selectedDate && (
            <button onClick={() => setSelectedDate('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500 hover:scale-110 transition-transform">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* FREQUENCY TABS */}
      <div className="flex flex-wrap gap-2 mb-8 bg-card/50 p-2 rounded-[2rem] border border-border overflow-hidden">
        {frequencyTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 ${
              activeTab === tab 
              ? 'bg-primary text-white dark:text-slate-950 shadow-lg shadow-primary/20' 
              : 'text-slate-400 hover:text-foreground hover:bg-background'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid Table Header: Hidden on small screens */}
      <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-10 py-6 bg-card backdrop-blur-xl rounded-t-[2.5rem] border border-border font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.25em] items-center shadow-lg">
        <div>Task Designation</div>
        <div>Assigned Person</div>
        <div>Frequency</div>
        <div>Next Checkpoint</div>
        <div className="text-right">Action</div>
      </div>

      {/* DATA TERMINAL: Responsive List */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-[1.5rem] lg:rounded-b-[2.5rem] lg:rounded-t-none overflow-hidden shadow-2xl transition-colors duration-500">
        {filteredChecklists.map(item => {
          const isEditing = editingId === item._id;
          return (
            <div key={item._id} className={`flex flex-col lg:grid lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr] items-center px-6 py-6 lg:px-10 lg:py-7 border-b border-border last:border-0 group transition-all duration-300 ${isEditing ? 'bg-primary/[0.03] dark:bg-primary/[0.05]' : 'hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05]'}`}>
              {isEditing ? (
                <>
                  <div className="w-full lg:pr-6 mb-4 lg:mb-0">
                    <input 
                        type="text" 
                        value={editData.taskName} 
                        onChange={(e) => setEditData({...editData, taskName: e.target.value})} 
                        className="w-full bg-background border border-primary text-foreground px-5 py-3 rounded-xl text-sm font-black uppercase tracking-tight outline-none focus:ring-4 focus:ring-primary/10 shadow-inner" 
                    />
                  </div>
                  <div className="w-full lg:pr-6 mb-4 lg:mb-0">
                    <div className="relative">
                      <select 
                          value={editData.doerId} 
                          onChange={(e) => setEditData({...editData, doerId: e.target.value})} 
                          className="w-full bg-background border border-primary text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-tight outline-none cursor-pointer appearance-none shadow-inner"
                      >
                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                      </select>
                      <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-primary pointer-events-none" />
                    </div>
                  </div>
                  <div className="hidden lg:block text-slate-500 font-black text-[10px] uppercase tracking-widest">{item.frequency || 'N/A'}</div>
                  <div className="hidden lg:block text-slate-500 text-xs font-bold font-mono">
                    {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'AWAITING'}
                  </div>
                  <div className="flex justify-end gap-3 w-full lg:w-auto">
                    <button onClick={() => handleUpdate(item._id)} className="flex-1 lg:flex-none p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"><Save size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="flex-1 lg:flex-none p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl border border-border hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90 shadow-sm"><X size={18} /></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 w-full lg:w-auto mb-4 lg:mb-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-sm"><CheckCircle2 size={18} className="text-primary" /></div>
                    <div className="min-w-0">
                      <span className="font-black text-foreground tracking-tight text-sm lg:text-base uppercase truncate leading-none">{item.taskName}</span>
                      <div className="lg:hidden flex items-center gap-3 mt-1.5 opacity-60">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.frequency}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'PENDING'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full lg:w-auto flex items-center gap-3 mb-4 lg:mb-0">
                    <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center border border-border shadow-inner"><User size={12} className="text-primary/60" /></div>
                    <span className="text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-tight truncate max-w-[150px]">
                      {item.doerId?.name || 'Unassigned node'}
                    </span>
                  </div>

                  <div className="hidden lg:flex items-center gap-2">
                    <Clock size={14} className="text-primary/40" />
                    <span className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">{item.frequency || 'N/A'}</span>
                  </div>
                  
                  <div className="hidden lg:flex items-center gap-2">
                    <Calendar size={14} className="text-primary/40" />
                    <span className="text-slate-500 text-[11px] font-black font-mono tracking-tighter">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString([], {month: 'short', day: 'numeric'}) : '---'}</span>
                  </div>

                  <div className="flex justify-end gap-3 w-full lg:w-auto lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                    <button onClick={() => handleEditClick(item)} className="flex-1 lg:flex-none p-3 bg-primary/5 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(item._id, item.taskName)} className="flex-1 lg:flex-none p-3 bg-red-500/5 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"><Trash2 size={18} /></button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* EMPTY STATE */}
        {(filteredChecklists.length === 0) && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-30 grayscale transition-colors text-center px-6">
            <div className="relative">
              <Search size={80} className="text-primary" />
              <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full border border-border"><Filter size={20} className="text-primary" /></div>
            </div>
            <p className="font-black text-[10px] uppercase tracking-[0.5em] text-slate-500">No routines match your current filters</p>
            <button onClick={() => { setSearchTerm(''); setActiveTab('All'); setSelectedDate(''); }} className="text-primary text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">Reset all filters</button>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
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

export default ManageChecklist;