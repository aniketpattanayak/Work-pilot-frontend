import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosConfig';
import RevisionPanel from '../components/RevisionPanel';
import TaskActivityDrawer from '../components/TaskActivityDrawer';
import { dialog } from '../components/Dialog';
import { TaskCard, sheetDisplayRows } from './FlowMyTasks';
import { useChat } from '../components/useChat';
import useTaskUnread from '../hooks/useTaskUnread';
import UnreadBadge from '../components/UnreadBadge';
import { openChatPopup } from '../utils/openChatPopup';
import ImageLightbox from '../components/ImageLightbox';
import LocalFileThumb from '../components/LocalFileThumb';
import { useUploadLimit, checkFiles, uploadHint } from '../utils/uploadLimit';
import TaskPhotoThumb from '../components/TaskPhotoThumb';
import { groupPhotosByHistory, allTaskPhotos } from '../utils/taskPhotos';
import {
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  History,
  Lock,
  X,
  Upload,
  Camera,
  MessageSquare,
  Send,
  RefreshCcw,
  FileText,
  ExternalLink,
  ImageIcon,
  Maximize2,
  CheckCircle2,
  Briefcase,
  Users,
  Activity,
  ShieldCheck,
  TrendingUp,
  Layers,
  LayoutGrid,
  Info,
  Target,
  FileSearch,
  Hash,
  CalendarClock,
  User,
  Eye,
  ListOrdered,
} from "lucide-react";
import MobileFilters from '../components/MobileFilters';
import useCompanySettings from '../hooks/useCompanySettings';
import useConfigurableColumns from '../hooks/useConfigurableColumns';
import { fmtIST, fmtISTDate, fmtISTTime } from '../utils/istTime';
import ColumnCustomizer from '../components/ColumnCustomizer';
import ActionsMenu from '../components/mytasks/ActionsMenu';
import HoldModal from '../components/mytasks/HoldModal';
import SubTaskModal from '../components/mytasks/SubTaskModal';
import SubTaskListModal from '../components/mytasks/SubTaskListModal';
import BulkCompleteModal from '../components/mytasks/BulkCompleteModal';
import BulkOnwardModal from '../components/mytasks/BulkOnwardModal';
import BulkReviseModal from '../components/mytasks/BulkReviseModal';

/**
 * DOER CHECKLIST: MISSION TERMINAL v3.5
 * Purpose: High-density Excel-style grid for Doer tasks + FMS Integration.
 */
// What the order is about, taken from the columns this step is meant to show (see FlowMyTasks).
const fmsDescription = (m) => {
  const rows = sheetDisplayRows(m).slice(0, 4);
  return rows.length ? rows.map(r => `${r.label}: ${r.value}`).join(' · ') : (m?.nodeConfig?.question || 'No order details');
};

// One shape for every kind of task, so one row renderer serves all four tabs.
const toChecklistItem = (i) => {
  const rawF = (Array.isArray(i.followers) && i.followers.length ? i.followers : (Array.isArray(i.coworkers) ? i.coworkers : []));
  const fNames = rawF.map(f => (typeof f === 'object' && f ? f.name : (typeof f === 'string' && !/^[0-9a-fA-F]{24}$/.test(f) ? f : ''))).filter(Boolean);
  return { ...i, dataType: 'Checklist', uniqueKey: `${i._id}-${i.instanceDate}`, title: i.taskName, description: i.description, deadlineDate: i.instanceDate || i.nextDueDate, statusLabel: i.isDone ? 'Completed' : 'Pending', assignerName: i.createdBy?.name || i.assignerId?.name || 'Admin', assignedToName: i.doerId?.name || 'You', followerNames: fNames };
};
const toDelegationItem = (i) => {
  const rawF = (Array.isArray(i.followers) && i.followers.length ? i.followers : (Array.isArray(i.coworkers) ? i.coworkers : []));
  const fNames = rawF.map(f => (typeof f === 'object' && f ? f.name : (typeof f === 'string' && !/^[0-9a-fA-F]{24}$/.test(f) ? f : ''))).filter(Boolean);
  return { ...i, dataType: 'Delegation', uniqueKey: i._id, title: i.title, description: i.description, deadlineDate: i.deadline, statusLabel: i.status, assignerName: i.assignerId?.name || '-', assignedToName: i.doerId?.name || '-', followerNames: fNames };
};
const toFmsItem = (i) => ({
  ...i,
  dataType: 'FMS',
  uniqueKey: i.instanceId || i._id,
  title: `${i.activeStep?.nodeName || i.templateName || i.nodeName} (#${i.orderIdentifier})`,
  description: fmsDescription(i),
  deadlineDate: i.activeStep?.plannedDeadline || i.completedAt || i.plannedDeadline,
  statusLabel: i.isOverdue ? 'Delayed' : 'On track',
  assignerName: i.activeStep?.assignedToName || i.assignerName || 'System',
  assignedToName: i.activeStep?.assignedToName || 'You',
  followerNames: [],
});

