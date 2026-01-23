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
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  Users,
  BarChart3
} from 'lucide-react';

/**
 * MANAGE CHECKLIST v2.2
 * Purpose: Manage recurring tasks with clean layout
 * Updated: Smart task name truncation
 */
const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({ doerId: '', taskName: '', description: '' });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const frequencyTabs = ['All', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

  // Helper function to truncate task names intelligently
  const truncateTaskName = (name, maxLength = 30) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    
    // Find the first word break after maxLength
    const truncated = name.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    // If there's a space, cut there; otherwise cut at maxLength
    if (lastSpaceIndex > 10) {
      return name.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  };

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

  const filteredChecklists = checklists.filter(item => {
    const matchesSearch = 
      item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.doerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
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
      await API.put(`/tasks/checklist-update/${id}`, editData);
      alert("Success: Task updated successfully.");
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Authorize permanent deletion of this recurring protocol?")) return;

    try {
        // Must point to the '/tasks/checklist/' endpoint
        await API.delete(`/tasks/checklist/${id}`);
        alert("Success: Checklist purged.");
        fetchChecklists(); // Refresh the list
    } catch (err) {
        console.error(err);
        alert("Action failed: Node deletion error."); // This is the error you were seeing
    }
};

  const getMonthlyStats = (history) => {
    if (!Array.isArray(history)) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return history.filter(log => {
      const isDone = log.action === 'Completed' || log.action === 'Administrative Completion';
      const logDate = new Date(log.timestamp);
      return isDone && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    }).length;
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={40} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase">Loading...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-8">
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
            <ClipboardList className="text-primary" size={32} />
          </div>
          <div>
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Manage Daily Tasks</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80">View and edit recurring work schedules</p>
          </div>
        </div>
        <button onClick={fetchData} className="group bg-card hover:bg-background border border-border px-8 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-xl">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-card p-6 rounded-[2.5rem] border border-border shadow-xl">
        <div className="relative group">
          <input 
            type="text"
            placeholder="Search by task or person name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-400 shadow-inner"
          />
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors" />
        </div>

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
      <div className="flex flex-wrap gap-2 mb-8 bg-card/50 p-2 rounded-[2rem] border border-border">
        {frequencyTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 ${
              activeTab === tab 
              ? 'bg-primary text-primary-foreground shadow-lg' 
              : 'text-slate-400 dark:text-slate-500 hover:text-foreground hover:bg-background'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TABLE HEADER */}
      <div className="hidden lg:flex items-center px-10 py-6 bg-card backdrop-blur-xl rounded-t-[2.5rem] border border-border font-black text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-[0.25em] shadow-lg">
        <div className="flex-[2]">Task Name</div>
        <div className="flex-[1.5]">Assigned To</div>
        <div className="flex-1">Schedule</div>
        <div className="flex-1">Next Due</div>
        <div className="w-16 text-center"></div>
        <div className="flex-1 text-right">Actions</div>
      </div>

      {/* TASK LIST */}
      <div className="flex flex-col bg-background lg:bg-card border border-border rounded-[1.5rem] lg:rounded-b-[2.5rem] lg:rounded-t-none overflow-hidden shadow-2xl">
        {filteredChecklists.map(item => {
          const isEditing = editingId === item._id;
          const isExpanded = expandedId === item._id;
          const monthlyCount = getMonthlyStats(item.history);
          const displayName = truncateTaskName(item.taskName);

          return (
            <div key={item._id} className="border-b border-border last:border-0">
              {/* MAIN ROW */}
              <div 
                className={`flex items-center px-6 py-6 lg:px-10 lg:py-7 gap-4 transition-all ${
                  !isEditing ? 'cursor-pointer' : ''
                } ${isExpanded ? 'bg-primary/[0.03] dark:bg-primary/[0.05]' : 'hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05]'} group`}
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : item._id)}
              >
                
                {isEditing ? (
                  <>
                    {/* EDIT MODE */}
                    <div className="flex-[2]">
                      <input 
                        type="text" 
                        value={editData.taskName} 
                        onChange={(e) => setEditData({...editData, taskName: e.target.value})} 
                        className="w-full bg-background border border-primary text-foreground px-5 py-3 rounded-xl text-sm font-black uppercase tracking-tight outline-none focus:ring-4 focus:ring-primary/10 shadow-inner" 
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="flex-[1.5]">
                      <select 
                        value={editData.doerId} 
                        onChange={(e) => setEditData({...editData, doerId: e.target.value})} 
                        className="w-full bg-background border border-primary text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-tight outline-none cursor-pointer shadow-inner"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="hidden lg:block flex-1 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      {item.frequency}
                    </div>
                    
                    <div className="hidden lg:block flex-1 text-slate-500 dark:text-slate-400 text-xs font-bold">
                      {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}) : 'Not Set'}
                    </div>
                    
                    <div className="hidden lg:block w-16"></div>
                    
                    <div className="flex gap-3 flex-1 justify-end">
                      <button onClick={(e) => handleUpdate(item._id, e)} className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-90">
                        <Save size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl border border-border hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90">
                        <X size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* VIEW MODE */}
                    <div className="flex items-center gap-4 flex-[2] min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                        <CheckCircle2 size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-foreground tracking-tight text-sm lg:text-base uppercase block" title={item.taskName}>
                          {displayName}
                        </span>
                        {item.taskName.length > 30 && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mt-1">
                            Click to view full name
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-3 flex-[1.5] min-w-0">
                      <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center border border-border shadow-inner shrink-0">
                        <User size={12} className="text-primary/60" />
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-tight truncate">
                        {item.doerId?.name || 'Not Assigned'}
                      </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 flex-1">
                      <Clock size={14} className="text-primary/40 shrink-0" />
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{item.frequency}</span>
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
                      <Calendar size={14} className="text-primary/40 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-black tracking-tight truncate">
                        {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}) : 'Not Set'}
                      </span>
                    </div>

                    <div className="hidden lg:flex justify-center w-16 shrink-0">
                      {isExpanded ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-slate-400 group-hover:text-primary transition-colors" />}
                    </div>

                    <div className="flex gap-3 flex-1 justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                      <button onClick={(e) => handleEditClick(item, e)} className="p-3 bg-primary/5 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all active:scale-90 shrink-0">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={(e) => handleDelete(item._id, item.taskName, e)} className="p-3 bg-red-500/5 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shrink-0">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* EXPANDED DETAILS */}
              {isExpanded && !isEditing && (
                <div className="bg-background/80 dark:bg-slate-950/40 p-6 lg:p-10 border-t border-border animate-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                      <h5 className="text-primary font-black text-[10px] uppercase tracking-widest mb-6">Task Information</h5>
                      
                      <div className="bg-card p-6 rounded-3xl border border-border shadow-lg space-y-5">
                        <div className="border-b border-border pb-4">
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest block mb-3">Full Task Name:</span>
                          <span className="text-foreground font-black text-sm uppercase tracking-tight leading-relaxed block">{item.taskName}</span>
                        </div>
                        
                        {item.description && (
                          <div className="border-b border-border pb-4">
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest block mb-2">Description:</span>
                            <p className="text-foreground text-sm leading-relaxed">{item.description}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-between border-b border-border pb-4">
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Assigned To:</span>
                          <span className="text-foreground font-black text-xs uppercase tracking-tight">{item.doerId?.name || 'Not Assigned'}</span>
                        </div>
                        
                        <div className="flex justify-between border-b border-border pb-4">
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Frequency:</span>
                          <span className="text-primary font-black text-xs uppercase tracking-tight">{item.frequency}</span>
                        </div>
                        
                        <div className="flex justify-between border-b border-border pb-4">
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Next Due:</span>
                          <span className="text-foreground font-black text-xs">
                            {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('en-IN', {weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'}) : 'Not Set'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Last Done:</span>
                          <span className="text-foreground font-black text-xs">
                            {item.lastCompleted ? new Date(item.lastCompleted).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : 'Not Done Yet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                      <h5 className="text-primary font-black text-[10px] uppercase tracking-widest mb-6">Performance Stats</h5>
                      
                      <div className="bg-card p-6 rounded-3xl border border-border shadow-lg space-y-5">
                        <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <BarChart3 size={20} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">This Month:</span>
                          </div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black text-2xl tracking-tighter">{monthlyCount}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <Target size={20} className="text-primary" />
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Status:</span>
                          </div>
                          <span className={`font-black text-xs uppercase tracking-widest px-3 py-1 rounded-lg ${
                            item.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {item.status || 'Active'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-slate-400" />
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-widest">Total Records:</span>
                          </div>
                          <span className="text-foreground font-black text-xl tracking-tighter">{item.history?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* EMPTY STATE */}
        {filteredChecklists.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-30 text-center px-6">
            <Search size={80} className="text-primary" />
            <p className="font-black text-[10px] uppercase tracking-[0.5em] text-slate-500 dark:text-slate-400">No tasks match your filters</p>
            <button 
              onClick={() => { setSearchTerm(''); setActiveTab('All'); setSelectedDate(''); }} 
              className="text-primary text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageChecklist;