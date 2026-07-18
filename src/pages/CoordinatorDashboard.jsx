import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import API from '../api/axiosConfig';
import { 
  ShieldCheck, Send, CheckCircle2, Clock, User, UserCheck, AlertCircle,
  RefreshCcw, MessageCircle, Zap, X, Phone, MessageSquare, Layers,
  ChevronRight, ClipboardList, Target, Calendar, Upload,
  ChevronDown, ChevronUp, Search, UserPlus
} from "lucide-react";

const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending'); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [tenantSettings, setTenantSettings] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkSelected, setBulkSelected] = useState({});
  const [bulkSubmitting, setBulkSubmitting] = useState({});
  const backlogRefs = useRef({});
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSendingWA, setIsSendingWA] = useState(false);

  const savedUser = JSON.parse(localStorage.getItem('user'));
  const tenantId = localStorage.getItem('tenantId') || tenantId;
  const coordinatorId = propCoordId || savedUser?._id || savedUser?.id;

  const toLockPattern = (input) => {
    if (!input) return "";
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ── Get PAST pending instances (for Pending tab) ─────────────────────────────
  const getPendingInstances = (task) => {
    if (task.taskType !== 'Checklist') return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let instances = [];
    let pointer = new Date(task.nextDueDate);
    pointer.setHours(0, 0, 0, 0);
    const historyKeys = (task.history || [])
      .filter(h => h.action === "Completed" || h.action === "Administrative Completion")
      .map(h => toLockPattern(h.instanceDate || h.timestamp));
    const config = task.frequencyConfig || {};
    const weekends = tenantSettings?.weekends || [0];
    const holidays = tenantSettings?.holidays || [];
    const isNonWorkingDay = (d) => {
      const str = d.toISOString().split('T')[0];
      return weekends.includes(d.getDay()) || holidays.some(h => new Date(h.date).toISOString().split('T')[0] === str);
    };
    const matchesConfig = (d) => {
      if (task.frequency === 'Weekly') return config.daysOfWeek?.includes(d.getDay());
      if (task.frequency === 'Monthly') return config.daysOfMonth?.includes(d.getDate());
      return true;
    };
    let loopCount = 0;
    while (pointer <= today && loopCount < 500) {
      loopCount++;
      const currentPattern = toLockPattern(pointer);
      if (!historyKeys.includes(currentPattern) && matchesConfig(pointer) && !isNonWorkingDay(pointer)) {
        instances.push({
          date: new Date(pointer),
          dateStr: pointer.toDateString(),
          isToday: pointer.getTime() === today.getTime(),
          isPast: pointer < today,
          status: pointer < today ? 'Pending' : 'TODAY'
        });
      }
      if (task.frequency === 'Daily') pointer.setDate(pointer.getDate() + 1);
      else if (task.frequency === 'Weekly') pointer.setDate(pointer.getDate() + 7);
      else break;
      pointer.setHours(0, 0, 0, 0);
    }
    return instances;
  };

  // ── Get FUTURE upcoming instances (for Upcoming tab) ─────────────────────────
  // Skips holidays and weekends, respects frequency config
  const getUpcomingInstances = (task, fromDate, toDate) => {
    if (task.taskType !== 'Checklist' || !task.nextDueDate) return [];
    const weekends = tenantSettings?.weekends || [0];
    const holidays = tenantSettings?.holidays || [];
    const config   = task.frequencyConfig || {};

    const isNonWorkingDay = (d) => {
      const str = d.toISOString().split('T')[0];
      return weekends.includes(d.getDay()) ||
             holidays.some(h => new Date(h.date).toISOString().split('T')[0] === str);
    };

    const matchesConfig = (d) => {
      if (task.frequency === 'Weekly')  return config.daysOfWeek?.includes(d.getDay());
      if (task.frequency === 'Monthly') return config.daysOfMonth?.includes(d.getDate());
      return true; // Daily and others
    };

    const historyKeys = (task.history || [])
      .filter(h => h.action === "Completed" || h.action === "Administrative Completion")
      .map(h => toLockPattern(h.instanceDate || h.timestamp));

    const instances = [];
    let pointer = new Date(fromDate);
    pointer.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    let loopCount = 0;

    while (pointer <= end && loopCount < 366) {
      loopCount++;
      if (!isNonWorkingDay(pointer) && matchesConfig(pointer)) {
        const dateStr = toLockPattern(pointer);
        if (!historyKeys.includes(dateStr)) {
          instances.push({
            date: new Date(pointer),
            dateStr: pointer.toDateString(),
            isToday: false,
            isPast: false,
            status: 'upcoming'
          });
        }
      }
      if (task.frequency === 'Daily') pointer.setDate(pointer.getDate() + 1);
      else if (task.frequency === 'Weekly') pointer.setDate(pointer.getDate() + 7);
      else if (task.frequency === 'Monthly') pointer.setMonth(pointer.getMonth() + 1);
      else pointer.setDate(pointer.getDate() + 1);
      pointer.setHours(0, 0, 0, 0);
    }
    return instances;
  };

  const fetchTasks = useCallback(async () => {
    if (!coordinatorId) { setLoading(false); return; }
    try {
      setLoading(true);
      const [res, settingsRes, fmsRes, fmsCompletedRes, empRes] = await Promise.all([
        API.get(`/tasks/coordinator/${coordinatorId}?force_sync=${Date.now()}`),
        API.get(`/tasks/settings/${tenantId}`).catch(() => ({ data: {} })),
        API.get(`/fms2/instances/${tenantId}`).catch(() => ({ data: { instances: [] } })),
        API.get(`/fms2/instances/${tenantId}?status=completed&limit=100`).catch(() => ({ data: { instances: [] } })),
        API.get(`/tasks/employees/${tenantId}`).catch(() => ({ data: [] })),
      ]);
      const allEmp = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || []);
      const delegationAndChecklist = Array.isArray(res.data) ? res.data : (res.data?.tasks || res.data?.data || []);
      delegationAndChecklist.forEach(t => {
        if (!t.taskType) t.taskType = t.frequency ? 'Checklist' : 'Delegation';
      });
      const adminEmp = allEmp.find(e => (e.roles || []).includes('Admin'));
      const fmsRawList = fmsRes.data?.instances || [];
      const fmsTasks = fmsRawList.map(inst => ({
        _id: inst.instanceId || inst._id,
        title: inst.orderIdentifier || '—',
        stepName: inst.activeStep?.nodeName || inst.templateName || '—',
        taskType: 'FMS',
        status: inst.isOverdue ? 'Overdue' : 'Active',
        isOverdue: inst.isOverdue || false,
        doerId: {
          name: inst.activeStep?.assignedToName || '—',
          whatsappNumber: (() => {
            const e = allEmp.find(x => x._id?.toString() === inst.activeStep?.assignedToId?.toString());
            return e?.whatsappNumber || '';
          })()
        },
        assignerId: { name: adminEmp?.name || 'Admin' },
        assignerName: adminEmp?.name || 'Admin',
        deadline: inst.activeStep?.plannedDeadline,
        flowName: inst.templateName,
        stepName: inst.activeStep?.nodeName,
        orderIdentifier: inst.orderIdentifier,
      }));
      const fmsCompletedList = fmsCompletedRes.data?.instances || [];
      const fmsCompletedTasks = fmsCompletedList.map(inst => ({
        _id: inst.instanceId || inst._id,
        title: inst.orderIdentifier || '—',
        taskType: 'FMS',
        status: 'Completed',
        isOverdue: false,
        stepName: (() => {
          const lastStep = inst.nodeHistory?.slice(-1)[0];
          return lastStep?.nodeName || '';
        })(),
        doerId: {
          name: (() => {
            const lastStep = inst.nodeHistory?.slice(-1)[0];
            return lastStep?.assignedToName || '—';
          })(),
          whatsappNumber: (() => {
            const lastStep = inst.nodeHistory?.slice(-1)[0];
            const e = allEmp.find(x => x._id?.toString() === lastStep?.assignedToId?.toString());
            return e?.whatsappNumber || '';
          })()
        },
        assignerId: { name: adminEmp?.name || 'Admin' },
        assignerName: adminEmp?.name || 'Admin',
        flowName: inst.templateName,
        deadline: inst.completedAt,
        completedAt: inst.completedAt,
      }));
      setTasks([...delegationAndChecklist, ...fmsTasks, ...fmsCompletedTasks]);
      setTenantSettings(settingsRes.data?.settings || settingsRes.data || null);
    } catch (err) {
      console.error("Dashboard Sync Failed:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [coordinatorId, tenantId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-set date range to next 5 days when switching to Upcoming
  useEffect(() => {
    if (activeTab === 'Upcoming') {
      const from = new Date();
      const to   = new Date();
      to.setDate(to.getDate() + 5);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(to.toISOString().split('T')[0]);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  }, [activeTab]);

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const term = searchTerm.toLowerCase().trim();

    return tasks.filter(task => {
      // isDone per task type
      const isDone =
        task.taskType === 'Checklist'
          ? getPendingInstances(task).length === 0
          : task.status === 'Completed' || task.status === 'Verified' ||
            task.status === 'completed' || task.status === 'done';

      const deadline = new Date(task.deadline || task.nextDueDate || Date.now());
      deadline.setHours(0, 0, 0, 0);

      let matchesTab = false;

      if (activeTab === 'Completed') {
        // All 3 types that are done
        matchesTab = isDone;

      } else if (activeTab === 'Pending') {
        if (isDone) {
          matchesTab = false;
        } else if (task.taskType === 'FMS') {
          matchesTab = !isDone; // FMS pending = all active steps (delayed + on time)
        } else if (task.taskType === 'Checklist') {
          const pending = getPendingInstances(task);
          matchesTab = pending.some(p => new Date(p.date) <= today); // has overdue instances
        } else {
          matchesTab = !isDone; // Delegation: all incomplete
        }

      } else if (activeTab === 'Upcoming') {
        if (isDone) {
          matchesTab = false;
        } else if (task.taskType === 'FMS') {
          matchesTab = !task.isOverdue; // FMS upcoming = on time only, not overdue
        } else if (task.taskType === 'Checklist') {
          const from = dateFrom ? new Date(dateFrom) : today;
          const to   = dateTo   ? new Date(dateTo)   : new Date(today.getTime() + 5 * 86400000);
          const upcoming = getUpcomingInstances(task, from, to);
          matchesTab = upcoming.length > 0;
        } else {
          // Delegation: future deadline
          matchesTab = !isDone && deadline > today;
        }
      }

      if (!matchesTab) return false;

      // Category filter
      if (categoryFilter === 'Delegation' && task.taskType !== 'Delegation') return false;
      if (categoryFilter === 'Checklist'  && task.taskType !== 'Checklist')  return false;
      if (categoryFilter === 'FMS'        && task.taskType !== 'FMS')        return false;

      // Search filter
      if (term === "") return true;
      return (task.title || "").toLowerCase().includes(term) ||
             (task.doerId?.name || "").toLowerCase().includes(term) ||
             (task.assignerId?.name || "").toLowerCase().includes(term) ||
             (task.doerId?.department || "").toLowerCase().includes(term);
    });
  }, [tasks, activeTab, searchTerm, tenantSettings, categoryFilter, dateFrom, dateTo]);

  const scrollToTask = (taskId) => {
    setTimeout(() => {
      const el = backlogRefs.current[taskId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1800);
  };

  const handleMarkDone = async (task, instanceDate = null) => {
    if (task.taskType === 'FMS') {
      if (!window.confirm(`Mark FMS step "${task.title}" as done?`)) return;
      try {
        await API.post(`/fms2/complete-step/${task._id}`, { decision: 'done', inputs: {} });
        fetchTasks();
        alert("FMS step marked as done.");
      } catch (err) {
        alert("Failed: " + (err.response?.data?.message || err.message));
      }
      return;
    }

    if (task.taskType === 'Checklist' && instanceDate) {
      const lockedInstancePattern = toLockPattern(instanceDate);
      const formData = new FormData();
      formData.append("checklistId", task._id);
      formData.append("instanceDate", lockedInstancePattern);
      formData.append("remarks", remarks || "Authorized by Coordinator");
      formData.append("completedBy", coordinatorId);
      if (selectedFile) formData.append("evidence", selectedFile);
      try {
        setIsSubmitting(true);
        await API.post("/tasks/checklist-done", formData);
        setRemarks(""); setSelectedFile(null);
        setTimeout(() => fetchTasks(), 1500);
        scrollToTask(task._id);
        alert("Success! Registry Synchronized.");
      } catch (err) {
        alert("Error: Synchronization failed.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (window.confirm("Verify this task as Done?")) {
        try {
          await API.post("/tasks/coordinator-force-done", {
            taskId: task._id, coordinatorId: coordinatorId,
            remarks: remarks || "Marked as Done by Coordinator"
          });
          setRemarks("");
          fetchTasks();
          alert("Success: Task completed.");
        } catch (err) {
          alert("Action failed: " + (err.response?.data?.message || err.message));
        }
      }
    }
  };

  const handleBulkDone = async (task) => {
    const selected = bulkSelected[task._id];
    if (!selected || selected.size === 0) return;
    if (!window.confirm(`Mark ${selected.size} backlog item${selected.size > 1 ? 's' : ''} as done?`)) return;
    setBulkSubmitting(prev => ({ ...prev, [task._id]: true }));
    let successCount = 0;
    for (const dateStr of selected) {
      try {
        const formData = new FormData();
        formData.append('checklistId', task._id);
        formData.append('instanceDate', dateStr);
        formData.append('remarks', 'Bulk authorized by Coordinator');
        formData.append('completedBy', coordinatorId);
        await API.post('/tasks/checklist-done', formData);
        successCount++;
      } catch (err) {
        console.error('Bulk done error for', dateStr, err.message);
      }
    }
    setBulkSelected(prev => ({ ...prev, [task._id]: new Set() }));
    setBulkSubmitting(prev => ({ ...prev, [task._id]: false }));
    setTimeout(() => fetchTasks(), 1000);
    scrollToTask(task._id);
    alert(`${successCount} of ${selected.size} items marked as done.`);
  };

  const toggleBulkSelect = (taskId, dateStr) => {
    setBulkSelected(prev => {
      const current = Array.from(prev[taskId] || []);
      const idx = current.indexOf(dateStr);
      const updated = idx >= 0 ? current.filter(d => d !== dateStr) : [...current, dateStr];
      return { ...prev, [taskId]: new Set(updated) };
    });
  };

  const toggleSelectAll = (task, instances) => {
    const pendingDates = instances
      .filter(i => i.status === 'PENDING' || i.status === 'Pending' || i.status === 'TODAY' || i.status === 'upcoming')
      .map(i => toLockPattern(i.date));
    const current = bulkSelected[task._id] || new Set();
    const allSelected = pendingDates.every(d => current.has(d));
    setBulkSelected(prev => ({
      ...prev,
      [task._id]: allSelected ? new Set([]) : new Set([...pendingDates])
    }));
  };

  const openReminderModal = (task) => {
    if (!task.doerId?.whatsappNumber) {
      alert("Mobile number not found for this staff member.");
      return;
    }
    setSelectedTask(task);
    setCustomMessage(`Reminder: The ${task.taskType} "${task.title}" is still pending. Please update the status.`);
    setIsModalOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedTask) return;
    setIsSendingWA(true);
    try {
      const coordinatorName = savedUser?.name || 'Coordinator';
      const hostname = window.location.hostname;
      const loginLink = hostname.includes('localhost')
        ? `http://${hostname}:5173/login`
        : `https://${hostname}/login`;
      await API.post('/tasks/send-whatsapp-reminder', {
        templateName: 'coordinator_manual_reminder',
        toPhone: selectedTask.doerId?.whatsappNumber,
        variables: [
          selectedTask.doerId?.name || 'Team Member',
          selectedTask.title || 'Task',
          coordinatorName,
          customMessage,
          loginLink,
        ],
      });
      alert('✅ WhatsApp reminder sent to ' + (selectedTask.doerId?.name || 'team member') + '!');
      setIsModalOpen(false);
      setCustomMessage('');
    } catch (err) {
      console.error('WhatsApp send error:', err);
      alert('❌ Failed to send: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSendingWA(false);
    }
  };

  const pendingCount = filteredTasks.filter(
    t => (t.status === 'Pending' || t.status === 'Active' || t.status === 'Overdue') &&
         (t.taskType !== 'Checklist' || getPendingInstances(t).length > 0)
  ).length;
  const completedCount = filteredTasks.filter(
    t => t.status === 'Completed' || t.status === 'Verified'
  ).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={40} />
      <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Verified Syncing...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 selection:bg-primary/30 px-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner"><ShieldCheck size={28} className="text-primary" /></div>
          <div>
            <h2 className="text-foreground text-xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">Coordinator Dashboard</h2>
            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-wide mt-2 opacity-80 italic">Precision Industrial Performance Registry</p>
          </div>
        </div>
        <button onClick={fetchTasks} className="group w-full md:w-auto bg-card hover:bg-background border border-border px-10 py-4 rounded-2xl text-foreground font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl">
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-8 relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Search size={22} className="text-slate-400 group-focus-within:text-primary transition-colors" /></div>
        <input type="text" placeholder="Filter by Personnel, Dept, or Mission..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border pl-14 pr-12 py-5 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" />
        {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-red-500"><X size={20} /></button>}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-primary group-hover:scale-110 transition-transform"><Layers size={60} /></div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Total Directives</span>
          <div className="text-3xl md:text-4xl font-black text-foreground mt-2 tracking-tighter">{filteredTasks.length}</div>
        </div>
        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 group-hover:scale-110 transition-transform"><Clock size={60} /></div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Pending Backlogs</span>
          <div className="text-3xl md:text-4xl font-black text-red-600 mt-2 tracking-tighter">{pendingCount}</div>
        </div>
        <div className="bg-card p-8 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={60} /></div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Sync Verified</span>
          <div className="text-3xl md:text-4xl font-black text-emerald-600 mt-2 tracking-tighter">{completedCount}</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 mb-8">
        {/* Row 1: Category filter + Date range */}
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Delegation', 'Checklist', 'FMS'].map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border ${
                categoryFilter === cat
                  ? cat === 'Delegation' ? 'bg-sky-500 text-white border-sky-500'
                  : cat === 'Checklist' ? 'bg-amber-500 text-white border-amber-500'
                  : cat === 'FMS' ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-primary text-white border-primary'
                  : 'bg-transparent text-slate-500 border-border hover:border-primary hover:text-primary'
              }`}>
              {cat === 'All' ? '🔍 All' : cat === 'Delegation' ? '📋 Delegation' : cat === 'Checklist' ? '✅ Checklist' : '🔀 FMS'}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-background border border-border text-foreground text-[11px] px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-background border border-border text-foreground text-[11px] px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-[9px] font-black text-red-400 hover:text-red-600 px-2 py-1.5 rounded-xl border border-red-200 hover:border-red-400 transition-all">
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Tab buttons */}
        <div className="flex gap-2 bg-card/50 p-2.5 rounded-[2rem] border border-border w-fit">
          {['Pending', 'Upcoming', 'Completed'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg scale-105' : 'text-slate-500 hover:text-foreground hover:bg-background'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Upcoming hint */}
        {activeTab === 'Upcoming' && (
          <div className="text-[10px] text-slate-500 font-medium italic">
            📅 Showing checklist instances from {dateFrom || 'today'} to {dateTo || 'next 5 days'} — holidays and weekends excluded
          </div>
        )}
      </div>

      {/* TASK TABLE */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden h-[600px] flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-[700px] lg:min-w-full">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl">
                <tr className="bg-background/50 border-b border-border">
                  <th className="w-[60px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Type</th>
                  <th className="w-[180px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Directive Name</th>
                  <th className="w-[160px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Assigned To</th>
                  <th className="w-[160px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Assigned By</th>
                  <th className="w-[140px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] text-center">Contact</th>
                  <th className="w-[140px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Next Target</th>
                  <th className="w-[140px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Status</th>
                  <th className="w-[150px] px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan="8" className="px-8 py-16 text-center text-slate-400 font-bold text-sm">No tasks found for this view.</td></tr>
                ) : filteredTasks.map((task) => {
                  const isChecklist = task.taskType === 'Checklist';
                  const instances = isChecklist
                    ? (activeTab === 'Upcoming'
                      ? getUpcomingInstances(task,
                          dateFrom ? new Date(dateFrom) : new Date(),
                          dateTo   ? new Date(dateTo)   : new Date(Date.now() + 5 * 86400000))
                      : getPendingInstances(task))
                    : [];
                  const isExpanded = expandedTaskId === task._id;
                  const isPending = task.status === "Pending" || task.status === "Active" || task.status === "Overdue";

                  return (
                    <React.Fragment key={task._id}>
                      <tr className="hover:bg-primary/[0.02] transition-all group">
                        <td className="px-4 py-3 min-w-0 break-words">
                          <div className={`p-2 rounded-xl w-fit text-[10px] font-black ${
                            task.taskType === 'Checklist' ? 'bg-amber-500/10 text-amber-600' :
                            task.taskType === 'FMS'       ? 'bg-purple-500/10 text-purple-600' :
                            'bg-sky-500/10 text-sky-600'}`}>
                            {task.taskType === 'Checklist' ? 'CHK' : task.taskType === 'FMS' ? 'FMS' : 'DLG'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative group max-w-[180px]">
                            <div className="text-sm font-black text-foreground uppercase tracking-tight truncate">{task.title}</div>
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-card border border-border rounded-lg p-2 text-xs shadow-xl z-50 w-max max-w-[300px]">{task.title}</div>
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
  {task.taskType === 'FMS'
    ? `${task.flowName || task.templateName || ''} — ${task.stepName || ''}`
    : isChecklist
    ? `Cycle: ${task.frequency}`
    : `ID: ${task._id?.slice(-6).toUpperCase()}`}
</div>
                        </td>
                        <td className="px-4 py-3 min-w-0 break-words">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                            <UserCheck size={14} className="text-emerald-500" />
                            {task.doerId?.name || 'Staff'}
                            <span className="ml-2 px-2 py-0.5 bg-primary/5 text-primary text-[8px] rounded border border-primary/10 shadow-sm font-black tracking-widest">Mapped</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase ml-5 tracking-tighter">Dept: {task.doerId?.department || 'OPS'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600">
                            <UserCheck size={12} className="text-emerald-500" />
                            {task.taskType === 'FMS' ? (task.flowName || task.assignerId?.name || '—') : (task.assignerId?.name || '—')}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-0 break-words text-center">
                          <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-xl border border-border text-primary font-black text-[11px] font-mono shadow-inner">
                            <Phone size={10} /> {task.doerId?.whatsappNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-0 break-words">
                          <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
                            <Clock size={14} className="text-primary/40" />
                            {task.taskType === 'Checklist'
                              ? (() => {
                                  const pending = getPendingInstances(task);
                                  const next = pending[0]?.date || task.nextDueDate;
                                  return next ? new Date(next).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A';
                                })()
                              : task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'
                            }
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-0 break-words">
                          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest border ${
                            isPending ? 'bg-red-500/10 text-red-600 border-red-500/20 shadow-sm' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm'}`}>
                            {isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}{task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 min-w-0 break-words">
                          <div className="flex flex-wrap justify-end items-center gap-2 max-w-[220px] ml-auto">
                            {isChecklist && instances.length > 0 && (
                              <button onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all active:scale-90">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {instances.length} {activeTab === 'Upcoming' ? 'Upcoming' : 'Backlogs'}
                              </button>
                            )}
                            {activeTab !== 'Completed' && (
                              <button onClick={() => openReminderModal(task)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-90">
                                <MessageCircle size={16} /> Remind
                              </button>
                            )}
                            {activeTab !== 'Completed' && (
                              <button onClick={() => handleMarkDone(task)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-90">
                                <Zap size={16} /> Force Done
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && instances.length > 0 && (
                        <tr>
                          <td colSpan="8" className="px-4 py-3 bg-background/50 border-y border-border/10">
                            <div className="space-y-3">
                              <div ref={el => backlogRefs.current[task._id] = el} className="flex items-center justify-between">
                                <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.35em] flex items-center gap-2">
                                  <Layers size={12} /> {activeTab === 'Upcoming' ? 'Upcoming Schedule' : 'Backlog Authorization Grid'}
                                </h5>
                                <div className="flex items-center gap-2">
                                  {(bulkSelected[task._id]?.size || 0) > 0 && (
                                    <button onClick={() => handleBulkDone(task)} disabled={bulkSubmitting[task._id]}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50">
                                      {bulkSubmitting[task._id] ? '...' : `✓ Mark ${bulkSelected[task._id].size} Done`}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="overflow-y-auto max-h-[320px]">
                                <div className="grid grid-cols-[auto_1.5fr_1fr_auto] items-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-border bg-muted/30">
                                  <input type="checkbox" className="w-3.5 h-3.5 mr-3 rounded cursor-pointer accent-emerald-600"
                                    checked={instances.length > 0 && instances.every(i => (bulkSelected[task._id] || new Set()).has(toLockPattern(i.date)))}
                                    onChange={() => toggleSelectAll(task, instances)} title="Select all" />
                                  <span>Date</span>
                                  <span>Status</span>
                                  <span className="text-right">Action</span>
                                </div>
                                {instances.map((instance, idx) => {
                                  const dateStr = toLockPattern(instance.date);
                                  const isChecked = (bulkSelected[task._id] || new Set()).has(dateStr);
                                  const isActionable = instance.status !== 'Completed';
                                  const rowColor = instance.isPast ? 'text-red-500' : instance.isToday ? 'text-amber-500' : 'text-primary';

                                  return (
                                    <div key={idx}
                                      className={`grid grid-cols-[auto_1.5fr_1fr_auto] items-center px-3 py-2 border-b border-border/50 transition cursor-pointer ${isChecked ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-muted/20'}`}
                                      onClick={(e) => { if (e.target.type === 'checkbox') return; if (isActionable) toggleBulkSelect(task._id, dateStr); }}>
                                      <input type="checkbox" className="w-3.5 h-3.5 mr-3 rounded cursor-pointer accent-emerald-600"
                                        checked={isChecked} disabled={!isActionable}
                                        onChange={(e) => { e.stopPropagation(); if (isActionable) toggleBulkSelect(task._id, dateStr); }}
                                        onClick={e => e.stopPropagation()} />
                                      <span className="text-sm font-medium text-foreground">
                                        {instance.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                                      </span>
                                      <span className={`text-[10px] font-black uppercase ${rowColor}`}>{instance.status}</span>
                                      <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                                        {isActionable ? (
                                          <button onClick={() => handleMarkDone(task, instance.date)}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-white hover:opacity-80 active:scale-95 transition-all ${instance.isPast ? 'bg-red-600' : 'bg-emerald-600'}`}>
                                            DONE
                                          </button>
                                        ) : (
                                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">✓ Done</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* WHATSAPP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.4)] relative animate-in zoom-in-95">
            <div className="px-8 py-8 border-b border-border flex justify-between items-center bg-background/50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20"><MessageSquare size={24} className="text-primary" /></div>
                <h3 className="text-foreground font-black text-xl uppercase tracking-tighter">Send Reminder</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-foreground active:scale-90 p-2"><X size={28} /></button>
            </div>
            <div className="p-10 space-y-10">
              <div className="bg-background border border-border p-6 rounded-[1.5rem] shadow-inner">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 italic">Technical Contact:</div>
                <div className="text-foreground font-black text-base flex items-center gap-4">
                  <UserCheck size={18} className="text-emerald-500" />
                  {selectedTask?.doerId?.name}
                  <span className="text-primary font-mono text-xs bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 tracking-widest">+{selectedTask?.doerId?.whatsappNumber}</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-2">Message Pattern</label>
                <textarea className="w-full h-36 bg-background border border-border rounded-[1.5rem] p-6 text-foreground text-sm font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                  value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Enter mission briefing details..." />
              </div>
              <button onClick={handleSendWhatsApp} disabled={isSendingWA}
                className="w-full bg-primary hover:bg-sky-400 text-primary-foreground font-black py-6 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-primary/20 uppercase text-xs tracking-[0.3em] disabled:opacity-50">
                <MessageCircle size={22} /> {isSendingWA ? 'Sending...' : 'Transmit via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default CoordinatorDashboard;