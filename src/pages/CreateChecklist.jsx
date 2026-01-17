import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronDown,
  Layout
} from 'lucide-react';

/**
 * CREATE CHECKLIST: ROUTINE INITIALIZATION ENGINE v1.3
 * Purpose: Configures automated recurring triggers for personnel-led operations.
 * Logic: Supports dynamic frequency anchors (Daily/Weekly/Monthly/Yearly) and doer-node assignment.
 */
const CreateChecklist = ({ tenantId }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    doerId: '',
    frequency: 'Daily',
    frequencyConfig: {
      dayOfWeek: 0,
      dayOfMonth: 1,
      month: 0,
      interval: 1
    }
  });

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // --- DATA ACQUISITION: ELIGIBLE DOER NODES ---
  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      const res = await API.get(`/superadmin/employees/${currentTenantId}`);
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      
      const filtered = rawData.filter(emp => {
        const roleStr = emp.role || "";
        const rolesArr = Array.isArray(emp.roles) ? emp.roles : [];
        const isDoer = roleStr.toLowerCase() === 'doer' || rolesArr.some(r => r.toLowerCase() === 'doer');
        const isAdmin = roleStr.toLowerCase() === 'admin' || rolesArr.some(r => r.toLowerCase() === 'admin');
        return isDoer || isAdmin;
      });

      setEmployees(filtered);
    } catch (err) {
      console.error("Staff Synchronization Error:", err);
      setEmployees([]); 
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // --- COMMAND: INITIALIZE ROUTINE ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/tasks/create-checklist', {
        ...formData,
        tenantId: currentTenantId
      });
      alert("Routine Handshake Success: Recurring checklist initialized.");
      setFormData({ 
        taskName: '', 
        description: '', 
        doerId: '', 
        frequency: 'Daily',
        frequencyConfig: { dayOfWeek: 0, dayOfMonth: 1, month: 0, interval: 1 }
      });
    } catch (err) {
      alert("Initialization Failure: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Helper for High-Fidelity Labels
  const FormLabel = ({ icon: Icon, text }) => (
    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1 mb-3">
      <Icon size={14} className="text-primary" /> {text}
    </label>
  );

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20 selection:bg-primary/30">
      
      {/* --- EXECUTIVE HEADER --- */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-8 px-2">
        <div className="bg-primary/10 p-4 rounded-[1.5rem] border border-primary/20 shadow-inner">
          <Activity className="text-primary" size={32} />
        </div>
        <div>
          <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">
            Initialize Routine
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">
            Configure automated recurring triggers for personnel-led operations.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card backdrop-blur-xl p-8 md:p-14 rounded-[3.5rem] border border-border shadow-2xl space-y-12 transition-all duration-500">
        
        {/* PROCESS IDENTITY */}
        <div className="space-y-1">
          <FormLabel icon={CheckCircle2} text="Process Designation" />
          <input 
            type="text" 
            required 
            placeholder="e.g. Quality Inspection Delta or Safety Protocol"
            value={formData.taskName} 
            onChange={(e) => setFormData({...formData, taskName: e.target.value})}
            className="w-full bg-background border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-black text-sm uppercase tracking-tight shadow-inner"
          />
        </div>

        {/* AUTHORIZED NODE & TEMPORAL FREQUENCY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-1">
            <FormLabel icon={User} text="Authorized Node (Doer)" />
            <div className="relative group">
              <select 
                required 
                value={formData.doerId} 
                onChange={(e) => setFormData({...formData, doerId: e.target.value})}
                className="w-full bg-background border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer font-black text-sm appearance-none shadow-inner"
              >
                <option value="">Select Personnel</option>
                {Array.isArray(employees) && employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name} — ({emp.department || 'Node'})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors" size={20} />
            </div>
          </div>

          <div className="space-y-1">
            <FormLabel icon={Clock} text="Temporal Frequency" />
            <div className="relative group">
              <select 
                value={formData.frequency} 
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full bg-background border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer font-black text-sm appearance-none shadow-inner"
              >
                <option value="Daily">Daily Execution</option>
                <option value="Weekly">Weekly Cycle</option>
                <option value="Monthly">Monthly Milestone</option>
                <option value="Yearly">Annual Review</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors" size={20} />
            </div>
          </div>
        </div>

        {/* --- DYNAMIC PRECISION SUB-PANEL --- */}
        <div className="relative bg-background/50 p-8 md:p-12 rounded-[3rem] border-2 border-dashed border-border overflow-hidden group/config transition-all duration-500">
          <Settings2 size={180} className="absolute -right-16 -bottom-16 text-primary/5 group-hover/config:rotate-90 group-hover/config:scale-110 transition-transform duration-1000 pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="p-2.5 bg-card rounded-xl shadow-inner border border-border">
                <Info size={18} className="text-primary" />
            </div>
            <h4 className="text-[11px] font-black text-slate-500 dark:text-primary uppercase tracking-[0.3em]">Schedule Precision Logic</h4>
          </div>

          <div className="relative z-10 animate-in fade-in slide-in-from-left-4 duration-500">
            {/* WEEKLY UI */}
            {formData.frequency === 'Weekly' && (
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-1">Recurrence Anchor (Day):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                        <button 
                            key={i}
                            type="button"
                            onClick={() => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfWeek: i}})}
                            className={`px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                formData.frequencyConfig.dayOfWeek === i 
                                ? 'bg-primary text-white dark:text-slate-950 border-primary shadow-xl shadow-primary/20' 
                                : 'bg-card border-border text-slate-400 hover:border-primary/50'
                            }`}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
              </div>
            )}

            {/* MONTHLY UI */}
            {formData.frequency === 'Monthly' && (
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-1">Target Day of Month (01-31):</label>
                <div className="flex items-center gap-6">
                    <input 
                    type="range" min="1" max="31"
                    value={formData.frequencyConfig.dayOfMonth}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                    className="flex-1 accent-primary h-2 bg-background border border-border rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="w-16 h-16 bg-card border-2 border-primary/40 rounded-2xl flex items-center justify-center font-black text-primary text-xl shadow-xl">
                        {formData.frequencyConfig.dayOfMonth.toString().padStart(2, '0')}
                    </div>
                </div>
              </div>
            )}

            {/* YEARLY UI */}
            {formData.frequency === 'Yearly' && (
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-1">Threshold Month</label>
                  <select 
                    value={formData.frequencyConfig.month}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, month: parseInt(e.target.value)}})}
                    className="w-full bg-card border border-border text-foreground px-6 py-5 rounded-2xl outline-none font-black text-sm shadow-sm"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] ml-1">Target Date</label>
                  <input 
                    type="number" placeholder="DD" min="1" max="31"
                    value={formData.frequencyConfig.dayOfMonth}
                    onChange={(e) => setFormData({...formData, frequencyConfig: {...formData.frequencyConfig, dayOfMonth: parseInt(e.target.value)}})}
                    className="w-full bg-card border border-border text-foreground px-6 py-5 rounded-2xl outline-none font-black text-sm shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* DAILY UI */}
            {formData.frequency === 'Daily' && (
              <div className="flex items-start gap-8 p-8 bg-card rounded-[2.5rem] border border-border shadow-sm">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                    <CalendarDays className="text-primary" size={28} />
                </div>
                <div className="space-y-2">
                    <p className="text-base font-black text-foreground uppercase tracking-tight">Active Continuous Deployment</p>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-relaxed opacity-70">
                    This protocol triggers automatically every business day at the primary facility opening sequence defined in the master ledger.
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OPERATIONAL BRIEFING */}
        <div className="space-y-1">
          <FormLabel icon={Layout} text="Operational Briefing" />
          <textarea 
            placeholder="Instructions, safety warnings, or objective context..."
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-bold text-sm shadow-inner min-h-[140px] resize-none"
          />
        </div>

        {/* SUBMISSION COMMAND */}
        <button 
          type="submit" 
          disabled={loading}
          className={`
            group relative w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-4 shadow-2xl
            ${loading 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-border' 
                : 'bg-primary hover:bg-sky-400 text-white dark:text-slate-950 hover:shadow-primary/30 active:scale-[0.98]'
            }
          `}
        >
          {loading ? <RefreshCcw size={22} className="animate-spin" /> : <PlusCircle size={22} className="group-hover:scale-125 transition-transform" />}
          Initialize & Sync Routine
        </button>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>
    </div>
  );
};

export default CreateChecklist;