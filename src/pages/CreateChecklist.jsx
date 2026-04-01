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

const CreateChecklist = ({ tenantId, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedEmployee, setSelectedEmployee] = useState(null);



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


  const [holidayList, setHolidayList] = useState([]);


  const fetchSettings = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      const res = await API.get(`/superadmin/settings/${currentTenantId}`);
      const data = res.data?.settings || res.data;
      
      if (data) {
        setHolidayList(Array.isArray(data.holidays) ? data.holidays : []);
      }
    } catch (err) {
      console.error("Fetch failure:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);


  const holidayDates = holidayList.map(h => new Date(h.date));

// 🔥 Map for quick lookup (for tooltip)
const holidayMap = {};
holidayList.forEach(h => {
  const key = new Date(h.date).toDateString();
  holidayMap[key] = h.name;
});


const isHoliday = (date) =>
  holidayDates.some(
    h => h.toDateString() === date.toDateString()
  );

const isDisabledDate = (date) =>
  isHoliday(date) ||
  (selectedEmployee && !selectedEmployee.workOnSunday && isSunday(date));



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



    setSelectedEmployee(emp);



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
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("System Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
{/*


  useEffect(() => {
  if (selectedEmployee && !selectedEmployee.workOnSunday) {
    setFormData(prev => ({
      ...prev,
      frequencyConfig: {
        ...prev.frequencyConfig,
        daysOfWeek: prev.frequencyConfig.daysOfWeek.filter(d => d !== 0)
      }
    }));
  }
}, [selectedEmployee]);

*/}

  return (
 <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 animate-in fade-in duration-700 selection:bg-primary/30">

  {/* HEADER */}
  <div className="mb-8 flex items-center gap-5">
    <div>
      <h2 className="text-foreground text-2xl md:text-3xl font-black uppercase leading-none ">
        Create Checklist Task
      </h2>
    </div>
  </div>

  <form onSubmit={handleSubmit} className="bg-card p-6 sm:p-8 lg:p-10 rounded-[2rem] border border-border shadow-2xl">

    {/* 🔥 GRID LAYOUT */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

      {/* ================= LEFT ================= */}
      <div className="space-y-6">

        {/* TASK NAME */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Task Name
          </label>
          <input
            type="text"
            required
            value={formData.taskName}
            onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
            className="w-full bg-background border border-border px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold text-base"
            placeholder="Enter Task Name"
          />
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-background border border-border px-4 py-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold h-28 resize-none"
            placeholder="Task Description"
          />
        </div>

        {/* DOER */}
        <div className="space-y-2 relative" ref={dropdownRef}>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Assign To
          </label>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              className={`w-full bg-background border ${formData.doerId ? 'border-emerald-500/50' : 'border-border'} px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold`}
              placeholder="    Search employee..."
            />
            {/*<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />*/}

            {searchTerm && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
              {employees
                .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(emp => (
                  <div
                    key={emp._id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border/50"
                  >
                    <p className="font-bold">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.department}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

      </div>

      {/* ================= RIGHT ================= */}
      <div className="space-y-6">

        {/* START DATE */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Start Date:  <t></t>
          </label>
          <DatePicker
  selected={new Date(formData.startDate)}
  onChange={(date) =>
    setFormData({ ...formData, startDate: date.toISOString().split('T')[0] })
  }
  minDate={new Date()}
  dateFormat="dd MMM yyyy"
  showYearDropdown
  showMonthDropdown
  dropdownMode="select"
  customInput={<CustomDateInput />}

   filterDate={(date) => !isDisabledDate(date)}
   highlightDates={[
  {
    "react-datepicker__day--holiday": holidayDates
  }
  ]}
  dayClassName={(date) => {
    const key = date.toDateString();

    if (holidayMap[key]) {
      return "holiday-day";
    }

    return "";
  }}
  renderDayContents={(day, date) => {
    const key = date.toDateString();
    const holidayName = holidayMap[key];

    return (
      <span title={holidayName || ""}>
        {day}
      </span>
    );
  }}

/>
        </div>

        {/* FREQUENCY */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Frequency
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setFormData({ ...formData, frequency: freq })}
                className={`py-3 rounded-xl text-xs font-black uppercase border transition-all ${
                  formData.frequency === freq
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border text-slate-500'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* 🔥 DYNAMIC CONFIG */}
        {(formData.frequency === 'Weekly' || formData.frequency === 'Monthly') ? (
          <div className="bg-background p-4 rounded-xl border border-border space-y-4">

           {/* {formData.frequency === 'Weekly' && (
              <div className="flex flex-wrap gap-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDayOfWeek(i)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                      formData.frequencyConfig.daysOfWeek.includes(i)
                        ? 'bg-primary text-white'
                        : 'bg-card border-border'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}*/}


            {formData.frequency === 'Weekly' && (
              <div className="flex flex-wrap gap-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => {
  const isSunday = i === 0;
  const isDisabled = isSunday && selectedEmployee && !selectedEmployee.workOnSunday;

  return (
    <button
      key={day}
      type="button"
      disabled={isDisabled} // ✅ disable click
      onClick={() => !isDisabled && toggleDayOfWeek(i)}
      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all
        ${formData.frequencyConfig.daysOfWeek.includes(i)
          ? 'bg-primary text-white'
          : 'bg-card border-border'}
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      {day}
    </button>
  );
})}
              </div>
            )}


            {formData.frequency === 'Monthly' && (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggleDateOfMonth(date)}
                    className={`text-xs p-2 rounded-lg border ${
                      formData.frequencyConfig.daysOfMonth.includes(date)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-card border-border'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            )}

          </div>
        ) : (
          <div className="bg-background p-4 rounded-xl border border-border text-xs font-bold text-slate-500">
            Start Date {" "}
            <span className="text-foreground">
              {new Date(formData.startDate).toLocaleDateString()}
            </span>
          </div>
        )}

      </div>

    </div>

    {/* SUBMIT */}
    <button
      type="submit"
      disabled={loading}
      className="w-full mt-10 py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-widest flex items-center justify-center gap-3"
    >
      {loading ? <RefreshCcw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
      Create Task
    </button>

  </form>
</div>
  );
};

export default CreateChecklist;