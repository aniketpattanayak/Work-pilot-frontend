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
  X,
  ShieldCheck,
  Check,
  Hash
} from 'lucide-react';

/**
 * CREATE CHECKLIST: RECURRING PROTOCOL PROVISIONING v2.7
 * UI: High-Contrast industrial theme with large dark fonts.
 * LOGIC: Multi-select Week/Month, Single-select Quarterly/Half-Yearly.
 */
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative group cursor-pointer" onClick={onClick} ref={ref}>
    <input
      value={value}
      readOnly
      className="w-full bg-background border-2 border-slate-200 text-slate-950 px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-slate-950 transition-all font-black cursor-pointer shadow-inner"
    />
    <CalendarDays className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-950 transition-colors pointer-events-none" size={20} />
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
      daysOfMonth: [], // For Multi-select (Monthly)
      dayOfMonth: 1,   // For Single-select (Quarterly/Half-Yearly)
      month: 0
    }
  });

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

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
      console.error("Staff fetch failure:", err);
      setEmployees([]);
    }
  }, [currentTenantId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

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
    if (!formData.doerId) return alert("Please map a valid staff member.");
    
    if (formData.frequency === 'Weekly' && formData.frequencyConfig.daysOfWeek.length === 0) {
        return alert("Select at least one day for weekly schedule.");
    }
    if (formData.frequency === 'Monthly' && formData.frequencyConfig.daysOfMonth.length === 0) {
        return alert("Select at least one date for monthly schedule.");
    }

    setLoading(true);
    try {
      await API.post('/tasks/create-checklist', { ...formData, tenantId: currentTenantId });
      alert("Success: Recurring Protocol initialized.");
      setFormData({ 
        taskName: '', description: '', doerId: '', frequency: 'Daily',
        startDate: new Date().toISOString().split('T')[0],
        frequencyConfig: { daysOfWeek: [], daysOfMonth: [], dayOfMonth: 1, month: 0 }
      });
      setSearchTerm('');
    } catch (err) {
      alert("System Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30">
      
      {/* HEADER - UPDATED TEXT */}
      <div className="mb-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl shrink-0">
          <Activity className="text-white" size={36} />
        </div>
        <div className="min-w-0">
          <h2 className="text-slate-950 text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">Initialize Checklist Directive</h2>
          <p className="text-slate-500 text-base font-bold uppercase tracking-widest mt-2 opacity-90">Provision master recurring work schedules for the operational ledger.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-14 rounded-[4rem] border-2 border-slate-200 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] space-y-14">
        
        {/* TASK IDENTITY */}
        <div className="space-y-5">
          <label className="flex items-center gap-3 text-xs font-black text-slate-950 uppercase tracking-[0.4em] ml-1">
            <CheckCircle2 size={18} className="text-primary" /> Task Name
          </label>
          <input 
            type="text" required 
            placeholder="e.g. Master Production Synchronization Log"
            value={formData.taskName} 
            onChange={(e) => setFormData({...formData, taskName: e.target.value})}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-950 px-8 py-6 rounded-[2rem] outline-none focus:border-slate-950 transition-all font-black placeholder:text-slate-400 text-xl shadow-inner"
          />
        </div>

        {/* TECHNICAL BRIEFING */}
        <div className="space-y-5">
          <label className="flex items-center gap-3 text-xs font-black text-slate-950 uppercase tracking-[0.4em] ml-1">
            <AlignLeft size={18} className="text-primary" /> Task Description 
          </label>
          <textarea 
            placeholder="Define mandatory execution parameters and technical checkpoints..."
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-950 px-8 py-6 rounded-[2rem] outline-none focus:border-slate-950 transition-all font-bold h-48 resize-none shadow-inner text-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* PERSONNEL SEARCH */}
          <div className="space-y-5 relative" ref={dropdownRef}>
            <label className="flex items-center gap-3 text-xs font-black text-slate-950 uppercase tracking-[0.4em] ml-1">
              <User size={18} className="text-primary" /> Doer Name
            </label>
            <div className="relative group">
              <input 
                type="text" placeholder="Search staff database..."
                value={searchTerm} onFocus={() => setShowDropdown(true)}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                className={`w-full bg-slate-50 border-2 ${formData.doerId ? 'border-emerald-500' : 'border-slate-200'} text-slate-950 px-14 py-5 rounded-[2rem] outline-none focus:border-slate-950 transition-all font-black text-lg shadow-inner`}
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              {searchTerm && <button type="button" onClick={clearSelection} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>}
            </div>
            {showDropdown && (
              <div className="absolute z-[100] w-full mt-4 bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] max-h-72 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4">
                {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                  <div key={emp._id} onClick={() => handleSelectEmployee(emp)} className="px-10 py-6 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex flex-col transition-all">
                    <span className="text-base font-black text-slate-950 uppercase tracking-tight">{emp.name}</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{emp.department || 'Operations'}</span>
                  </div>
                )) : <div className="px-10 py-12 text-center text-slate-400 text-sm font-black uppercase tracking-widest">Personnel Registry Empty</div>}
              </div>
            )}
          </div>

          {/* START DATE */}
          <div className="space-y-5">
            <label className="flex items-center gap-3 text-xs font-black text-slate-950 uppercase tracking-[0.4em] ml-1">
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
        <div className="space-y-8">
          <label className="flex items-center gap-3 text-xs font-black text-slate-950 uppercase tracking-[0.4em] ml-1">
            <Repeat size={18} className="text-primary" /> Frequency
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map((freq) => (
              <button
                key={freq} type="button"
                onClick={() => setFormData({...formData, frequency: freq})}
                className={`py-6 rounded-[1.8rem] border-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  formData.frequency === freq ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-950 hover:text-slate-950'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* DYNAMIC TUNING TERMINAL */}
        <div className="bg-slate-50 p-10 sm:p-16 rounded-[4rem] border-2 border-slate-200 border-dashed relative overflow-hidden transition-all">
          <h4 className="flex items-center gap-4 text-xs font-black text-slate-950 uppercase tracking-[0.4em] mb-14 relative z-10">
            <Settings2 size={24} className="text-primary" /> Frequency Configuration: {formData.frequency}
          </h4>

          <div className="relative z-10">
            {/* WEEKLY MULTI-SELECT */}
            {formData.frequency === 'Weekly' && (
              <div className="space-y-10">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Map Operational Days (Multi-Selection Authorized):</label>
                <div className="flex flex-wrap gap-5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <button
                      key={day} type="button"
                      onClick={() => toggleDayOfWeek(i)}
                      className={`w-20 h-20 rounded-[1.5rem] font-black text-base uppercase transition-all flex items-center justify-center border-2 ${
                        formData.frequencyConfig.daysOfWeek.includes(i)
                        ? 'bg-slate-950 text-white border-slate-950 shadow-2xl scale-110'
                        : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MONTHLY MULTI-SELECT */}
            {formData.frequency === 'Monthly' && (
              <div className="space-y-10">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Map Calendar Dates (Multi-Selection Authorized):</label>
                <div className="grid grid-cols-7 sm:grid-cols-10 gap-3">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                    <button
                      key={date} type="button"
                      onClick={() => toggleDateOfMonth(date)}
                      className={`aspect-square rounded-[1.2rem] font-black text-sm transition-all flex items-center justify-center border-2 ${
                        formData.frequencyConfig.daysOfMonth.includes(date)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-110'
                        : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QUARTERLY / HALF-YEARLY: RESTORED SINGLE INPUT */}
            {['Quarterly', 'Half-Yearly'].includes(formData.frequency) && (
              <div className="space-y-10">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Iteration Execution Point (Day 1-31):</label>
                <div className="relative group">
                    <input 
                    type="number" min="1" max="31"
                    value={formData.frequencyConfig.dayOfMonth}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                    className="w-full bg-white border-2 border-slate-200 text-slate-950 px-10 py-7 rounded-[2rem] outline-none focus:border-slate-950 transition-all font-black text-2xl shadow-inner"
                    />
                    <Hash size={24} className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-200 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase italic">* System will trigger a mission on this date every {formData.frequency.toLowerCase()} interval.</p>
              </div>
            )}

            {formData.frequency === 'Daily' && (
              <div className="flex items-center gap-8 p-10 bg-white rounded-[3rem] border-2 border-slate-200 shadow-sm">
                <div className="p-6 bg-emerald-500/10 rounded-[2rem]"><Clock className="text-emerald-600" size={40} /></div>
                <p className="text-sm font-black text-slate-700 uppercase leading-relaxed tracking-widest">Active Daily Synchronization Node engaged.</p>
              </div>
            )}

            {formData.frequency === 'Yearly' && (
              <div className="flex flex-col sm:flex-row gap-10">
                <div className="flex-1 space-y-5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Registry Audit Month:</label>
                  <select 
                    value={formData.frequencyConfig.month}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, month: parseInt(e.target.value)}})}
                    className="w-full bg-white border-2 border-slate-200 text-slate-950 px-8 py-6 rounded-[2rem] outline-none font-black uppercase text-base appearance-none cursor-pointer"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Audit Calendar Date:</label>
                  <input 
                    type="number" min="1" max="31"
                    value={formData.frequencyConfig.dayOfMonth}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                    className="w-full bg-white border-2 border-slate-200 text-slate-950 px-8 py-6 rounded-[2rem] outline-none font-black text-xl shadow-inner"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EXECUTION HANDSHAKE */}
        <button 
          type="submit" disabled={loading}
          className="w-full py-10 rounded-[3rem] bg-slate-950 hover:bg-black text-white font-black text-sm sm:text-base uppercase tracking-[0.5em] shadow-[0_30px_70px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-8 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <RefreshCcw className="animate-spin" size={32} /> : <ShieldCheck size={32} />}
          Create Checklist task
        </button>
      </form>
    </div>
  );
};

export default CreateChecklist;