const DoerChecklist = ({ doerId }) => {
  const { isOn: companyAllows } = useCompanySettings(); // Settings > Functions on / off
  const { openTaskThread, chatEnabled } = useChat();
  const { unreadFor, markRead } = useTaskUnread();
  const navigate = useNavigate();
  const openTaskChat = useCallback(async (opts) => {
    const conv = await openTaskThread(opts);
    if (conv?._id && !openChatPopup(conv._id)) navigate(`/dashboard/chat?conv=${conv._id}`);
  }, [openTaskThread, navigate]);
  // History/files details modal: mirrors the assigner-side one in
  // ManageTasks.jsx so the doer can see every uploaded photo and the full
  // audit trail (including rejection remarks) for a delegation task.
  const [detailsModalTask, setDetailsModalTask] = useState(null);
  const [openCards, setOpenCards] = useState({}); // phone cards: tap the title/description to read it in full
  // Full-screen zoomable photo GALLERY - shared by the History & Files
  // modal and the row-level "has photos" thumbnail, same as ManageTasks.jsx.
  const [gallery, setGallery] = useState(null); // { photos, startIndex, task } | null
  const openGallery = (photos, startIndex, task) => setGallery({ photos, startIndex, task });
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [activeTaskDrawer, setActiveTaskDrawer] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [checklist, setChecklist] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [fmsMissions, setFmsMissions] = useState([]);
  const [timeFilter, setTimeFilter] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All Data');
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);

  // Custom Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Extra filters: order of the list + the date the task was given to me
  const [sortMode, setSortMode] = useState('Default');
  const [givenFrom, setGivenFrom] = useState('');
  const [givenTo, setGivenTo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [modalType, setModalType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  // Multiple evidence photos for marking a Delegation task done - picked
  // from device storage or captured live from the camera (requirement: the
  // doer must be able to choose either source, and attach more than one).
  const [delegationFiles, setDelegationFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const savedUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentDoerId = doerId || savedUser._id || savedUser.id;
  // ── Assign a received task onward ──
  const [onwardTask, setOnwardTask] = useState(null);
  const [onwardStaff, setOnwardStaff] = useState([]);
  const [onwardPick, setOnwardPick] = useState('');
  const [onwardNote, setOnwardNote] = useState('');
  const [onwardBusy, setOnwardBusy] = useState(false);
  const [onwardErr, setOnwardErr] = useState('');
  // ── Bulk actions, On hold, sub tasks ──
  const [selected, setSelected] = useState({});        // uniqueKey -> true
  const [bulkMode, setBulkMode] = useState(null);      // 'complete' | 'onward' | 'revise' | null
  const [flash, setFlash] = useState('');
  const [holdTask, setHoldTask] = useState(null);
  const [subCreateFor, setSubCreateFor] = useState(null);
  const [subListFor, setSubListFor] = useState(null);
  const [subSummary, setSubSummary] = useState({});    // type -> { id -> { total, done } }
  const myRoles = Array.isArray(savedUser.roles) ? savedUser.roles : (savedUser.role ? [savedUser.role] : []);
  const idOf = (v) => String((v && v._id) || v || '');
  // Chat + History work for every kind of task (delegation, checklist, FMS step)
  const chatOptsFor = (item) => {
    if (item.dataType === 'Checklist') return { taskId: item._id, taskType: 'checklist', taskTitle: item.title, participants: [idOf(item.doerId) || currentDoerId, idOf(item.assignerId) || idOf(item.createdBy)].filter(Boolean) };
    if (item.dataType === 'FMS') return { taskId: item.instanceId || item._id, taskType: 'flow', taskTitle: item.title, participants: [currentDoerId].filter(Boolean) };
    return { taskId: item._id, taskType: 'delegation', taskTitle: item.title, participants: [idOf(item.doerId) || currentDoerId, idOf(item.assignerId)].filter(Boolean) };
  };
  const withHistory = (item) => {
    if (item.dataType === 'Checklist') {
      const who = (item.doerId && item.doerId.name) || item.doerName || 'Doer';
      return { ...item, history: (item.history || []).map((h) => ({ ...h, performedBy: h.performedBy || { name: who } })) };
    }
    if (item.dataType === 'FMS') {
      const rows = [];
      (item.nodeHistory || []).forEach((n) => {
        const inputs = n.inputs && typeof n.inputs === 'object' ? Object.entries(n.inputs).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
        const late = n.delayMinutes > 0 ? `Late by ${n.delayMinutes} min` : 'On time';
        rows.push({ action: `${n.nodeName} - ${n.decision ? String(n.decision).toUpperCase() : 'Done'}`, performedBy: { name: n.completedByName || n.assignedToName }, timestamp: n.completedAt, remarks: [inputs, late].filter(Boolean).join(' · ') });
      });
      if (item.activeStep) rows.push({ action: `Now with: ${item.activeStep.nodeName}`, performedBy: { name: item.activeStep.assignedToName }, timestamp: item.activeStep.activatedAt, remarks: '' });
      return { ...item, history: rows };
    }
    return item;
  };
  // "Revised" belongs to the doer who asked for the new date, not to whoever got the task afterwards
  const revisedForMe = (t) => {
    let by = idOf(t.revisedByDoerId);
    if (!by) {
      const h = [...(t.history || [])].reverse().find((x) => x.action === 'Deadline Revised');
      by = h ? idOf(h.performedBy) : '';
    }
    return !by || by === String(currentDoerId);
  };
  // A task I handed to someone else: I can follow it here but not work on it
  const isPassedOn = (t) =>
    idOf(t.doerId) !== String(currentDoerId) &&
    (t.forwardChain || []).some(c => idOf(c.employeeId) === String(currentDoerId));
  // A task I only FOLLOW (the doer is someone else): I can watch it, chat with the doer and read its history, nothing else
  const isFollowerRow = (t) => t.dataType === 'Delegation' && t.myRole === 'follower';
  const followerWhy = (t) => `You only follow this task. Only ${(t.doerId && t.doerId.name) || 'the doer'} can do this.`;
  const canForward = (t) =>
    companyAllows('delegation_assignOnward') &&
    myRoles.includes('Assigner') &&
    (t.status === 'Pending' || t.status === 'Accepted') &&
    idOf(t.doerId) === String(currentDoerId);
  const openOnward = async (t) => {
    setOnwardTask(t); setOnwardPick(''); setOnwardNote(''); setOnwardErr(''); setOnwardStaff([]);
    try {
      const r = await API.get(`/tasks/authorized-staff/${currentDoerId}?mappedOnly=1`);
      const taken = new Set([String(currentDoerId), idOf(t.assignerId), ...(t.forwardChain || []).map(c => idOf(c.employeeId))]);
      setOnwardStaff((r.data?.doers || []).filter(d => !taken.has(String(d._id))));
    } catch {
      setOnwardErr('Could not load your team. Please try again.');
    }
  };
  const submitOnward = async () => {
    if (!onwardPick) { setOnwardErr('Please choose who to assign this to.'); return; }
    try {
      setOnwardBusy(true); setOnwardErr('');
      await API.post('/tasks/assign-onward', { taskId: onwardTask._id, newDoerId: onwardPick, remarks: onwardNote.trim() });
      setOnwardTask(null);
      fetchAllTasks();
    } catch (err) {
      setOnwardErr(err.response?.data?.message || 'Could not assign this task onward.');
    } finally {
      setOnwardBusy(false);
    }
  };


  const fetchAllTasks = useCallback(async () => {
    if (!currentDoerId) {
      setLoading(false);
      return;
    }
    try {
      // The full-screen spinner only the first time; a refresh after submitting must not blank the screen
      if (!loadedOnce.current) setLoading(true);
      const userEmail = savedUser.email;
      // A request that fails keeps what is already on screen (null) instead of showing an empty list and a wrong count
      const [checklistRes, delegationRes, fmsRes] = await Promise.all([
        API.get(`/tasks/checklist/${currentDoerId}?includeDone=1`, { params: { _: Date.now() } }).catch(() => null),
        API.get(`/tasks/doer/${currentDoerId}?includePassedOn=1`, { params: { _: Date.now() } }).catch(() => null),
        API.get(`/fms2/my-tasks-full/${currentDoerId}`).catch(() => null)
      ]);

      const employeesRes = await API.get('/tasks/employees').catch(() => ({ data: [] }));
      const empData = Array.isArray(employeesRes.data)
        ? employeesRes.data
        : (employeesRes.data?.employees || employeesRes.data?.data || []);
      setEmployees(empData);

      if (checklistRes) {
        setChecklist(Array.isArray(checklistRes.data) ? checklistRes.data : (checklistRes.data?.data || []));
      }
      if (delegationRes) {
        setDelegatedTasks(Array.isArray(delegationRes.data) ? delegationRes.data : (delegationRes.data?.tasks || delegationRes.data?.data || []));
      }
      if (fmsRes) setFmsMissions(Array.isArray(fmsRes.data) ? fmsRes.data : []);
      loadedOnce.current = true;
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDoerId, savedUser.email]);

  useEffect(() => { fetchAllTasks(); }, [fetchAllTasks]);
  // Tasks given to this person while the page is open (a new checklist, a new delegation) appear without a manual reload:
  // refreshed every minute and whenever the tab / window is brought back.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) fetchAllTasks(); };
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [fetchAllTasks]);
  useEffect(() => { setSelected({}); }, [activeCategory]);

  // Small "Sub tasks 1/3" badges
  const subTasksOn = companyAllows('tasks_subTasks');
  useEffect(() => {
    if (!subTasksOn) { setSubSummary({}); return undefined; }
    let live = true;
    const run = async (parentType, ids) => {
      if (!ids.length) return {};
      try { const r = await API.post('/tasks/sub-tasks/summary', { parentType, ids }); return (r.data && r.data.summary) || {}; } catch (e) { return {}; }
    };
    (async () => {
      const [d, c, f] = await Promise.all([
        run('Delegation', delegatedTasks.map((t) => String(t._id))),
        run('Checklist', [...new Set(checklist.map((t) => String(t._id)))]),
        run('FMS', fmsMissions.map((m) => String(m.instanceId || m._id)).filter(Boolean)),
      ]);
      if (live) setSubSummary({ Delegation: d, Checklist: c, FMS: f });
    })();
    return () => { live = false; };
  }, [delegatedTasks, checklist, fmsMissions, subTasksOn]);

  // Display order for every list on this page: overdue pending work first, then today, then upcoming
  // (soonest first), and finished work last (most recently finished first).
  const sortSeq = (list, dateOf, doneOf, heldOf = () => false) => {
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const ms = (v) => { const t = new Date(v).getTime(); return Number.isNaN(t) ? Infinity : t; };
    const rank = (it) => {
      if (doneOf(it)) return 3;
      if (heldOf(it)) return 2.5;
      const raw = dateOf(it);
      if (!raw) return 2;
      const d = new Date(raw); d.setHours(0, 0, 0, 0);
      const t = d.getTime();
      return Number.isNaN(t) ? 2 : (t < todayMs ? 0 : (t === todayMs ? 1 : 2));
    };
    return [...list].sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      const ta = ms(dateOf(a)), tb = ms(dateOf(b));
      if (ta === tb) return 0;
      return ra === 3 ? (ta < tb ? 1 : -1) : (ta < tb ? -1 : 1);
    });
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Date a task was given to the doer, per task type
    const givenOf = {
      Delegation: (t) => t.createdAt,
      Checklist: (t) => t.createdAt || t.startDate,
      FMS: (t) => t.activeStep?.activatedAt || t.startedAt || t.createdAt,
    };
    const dayOf = (v) => { if (!v) return null; const d = new Date(v); if (Number.isNaN(d.getTime())) return null; d.setHours(0, 0, 0, 0); return d.getTime(); };
    const givenOk = (type, t) => {
      if (!givenFrom && !givenTo) return true;
      const g = dayOf(givenOf[type](t));
      if (g === null) return false;
      if (givenFrom && g < dayOf(givenFrom)) return false;
      if (givenTo && g > dayOf(givenTo)) return false;
      return true;
    };
    // "Recent first" etc. replaces the default order when chosen
    const orderBy = (list, type, dlOf, defaultSorted) => {
      if (sortMode === 'Default') return defaultSorted;
      const key = (t) => {
        const v = sortMode.startsWith('Deadline') ? dlOf(t) : givenOf[type](t);
        const x = new Date(v).getTime();
        return Number.isNaN(x) ? null : x;
      };
      const dir = (sortMode === 'Recent first' || sortMode === 'Deadline latest') ? -1 : 1;
      return [...list].sort((a, b) => {
        const ka = key(a), kb = key(b);
        if (ka === null && kb === null) return 0;
        if (ka === null) return 1;
        if (kb === null) return -1;
        return (ka - kb) * dir;
      });
    };

    const filterByDateAndStatus = (dateStr, isCompleted, isPendingWorkCondition) => {
      if (startDate || endDate) {
        if (!dateStr) return false;
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
        if (startDate && targetDate < new Date(startDate)) return false;
        if (endDate && targetDate > new Date(endDate)) return false;
        return true;
      }

      if (timeFilter === 'All') return true;
      if (timeFilter === 'Completed') return isCompleted;

      if (!dateStr) return false;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      if (timeFilter === 'Pending Work') {
        return target.getTime() < today.getTime() && isPendingWorkCondition;
      }
      if (timeFilter === 'Upcoming') {
        return target.getTime() > today.getTime();
      }
      if (timeFilter === 'Today') {
        return target.getTime() === today.getTime();
      }
      if (timeFilter === 'Next 7 Days') {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return target.getTime() > today.getTime() && target.getTime() <= nextWeek.getTime();
      }
      return true;
    };

    const assignmentsKept = delegatedTasks.filter(item => {
      const isCompleted = item.status === 'Completed' || item.status === 'Verified';
      const isPending = !isCompleted;
      return !item.planId && givenOk('Delegation', item) && filterByDateAndStatus(item.deadline, isCompleted, isPending);
    });
    const filteredAssignments = orderBy(assignmentsKept, 'Delegation', (i) => i.deadline,
      sortSeq(assignmentsKept, (i) => i.deadline, (i) => i.status === 'Completed' || i.status === 'Verified', (i) => !!(i.onHold && i.onHold.isOn)));

    const checklistKept = checklist.filter(item => {
      const isCompleted = item.isDone;
      const isPending = !isCompleted;
      return !item.planId && givenOk('Checklist', item) && filterByDateAndStatus(item.instanceDate || item.nextDueDate, isCompleted, isPending);
    });
    const filteredChecklist = orderBy(checklistKept, 'Checklist', (i) => i.instanceDate || i.nextDueDate,
      sortSeq(checklistKept, (i) => i.instanceDate || i.nextDueDate, (i) => !!i.isDone));

    const fmsKept = fmsMissions.filter(item => {
      const isCompleted = item.status === 'completed';
      const isPending = !isCompleted;
      const deadlineDate = item.activeStep?.plannedDeadline || item.completedAt || item.plannedDeadline;
      return givenOk('FMS', item) && filterByDateAndStatus(deadlineDate, isCompleted, isPending);
    });
    const filteredFms = orderBy(fmsKept, 'FMS', (i) => i.activeStep?.plannedDeadline || i.completedAt || i.plannedDeadline,
      sortSeq(fmsKept, (i) => i.activeStep?.plannedDeadline || i.completedAt || i.plannedDeadline, (i) => i.status === 'completed'));

    // Tasks made from a Planner step live on their own "Planner" tab, not in the lists above
    const planKept = [
      ...delegatedTasks.filter((i) => i.planId && givenOk('Delegation', i) && filterByDateAndStatus(i.deadline, i.status === 'Completed' || i.status === 'Verified', !(i.status === 'Completed' || i.status === 'Verified'))).map(toDelegationItem),
      ...checklist.filter((i) => i.planId && givenOk('Checklist', i) && filterByDateAndStatus(i.instanceDate || i.nextDueDate, !!i.isDone, !i.isDone)).map(toChecklistItem),
    ];
    const planN = sortSeq(planKept, (i) => i.deadlineDate, (i) => (i.dataType === 'Checklist' ? !!i.isDone : (i.status === 'Completed' || i.status === 'Verified')), (i) => !!(i.onHold && i.onHold.isOn));
    const routinesN = filteredChecklist.map(toChecklistItem);
    const assignmentsN = filteredAssignments.map(toDelegationItem);
    const fmsN = filteredFms.map(toFmsItem);
    const combined = [...routinesN, ...assignmentsN, ...fmsN];
    const doneOf = (i) => (i.dataType === 'Checklist' ? !!i.isDone : i.dataType === 'Delegation' ? (i.status === 'Completed' || i.status === 'Verified') : i.status === 'completed');
    let all;
    if (sortMode === 'Default') {
      all = sortSeq(combined, (i) => i.deadlineDate, doneOf, (i) => !!(i.onHold && i.onHold.isOn));
    } else {
      const keyOf = (i) => { const x = new Date(sortMode.startsWith('Deadline') ? i.deadlineDate : givenOf[i.dataType](i)).getTime(); return Number.isNaN(x) ? null : x; };
      const dir = (sortMode === 'Recent first' || sortMode === 'Deadline latest') ? -1 : 1;
      all = combined.sort((a, b) => { const ka = keyOf(a), kb = keyOf(b); if (ka === null && kb === null) return 0; if (ka === null) return 1; if (kb === null) return -1; return (ka - kb) * dir; });
    }
    return { routines: filteredChecklist, assignments: filteredAssignments, fms: filteredFms, routinesN, assignmentsN, fmsN, planN, all };
  }, [checklist, delegatedTasks, fmsMissions, timeFilter, startDate, endDate, sortMode, givenFrom, givenTo]);

  // Built-in columns of My Tasks (company custom fields and the saved layout are added by useConfigurableColumns)
  // Tick boxes (and the bulk bar) are not shown on the Completed tab
  const bulkOn = companyAllows('tasks_bulkActions') && timeFilter !== 'Completed';
  const subOn = companyAllows('tasks_subTasks');
  const holdOn = companyAllows('tasks_onHold');
  const buildColumns = () => {
    const cols = [];
    if (bulkOn) {
      cols.push({
        key: 'select', label: 'Select', width: '28px', locked: true, cellClassName: 'min-w-0',
        render: (it) => <input type="checkbox" aria-label={`Select ${it.title}`} checked={!!selected[it.uniqueKey]} onChange={() => toggleOne(it.uniqueKey)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
      });
    }
    cols.push(
      { key: 'sno', label: 'S. no.', width: '40px', cellClassName: 'text-xs font-black text-slate-400', render: (it, i) => i + 1 },
      {
        key: 'title', label: 'Task', width: 'minmax(130px,1.4fr)', locked: true, cellClassName: 'min-w-0 pr-2',
        render: (it) => (
          <>
            <span className="font-black text-sm text-foreground whitespace-normal break-words block leading-tight">{it.title}</span>
            {givenLine(it)}
            {(activeCategory === 'All Data' || activeCategory === 'Planner') && <span className="inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 w-fit">Type: {it.dataType}</span>}
            {it.dataType === 'Delegation' && roleChip(it)}
            {tagsOf(it)}
            {photoLink(it)}
          </>
        )
      },
      { key: 'assigner', label: 'Assigned By', width: 'minmax(78px,0.8fr)', headerClassName: 'text-center', cellClassName: 'text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 whitespace-normal break-words leading-tight px-1', render: (it) => it.assignerName || '-' },
      { key: 'assignedTo', label: 'Assigned To', width: 'minmax(78px,0.8fr)', headerClassName: 'text-center', cellClassName: 'text-center text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 whitespace-normal break-words leading-tight px-1', render: (it) => it.assignedToName || '-' },
      { key: 'followers', label: 'Followers', width: 'minmax(78px,0.8fr)', headerClassName: 'text-center', cellClassName: 'text-center text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-300 px-1 whitespace-normal break-words', render: (it) => (it.followerNames && it.followerNames.length ? it.followerNames.join(', ') : '-') },
      { key: 'description', label: 'Description', width: 'minmax(100px,1.4fr)', cellClassName: 'text-xs opacity-70 font-semibold whitespace-normal break-words pr-2', render: (it) => descriptionCell(it) },
      { key: 'date', label: 'Deadline', width: 'minmax(112px,1fr)', headerClassName: 'text-center', cellClassName: 'flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] font-bold', render: (it) => dateCell(it) },
      { key: 'status', label: 'Priority / Status', width: 'minmax(108px,0.9fr)', headerClassName: 'text-center', cellClassName: 'flex justify-center items-center gap-2', render: (it) => statusCell(it) },
      { key: 'actions', label: 'Actions', width: '112px', pinEnd: true, headerClassName: 'text-right pr-4', cellClassName: 'flex flex-wrap justify-end items-center gap-1.5', render: (it) => actionsFor(it) },
    );
    return cols;
  };
  const columnsNow = buildColumns();
  const ctlAll = useConfigurableColumns({ tableKey: 'mytasks_all', columns: columnsNow, customFieldEntity: 'delegation', phoneUsesDefaults: true });
  const ctlChecklist = useConfigurableColumns({ tableKey: 'mytasks_checklist', columns: columnsNow, customFieldEntity: 'task', phoneUsesDefaults: true });
  const ctlDelegation = useConfigurableColumns({ tableKey: 'mytasks_delegation', columns: columnsNow, customFieldEntity: 'delegation', phoneUsesDefaults: true });
  const ctlFms = useConfigurableColumns({ tableKey: 'mytasks_fms', columns: columnsNow, phoneUsesDefaults: true });
  const ctl = activeCategory === 'Checklist' ? ctlChecklist : activeCategory === 'Delegation' ? ctlDelegation : activeCategory === 'FMS' ? ctlFms : ctlAll;


  // Shared phone-card pieces for the Checklist, Delegation and FMS tabs (same look as All Data).
  const typeToneOf = (t) => t === 'Checklist' ? 'text-sky-500 bg-sky-500/10 border-sky-500/25' : t === 'Delegation' ? 'text-violet-500 bg-violet-500/10 border-violet-500/25' : 'text-slate-400 bg-slate-500/10 border-slate-500/25';
  // Phone card helper: which group a task sits in, plus the short status text and colours for its card.
  const cardInfo = (item) => {
    const done = item.dataType === 'Checklist' ? !!item.isDone
      : item.dataType === 'Delegation' ? (item.status === 'Completed' || item.status === 'Verified')
        : item.status === 'completed';
    if (done) return { group: 'Completed', text: 'Completed', stripe: 'before:bg-emerald-500', dot: 'text-emerald-500' };
    if (item.onHold && item.onHold.isOn) return { group: 'On hold', text: 'On hold', stripe: 'before:bg-amber-500', dot: 'text-amber-600' };
    const raw = item.deadlineDate;
    const d = raw ? new Date(raw) : null;
    if (!d || Number.isNaN(d.getTime())) return { group: 'Upcoming', text: item.statusLabel || 'Pending', stripe: 'before:bg-slate-500', dot: 'text-slate-400' };
    d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { group: 'Overdue', text: `Overdue ${-days} day${days === -1 ? '' : 's'}`, stripe: 'before:bg-red-500', dot: 'text-red-500' };
    if (days === 0) return { group: 'Today', text: 'Due today', stripe: 'before:bg-amber-500', dot: 'text-amber-500' };
    return { group: 'Upcoming', text: `In ${days} day${days === 1 ? '' : 's'}`, stripe: 'before:bg-slate-500', dot: 'text-slate-400' };
  };

  // Same rule as the delegation count: every task still waiting for the doer is counted, so the badge
  // matches the rows in the table. A task that is due now counts once per missed day; a task scheduled
  // for a later date (for example a new checklist whose first date is ahead) counts as 1.
  const pendingRoutinesCount = checklist.reduce((n, item) => {
    if (item.isDone || item.planId) return n;
    if (item.onHold && item.onHold.isOn) return n;
    const target = new Date(item.instanceDate || item.nextDueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (Number.isNaN(target.getTime())) return n + 1;
    target.setHours(0, 0, 0, 0);
    return n + (target.getTime() <= today.getTime() ? Math.max(1, Number(item.pendingDue) || 1) : 1);
  }, 0);
  const pendingDelegationsCount = delegatedTasks.filter(t => !t.planId && t.status !== 'Completed' && t.status !== 'Verified' && !isPassedOn(t) && t.myRole !== 'follower').length;
  // Tasks made from a Planner step get their own tab
  const hasPlanTasks = delegatedTasks.some((t) => t.planId) || checklist.some((t) => t.planId);
  const pendingPlanCount = delegatedTasks.filter((t) => t.planId && t.status !== 'Completed' && t.status !== 'Verified' && t.myRole !== 'follower').length + checklist.filter((t) => t.planId && !t.isDone).length;
  const allPendingCount = pendingRoutinesCount + pendingDelegationsCount + fmsMissions.filter(f => f.status !== 'completed').length + (hasPlanTasks ? pendingPlanCount : 0);

  const maxFileMb = useUploadLimit();
  const addDelegationFiles = (list) => {
    const { ok, problems } = checkFiles(list, maxFileMb);
    if (problems.length) dialog.alert(problems.join('\n'), { tone: 'error', title: 'File not added' });
    if (ok.length) setDelegationFiles((prev) => [...prev, ...ok]);
  };
  const pickSingleFile = (input) => {
    const { ok, problems } = checkFiles(input.files, maxFileMb);
    if (problems.length) { dialog.alert(problems.join('\n'), { tone: 'error', title: 'File not added' }); input.value = ''; return; }
    setSelectedFile(ok[0] || null);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    const formData = new FormData();
    formData.append("remarks", remarks || "");

    try {
      setUploading(true);

      if (modalType === "Checklist") {
        formData.append("checklistId", activeTask._id);
        if (activeTask.instanceDate) {
          formData.append("instanceDate", activeTask.instanceDate);
        }
        if (selectedFile) formData.append("evidence", selectedFile);
        await API.post("/tasks/checklist-done", formData);
      } else {
        formData.append("taskId", activeTask._id);
        formData.append("status", "Completed");
        formData.append("doerId", currentDoerId);
        // Multiple files (storage picks and/or live camera captures) all go
        // up as separate "evidence" fields - the backend's /respond route
        // now accepts an array (routes/taskRoutes.js: useUpload(_upload.array('evidence', 6))).
        delegationFiles.forEach((f) => formData.append("evidence", f));
        await API.put(`/tasks/respond`, formData);
      }

      // Show the result at once (Action greyed out, count down) - the refresh below then confirms it from the server.
      if (modalType === "Checklist") {
        const sameDay = (a, b) => new Date(a || 0).toDateString() === new Date(b || 0).toDateString();
        setChecklist((prev) => prev.map((c) => {
          if (String(c._id) !== String(activeTask._id) || c.isDone) return c;
          if (!sameDay(c.instanceDate || c.nextDueDate, activeTask.instanceDate || activeTask.nextDueDate)) return c;
          // One day less waiting. If that was the only day, the row is done and its Action is greyed out;
          // if more missed days are waiting, the row stays with a lower count until the refresh brings the next day.
          const due = Math.max(1, Number(c.pendingDue) || 1);
          return due > 1 ? { ...c, pendingDue: due - 1 } : { ...c, isDone: true, pendingDue: 0 };
        }));
      } else if (modalType === "Delegation") {
        setDelegatedTasks((prev) => prev.map((d) => (d._id === activeTask._id ? { ...d, status: 'Completed' } : d)));
      }
      setShowModal(false);
      setRemarks("");
      setSelectedFile(null);
      setDelegationFiles([]);
      fetchAllTasks();

    } catch (err) {
      console.error("Submission Error Details:", err.response?.data || err.message);
      await dialog.alert(err.response?.data?.message || "Could not submit. Please try again.", { tone: "error", title: "Not submitted" });
    } finally {
      setUploading(false);
    }
  };

  // ───────── My Tasks helpers: selection, hold, sub tasks, one Actions button ─────────
  const isDoneItem = (it) => it.dataType === 'Checklist' ? !!it.isDone : it.dataType === 'Delegation' ? ['Completed', 'Verified'].includes(it.status) : it.status === 'completed';
  const isHeld = (it) => !!(it.onHold && it.onHold.isOn) && !isDoneItem(it);
  const notDueYet = (it) => { if (it.dataType !== 'Checklist' && it.dataType !== 'Delegation') return false; const d = new Date(it.deadlineDate); d.setHours(0, 0, 0, 0); const t = new Date(); t.setHours(0, 0, 0, 0); return d.getTime() > t.getTime(); };
  const isPastDueItem = (it) => !!it.deadlineDate && new Date(it.deadlineDate) < new Date() && !isDoneItem(it) && !isHeld(it);
  const isFmsDelayed = (it) => !!it.isOverdue || (!!it.deadlineDate && it.status !== 'completed' && new Date() > new Date(it.deadlineDate));
  const fmtDM = (d) => new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short' });
  const dateTextOf = (it) => {
    if (!it.deadlineDate) return 'N/A';
    const day = fmtISTDate(it.deadlineDate);
    return it.dataType === 'Checklist' ? day : `${day} ${fmtISTTime(it.deadlineDate)}`;
  };
  // When the task was given to the person (Indian time, AM/PM)
  const givenOf = (it) => it.createdAt || it.startedAt || (it.activeStep && it.activeStep.activatedAt) || null;
  const givenLine = (it) => (givenOf(it) ? <span className="inline-block mt-1 rounded-lg px-2 py-1 text-[10px] leading-tight font-bold text-white bg-sky-600 shadow-sm normal-case tracking-normal" data-testid="given-at">Given: {fmtIST(givenOf(it))}</span> : null);
  // Mark for ANY date change (not only a doer's own revision). The pause after "On hold" is not a revision.
  const revisedNote = (it) => {
    if (it.dataType !== 'Delegation') return '';
    const changes = (it.dateChanges || []).filter((c) => c.byRole !== 'hold');
    const legacy = !(it.dateChanges || []).length && it.originalDeadline && revisedForMe(it);
    if (!changes.length && !legacy) return '';
    const was = (changes[0] && changes[0].oldDeadline) || it.originalDeadline;
    if (!was) return 'Revised';
    const days = Math.round((new Date(it.deadlineDate) - new Date(was)) / 86400000);
    return `Revised · was ${fmtDM(was)} (${days >= 0 ? '+' : ''}${days}d)${changes.length > 1 ? ` · changed ${changes.length} times` : ''}`;
  };
  const subIdOf = (it) => String(it.dataType === 'FMS' ? (it.instanceId || it._id) : it._id);
  const subsOf = (it) => ((subSummary[it.dataType] || {})[subIdOf(it)]) || { total: 0, done: 0 };
  const mineDelegation = (it) => it.dataType === 'Delegation' && idOf(it.doerId) === String(currentDoerId);
  // Sub tasks only for tasks scheduled today or later
  const isPastDay = (it) => { if (!it.deadlineDate) return false; const d = new Date(it.deadlineDate); d.setHours(0, 0, 0, 0); const n = new Date(); n.setHours(0, 0, 0, 0); return d.getTime() < n.getTime(); };
  const canSplit = (it) => subOn && !isPastDay(it) && myRoles.includes('Doer') && myRoles.includes('Assigner') && !isDoneItem(it) && !(it.dataType === 'Delegation' && (!mineDelegation(it) || !['Pending', 'Accepted'].includes(it.status)));
  const canHold = (it) => holdOn && mineDelegation(it) && ['Pending', 'Accepted'].includes(it.status);

  // Why a task can / cannot be completed in bulk (FMS steps have their own form)
  const completeCheck = (it) => {
    if (isDoneItem(it)) return { ok: false, why: 'Already done.' };
    if (it.dataType === 'FMS') return { ok: false, why: 'Flow (FMS) steps have their own form, so complete them one at a time from Actions.' };
    if (it.dataType === 'Delegation') {
      if (isFollowerRow(it)) return { ok: false, why: followerWhy(it) };
      if (isPassedOn(it)) return { ok: false, why: `You passed this task to ${(it.doerId && it.doerId.name) || 'someone else'}.` };
      if (!['Pending', 'Accepted'].includes(it.status)) return { ok: false, why: `It is "${it.status}", so it cannot be completed now.` };
      if (notDueYet(it)) return { ok: false, why: 'It is scheduled for a later date.' };
      return { ok: true };
    }
    if (notDueYet(it)) return { ok: false, why: 'It is not due yet.' };
    return { ok: true };
  };
  const reviseCheck = (it) => {
    if (it.dataType !== 'Delegation') return { ok: false, why: 'Only delegation tasks can get a new date here.' };
    if (!companyAllows('delegation_doerRevise')) return { ok: false, why: 'Your company has switched off date changes by doers.' };
    if (isDoneItem(it)) return { ok: false, why: 'Already done.' };
    if (isFollowerRow(it)) return { ok: false, why: followerWhy(it) };
    if (isPassedOn(it)) return { ok: false, why: 'You passed this task to someone else.' };
    if (!['Pending', 'Accepted'].includes(it.status)) return { ok: false, why: `It is "${it.status}", so the date cannot be changed now.` };
    if (it.isRevisionAllowed === false) return { ok: false, why: 'The person who gave the task did not allow date changes.' };
    if (isPastDueItem(it) || (it.deadlineDate && new Date(it.deadlineDate) < new Date())) return { ok: false, why: 'The deadline has already passed.' };
    if ((it.history || []).some((h) => h.action === 'Deadline Approved' || h.action === 'Deadline Revised')) return { ok: false, why: 'The date was already changed once.' };
    return { ok: true };
  };
  const onwardCheck = (it) => {
    if (it.dataType !== 'Delegation') return { ok: false, why: 'Only delegation tasks can be passed on.' };
    if (!companyAllows('delegation_assignOnward')) return { ok: false, why: 'Your company has switched off passing tasks on.' };
    if (!myRoles.includes('Assigner')) return { ok: false, why: 'Only an Assigner can pass tasks on.' };
    if (isDoneItem(it)) return { ok: false, why: 'Already done.' };
    if (isFollowerRow(it)) return { ok: false, why: followerWhy(it) };
    if (isPassedOn(it)) return { ok: false, why: 'You already passed this task on.' };
    if (!canForward(it)) return { ok: false, why: 'This task cannot be passed on now.' };
    return { ok: true };
  };

  const rowsNow = activeCategory === 'Planner' ? filteredData.planN : activeCategory === 'All Data' ? filteredData.all : activeCategory === 'Checklist' ? filteredData.routinesN : activeCategory === 'Delegation' ? filteredData.assignmentsN : filteredData.fmsN;
  useEffect(() => { if (timeFilter === 'Completed') setSelected({}); }, [timeFilter]);
  const selectedItems = filteredData.all.filter((i) => selected[i.uniqueKey]);
  const allTicked = rowsNow.length > 0 && rowsNow.every((i) => selected[i.uniqueKey]);
  const toggleOne = (k) => setSelected((s) => { const n = { ...s }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const toggleAll = () => setSelected((s) => { const n = { ...s }; if (rowsNow.every((i) => n[i.uniqueKey])) rowsNow.forEach((i) => delete n[i.uniqueKey]); else rowsNow.forEach((i) => { n[i.uniqueKey] = true; }); return n; });
  const closeBulk = (count) => {
    setBulkMode(null);
    if (count > 0) { setSelected({}); setFlash(`${count} task${count > 1 ? 's' : ''} updated.`); fetchAllTasks(); }
  };

  const openSingle = (it) => {
    setActiveTask(it); setModalType(it.dataType); setDelegationFiles([]); setRemarks(''); setSelectedFile(null); setShowModal(true);
  };
  const resumeTask = async (it) => {
    try {
      const r = await API.post(`/tasks/${it._id}/resume`);
      await dialog.alert((r.data && r.data.message) || 'Resumed.', { tone: 'success' });
      fetchAllTasks();
    } catch (e) {
      dialog.alert((e.response && e.response.data && e.response.data.message) || 'Could not resume the task.', { tone: 'error' });
    }
  };

  // The ONE Actions button of a row (+ chat and history beside it)
  const actionsFor = (item, cls = '') => {
    const done = isDoneItem(item);
    const passed = item.dataType === 'Delegation' && isPassedOn(item);
    const follower = isFollowerRow(item);
    const held = isHeld(item);
    const menu = [];
    if (!done && !passed && !follower) {
      if (item.dataType === 'Checklist') menu.push({ key: 'complete', label: 'Submit', disabled: notDueYet(item), hint: notDueYet(item) ? 'Not due yet' : undefined, onClick: () => openSingle(item) });
      else if (item.dataType === 'FMS') menu.push({ key: 'complete', label: 'Done', onClick: () => openSingle(item) });
      else if (['Pending', 'Accepted'].includes(item.status)) menu.push({ key: 'complete', label: 'Complete', disabled: notDueYet(item), hint: notDueYet(item) ? 'Not due yet' : undefined, onClick: () => openSingle(item) });
      if (canForward(item)) menu.push({ key: 'onward', label: 'Assign Onward', onClick: () => openOnward(item) });
      // "Put on hold" is no longer offered. A task that is already on hold can still be resumed.
      if (held && mineDelegation(item)) menu.push({ key: 'resume', label: 'Resume work', hint: 'The deadline moves by the waiting time', onClick: () => resumeTask(item) });
      if (canSplit(item)) menu.push({ key: 'addsub', label: 'Add sub task', onClick: () => setSubCreateFor(item) });
      if (subsOf(item).total > 0) menu.push({ key: 'viewsub', label: `View sub tasks (${subsOf(item).done}/${subsOf(item).total})`, onClick: () => setSubListFor(item) });
    }
    return (
      <>
        {passed && <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Passed to {(item.doerId && item.doerId.name) || 'someone'}</span>}
        {follower && <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest" title={followerWhy(item)}>Following</span>}
        <ActionsMenu items={menu} disabled={done || passed || follower || menu.length === 0} disabledTitle={done ? 'This task is done' : passed ? 'You passed this task on' : follower ? followerWhy(item) : 'No actions available'} className={cls} />
        {!passed && (
          <>
            <button type="button" onClick={() => { setActiveTaskDrawer({ task: item, index: 1 }); markRead(item._id); }} className="relative p-1.5 bg-background border border-border text-slate-400 hover:border-blue-400 hover:text-blue-500 rounded-lg transition-all active:scale-90 max-lg:w-10 max-lg:h-10 max-lg:flex max-lg:items-center max-lg:justify-center" title="Message"><MessageSquare size={12} /><UnreadBadge count={unreadFor(item._id)} /></button>
            <button type="button" onClick={() => setDetailsModalTask(withHistory(item))} className="p-1.5 bg-background border border-border text-slate-400 hover:border-violet-400 hover:text-violet-500 rounded-lg transition-all active:scale-90 max-lg:w-10 max-lg:h-10 max-lg:flex max-lg:items-center max-lg:justify-center" title="History & files"><History size={12} /></button>
          </>
        )}
      </>
    );
  };

  const photoLink = (item) => {
    if (!(item.files || []).length) return null;
    const photos = allTaskPhotos(item);
    const latest = photos[photos.length - 1];
    return (
      <button type="button" onClick={() => openGallery(photos, photos.length - 1, item)} className="mt-1.5 flex items-center gap-1.5 group/thumb w-fit" title="View uploaded photos">
        <TaskPhotoThumb file={latest} className="w-7 h-7" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover/thumb:text-primary">{photos.length > 1 ? `+${photos.length} photos` : '1 photo'}</span>
      </button>
    );
  };

  // "I do this" (green) or "I follow this" (indigo): the two kinds of task look different
  const roleChip = (it) => it.myRole === 'follower'
    ? <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 w-fit" title="Someone else does this task. You follow it.">Follower</span>
    : <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 w-fit" title="This task is yours to do.">Doer</span>;
  const rowTone = (it) => it.dataType === 'Delegation' && it.myRole === 'follower'
    ? 'border-l-4 border-l-indigo-500 bg-indigo-500/[0.07]'
    : 'border-l-4 border-l-emerald-500/60';

  const tagsOf = (item) => {
    const s = subsOf(item);
    const held = isHeld(item);
    if (!held && !s.total && !(item.parentTask && item.parentTask.title)) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        {held && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest" title={`On hold: ${[item.onHold.reason, item.onHold.reasonNote].filter(Boolean).join(' - ')}`}>On hold</span>}
        {s.total > 0 && <button type="button" onClick={() => setSubListFor(item)} className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 text-sky-600 text-[8px] font-black uppercase tracking-widest" title="View sub tasks">Sub tasks {s.done}/{s.total}</button>}
        {item.parentTask && item.parentTask.title && <span className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/25 text-violet-600 text-[8px] font-black uppercase tracking-widest break-all" title="This is a part of a bigger task">Sub task of “{item.parentTask.title}”</span>}
      </div>
    );
  };

  const descriptionCell = (it) => (
    <>
      <span className="uppercase">{it.description || 'No description provided.'}</span>
      {it.dataType === 'Delegation' && it.remarks && (
        <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-black normal-case tracking-tight">
          {it.status === 'Accepted' ? 'Sent back — ' : 'Note — '}{it.remarks}
        </div>
      )}
    </>
  );
  const dateCell = (it) => {
    const red = isPastDueItem(it) && !it.isBacklog;
    return (
      <>
        <Calendar size={12} className="text-primary/30 shrink-0" />
        <p className={`uppercase tracking-tighter whitespace-nowrap ${red ? 'text-red-500' : it.isBacklog && !isDoneItem(it) ? 'text-amber-600' : 'text-slate-500'}`}>{dateTextOf(it)}</p>
        {isHeld(it) && <span className="basis-full text-center text-[8px] font-black uppercase text-amber-600">Clock paused</span>}
        {it.dataType === 'Checklist' && !it.isDone && Number(it.pendingDue) > 1 && <span className="basis-full text-center text-[8px] font-black uppercase text-amber-600" title="Missed days still waiting to be submitted">{it.pendingDue} days pending</span>}
        {revisedNote(it) && <span className="basis-full text-center text-[8px] font-black uppercase text-amber-600" title="The deadline was changed">{revisedNote(it)}</span>}
      </>
    );
  };
  const statusCell = (it) => {
    if (isHeld(it)) return <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border text-amber-700 border-amber-300 bg-amber-50">On hold</span>;
    if (it.dataType === 'FMS') {
      const delayed = isFmsDelayed(it);
      return <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${it.status === 'completed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : delayed ? 'text-red-600 border-red-200 bg-red-50' : 'text-sky-600 border-sky-200 bg-sky-50'}`}>{it.status === 'completed' ? 'COMPLETED' : delayed ? 'DELAYED' : 'ON TRACK'}</span>;
    }
    if (it.dataType === 'Checklist') return <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{it.frequency || 'Daily'} CYCLE</span>;
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${isPastDueItem(it) ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-primary border-primary/20 bg-primary/5'}`}>{it.priority || 'Standard'}</span>
          <span className="text-[7px] text-slate-400 font-black uppercase">/ {it.statusLabel || it.status}</span>
        </div>
        {reviseLink(it)}
      </div>
    );
  };
  // "Revise" sits under Priority / Status (it used to be in the Actions menu)
  const reviseLink = (it) => (it.dataType === 'Delegation' && reviseCheck(it).ok ? (
    <button type="button" onClick={() => { setSelectedTask(it); setShowRevisionModal(true); }} data-testid="revise-link"
      className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-colors active:scale-95 max-lg:min-h-8"
      title="Ask for more time on this task">Revise</button>
  ) : null);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[300px] bg-transparent">
      <RefreshCcw className="animate-spin text-primary mb-2" size={24} />
      <p className="text-slate-500 font-black text-[8px] tracking-[0.4em] uppercase">Syncing Node...</p>
    </div>
  );

  const isYesNo = activeTask?.inputType === "yesno";
  const isPaused = activeTask?.isPaused;

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 px-2 sm:px-6">

      {/* HEADER SECTION */}
      <div className="flex flex-row justify-between items-center mb-3 py-2 border-b border-border gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shadow-inner shrink-0">
            <ClipboardCheck size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-foreground text-lg sm:text-xl font-black tracking-tighter uppercase leading-none truncate">My Tasks</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1 opacity-60 truncate">Session Active: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:block shrink-0"><ColumnCustomizer ctl={ctl} /></div>
          <button onClick={fetchAllTasks} className="group bg-card border border-border px-3 sm:px-4 py-1.5 min-h-[44px] lg:min-h-[40px] rounded-lg text-foreground font-black text-[10px] sm:text-[12px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm shrink-0">
            <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Refresh
          </button>
        </div>
      </div>

      {/* CATEGORY TABS SEQUENCE */}
      <div className={`grid grid-cols-2 gap-2 mb-4 ${hasPlanTasks ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
        <button
          onClick={() => { setActiveCategory('All Data'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'All Data' ? 'bg-slate-800 text-white border-slate-800 shadow-slate-800/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <LayoutGrid size={16} className="shrink-0" />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate min-w-0">All Data</span>
          {allPendingCount > 0 && (
            <span className="absolute -top-2 -right-2 z-10 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black leading-none rounded-full shadow-md ring-2 ring-background">
              {allPendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('Checklist'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Checklist' ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Layers size={16} className="shrink-0" />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate min-w-0">Checklist</span>
          {pendingRoutinesCount > 0 && (
            <span className="absolute -top-2 -right-2 z-10 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black leading-none rounded-full shadow-md ring-2 ring-background">
              {pendingRoutinesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('Delegation'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Delegation' ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Briefcase size={16} className="shrink-0" />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate min-w-0">Delegation</span>
          {pendingDelegationsCount > 0 && (
            <span className="absolute -top-2 -right-2 z-10 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black leading-none rounded-full shadow-md ring-2 ring-background">
              {pendingDelegationsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveCategory('FMS'); setTimeFilter('All'); }}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'FMS' ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/20' : 'bg-card text-slate-500 border-border'}`}
        >
          <Activity size={16} className={`shrink-0 ${activeCategory === 'FMS' ? 'animate-pulse' : ''}`} />
          <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate min-w-0">FMS Missions</span>
          {filteredData.fms.length > 0 && (
            <span className="absolute -top-2 -right-2 z-10 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black leading-none rounded-full shadow-md ring-2 ring-background">
              {filteredData.fms.length}
            </span>
          )}
        </button>

        {hasPlanTasks && (
          <button
            data-testid="tab-planner"
            onClick={() => { setActiveCategory('Planner'); setTimeFilter('All'); }}
            className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-1 min-h-[44px] rounded-xl border transition-all active:scale-95 shadow-sm ${activeCategory === 'Planner' ? 'bg-violet-600 text-white border-violet-600 shadow-violet-600/20' : 'bg-card text-slate-500 border-border'}`}
          >
            <ListOrdered size={16} className="shrink-0" />
            <span className="font-black text-[9px] sm:text-[12px] uppercase tracking-widest truncate min-w-0">Planner</span>
            {pendingPlanCount > 0 && (
              <span className="absolute -top-2 -right-2 z-10 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black leading-none rounded-full shadow-md ring-2 ring-background">
                {pendingPlanCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* FILTERS & DATE RANGE — collapsed behind Filters on phones */}
      <div className="mb-6">
        <MobileFilters
          activeCount={[timeFilter && timeFilter !== 'All', !!startDate, !!endDate, sortMode !== 'Default', !!givenFrom, !!givenTo].filter(Boolean).length}
          onClear={() => { setTimeFilter('All'); setStartDate(''); setEndDate(''); setSortMode('Default'); setGivenFrom(''); setGivenTo(''); }}
          className="flex flex-col gap-3 bg-card/40 p-3 rounded-xl border border-border"
        >
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Completed', 'Today', 'Next 7 Days', 'Pending Work', 'Upcoming'].map(range => (
              <button
                key={range}
                onClick={() => { setTimeFilter(range); setStartDate(''); setEndDate(''); }}
                className={`px-3 py-1.5 min-h-[44px] lg:min-h-[36px] rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all active:scale-95 ${timeFilter === range ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-card text-slate-500 border-border hover:border-primary/40'}`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* One row, in this order: Given from | Given to | Order | Deadline from | Deadline to (wraps neatly on small screens) */}
          <div className="flex flex-wrap items-center gap-2 min-w-0" data-testid="mytasks-filter-row">
            <label className="flex items-center gap-1 bg-background border border-border px-1.5 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0 whitespace-nowrap">Given from</span>
              <input type="date" aria-label="Given from" value={givenFrom} onChange={(e) => setGivenFrom(e.target.value)} className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[100px]" />
            </label>
            <label className="flex items-center gap-1 bg-background border border-border px-1.5 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0 whitespace-nowrap">Given to</span>
              <input type="date" aria-label="Given to" value={givenTo} onChange={(e) => setGivenTo(e.target.value)} className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[100px]" />
            </label>
            <label className="flex items-center gap-1 bg-background border border-border px-1.5 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0 whitespace-nowrap">Order</span>
              <select aria-label="Order" value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[132px] max-w-full truncate">
                <option value="Default">Default (overdue first)</option>
                <option value="Recent first">Recent first (newest given)</option>
                <option value="Oldest first">Oldest given first</option>
                <option value="Deadline earliest">Deadline: earliest first</option>
                <option value="Deadline latest">Deadline: latest first</option>
              </select>
            </label>
            <label className="flex items-center gap-1 bg-background border border-border px-1.5 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0 whitespace-nowrap">Deadline from</span>
              <input
                type="date"
                aria-label="Deadline from"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setTimeFilter(''); }}
                className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[100px]"
              />
            </label>
            <label className="flex items-center gap-1 bg-background border border-border px-1.5 py-1 rounded-lg min-w-0">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0 whitespace-nowrap">Deadline to</span>
              <input
                type="date"
                aria-label="Deadline to"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setTimeFilter(''); }}
                className="bg-transparent text-xs text-foreground font-semibold outline-none min-w-0 w-[100px]"
              />
            </label>
            {(startDate || endDate || givenFrom || givenTo || sortMode !== 'Default') && (
              <button
                type="button"
                onClick={() => {
                  setGivenFrom(''); setGivenTo(''); setSortMode('Default');
                  if (startDate || endDate) { setStartDate(''); setEndDate(''); setTimeFilter('All'); }
                }}
                className="text-[9px] font-black uppercase text-red-500 hover:underline px-2 shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </MobileFilters>
      </div>

      {/* FLASH MESSAGE AFTER A BULK ACTION */}
      {flash && (
        <div role="status" className="mb-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash('')} aria-label="Dismiss" className="shrink-0"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" /> Doer: you do this task</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Follower: you only follow this task</span>
      </div>

      {/* TOOLBAR: bulk actions (when ticked) + choose columns */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {bulkOn && (
            <label className="lg:hidden flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <input type="checkbox" aria-label="Select all tasks (phone)" checked={allTicked} onChange={toggleAll} className="w-4 h-4 accent-[hsl(var(--primary))]" /> All
            </label>
          )}
          {bulkOn && selectedItems.length > 0 && (
            <div data-testid="bulk-bar" className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedItems.length} selected</span>
              <button type="button" onClick={() => setBulkMode('complete')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">Complete</button>
              {companyAllows('delegation_assignOnward') && myRoles.includes('Assigner') && (
                <button type="button" onClick={() => setBulkMode('onward')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">Assign Onward</button>
              )}
              {companyAllows('delegation_doerRevise') && (
                <button type="button" onClick={() => setBulkMode('revise')} className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-[10px] font-black uppercase tracking-widest">Revise</button>
              )}
              <button type="button" onClick={() => setSelected({})} className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500">Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* The table scrolls sideways when the columns are wider than the screen; Actions stays in view */}
      <div className="lg:overflow-x-auto lg:pb-2" data-testid="mytasks-scroll">
        <div className="lg:min-w-[var(--cfg-min)]" style={{ '--cfg-min': `${ctl.minWidth + 120}px` }}>
          {/* GRID HEADER (columns follow the saved layout) */}
          <div className="hidden lg:grid px-6 py-2.5 bg-slate-900 dark:bg-slate-950 rounded-t-lg border border-slate-800 font-black text-slate-400 text-[10px] uppercase tracking-[0.14em] items-center gap-2" style={{ gridTemplateColumns: ctl.gridTemplate }}>
            {ctl.columns.map((c) => (
              <div key={c.key} className={`min-w-0 break-words leading-[1.4] py-0.5 ${c.headerClassName || ''} ${c.key === 'actions' ? 'lg:sticky lg:right-0 z-10 bg-slate-900 dark:bg-slate-950 lg:shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.45)]' : ''}`}>
                {c.key === 'select'
                  ? <input type="checkbox" aria-label="Select all tasks" checked={allTicked} onChange={toggleAll} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                  : c.label}
              </div>
            ))}
          </div>

          {/* DATA TERMINAL */}
          <div className="flex flex-col bg-background lg:bg-card border border-border rounded-lg shadow-xl w-full max-lg:gap-2.5 max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:rounded-none max-lg:overflow-visible">
            {rowsNow.length === 0 ? (
              <div className="py-20 text-center opacity-30 grayscale"><Activity size={32} className="mx-auto mb-4" /><p className="font-black uppercase text-[8px] tracking-[0.4em]">Nothing here</p></div>
            ) : rowsNow.map((item, index) => {
              const ci = cardInfo(item);
              const k = item.uniqueKey;
              const prevGroup = index > 0 ? cardInfo(rowsNow[index - 1]).group : null;
              const groupCount = ci.group !== prevGroup ? rowsNow.filter((x) => cardInfo(x).group === ci.group).length : 0;
              const ticked = !!selected[k];
              const held = isHeld(item);
              const who = item.assignerName || '-';
              return (
                <React.Fragment key={k}>
                  {groupCount > 0 && (
                    <div className="lg:hidden flex items-center gap-2 px-0.5 pt-2 text-[9.5px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      <span>{ci.group} · {groupCount}</span><span className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  {/* Computer row */}
                  <div data-row={k} className={`max-lg:hidden grid items-center gap-2 px-6 py-3 border-b border-border last:border-0 hover:bg-muted/40 ${rowTone(item)} ${ticked ? 'bg-primary/5' : ''}`} style={{ gridTemplateColumns: ctl.gridTemplate }}>
                    {ctl.columns.map((c) => (
                      <div key={c.key} className={`${c.cellClassName || 'min-w-0 text-xs font-semibold'} ${c.key === 'actions' ? 'lg:sticky lg:right-0 z-10 bg-card pl-2 -my-3 py-3 lg:shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.35)]' : ''}`} data-col={c.key}>{c.render ? c.render(item, index) : null}</div>
                    ))}
                  </div>
                  {/* Phone card */}
                  <div data-card={k} className={`lg:hidden relative overflow-hidden ${item.dataType === 'Delegation' && item.myRole === 'follower' ? 'bg-indigo-500/[0.07]' : 'bg-card'} border ${ticked ? 'border-primary' : 'border-border'} rounded-2xl pl-5 pr-3.5 py-3.5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${ci.stripe} ${ci.group === 'Completed' ? 'opacity-85' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {bulkOn && <input type="checkbox" aria-label={`Select ${item.title}`} checked={ticked} onChange={() => toggleOne(k)} className="w-4 h-4 mr-1 accent-[hsl(var(--primary))]" />}
                      <span className={`px-1.5 py-[3px] rounded-md border text-[8.5px] font-black uppercase tracking-[0.1em] ${typeToneOf(item.dataType)}`}>{item.dataType}</span>
                      {item.dataType === 'Delegation' && (item.myRole === 'follower'
                        ? <span className="px-1.5 py-[3px] rounded-md border text-[8.5px] font-black uppercase tracking-[0.1em] bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30">Follower</span>
                        : <span className="px-1.5 py-[3px] rounded-md border text-[8.5px] font-black uppercase tracking-[0.1em] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">Doer</span>)}
                      <span className={`ml-auto flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] ${held ? 'text-amber-600' : item.dataType === 'FMS' && isFmsDelayed(item) && ci.group !== 'Completed' ? 'text-red-500' : ci.dot}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{held ? 'On hold' : item.dataType === 'FMS' && ci.group !== 'Completed' && isFmsDelayed(item) ? 'Delayed' : ci.text}</span>
                    </div>
                    <span className={`font-extrabold text-[15px] leading-snug text-foreground block [overflow-wrap:anywhere] ${openCards[k] ? '' : 'line-clamp-2'}`} onClick={() => setOpenCards((o) => ({ ...o, [k]: !o[k] }))}>{item.title}</span>
                    {tagsOf(item)}
                    <p className={`text-xs text-muted-foreground mt-1 leading-snug [overflow-wrap:anywhere] ${openCards[k] ? '' : 'line-clamp-2'}`} onClick={() => setOpenCards((o) => ({ ...o, [k]: !o[k] }))}>{item.description || 'No description provided.'}</p>
                    {(String(item.title || '').length > 55 || String(item.description || '').length > 70) && (
                      <button type="button" onClick={() => setOpenCards((o) => ({ ...o, [k]: !o[k] }))} className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">{openCards[k] ? 'Show less' : 'Read full'}</button>
                    )}
                    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 min-w-0"><Calendar size={13} className="shrink-0 opacity-70" />{dateTextOf(item)}</span>
                      {givenOf(item) && <span className="basis-full text-[10px] text-slate-400">Given: {fmtIST(givenOf(item))}</span>}
                      <span className="flex items-center gap-1.5 min-w-0"><User size={13} className="shrink-0 opacity-70" /><span className="truncate max-w-[180px]">By {who}</span></span>
                      <span className="flex items-center gap-1.5 min-w-0"><User size={13} className="shrink-0 opacity-70" /><span className="truncate max-w-[180px]">To {item.assignedToName || '-'}</span></span>
                      {item.followerNames && item.followerNames.length > 0 && <span className="flex items-center gap-1.5 min-w-0 text-indigo-600 dark:text-indigo-300"><Eye size={13} className="shrink-0 opacity-70" /><span className="truncate max-w-[220px]">Followers: {item.followerNames.join(', ')}</span></span>}
                      {item.dataType === 'Checklist' && <span className="flex items-center gap-1.5 min-w-0"><RefreshCcw size={13} className="shrink-0 opacity-70" />{item.frequency || 'Daily'}</span>}
                      {revisedNote(item) && <span className="basis-full text-[10px] font-black uppercase text-amber-600">{revisedNote(item)}</span>}
                      {reviseLink(item) && <span className="basis-full">{reviseLink(item)}</span>}
                    </div>
                    {photoLink(item)}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      {actionsFor(item, 'min-h-10 flex-1 rounded-xl text-[11px] tracking-[0.14em]')}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* MISSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-foreground transition-all active:scale-90 cursor-pointer"><X size={24} /></button>
            {modalType === 'FMS' ? (
              <div className="max-h-[78vh] overflow-y-auto pr-1 -mr-1">
                <h3 className="text-foreground text-lg font-black uppercase tracking-tight text-center mb-4">FMS Task</h3>
                <TaskCard
                  task={activeTask}
                  onComplete={() => { setShowModal(false); fetchAllTasks(); }}
                />
              </div>
            ) : (
              <form onSubmit={handleFinalSubmit} className="space-y-6">
                <div className="text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mx-auto mb-4 ${modalType === 'FMS' ? 'bg-slate-900 border-slate-700 text-white' : activeTask?.isBacklog ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-primary/10 border-primary/20 text-primary'}`}><Send size={24} /></div>
                  <h3 className="text-foreground text-xl font-black uppercase tracking-tight">
                    {modalType === 'FMS' ? 'FMS Mission Sync' : activeTask?.isBacklog ? 'Backlog Sync' : 'Update Task'}
                  </h3>
                  <p className="text-primary font-black text-[10px] uppercase mt-1 tracking-widest px-4 whitespace-normal break-words">
                    {activeTask?.title || activeTask?.taskName || activeTask?.nodeName}
                  </p>
                </div>
                <textarea required placeholder="Mission remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full h-32 bg-background border border-border text-foreground p-4 rounded-2xl outline-none font-bold text-[10px] uppercase shadow-inner" />
                {modalType === "Delegation" ? (
                  // Delegation completion: the doer must be able to choose
                  // storage or a live camera photo, and attach more than one.
                  <div>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border-2 border-dashed border-border text-[9px] font-black uppercase text-slate-400 hover:border-primary/50 hover:text-primary cursor-pointer transition-all">
                        <Upload size={16} /> From storage
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => { addDelegationFiles(e.target.files); e.target.value = ''; }}
                        />
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border-2 border-dashed border-border text-[9px] font-black uppercase text-slate-400 hover:border-primary/50 hover:text-primary cursor-pointer transition-all">
                        <Camera size={16} /> Take photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => { addDelegationFiles(e.target.files); e.target.value = ''; }}
                        />
                      </label>
                    </div>
                    {delegationFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {delegationFiles.map((f, i) => (
                          <LocalFileThumb key={i} file={f} onRemove={() => setDelegationFiles((prev) => prev.filter((_, j) => j !== i))} />
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[9px] font-bold text-slate-400 text-center">{uploadHint(maxFileMb)}</p>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed p-6 rounded-2xl text-center bg-background border-border hover:border-primary/50 transition-all">
                    <input type="file" onChange={(e) => pickSingleFile(e.target)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <Upload size={20} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-[9px] font-black text-foreground uppercase">{selectedFile ? selectedFile.name : "Attach Payload"}</p>
                    <p className="mt-1 text-[8px] font-bold text-slate-400 normal-case">{uploadHint(maxFileMb)}</p>
                  </div>
                )}

                <button
                  disabled={uploading}
                  className="w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] text-white shadow-lg active:scale-95 transition-all bg-slate-900"
                >
                  Finalize Result
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/98 z-[10000] flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Evidence" className="max-w-full max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95" />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {onwardTask && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-center p-6">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 relative border border-border">
            <button onClick={() => setOnwardTask(null)} className="absolute top-4 right-4"><X size={20} /></button>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Assign Onward</h3>
            <p className="text-xs text-muted-foreground mb-4 break-words">{onwardTask.title}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              {[onwardTask.assignerId?.name, ...(onwardTask.forwardChain || []).map(c => c.employeeId?.name), 'You'].filter(Boolean).join(' → ')} → <span className="text-indigo-500">New person</span>
            </p>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Assign to</label>
            <select value={onwardPick} onChange={(e) => setOnwardPick(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm">
              <option value="">Select a person…</option>
              {onwardStaff.map(d => <option key={d._id} value={d._id}>{d.name}{d.department ? ` (${d.department})` : ''}</option>)}
            </select>
            {onwardStaff.length === 0 && !onwardErr && (
              <p className="text-xs text-amber-600 mb-3">No one is mapped under you yet. Ask your Admin to map team members to you.</p>
            )}
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Note (optional)</label>
            <textarea value={onwardNote} onChange={(e) => setOnwardNote(e.target.value)} rows={2} className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm" placeholder="Anything they should know" />
            {onwardErr && <p className="text-xs text-red-500 mb-3">{onwardErr}</p>}
            <p className="text-[10px] text-muted-foreground mb-4">The person you pick becomes the doer and marks it done. You and the original assigner are both told when it is completed.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOnwardTask(null)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
              <button onClick={submitOnward} disabled={onwardBusy} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{onwardBusy ? 'Assigning…' : 'Assign Onward'}</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY & FILES MODAL — same data/shape as the assigner-side one in
          ManageTasks.jsx, so the doer can see every uploaded photo plus the
          full audit trail, including any rejection/send-back remarks. */}
      {detailsModalTask && (
        <div className="fixed inset-0 z-[9994] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-black text-sm uppercase tracking-widest">History & Files</h3>
              <button onClick={() => setDetailsModalTask(null)} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {detailsModalTask.remarks && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  Latest remarks: {detailsModalTask.remarks}
                </div>
              )}
              {/* Each history entry shows its OWN photos inline, right next to who
                  did it and when. groupPhotosByHistory (src/utils/taskPhotos.js,
                  shared with ManageTasks.jsx) handles every photo shape this app
                  has ever stored and never drops a photo - anything it can't
                  confidently place shows up in "Other photos" below instead. */}
              {(() => {
                const { entries, otherPhotos } = groupPhotosByHistory(detailsModalTask);
                const reversed = entries.slice().reverse();
                const MAX_THUMBS = 3;
                return (
                  <>
                    {reversed.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No history yet.</p>
                    ) : reversed.map((h, i) => (
                      <div key={i} className="text-xs border-l-2 border-border pl-3 pb-1">
                        <div className="font-bold text-foreground">{h.action} <span className="text-muted-foreground font-normal">— {h.performedBy?.name || 'System'}</span></div>
                        {h.remarks && <div className="text-muted-foreground mt-0.5">{h.remarks}</div>}
                        <div className="text-[10px] text-slate-400 mt-0.5">{h.timestamp ? fmtIST(h.timestamp) : ''}</div>
                        {h.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {h.photos.slice(0, MAX_THUMBS).map((f, fi) => (
                              <TaskPhotoThumb
                                key={fi}
                                file={f}
                                className="w-16 h-16"
                                onClick={() => openGallery(h.photos, fi, detailsModalTask)}
                              />
                            ))}
                            {h.photos.length > MAX_THUMBS && (
                              <button
                                type="button"
                                onClick={() => openGallery(h.photos, MAX_THUMBS, detailsModalTask)}
                                className="w-16 h-16 rounded-xl border border-border bg-background hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center text-[10px] font-black uppercase tracking-tight transition-all"
                              >
                                +{h.photos.length - MAX_THUMBS} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {otherPhotos.length > 0 && (
                      <div className="text-xs border-l-2 border-dashed border-amber-400/50 pl-3 pb-1">
                        <div className="font-bold text-amber-600 dark:text-amber-400">Other photos</div>
                        <div className="text-muted-foreground mt-0.5">Couldn't confidently match these to a specific step, so they're still shown here rather than hidden.</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {otherPhotos.slice(0, MAX_THUMBS).map((f, fi) => (
                            <TaskPhotoThumb
                              key={fi}
                              file={f}
                              className="w-16 h-16"
                              onClick={() => openGallery(otherPhotos, fi, detailsModalTask)}
                            />
                          ))}
                          {otherPhotos.length > MAX_THUMBS && (
                            <button
                              type="button"
                              onClick={() => openGallery(otherPhotos, MAX_THUMBS, detailsModalTask)}
                              className="w-16 h-16 rounded-xl border border-border bg-background hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center text-[10px] font-black uppercase tracking-tight transition-all"
                            >
                              +{otherPhotos.length - MAX_THUMBS} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <ImageLightbox photos={gallery?.photos} startIndex={gallery?.startIndex} task={gallery?.task} onClose={() => setGallery(null)} />

      {holdTask && <HoldModal task={holdTask} onClose={() => setHoldTask(null)} onDone={() => { setHoldTask(null); setFlash('The task is On hold. The waiting time will not be counted.'); fetchAllTasks(); }} />}
      {subCreateFor && (
        <SubTaskModal
          parent={{ ...subCreateFor, _id: subIdOf(subCreateFor) }}
          parentType={subCreateFor.dataType}
          currentDoerId={currentDoerId}
          onClose={() => setSubCreateFor(null)}
          onDone={(res) => { setSubCreateFor(null); setFlash(`Sub task created.${res && res.warnings && res.warnings.length ? ' ' + res.warnings.join(' ') : ''}`); fetchAllTasks(); }}
        />
      )}
      {subListFor && <SubTaskListModal parent={{ ...subListFor, _id: subIdOf(subListFor) }} parentType={subListFor.dataType} onClose={() => setSubListFor(null)} />}
      {bulkMode === 'complete' && <BulkCompleteModal items={selectedItems} eligible={completeCheck} currentDoerId={currentDoerId} onClose={closeBulk} onDone={closeBulk} />}
      {bulkMode === 'onward' && <BulkOnwardModal items={selectedItems} eligible={onwardCheck} currentDoerId={currentDoerId} onClose={closeBulk} onDone={closeBulk} />}
      {bulkMode === 'revise' && <BulkReviseModal items={selectedItems} eligible={reviseCheck} onClose={closeBulk} onDone={closeBulk} />}

      {showRevisionModal && selectedTask && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-center p-6">
          <div className="bg-card w-full max-w-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowRevisionModal(false)}
              className="absolute top-4 right-4"
            >
              <X size={20} />
            </button>
            <RevisionPanel
              task={selectedTask}
              employees={employees}
              assignerId={currentDoerId}
              onSuccess={() => {
                setShowRevisionModal(false);
                fetchAllTasks();
              }}
              source="doer"
            />
          </div>
        </div>
      )}

      {activeTaskDrawer && (
        <TaskActivityDrawer
          isOpen={!!activeTaskDrawer}
          onClose={() => { markRead(activeTaskDrawer.task._id); setActiveTaskDrawer(null); }}
          task={activeTaskDrawer.task}
          taskIndex={activeTaskDrawer.index || 1}
          taskType={activeTaskDrawer.task?.dataType === 'Checklist' ? 'checklist' : activeTaskDrawer.task?.dataType === 'FMS' ? 'flow' : 'delegation'}
          employees={employees}
          currentUser={savedUser}
          onUpdateTask={fetchAllTasks}
        />
      )}
    </div>
  );
};

export default DoerChecklist;