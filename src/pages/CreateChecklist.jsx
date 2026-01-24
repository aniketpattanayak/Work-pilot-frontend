import React, { useState, useEffect, useCallback, forwardRef, useRef } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import API from '../api/axiosConfig';
import { 
  User, PlusCircle, Clock, CheckCircle2, Settings2,
  CalendarDays, Activity, RefreshCcw, AlignLeft,
  Repeat, Search, X, ShieldCheck, Hash, Check
} from 'lucide-react';

/**
 * CREATE CHECKLIST v3.7 (Balanced & Theme-Adaptive)
 * UI: Responds correctly to Light/Dark modes using semantic classes.
 * Logic: Smart look-ahead for Week/Month; Milestone-anchor for Q/H/Y.
 */
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative group cursor-pointer" onClick={onClick} ref={ref}>
    <input
      value={value}
      readOnly
      className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold cursor-pointer shadow-inner text-base"
    />
    <CalendarDays className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none" size={20} />
  </div>
));

const CreateChecklist = ({ tenantId }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
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
      daysOfWeek: [], 
      daysOfMonth: [],
      month: 0
    }
  });

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
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
        return rolesArr.some(r => r.toLowerCase() === 'doer' || r.toLowerCase() === 'admin') ||
               (emp.role || "").toLowerCase() === 'doer' || (emp.role || "").toLowerCase() === 'admin';
      });
      setEmployees(filtered);
    } catch (err) {
      console.error("Staff fetch failure:", err);
    }
  }, [currentTenantId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSelectEmployee = (emp) => {
    setFormData({ ...formData, doerId: emp._id });
    setSearchTerm(emp.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setFormData({ ...formData, doerId: '' });
    setSearchTerm('');
  };

  const toggleDayOfWeek = (dayIndex) => {
    const currentDays = [...formData.frequencyConfig.daysOfWeek];
    const index = currentDays.indexOf(dayIndex);
    if (index > -1) currentDays.splice(index, 1);
    else currentDays.push(dayIndex);
    setFormData({ ...formData, frequencyConfig: { ...formData.frequencyConfig, daysOfWeek: currentDays.sort() } });
  };

  const toggleDateOfMonth = (date) => {
    const currentDates = [...formData.frequencyConfig.daysOfMonth];
    const index = currentDates.indexOf(date);
    if (index > -1) currentDates.splice(index, 1);
    else currentDates.push(date);
    setFormData({ ...formData, frequencyConfig: { ...formData.frequencyConfig, daysOfMonth: currentDates.sort((a,b) => a - b) } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doerId) return alert("Please select a personnel.");
    if (formData.frequency === 'Weekly' && formData.frequencyConfig.daysOfWeek.length === 0) return alert("Select at least one day.");
    if (formData.frequency === 'Monthly' && formData.frequencyConfig.daysOfMonth.length === 0) return alert("Select at least one date.");

    setLoading(true);
    try {
      await API.post('/tasks/create-checklist', { ...formData, tenantId: currentTenantId });
      alert("Success: Master Directive synchronized.");
      setFormData({ 
        taskName: '', description: '', doerId: '', frequency: 'Daily',
        startDate: new Date().toISOString().split('T')[0],
        frequencyConfig: { daysOfWeek: [], daysOfMonth: [], month: 0 }
      });
      setSearchTerm('');
    } catch (err) {
      alert("System Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 selection:bg-primary/30 px-6 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row items-center gap-5">
        <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 shadow-inner shrink-0">
          <Activity className="text-primary" size={32} />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none">Initialize Checklist Task</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 opacity-80">Provision master recurring work schedules for the ledger.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] border border-border shadow-2xl space-y-10">
        
        {/* TASK IDENTITY */}
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">
            <CheckCircle2 size={18} className="text-primary" /> Task Name
          </label>
          <input 
            type="text" required 
            placeholder="e.g. Daily Inventory Synchronization"
            value={formData.taskName} 
            onChange={(e) => setFormData({...formData, taskName: e.target.value})}
            className="w-full bg-background border border-border text-foreground px-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black placeholder:text-slate-500 text-xl shadow-inner"
          />
        </div>

        {/* TASK DESCRIPTION */}
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">
            <AlignLeft size={18} className="text-primary" /> Task Description
          </label>
          <textarea 
            placeholder="Define execution parameters and technical checkpoints..."
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-background border border-border text-foreground px-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold h-36 resize-none shadow-inner text-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* PERSONNEL SEARCH */}
          <div className="space-y-4 relative" ref={dropdownRef}>
            <label className="flex items-center gap-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">
              <User size={18} className="text-primary" /> Doer Name
            </label>
            <div className="relative group">
              <input 
                type="text" placeholder="Search staff database..."
                value={searchTerm} onFocus={() => setShowDropdown(true)}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                className={`w-full bg-background border ${formData.doerId ? 'border-emerald-500/50' : 'border-border'} text-foreground px-14 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-lg shadow-inner`}
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              {searchTerm && <button type="button" onClick={clearSelection} className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>}
            </div>
            {showDropdown && (
              <div className="absolute z-[100] w-full mt-4 bg-card border border-border rounded-3xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2">
                {employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                  <div key={emp._id} onClick={() => handleSelectEmployee(emp)} className="px-8 py-5 hover:bg-primary/10 cursor-pointer border-b border-border/50 last:border-0 flex flex-col transition-all">
                    <span className="text-base font-black text-foreground uppercase">{emp.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{emp.department || 'Operations'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* START DATE */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] ml-1">
              <CalendarDays size={18} className="text-primary" /> Start Date
            </label>
            <DatePicker
              selected={new Date(formData.startDate)}
              onChange={(date) => setFormData({...formData, startDate: date.toISOString().split('T')[0]})}
              minDate={new Date()}
              dateFormat="dd MMMM, yyyy"
              customInput={<CustomDateInput />}
            />
          </div>
        </div>

        {/* FREQUENCY SELECTION */}
        <div className="space-y-6">
          <label className="flex items-center gap-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] ml-1">
            <Repeat size={18} className="text-primary" /> Frequency
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map((freq) => (
              <button
                key={freq} type="button"
                onClick={() => setFormData({...formData, frequency: freq})}
                className={`py-5 rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-sm ${
                  formData.frequency === freq 
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
                    : 'bg-background text-slate-500 border-border hover:border-slate-400'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* DYNAMIC CONFIGURATION TERMINAL */}
        {(formData.frequency === 'Weekly' || formData.frequency === 'Monthly') ? (
            <div className="bg-background/50 p-8 rounded-[2rem] border border-border border-dashed space-y-8 animate-in zoom-in-95">
                <h4 className="flex items-center gap-3 text-xs font-black text-foreground uppercase tracking-[0.3em]">
                    <Settings2 size={18} className="text-primary" /> Multi-Instance Configuration: {formData.frequency}
                </h4>

                {formData.frequency === 'Weekly' && (
                    <div className="flex flex-wrap gap-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                            <button
                                key={day} type="button"
                                onClick={() => toggleDayOfWeek(i)}
                                className={`w-16 h-16 rounded-2xl font-black text-sm uppercase transition-all flex items-center justify-center border-2 ${
                                    formData.frequencyConfig.daysOfWeek.includes(i)
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xl scale-110'
                                    : 'bg-card text-slate-400 border-border hover:border-primary/50'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                )}

                {formData.frequency === 'Monthly' && (
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-3">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                            <button
                                key={date} type="button"
                                onClick={() => toggleDateOfMonth(date)}
                                className={`aspect-square rounded-xl font-black text-xs transition-all flex items-center justify-center border-2 ${
                                    formData.frequencyConfig.daysOfMonth.includes(date)
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xl scale-110'
                                    : 'bg-card text-slate-400 border-border hover:border-primary/50'
                                }`}
                            >
                                {date}
                            </button>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase italic flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" /> Authorized instances will be verified against the Initiation Date.
                </p>
            </div>
        ) : (
            /* MILESTONE ANCHOR INFO */
            <div className="flex items-center gap-8 p-8 bg-background/50 rounded-[2rem] border border-border border-dashed">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner"><Clock className="text-primary" size={28} /></div>
                <div>
                    <p className="text-base font-black text-foreground uppercase tracking-widest mb-1">Anchor Lock Active</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed tracking-wider">
                        Cycle anchored to <span className="text-foreground underline decoration-primary/50">{new Date(formData.startDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'})}</span> with fixed {formData.frequency} intervals.
                    </p>
                </div>
            </div>
        )}

        {/* SUBMIT BUTTON */}
        <button 
          type="submit" disabled={loading}
          className="w-full py-8 rounded-[2rem] bg-primary hover:bg-sky-400 text-primary-foreground font-black text-sm sm:text-base uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-6 active:scale-95 disabled:opacity-50"
        >
          {loading ? <RefreshCcw className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
          create checklist task
        </button>
      </form>
    </div>
  );
};

export default CreateChecklist;