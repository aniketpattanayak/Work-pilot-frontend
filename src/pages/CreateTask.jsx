import React, { useState, useEffect, useCallback, forwardRef, useRef } from "react";
import API from '../api/axiosConfig'; 
import { dialog } from '../components/Dialog';
import { useUploadLimit, checkFiles, uploadHint } from '../utils/uploadLimit';
import DynamicFieldRenderer from '../components/DynamicFieldRenderer';
import useCustomFields from '../hooks/useCustomFields';
import useCompanySettings from '../hooks/useCompanySettings';
import DatePicker from "react-datepicker"; 
import "react-datepicker/dist/react-datepicker.css"; 
import {
  Paperclip,
  X,
  PlusCircle,
  User,
  Users, 
  ShieldCheck,
  Calendar,
  FileText,
  RefreshCcw,
  AlertCircle,
  Flag,
  CalendarDays,
  ChevronRight,
  Search,
  UserCheck
} from "lucide-react";

const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative group cursor-pointer" onClick={onClick} ref={ref}>
    <input
      value={value}
      readOnly
      placeholder="Select Deadline Date"
      className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold cursor-pointer placeholder:text-slate-500 shadow-inner"
    />
    <CalendarDays className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors pointer-events-none" size={18} />
  </div>
));

const CreateTask = ({ tenantId, assignerId, employees: initialEmployees, onSuccess, hideHeader = false }) => {
  const [task, setTask] = useState({
    title: "",
    description: "",
    doerId: "",
    coordinatorId: "",
    priority: "Medium",
    deadline: null, 
    isRevisionAllowed: true,
    followersCanChangeDate: true,
    maxExtensionDays: "3",
    coworkers: [],
  });

  const [doerSearch, setDoerSearch] = useState('');
  const [followerSearch, setFollowerSearch] = useState('');
  const [showDoerDropdown, setShowDoerDropdown] = useState(false);
  const doerDropdownRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const { fields: customFieldDefs } = useCustomFields('delegation'); // company-defined extra fields (empty = form unchanged)
  const [customValues, setCustomValues] = useState({});
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [loading, setLoading] = useState(!initialEmployees || initialEmployees.length === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHelpers, setSelectedHelpers] = useState([]);
  const { isOn: companyAllows } = useCompanySettings();
  const followersMayChange = companyAllows('dates_followersChange');

  const currentTenantId = tenantId || localStorage.getItem("tenantId");
  const sessionUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentAssignerId = assignerId || sessionUser?._id || sessionUser?.id;

  // Working hours — loaded from settings (used only for the optional
  // "set to office closing time" quick-pick below; the deadline's own
  // default time is 11:59 PM, not this).
  const [closeHour, setCloseHour] = useState(18); // default 6:00 PM
  const [holidayList, setHolidayList] = useState([]);
  // Deadline time: defaults to 11:59 PM of whatever date is picked; the
  // assigner can change it, and it's shown wherever the deadline is shown.
  const [deadlineTime, setDeadlineTime] = useState('23:59');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (doerDropdownRef.current && !doerDropdownRef.current.contains(event.target)) {
        setShowDoerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/settings/${currentTenantId}`);
      const data = res.data?.settings || res.data;
      if (data) {
        setHolidayList(Array.isArray(data.holidays) ? data.holidays : []);
        // Read office closing hour for auto-deadline
        if (data.workingHours?.close !== undefined) {
          setCloseHour(Number(data.workingHours.close));
        }
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
  const holidayMap = {};
  holidayList.forEach(h => {
    const key = new Date(h.date).toDateString();
    holidayMap[key] = h.name;
  });

  const isDisabledDate = (date) =>
    holidayDates.some(h => h.toDateString() === date.toDateString());

  // When a date is picked, apply the current deadline time (11:59 PM by
  // default, or whatever the assigner has set it to).
  const applyDeadlineTime = (date, timeStr) => {
    const [h, m] = (timeStr || '23:59').split(':').map(Number);
    const d = new Date(date);
    d.setHours(Number.isFinite(h) ? h : 23, Number.isFinite(m) ? m : 59, 0, 0);
    return d;
  };

  const handleDateChange = (date) => {
    if (!date) {
      setTask({ ...task, deadline: null });
      return;
    }
    setTask({ ...task, deadline: applyDeadlineTime(date, deadlineTime) });
  };

  const handleTimeChange = (timeStr) => {
    setDeadlineTime(timeStr);
    if (task.deadline) {
      setTask({ ...task, deadline: applyDeadlineTime(task.deadline, timeStr) });
    }
  };

  const applyOfficeClosingTime = () => {
    const t = `${String(closeHour).padStart(2, '0')}:00`;
    handleTimeChange(t);
  };

  const fetchMyTeam = useCallback(async () => {
    if (!currentAssignerId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/authorized-staff/${currentAssignerId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.doers || res.data?.data || []);
      setEmployees(data);
    } catch (err) {
      console.error("Error loading team:", err);
      setEmployees([]); 
    } finally {
      setLoading(false);
    }
  }, [currentAssignerId]);

  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
      setLoading(false);
    } else {
      fetchMyTeam();
    }
  }, [currentAssignerId, initialEmployees, fetchMyTeam]);

  const filteredDoers = employees.filter(emp => 
    (emp.name || "").toLowerCase().includes(doerSearch.toLowerCase())
  );

  const filteredFollowers = employees.filter(emp => 
    emp._id !== task.doerId && 
    (emp.name || "").toLowerCase().includes(followerSearch.toLowerCase())
  );

  const handleSelectDoer = (emp) => {
    setTask({ ...task, doerId: emp._id });
    setDoerSearch(emp.name);
    setShowDoerDropdown(false);
  };

  const maxFileMb = useUploadLimit();
  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    const { ok, problems } = checkFiles(picked, maxFileMb);
    if (problems.length) dialog.alert(problems.join('\n'), { tone: 'error', title: 'File not added' });
    setSelectedFiles([...selectedFiles, ...ok]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.doerId) return dialog.alert("Please search and select who the task is assigned to.", { tone: 'error' });
    if (!task.deadline) return dialog.alert("Please select a completion deadline.", { tone: 'error' });
    const extDays = Number(task.maxExtensionDays);
    if (task.isRevisionAllowed && (!Number.isInteger(extDays) || extDays < 1 || extDays > 90)) {
      return dialog.alert("Deadline change is allowed, so please enter how many days the doer may extend (1 to 90).", { tone: 'error', title: 'Extension days' });
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("tenantId", currentTenantId);
    formData.append("assignerId", currentAssignerId);
    formData.append("title", task.title);
    formData.append("description", task.description);
    formData.append("doerId", task.doerId);
    formData.append("priority", task.priority);
    formData.append("deadline", task.deadline.toISOString()); 
    formData.append("isRevisionAllowed", task.isRevisionAllowed);
    formData.append("followersCanChangeDate", task.followersCanChangeDate !== false);
    formData.append("maxExtensionDays", task.isRevisionAllowed ? String(Number(task.maxExtensionDays)) : "0");
    formData.append("helperDoers", JSON.stringify(selectedHelpers));
    if (task.coordinatorId) formData.append("coordinatorId", task.coordinatorId);
    selectedFiles.forEach((file) => formData.append("taskFiles", file));
    if (customFieldDefs.length > 0) formData.append("customFields", JSON.stringify(customValues));

    try {
      await API.post("/tasks/create-task", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      dialog.alert("The task was assigned.", { tone: 'success' });
      setTask({ title: "", description: "", doerId: "", coordinatorId: "", priority: "Medium", deadline: null, isRevisionAllowed: true, followersCanChangeDate: true, maxExtensionDays: "3", coworkers: [] });
      setSelectedFiles([]);
      setCustomValues({});
      setSelectedHelpers([]);
      setDoerSearch('');
      setFollowerSearch('');
      if (onSuccess) onSuccess();
    } catch (err) {
      dialog.alert(err.response?.data?.message || "The task could not be created. Please try again.", { tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-6 bg-transparent">
      <RefreshCcw className="animate-spin text-primary" size={40} />
      <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Syncing Personnel...</p>
    </div>
  );

  return (
    <div className="w-full px-1 py-3">
      <div className="max-w-0.5xl mx-auto">
        <div className="bg-card/80 backdrop-blur border border-border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 sm:p-8">

          {/* HEADER */}
          {!hideHeader && (
            <div className="mb-6 border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-foreground">Create New Delegation Task</h2>
              <p className="text-sm text-slate-500 mt-1">Assign work and track progress</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* TITLE + PRIORITY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative group">
                <label className="text-sm font-medium text-slate-600">Title</label>
                <input
                  type="text"
                  required
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  className="peer w-full px-4 pt-3 pb-2 rounded-lg border border-border bg-background/70 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="Enter Title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => setTask({ ...task, priority: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background/70 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="relative">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                value={task.description}
                onChange={(e) => setTask({ ...task, description: e.target.value })}
                className="peer w-full px-4 pt-5 pb-2 rounded-lg border border-border bg-background/70 text-sm min-h-[110px] focus:ring-2 focus:ring-primary/30 outline-none"
                placeholder="Enter Description"
              />
            </div>

            {/* COMPANY-DEFINED EXTRA FIELDS (renders nothing when the company has none) */}
            <DynamicFieldRenderer
              variant="plain"
              fields={customFieldDefs}
              values={customValues}
              requireOnCreate
              onChange={(name, value) => setCustomValues((v) => ({ ...v, [name]: value }))}
            />

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-5">

                {/* ASSIGN */}
                <div ref={doerDropdownRef} className="relative">
                  <label className="text-sm font-medium text-slate-600">Assign To</label>
                  <input
                    type="text"
                    value={doerSearch}
                    onFocus={() => setShowDoerDropdown(true)}
                    onChange={(e) => { setDoerSearch(e.target.value); setShowDoerDropdown(true); }}
                    placeholder="Search user"
                    className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background/70 text-sm focus:ring-2 focus:ring-primary/30"
                  />
                  {showDoerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-md max-h-50 overflow-y-auto">
                      {filteredDoers.map(emp => (
                        <div key={emp._id} onClick={() => handleSelectDoer(emp)}
                          className="px-4 py-2 text-sm hover:bg-primary/10 cursor-pointer">
                          {emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DEADLINE — date + time; defaults to 11:59 PM of the picked date */}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Deadline
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      (defaults to 11:59 PM — change the time below if needed)
                    </span>
                  </label>

                  <div className="flex gap-2 items-start mt-1">
                    <DatePicker
                      selected={task.deadline}
                      onChange={handleDateChange}
                      dateFormat="dd MMM yyyy"
                      placeholderText="Select deadline date"
                      minDate={new Date()}
                      isClearable
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      scrollableYearDropdown
                      yearDropdownItemNumber={10}
                      filterDate={(date) => !isDisabledDate(date)}
                      dayClassName={(date) => {
                        const key = date.toDateString();
                        return holidayMap[key] ? "holiday-day" : "";
                      }}
                      renderDayContents={(day, date) => {
                        const key = date.toDateString();
                        const holidayName = holidayMap[key];
                        return <span title={holidayName || ""}>{day}</span>;
                      }}
                      className="flex-1 w-full px-4 py-2.5 rounded-lg border border-border bg-background/70 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      aria-label="Deadline time"
                      className="w-32 px-3 py-2.5 rounded-lg border border-border bg-background/70 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyOfficeClosingTime}
                    className="mt-1.5 text-[11px] text-primary hover:underline"
                  >
                    Use office closing time ({closeHour > 12 ? `${closeHour - 12}:00 PM` : `${closeHour}:00 AM`}) instead
                  </button>

                  {/* Show the full selected date + time clearly */}
                  {task.deadline && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <CalendarDays size={11} />
                      Deadline set to:{" "}
                      <span className="font-semibold text-foreground">
                        {task.deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{" "}
                        at {task.deadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  )}
                </div>

                {/* FILE */}
                <div>
                  <label className="text-sm font-medium text-slate-600">Attachments</label>
                  <div className="mt-1 relative border border-dashed border-border rounded-lg p-4 text-center bg-background/50 hover:bg-primary/5 hover:border-primary/50 transition cursor-pointer group">
                    <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <p className="text-sm text-slate-500 group-hover:text-primary transition">Click to upload files</p>
                    <p className="text-xs text-slate-400">{uploadHint(maxFileMb)}</p>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1 text-xs bg-background border border-border rounded-md">
                          {f.name}
                          <button type="button" onClick={() => removeFile(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* FOLLOWERS */}
              <div className="lg:col-span-2 flex flex-col">
                <label className="text-sm font-medium text-slate-600">Followers</label>
                {selectedHelpers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedHelpers.map((h) => (
                      <div key={h.helperId} className="flex items-center gap-2 px-3 py-1 text-xs bg-primary/10 text-primary rounded-full">
                        {h.name}
                        <button type="button" onClick={() => setSelectedHelpers(selectedHelpers.filter(x => x.helperId !== h.helperId))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={followerSearch}
                  onChange={(e) => setFollowerSearch(e.target.value)}
                  placeholder="Search followers"
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-border text-sm bg-background/70 focus:ring-2 focus:ring-primary/30"
                />
                <div className="mt-2 h-40 overflow-y-auto border border-border rounded-lg p-1 space-y-1 custom-scrollbar">
                  {filteredFollowers.map((emp) => (
                    <label key={emp._id} className="flex justify-between items-center px-3 py-2 text-sm hover:bg-primary/5 cursor-pointer rounded-md transition">
                      <span>{emp.name}</span>
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selectedHelpers.some(h => h.helperId === emp._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHelpers([...selectedHelpers, { helperId: emp._id, name: emp.name }]);
                          } else {
                            setSelectedHelpers(selectedHelpers.filter(h => h.helperId !== emp._id));
                          }
                        }}
                      />
                    </label>
                  ))}
                </div>
                {selectedHelpers.length > 0 && followersMayChange && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-600" title="If ticked, followers can move the deadline. If not, they must ask you first.">
                    <input type="checkbox" className="accent-primary" checked={task.followersCanChangeDate !== false} onChange={(e) => setTask({ ...task, followersCanChangeDate: e.target.checked })} />
                    Followers can change the date
                  </label>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <label className="flex items-center gap-2 text-xl text-slate-600">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={task.isRevisionAllowed}
                  onChange={(e) => setTask({ ...task, isRevisionAllowed: e.target.checked })}
                />
                Allow deadline change
              </label>
              {task.isRevisionAllowed && (
                <label className="flex items-center gap-2 text-sm text-slate-600" title="After the deadline you chose, the doer can move it by up to this many days">
                  Extend up to
                  <input
                    type="number" min="1" max="90" step="1"
                    value={task.maxExtensionDays}
                    onChange={(e) => setTask({ ...task, maxExtensionDays: e.target.value })}
                    className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-center font-bold text-foreground"
                  />
                  day(s)
                </label>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
              >
                {isSubmitting ? "Creating..." : "Create Task"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTask;