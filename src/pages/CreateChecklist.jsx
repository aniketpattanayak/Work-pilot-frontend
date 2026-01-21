import React, { useState, useEffect, useCallback, forwardRef, useRef } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import API from '../api/axiosConfig';
import { 
  Calendar, 
  User, 
  PlusCircle, 
  Info, 
  Clock, 
  CheckCircle2, 
  Settings2,
  CalendarDays,
  Activity,
  RefreshCcw,
  AlignLeft,
  Repeat,
  ChevronRight,
  Search,
  X
} from 'lucide-react';

/**
 * CREATE CHECKLIST: RECURRING PROTOCOL PROVISIONING v1.8
 * UPDATED: Real-time Searchable Doer Selection.
 * UI: Fully responsive and theme-adaptive (Light/Dark).
 */
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative group cursor-pointer" onClick={onClick} ref={ref}>
    <input
      value={value}
      readOnly
      className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold cursor-pointer placeholder:text-slate-500 shadow-inner"
    />
    <CalendarDays className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none" size={18} />
  </div>
));

const CreateChecklist = ({ tenantId }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    doerId: '',
    frequency: 'Daily',
    startDate: new Date().toISOString().split('T')[0],
    frequencyConfig: {
      dayOfWeek: 0,
      dayOfMonth: 1,
      month: 0,
      interval: 1
    }
  });

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      const res = await API.get(`/superadmin/employees/${currentTenantId}`);
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      
      const filtered = rawData.filter(emp => {
        const rolesArr = Array.isArray(emp.roles) ? emp.roles : [];
        const roleStr = emp.role || "";
        return rolesArr.some(r => r.toLowerCase() === 'doer' || r.toLowerCase() === 'admin') ||
               roleStr.toLowerCase() === 'doer' || roleStr.toLowerCase() === 'admin';
      });

      setEmployees(filtered);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectEmployee = (emp) => {
    setFormData({ ...formData, doerId: emp._id });
    setSearchTerm(emp.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setFormData({ ...formData, doerId: '' });
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doerId) return alert("Please search and select a valid staff member.");
    
    setLoading(true);
    try {
      await API.post('/tasks/create-checklist', {
        ...formData,
        tenantId: currentTenantId
      });
      alert("Success: Routine Checklist provisioned successfully.");
      setFormData({ 
        taskName: '', 
        description: '', 
        doerId: '', 
        frequency: 'Daily',
        startDate: new Date().toISOString().split('T')[0],
        frequencyConfig: { dayOfWeek: 0, dayOfMonth: 1, month: 0, interval: 1 }
      });
      setSearchTerm('');
    } catch (err) {
      alert("Protocol Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
        <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
          <Activity className="text-primary" size={32} />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Add Checklist Task</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Assign automated tasks to your team with smart search.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-border shadow-2xl space-y-8 transition-colors duration-500">
        
        {/* Task Name */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <CheckCircle2 size={14} className="text-primary" /> Task Title
          </label>
          <input 
            type="text" required 
            placeholder="e.g. Daily Inventory Synchronization"
            value={formData.taskName} 
            onChange={(e) => setFormData({...formData, taskName: e.target.value})}
            className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-500 shadow-inner"
          />
        </div>

        {/* Task Description */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <AlignLeft size={14} className="text-primary" /> Task Details 
          </label>
          <textarea 
            placeholder="Explain what needs to be done..."
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold h-32 resize-none shadow-inner placeholder:text-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* SEARCHABLE DOER SELECTION */}
          <div className="space-y-3 relative" ref={dropdownRef}>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
              <User size={14} className="text-primary" /> Search & Select Doer
            </label>
            <div className="relative group">
              <input 
                type="text"
                placeholder="Type name to search..."
                value={searchTerm}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                className={`w-full bg-background border ${formData.doerId ? 'border-emerald-500/50' : 'border-border'} text-foreground px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-500 shadow-inner`}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors" size={18} />
              
              {searchTerm && (
                <button 
                  type="button"
                  onClick={clearSelection}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute z-[100] w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => (
                    <div 
                      key={emp._id}
                      onClick={() => handleSelectEmployee(emp)}
                      className="px-6 py-4 hover:bg-primary/10 cursor-pointer border-b border-border/50 last:border-0 flex flex-col transition-colors"
                    >
                      <span className="text-sm font-black text-foreground uppercase tracking-tight">{emp.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{emp.department || 'General Sector'}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                    No matching staff found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Date Protocol */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
              <CalendarDays size={14} className="text-primary" /> Start Date
            </label>
            <DatePicker
              selected={new Date(formData.startDate)}
              onChange={(date) => setFormData({...formData, startDate: date.toISOString().split('T')[0]})}
              minDate={new Date()}
              dateFormat="dd MMMM, yyyy"
              customInput={<CustomDateInput />}
              calendarClassName="work-pilot-dark-calendar"
            />
          </div>
        </div>

        {/* Frequency Logic */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">
            <Repeat size={14} className="text-primary" /> Frequency
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map((freq) => (
              <button
                key={freq} type="button"
                onClick={() => setFormData({...formData, frequency: freq})}
                className={`py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm ${
                  formData.frequency === freq 
                  ? 'bg-primary text-white dark:text-slate-950 border-primary shadow-primary/20' 
                  : 'bg-background text-slate-400 border-border hover:border-slate-400'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* DYNAMIC CONFIGURATION TERMINAL */}
        <div className="bg-background/80 p-6 sm:p-8 rounded-[2rem] border border-border border-dashed relative overflow-hidden group">
          <Settings2 size={140} className="absolute -right-12 -bottom-12 text-primary opacity-[0.03] group-hover:rotate-45 transition-transform duration-1000 pointer-events-none" />
          
          <h4 className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-8 relative z-10">
            <Info size={18} /> Schedule setting for: {formData.frequency}
          </h4>

          <div className="relative z-10">
            {formData.frequency === 'Weekly' && (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Operational Day:</label>
                <div className="relative">
                  <select 
                    value={formData.frequencyConfig.dayOfWeek}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfWeek: parseInt(e.target.value)}})}
                    className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black uppercase text-xs appearance-none cursor-pointer"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18} />
                </div>
              </div>
            )}

            {['Monthly', 'Quarterly', 'Half-Yearly'].includes(formData.frequency) && (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Iteration Checkpoint (1-31):</label>
                <input 
                  type="number" min="1" max="31"
                  value={formData.frequencyConfig.dayOfMonth}
                  onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                  className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm shadow-inner"
                />
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 ml-1 italic">
                  * Task will trigger on this day every {formData.frequency.toLowerCase()} interval.
                </p>
              </div>
            )}

            {formData.frequency === 'Daily' && (
              <div className="flex items-center gap-5 p-5 bg-primary/5 rounded-2xl border border-primary/10 shadow-inner">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Clock className="text-primary shrink-0" size={24} />
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                  This task will reset everyday. A staff will see it as soon as the factory opens.
                </p>
              </div>
            )}

            {formData.frequency === 'Yearly' && (
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Month Selector:</label>
                  <div className="relative">
                    <select 
                      value={formData.frequencyConfig.month}
                      onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, month: parseInt(e.target.value)}})}
                      className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black uppercase text-xs appearance-none cursor-pointer"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Calendar Day:</label>
                  <input 
                    type="number" min="1" max="31"
                    value={formData.frequencyConfig.dayOfMonth}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                    className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm shadow-inner"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EXECUTION HANDSHAKE */}
        <button 
          type="submit" disabled={loading}
          className="w-full py-6 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white dark:text-slate-950 font-black text-xs sm:text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
        >
          {loading ? <RefreshCcw className="animate-spin" size={20} /> : <PlusCircle size={20} />}
          Save Routine work
        </button>
      </form>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
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

export default CreateChecklist;