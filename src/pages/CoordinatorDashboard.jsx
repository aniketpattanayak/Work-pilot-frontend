import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import API from '../api/axiosConfig';
import { isViewerOnly } from '../utils/viewerMode';
import { dialog } from '../components/Dialog';
import {
  ShieldCheck, Send, CheckCircle2, Clock, User, UserCheck, AlertCircle,
  RefreshCcw, MessageCircle, Zap, X, Phone, MessageSquare, Layers,
  ChevronRight, ClipboardList, Target, Calendar, Upload,
  ChevronDown, ChevronUp, Search, UserPlus, Bell, Check
} from "lucide-react";
import ResponsiveTable from '../components/ResponsiveTable';
import MobileFilters from '../components/MobileFilters';

const UserAvatar = ({ name, avatar, className = "w-7 h-7 text-[10px]" }) => {
  const [imgError, setImgError] = useState(false);
  const src = !imgError && (avatar || (name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e2e8f0&color=334155&bold=true&size=64` : null));

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        onError={() => setImgError(true)}
        className={`${className} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700`}
      />
    );
  }

  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <div className={`${className} rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold shrink-0 border border-slate-300 dark:border-slate-600 select-none`}>
      {initials || <User size={12} />}
    </div>
  );
};

const CoordinatorDashboard = ({ coordinatorId: propCoordId }) => {
  const isViewer = isViewerOnly();
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
  const [coordExtraCols, setCoordExtraCols] = useState(() => {
    try { return JSON.parse(localStorage.getItem('coord_fms_cols') || '[]'); } catch { return []; }
  });
  const [showCoordColConfig, setShowCoordColConfig] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);

  const savedUser = JSON.parse(localStorage.getItem('user'));
  const tenantId = localStorage.getItem('tenantId') || savedUser?.tenantId;
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
  const getUpcomingInstances = (task, fromDate, toDate) => {
    if (task.taskType !== 'Checklist' || !task.nextDueDate) return [];
    const weekends = tenantSettings?.weekends || [0];
    const holidays = tenantSettings?.holidays || [];
    const config = task.frequencyConfig || {};

    const isNonWorkingDay = (d) => {
      const str = d.toISOString().split('T')[0];
      return weekends.includes(d.getDay()) ||
        holidays.some(h => new Date(h.date).toISOString().split('T')[0] === str);
    };

    const matchesConfig = (d) => {
      if (task.frequency === 'Weekly') return config.daysOfWeek?.includes(d.getDay());
      if (task.frequency === 'Monthly') return config.daysOfMonth?.includes(d.getDate());
      return true;
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
      const [res, settingsRes, fmsRes, fmsCompletedRes, empRes, tmplRes] = await Promise.all([
        API.get(`/tasks/coordinator/${coordinatorId}?force_sync=${Date.now()}`),
        API.get(`/tasks/settings/${tenantId}`).catch(() => ({ data: {} })),
        API.get(`/fms2/instances/${tenantId}`).catch(() => ({ data: { instances: [] } })),
        API.get(`/fms2/instances/${tenantId}?status=completed&limit=100`).catch(() => ({ data: { instances: [] } })),
        API.get(`/tasks/employees/${tenantId}`).catch(() => ({ data: [] })),
        API.get(`/fms2/templates/${tenantId}`).catch(() => ({ data: [] })),
      ]);
      const allEmp = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || []);
      const delegationAndChecklist = Array.isArray(res.data) ? res.data : (res.data?.tasks || res.data?.data || []);
      delegationAndChecklist.forEach(t => {
        if (!t.taskType) t.taskType = t.frequency ? 'Checklist' : 'Delegation';
      });
      const fetchedTemplates = Array.isArray(tmplRes.data) ? tmplRes.data : [];
      setAllTemplates(fetchedTemplates);
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
        orderIdentifier: inst.orderIdentifier,
        rawSheetData: inst.rawSheetData || {},
        nodeHistory: inst.nodeHistory || [],
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

  // Switching tabs starts with no date filter (Upcoming still looks 5 days ahead for checklists by default)
  useEffect(() => {
    setDateFrom('');
    setDateTo('');
  }, [activeTab]);

  // The rules that decide which tasks belong to a tab. Used for the table (current tab + date range)
  // and for the counts shown on the other tabs - so a count always equals what that tab will list.
  const filterTasksFor = (tab, dateFrom, dateTo) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const term = searchTerm.toLowerCase().trim();

    return tasks.filter(task => {
      const isDone =
        task.taskType === 'Checklist'
          ? getPendingInstances(task).length === 0
          : task.status === 'Completed' || task.status === 'Verified' ||
          task.status === 'completed' || task.status === 'done';

      const deadline = new Date(task.deadline || task.nextDueDate || Date.now());
      deadline.setHours(0, 0, 0, 0);

      let matchesTab = false;

      if (tab === 'Completed') {
        // Checklists repeat, so they are never "completed" as a whole
        matchesTab = isDone && task.taskType !== 'Checklist';
      } else if (tab === 'Pending') {
        if (isDone) {
          matchesTab = false;
        } else if (task.taskType === 'FMS') {
          matchesTab = !isDone;
        } else if (task.taskType === 'Checklist') {
          const pending = getPendingInstances(task);
          matchesTab = pending.some(p => new Date(p.date) <= today);
        } else {
          matchesTab = !isDone;
        }
      } else if (tab === 'Upcoming') {
        if (isDone) {
          matchesTab = false;
        } else if (task.taskType === 'FMS') {
          matchesTab = !task.isOverdue;
        } else if (task.taskType === 'Checklist') {
          const from = dateFrom ? new Date(dateFrom) : today;
          const to = dateTo ? new Date(dateTo) : new Date(today.getTime() + 5 * 86400000);
          const upcoming = getUpcomingInstances(task, from, to);
          matchesTab = upcoming.length > 0;
        } else {
          matchesTab = !isDone && deadline > today;
        }
      }

      if (!matchesTab) return false;

      // Category filter
      if (categoryFilter === 'Delegation' && task.taskType !== 'Delegation') return false;
      if (categoryFilter === 'Checklist' && task.taskType !== 'Checklist') return false;
      if (categoryFilter === 'FMS' && task.taskType !== 'FMS') return false;

      // Date Range Filter
      if (dateFrom || dateTo) {
        // Skip parent date filtering for checklists in Upcoming tab, since instances are generated dynamically
        if (!(tab === 'Upcoming' && task.taskType === 'Checklist')) {
          const taskDate = new Date(task.completedAt || task.deadline || task.nextDueDate || Date.now());
          taskDate.setHours(0, 0, 0, 0);
          if (dateFrom) {
            const fDate = new Date(dateFrom);
            fDate.setHours(0, 0, 0, 0);
            if (taskDate < fDate) return false;
          }
          if (dateTo) {
            const tDate = new Date(dateTo);
            tDate.setHours(23, 59, 59, 999);
            if (taskDate > tDate) return false;
          }
        }
      }

      // Search filter
      if (term === "") return true;
      return (task.title || "").toLowerCase().includes(term) ||
        (task.doerId?.name || "").toLowerCase().includes(term) ||
        (task.assignerId?.name || "").toLowerCase().includes(term) ||
        (task.doerId?.department || "").toLowerCase().includes(term);
    });
  };

  const filteredTasks = useMemo(
    () => filterTasksFor(activeTab, dateFrom, dateTo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, activeTab, searchTerm, tenantSettings, categoryFilter, dateFrom, dateTo]
  );

  // Numbers shown on the tabs: the open tab counts exactly the rows in the table; the other tabs count
  // what they will show when opened (same search + category, no date range, as a tab switch clears it).
  const tabCounts = useMemo(() => {
    const out = {};
    ['Pending', 'Upcoming', 'Completed'].forEach((t) => {
      out[t] = t === activeTab ? filteredTasks.length : filterTasksFor(t, '', '').length;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTasks, tasks, activeTab, searchTerm, tenantSettings, categoryFilter]);

  const scrollToTask = (taskId) => {
    setTimeout(() => {
      const el = backlogRefs.current[taskId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1800);
  };

  const handleMarkDone = async (task, instanceDate = null) => {
    if (task.taskType === 'FMS') {
      if (!(await dialog.confirm(`Mark FMS step "${task.title}" as done?`, { title: 'Mark as done', confirmText: 'Mark done' }))) return;
      try {
        await API.post(`/fms2/complete-step/${task._id}`, { decision: 'done', inputs: {} });
        fetchTasks();
        await dialog.alert("The FMS step was marked as done.", { tone: 'success', title: 'Done' });
      } catch (err) {
        await dialog.alert(err.response?.data?.message || err.message || 'Could not complete this step.', { tone: 'error', title: 'Not completed' });
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
        await dialog.alert("The checklist item was marked as done.", { tone: 'success', title: 'Done' });
      } catch (err) {
        await dialog.alert(err.response?.data?.message || "Could not mark this item as done.", { tone: 'error', title: 'Not completed' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (await dialog.confirm("Mark this task as done?", { title: 'Force done', confirmText: 'Mark done' })) {
        try {
          await API.post("/tasks/coordinator-force-done", {
            taskId: task._id, coordinatorId: coordinatorId,
            remarks: remarks || "Marked as Done by Coordinator"
          });
          setRemarks("");
          fetchTasks();
          await dialog.alert("The task was marked as done.", { tone: 'success', title: 'Done' });
        } catch (err) {
          await dialog.alert(err.response?.data?.message || err.message || 'Could not complete this task.', { tone: 'error', title: 'Not completed' });
        }
      }
    }
  };

  const handleBulkDone = async (task) => {
    const selected = bulkSelected[task._id];
    if (!selected || selected.size === 0) return;
    if (!(await dialog.confirm(`Mark ${selected.size} backlog item${selected.size > 1 ? 's' : ''} as done?`, { title: 'Mark as done', confirmText: 'Mark done' }))) return;
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
    await dialog.alert(`${successCount} of ${selected.size} items were marked as done.`, { tone: successCount === selected.size ? 'success' : 'error', title: 'Bulk update' });
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

  const openReminderModal = async (task) => {
    if (!task.doerId?.whatsappNumber) {
      await dialog.alert("No mobile number was found for this staff member.", { tone: 'error', title: 'No number' });
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
      setIsModalOpen(false);
      setCustomMessage('');
      await dialog.alert('WhatsApp reminder sent to ' + (selectedTask.doerId?.name || 'the team member') + '.', { tone: 'success', title: 'Sent' });
    } catch (err) {
      console.error('WhatsApp send error:', err);
      await dialog.alert(err.response?.data?.message || err.message || 'Could not send the reminder.', { tone: 'error', title: 'Not sent' });
    } finally {
      setIsSendingWA(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={40} />
      <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Verified Syncing...</p>
    </div>
  );

  // ── Table layout: the Type column only shows on the All view; every column gets a share of the width
  // so the whole table fits the screen without sideways scrolling ──
  const showType = categoryFilter === 'All';
  const BASE_W = { sno: 4, type: 10, name: showType ? 16 : 22, to: showType ? 16 : 18, by: showType ? 12 : 14, contact: 12, next: 12, status: 11, act: 13 };
  const extraN = coordExtraCols.length;
  const baseTotal = Object.entries(BASE_W).reduce((n, [k, v]) => n + (k === 'type' && !showType ? 0 : v), 0);
  const fit = extraN ? Math.max(0.45, (100 - 8 * extraN) / baseTotal) : 100 / baseTotal;
  const colStyle = (i) => {
    const key = ['sno', 'type', 'name', 'to', 'by', 'contact', 'next', 'status', 'act'][i];
    return { width: (BASE_W[key] * fit).toFixed(2) + '%' };
  };
  const extraW = extraN ? ((100 - baseTotal * fit) / extraN).toFixed(2) + '%' : undefined;
  const colCount = 8 + (showType ? 1 : 0) + extraN;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-500 selection:bg-primary/30 px-3 md:px-4">

      {/* HEADER CARD */}
      <div className="bg-card border border-border rounded-2xl p-3.5 md:p-4 shadow-sm flex items-center justify-between mb-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-100 dark:border-sky-800/50 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck size={22} className="text-sky-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-lg md:text-xl font-black tracking-tight uppercase leading-none truncate">
              Coordinator Dashboard
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider mt-1 italic truncate">
              See every task, checklist and flow in one place
            </p>
          </div>
        </div>
        <button
          onClick={fetchTasks}
          className="group shrink-0 bg-card hover:bg-muted/50 border border-border px-4 py-2 rounded-xl text-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
        >
          <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-700 text-sky-500" /> REFRESH
        </button>
      </div>

      {/* SEARCH + CATEGORY + DATE RANGE */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search bar */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search person, dept, or task..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border pl-9 pr-8 py-1.5 rounded-full text-xs font-semibold text-foreground placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center text-slate-400 hover:text-red-500"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['All', 'Delegation', 'Checklist', 'FMS'].map(cat => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full font-black text-[10px] md:text-[11px] uppercase tracking-wider transition-all shadow-sm ${
                    active
                      ? 'bg-[#0088FF] text-white shadow-sky-500/20'
                      : 'bg-card border border-border text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {cat === 'All' ? 'ALL' : cat.toUpperCase()}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowCoordColConfig(c => !c)}
              title="Choose extra columns for FMS rows"
              className={`px-3.5 py-1.5 rounded-full font-black text-[10px] md:text-[11px] uppercase tracking-wider transition-all shadow-sm ${
                showCoordColConfig
                  ? 'bg-[#0088FF] text-white shadow-sky-500/20'
                  : 'bg-card border border-border text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              COLUMNS{coordExtraCols.length > 0 ? ` (${coordExtraCols.length})` : ''}
            </button>
          </div>
        </div>

        {/* Date Range & Apply */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Date Range</span>
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-card border border-border text-foreground text-[11px] px-3 py-1 rounded-full outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm"
          />
          <span className="text-[11px] text-slate-500 font-medium">To</span>
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-card border border-border text-foreground text-[11px] px-3 py-1 rounded-full outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm"
          />
          <button
            type="button"
            onClick={fetchTasks}
            className="px-3.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-sm active:scale-95 transition-all"
          >
            Apply
          </button>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* SUB-TABS (Pending / Upcoming / Completed) */}
      <div className="flex items-center gap-1.5 mb-2.5">
        {['Pending', 'Upcoming', 'Completed'].map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm ${
                active
                  ? 'bg-[#0088FF] text-white shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab} <span className="ml-0.5 tabular-nums">({tabCounts[tab] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'Upcoming' && (
        <div className="mb-2 text-[10px] text-slate-500 font-medium italic">
          Checklist instances from {dateFrom || 'today'} to {dateTo || 'next 5 days'} (holidays and weekends excluded)
        </div>
      )}

      {/* TASK TABLE CONTAINER */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-17.5rem)] min-h-[350px] flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="mobile-full-width min-w-[700px] lg:min-w-full">
            {/* Coordinator Sheet Column Config Panel */}
            {showCoordColConfig && (() => {
              const fmsTasks = tasks.filter(t => t.taskType === 'FMS');
              const allowedCols = [...new Set(fmsTasks.flatMap(t => {
                const tmpl = allTemplates?.find(tmpl => tmpl.name === t.flowName);
                const sheetCols = tmpl?.allowedCoordinatorColumns || [];
                // Also add collected fields from template nodes
                const collectedCols = (tmpl?.nodes || []).filter(n => n.inputFields?.length > 0).flatMap(n =>
                  (n.inputFields || []).map(f => `[${n.name}] ${f.label}`)
                );
                return [...sheetCols, ...collectedCols];
              }))];
              if (allowedCols.length === 0) return (
                <div style={{ background: 'var(--color-muted)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 12, color: 'var(--color-muted-foreground)' }}>
                  No columns configured by admin yet. Admin must set allowed coordinator columns in Flow Builder → Sheet tab.
                </div>
              );
              return (
                <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>👁 Sheet columns to show in tracking table</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allowedCols.map(col => {
                      const checked = coordExtraCols.includes(col);
                      return (
                        <label key={col} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                          background: checked ? 'var(--color-primary)' : 'var(--color-muted)',
                          color: checked ? 'white' : 'var(--color-muted-foreground)',
                          border: '1px solid var(--color-border)', transition: 'all .12s'
                        }}>
                          <input type="checkbox" style={{ display: 'none' }} checked={checked}
                            onChange={e => {
                              const next = e.target.checked ? [...coordExtraCols, col] : coordExtraCols.filter(c => c !== col);
                              setCoordExtraCols(next);
                              localStorage.setItem('coord_fms_cols', JSON.stringify(next));
                            }} />
                          {checked ? '✓ ' : ''}{col}
                        </label>
                      );
                    })}
                  </div>
                  {coordExtraCols.length > 0 && (
                    <button onClick={() => { setCoordExtraCols([]); localStorage.removeItem('coord_fms_cols'); }}
                      style={{ marginTop: 8, fontSize: 10, color: 'var(--color-muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Clear all
                    </button>
                  )}
                </div>
              );
            })()}
            <ResponsiveTable>
              <table className="mobile-card-table w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-20 bg-muted/40 backdrop-blur-md border-b border-border">
                  <tr>
                    <th style={colStyle(0)} className="hidden md:table-cell px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">S.No</th>
                    {showType && <th style={colStyle(1)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">TYPE</th>}
                    <th style={colStyle(2)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">DIRECTIVE NAME</th>
                    <th style={colStyle(3)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">ASSIGNED TO</th>
                    <th style={colStyle(4)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">ASSIGNED BY</th>
                    <th style={colStyle(5)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">CONTACT</th>
                    {coordExtraCols.map(col => (
                      <th key={col} style={{ width: extraW }} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">{col}</th>
                    ))}
                    <th style={colStyle(6)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">NEXT TARGET</th>
                    <th style={colStyle(7)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">STATUS</th>
                    <th style={colStyle(8)} className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.length === 0 ? (
                    <tr><td colSpan={colCount} className="px-8 py-16 text-center text-slate-400 font-bold text-sm">No tasks found for this view.</td></tr>
                  ) : filteredTasks.map((task, rowIdx) => {
                    const isChecklist = task.taskType === 'Checklist';
                    const instances = isChecklist
                      ? (activeTab === 'Upcoming'
                        ? getUpcomingInstances(task,
                          dateFrom ? new Date(dateFrom) : new Date(),
                          dateTo ? new Date(dateTo) : new Date(Date.now() + 5 * 86400000))
                        : getPendingInstances(task))
                      : [];
                    const isExpanded = expandedTaskId === task._id;
                    const isPending = task.status === "Pending" || task.status === "Active" || task.status === "Overdue";

                    return (
                      <React.Fragment key={task._id}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors border-b border-border/40">
                          <td data-label-skip className="hidden md:table-cell px-3 py-2 text-center text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                            {rowIdx + 1}
                          </td>
                          {showType && (
                            <td className="px-3 py-2 min-w-0">
                              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${
                                task.taskType === 'Checklist' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' :
                                task.taskType === 'FMS' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                                'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                              }`}>
                                {task.taskType === 'Checklist' ? 'CHECKLIST' : task.taskType === 'FMS' ? 'FMS' : 'DELEGATION'}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-2 min-w-0">
                            <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate leading-tight" title={task.title}>
                              {task.title}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5 truncate">
                              ID: {(task.orderIdentifier || task._id?.slice(-6) || '').toUpperCase()}
                            </div>
                          </td>
                          <td className="px-3 py-2 min-w-0">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={task.doerId?.name} avatar={task.doerId?.avatar} className="w-7 h-7 text-[10px]" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 leading-none">
                                  <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {task.doerId?.name || 'Staff'}
                                  </span>
                                  {(!task.taskType || task.taskType === 'Delegation') && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 leading-none">
                                      Mapped
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight mt-1 truncate">
                                  DEPT:{task.doerId?.department || 'TECH'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 min-w-0">
                            {(() => {
                              const byName = task.taskType === 'FMS'
                                ? (task.assignerName || task.assignerId?.name || 'Admin')
                                : (task.createdBy?.name || task.assignerId?.name || task.assignerName || (task.taskType === 'Checklist' ? 'Admin' : '—'));
                              return (
                                <div className="flex items-center gap-2">
                                  <UserAvatar name={byName} avatar={task.assignerId?.avatar} className="w-7 h-7 text-[10px]" />
                                  <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {byName}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <Phone size={13} className="text-sky-500 shrink-0" />
                              <span>{task.doerId?.whatsappNumber || '99999 99999'}</span>
                            </div>
                          </td>
                          {coordExtraCols.map(col => {
                            if (task.taskType !== 'FMS') return <td key={col} className="px-3 py-2 text-xs text-muted-foreground">—</td>;
                            const collectMatch = col.match(/^\[(.+?)\] (.+)$/);
                            let cellValue = '—';
                            if (collectMatch) {
                              const [, stepName, fieldLabel] = collectMatch;
                              const tmpl = allTemplates?.find(t => t.name === task.flowName);
                              const node = tmpl?.nodes?.find(n => n.name === stepName);
                              const field = node?.inputFields?.find(f => f.label === fieldLabel);
                              if (field && task.rawSheetData) {
                                const histStep = (task.nodeHistory || [])?.find(h => h.nodeName === stepName);
                                cellValue = histStep?.inputs?.[field.id] || '—';
                              }
                            } else {
                              cellValue = task.rawSheetData?.[col] || '—';
                            }
                            return <td key={col} className="px-3 py-2 text-[11px] break-words">{String(cellValue)}</td>;
                          })}
                          <td className="px-3 py-2 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <Clock size={13} className="text-slate-400 shrink-0" />
                              <span>
                                {task.taskType === 'Checklist'
                                  ? (() => {
                                    const pending = getPendingInstances(task);
                                    const next = pending[0]?.date || task.nextDueDate;
                                    return next ? new Date(next).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                                  })()
                                  : task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 min-w-0">
                            {(() => {
                              const s = (task.status || 'Pending').toUpperCase();
                              const isComp = activeTab === 'Completed' || s === 'COMPLETED';
                              const isUp = activeTab === 'Upcoming' || s === 'UPCOMING';
                              const isOver = s === 'OVERDUE' || task.isOverdue;

                              if (isComp) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 size={11} /> COMPLETED
                                  </span>
                                );
                              }
                              if (isUp) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                    <Clock size={11} /> UPCOMING
                                  </span>
                                );
                              }
                              if (isOver) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                    <AlertCircle size={11} /> OVERDUE
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                  <Clock size={11} /> PENDING
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2 min-w-0">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {activeTab === 'Completed' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                  <CheckCircle2 size={13} /> Completed
                                </span>
                              ) : (
                                <>
                                  {!isViewer && (
                                    <button
                                      type="button"
                                      onClick={() => openReminderModal(task)}
                                      className="w-[100px] h-6 flex items-center justify-center gap-1 rounded-full border border-sky-400 text-sky-600 bg-white dark:bg-card hover:bg-sky-50 dark:hover:bg-sky-950/30 text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                                    >
                                      <MessageSquare size={10} /> Remind <Bell size={10} />
                                    </button>
                                  )}
                                  {!isViewer && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkDone(task)}
                                      className="w-[100px] h-6 flex items-center justify-center gap-1 rounded-full border border-emerald-400 text-emerald-600 bg-white dark:bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                                    >
                                      <Zap size={10} /> Force Done <Check size={10} />
                                    </button>
                                  )}
                                  {isChecklist && instances.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                                      className="w-[100px] h-5 flex items-center justify-center gap-1 rounded-full border border-amber-300 text-amber-600 bg-amber-50/80 hover:bg-amber-100 text-[9px] font-bold transition-all"
                                    >
                                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />} {instances.length} {activeTab === 'Upcoming' ? 'Upcoming' : 'Backlogs'}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && instances.length > 0 && (
                          <tr>
                            <td colSpan={colCount} className="px-4 py-3 bg-background/50 border-y border-border/10">
                              <div className="space-y-3">
                                <div ref={el => backlogRefs.current[task._id] = el} className="flex items-center justify-between">
                                  <h5 className="text-primary font-black text-[10px] uppercase tracking-[0.35em] flex items-center gap-2">
                                    <Layers size={12} /> {activeTab === 'Upcoming' ? 'Upcoming Schedule' : 'Backlog Authorization Grid'}
                                  </h5>
                                  <div className="flex items-center gap-2">
                                    {(bulkSelected[task._id]?.size || 0) > 0 && (
                                      <button onClick={() => handleBulkDone(task)} disabled={bulkSubmitting[task._id]}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-70 active:scale-95 transition-all disabled:opacity-50">
                                        {bulkSubmitting[task._id] ? '...' : `✓ Mark ${bulkSelected[task._id].size} Done`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="overflow-y-auto max-h-[320px]">
                                  <div className="grid grid-cols-[auto_1.5fr_1fr_auto] items-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-border bg-muted/30">
                                    <input type="checkbox" className="w-3.5 h-3.5 mr-3 rounded cursor-pointer accent-emerald-600"
                                      checked={instances.length > 0 && instances.every(i => (bulkSelected[task._id] || new Set()).has(toLockPattern(i.date)))}
                                      onChange={() => toggleSelectAll(task, instances)} title="Select all" disabled={isViewer} />
                                    <span>Date</span>
                                    <span>Status</span>
                                    <span className="text-right">Action</span>
                                  </div>
                                  {instances.map((instance, idx) => {
                                    const dateStr = toLockPattern(instance.date);
                                    const isChecked = (bulkSelected[task._id] || new Set()).has(dateStr);
                                    const isActionable = instance.status !== 'Completed' && !isViewer;
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
                                            instance.status === 'Completed'
                                              ? <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">✓ Done</span>
                                              : <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
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
            </ResponsiveTable>
          </div>
        </div>
      </div>

      {/* WHATSAPP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="mobile-sheet bg-card border border-border w-full max-w-lg rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.4)] relative animate-in zoom-in-95">
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