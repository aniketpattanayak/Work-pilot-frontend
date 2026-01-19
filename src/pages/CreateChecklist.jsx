import React, { useState, useEffect, useCallback, forwardRef } from 'react'; // Added forwardRef
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
  RefreshCcw 
} from 'lucide-react';
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative group cursor-pointer" onClick={onClick} ref={ref}>
    <input
      value={value}
      readOnly
      className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold cursor-pointer placeholder:text-slate-700 shadow-inner"
    />
    <CalendarDays className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-sky-400 transition-colors pointer-events-none" size={18} />
  </div>
));
const CreateChecklist = ({ tenantId }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
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

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures 'employees' is always an array to prevent .filter crashes.
   */
  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      // Switched to centralized API instance
      const res = await API.get(`/superadmin/employees/${currentTenantId}`);
      
      // Safety: Unwrap data if nested, ensure array format
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      
      // Robust filtering logic (Preserved & Enhanced with checks)
      const filtered = rawData.filter(emp => {
        const roleStr = emp.role || "";
        const rolesArr = Array.isArray(emp.roles) ? emp.roles : [];
        
        const isDoer = roleStr.toLowerCase() === 'doer' || 
                       rolesArr.some(r => r.toLowerCase() === 'doer');
        
        const isAdmin = roleStr.toLowerCase() === 'admin' || 
                        rolesArr.some(r => r.toLowerCase() === 'admin');

        return isDoer || isAdmin;
      });

      setEmployees(filtered);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]); // Fallback
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Switched to centralized API instance
      await API.post('/tasks/create-checklist', {
        ...formData,
        tenantId: currentTenantId
      });
      alert("Recurring Checklist Created Successfully!");
      setFormData({ 
        taskName: '', 
        description: '', 
        doerId: '', 
        frequency: 'Daily',
        frequencyConfig: { dayOfWeek: 0, dayOfMonth: 1, month: 0, interval: 1 }
      });
    } catch (err) {
      alert("Failed to create checklist: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="mb-10 flex items-center gap-4">
        <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
          <Activity className="text-sky-400" size={32} />
        </div>
        <div>
          <h2 className="text-white text-3xl font-black tracking-tighter">
            Schedule Factory Routine
          </h2>
          <p className="text-slate-500 text-sm font-medium">Provision recurring tasks with automated triggers and personnel tracking.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-slate-800/60 shadow-2xl space-y-8">
        
        {/* Task Identity */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <CheckCircle2 size={14} className="text-sky-400" /> Task Designation
          </label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Office Sanitation or Safety Drill"
            value={formData.taskName} 
            onChange={(e) => setFormData({...formData, taskName: e.target.value})}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700 font-bold"
          />
        </div>

        {/* Assignment & Primary Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 1. Operational Doer */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <User size={14} className="text-sky-400" /> Operational Doer
            </label>
            <select 
              required 
              value={formData.doerId} 
              onChange={(e) => setFormData({...formData, doerId: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all cursor-pointer font-bold appearance-none"
            >
              <option value="">Select Personnel</option>
              {Array.isArray(employees) && employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name} ({emp.department || 'Staff'})</option>
              ))}
            </select>
          </div>

          {/* 2. Commencement Date (NEW TAILWIND PICKER) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <CalendarDays size={14} className="text-sky-400" /> Commencement Date
            </label>
            <DatePicker
              selected={formData.startDate ? new Date(formData.startDate) : new Date()}
              onChange={(date) => setFormData({...formData, startDate: date.toISOString().split('T')[0]})}
              minDate={new Date()}
              dateFormat="dd MMMM, yyyy"
              customInput={<CustomDateInput />} // Uses our Tailwind component
              calendarClassName="work-pilot-dark-calendar"
            />
          </div>
        </div>

        {/* DYNAMIC CONFIGURATION BOX */}
        <div className="bg-slate-950/60 p-8 rounded-3xl border border-sky-500/20 border-dashed relative overflow-hidden group">
          <Settings2 size={120} className="absolute -right-10 -bottom-10 text-sky-500/5 group-hover:rotate-45 transition-transform duration-1000" />
          
          <h4 className="flex items-center gap-2 text-[11px] font-black text-sky-400 uppercase tracking-[0.2em] mb-6 relative z-10">
            <Info size={16} /> Schedule Precision Settings
          </h4>

          <div className="relative z-10">
            {formData.frequency === 'Weekly' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400">Select Recurrence Day:</label>
                <select 
                  value={formData.frequencyConfig.dayOfWeek}
                  onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfWeek: parseInt(e.target.value)}})}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 transition-all font-bold"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.frequency === 'Monthly' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400">Target Day of Month (1-31):</label>
                <input 
                  type="number" min="1" max="31"
                  value={formData.frequencyConfig.dayOfMonth}
                  onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 transition-all font-bold"
                />
              </div>
            )}

            {formData.frequency === 'Yearly' && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400">Month:</label>
                  <select 
                    value={formData.frequencyConfig.month}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, month: parseInt(e.target.value)}})}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 transition-all font-bold"
                  >
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400">Date:</label>
                  <input 
                    type="number" placeholder="Date" min="1" max="31"
                    value={formData.frequencyConfig.dayOfMonth}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 transition-all font-bold"
                  />
                </div>
              </div>
            )}

            {formData.frequency === 'Daily' && (
              <div className="flex items-start gap-4 p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10">
                <CalendarDays className="text-sky-400 shrink-0" size={20} />
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  Daily Activation Protocol: This task will trigger automatically every working day at the factory opening time configured in <span className="text-sky-400">Foundation Setup</span>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? <RefreshCcw size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          Initialize & Deploy Checklist
        </button>
      </form>
    </div>
  );
};

export default CreateChecklist;