import React, { useEffect, useState, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import { isViewerOnly } from '../utils/viewerMode';
import {
  Trash2,
  Edit3,
  RefreshCcw,
  User,
  Calendar,
  Save,
  X,
  ClipboardList,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  FileText,
  Target,
  ChevronDown,
  History,
  MessageSquare,
  Settings2,
  Check,
  Plus,
  Upload
} from 'lucide-react';
import CreateChecklist from './CreateChecklist';
import BulkUpload from '../components/BulkUpload';
import { dialog } from '../components/Dialog';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../components/useChat';
import { openChatPopup } from '../utils/openChatPopup';
import MobileFilters from '../components/MobileFilters';
import ResponsiveGrid from '../components/ResponsiveGrid';
import ConfigurableTable from '../components/ConfigurableTable';
import { fmtIST } from '../utils/istTime';
import ColumnCustomizer from '../components/ColumnCustomizer';
import useConfigurableColumns from '../hooks/useConfigurableColumns';
import DynamicFieldRenderer from '../components/DynamicFieldRenderer';

const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayYmd = () => ymd(new Date());

/**
 * MANAGE CHECKLIST v5.6
 * Purpose: Professional Ledger with Configuration Popup.
 * Updated: Modal stays open on success so user can see upload results.
 */
const ManageChecklist = ({ tenantId, assignerId }) => {
  const isViewer = isViewerOnly();
  const navigate = useNavigate();
  const { openTaskThread, chatEnabled } = useChat();
  const [historyFor, setHistoryFor] = useState(null); // History modal for one checklist task
  const openChat = async (item) => {
    const idOf = (v) => String((v && v._id) || v || '');
    const conv = await openTaskThread({ taskId: item._id, taskType: 'checklist', taskTitle: item.taskName, participants: [idOf(item.doerId), idOf(item.createdBy) || assignerId].filter(Boolean) });
    if (conv && conv._id && !openChatPopup(conv._id)) navigate(`/dashboard/chat?conv=${conv._id}`);
  };
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // MODAL STATE
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const [editData, setEditData] = useState({
    doerId: '',
    taskName: '',
    description: '',
    frequency: 'Daily',
    frequencyConfig: { daysOfWeek: [], daysOfMonth: [] }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const frequencyTabs = ['All', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

  // Safely get user and assignerId for the BulkUpload component
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const currentAssignerId = assignerId || user?._id || user?.id;

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  /**
   * TIMELINE ENGINE
   */
  const getNextFiveDates = (item) => {
    const dates = [];
    const config = item.frequencyConfig || {};
    const frequency = item.frequency;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let pointer = new Date(today);
    // A person who works on Sundays keeps Sunday as a working day; everyone else has it off.
    const doerEmp = employees.find(e => String(e._id) === String(item.doerId?._id || item.doerId));
    const weekends = (tenantSettings?.weekends || [0]).filter(d => !(d === 0 && (doerEmp?.workOnSunday || item.doerId?.workOnSunday)));
    const holidays = tenantSettings?.holidays || [];

    const normalizeDate = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    };

    const holidaySet = new Set(
      (holidays || []).map(h => normalizeDate(h.date))
    );

    const isNonWorkingDay = (date) => {
      const time = normalizeDate(date);
      return weekends.includes(date.getDay()) || holidaySet.has(time);
    };

    const matchesConfig = (date) => {
      if (frequency === 'Weekly') {
        const allowed = Array.isArray(config.daysOfWeek) && config.daysOfWeek.length > 0 ? config.daysOfWeek : [new Date(item.nextDueDate).getDay()];
        return allowed.includes(date.getDay());
      }
      if (frequency === 'Monthly') {
        const allowed = Array.isArray(config.daysOfMonth) && config.daysOfMonth.length > 0 ? config.daysOfMonth : [new Date(item.nextDueDate).getDate()];
        return allowed.includes(date.getDate());
      }
      return true;
    };

    if (['Yearly', 'Half-Yearly', 'Quarterly'].includes(frequency)) {
      const baseDate = new Date(item.nextDueDate || today);

      let count = 0;
      let pointer = new Date(baseDate);

      while (dates.length < 5 && count < 10) {
        count++;
        if (frequency === 'Yearly') pointer.setFullYear(pointer.getFullYear() + 1);
        if (frequency === 'Half-Yearly') pointer.setMonth(pointer.getMonth() + 6);
        if (frequency === 'Quarterly') pointer.setMonth(pointer.getMonth() + 3);

        while (isNonWorkingDay(pointer)) {
          pointer.setDate(pointer.getDate() + 1);
        }

        dates.push({
          label: dates.length === 0 ? "NEXT" : "FOLLOWING",
          date: new Date(pointer).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        });
      }
      return dates;
    }

    // A scheduled day that is a day off (Sunday off, weekly off, holiday) moves to the next working day,
    // e.g. Sunday 8 Nov for someone who has Sunday off shows on Monday 9 Nov.
    const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    let lastShown = 0;
    let loopSafety = 0;
    while (dates.length < 5 && loopSafety < 1000) {
      loopSafety++;
      if (matchesConfig(pointer)) {
        const shown = new Date(pointer);
        let guard = 0;
        while (isNonWorkingDay(shown) && guard++ < 60) shown.setDate(shown.getDate() + 1);
        if (shown.getTime() > lastShown) {
          lastShown = shown.getTime();
          dates.push({ label: dates.length === 0 ? "NEXT" : "FOLLOWING", date: fmt(shown) });
        }
      }
      pointer.setDate(pointer.getDate() + 1);
    }
    return dates;
  };

  /**
   * MODAL TOGGLES
   */
  const toggleEditDay = (dayIndex) => {
    const current = [...(editData.frequencyConfig.daysOfWeek || [])];
    const idx = current.indexOf(dayIndex);
    if (idx > -1) current.splice(idx, 1);
    else current.push(dayIndex);
    setEditData({ ...editData, frequencyConfig: { ...editData.frequencyConfig, daysOfWeek: current.sort() } });
  };

  const toggleEditDate = (dateNum) => {
    const current = [...(editData.frequencyConfig.daysOfMonth || [])];
    const idx = current.indexOf(dateNum);
    if (idx > -1) current.splice(idx, 1);
    else current.push(dateNum);
    setEditData({ ...editData, frequencyConfig: { ...editData.frequencyConfig, daysOfMonth: current.sort((a, b) => a - b) } });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkRes, empRes, settingsRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`, { params: { _: Date.now() } }).catch(() => ({ data: [] })),
        API.get(`/tasks/employees/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/tasks/settings/${currentTenantId}`).catch(() => ({ data: {} }))
      ]);
      setChecklists(Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []));
      setEmployees((Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || [])).filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));
      setTenantSettings(settingsRes.data?.settings || settingsRes.data || null);
    } catch (err) { console.error("Fetch error:", err); } finally { setLoading(false); }
  }, [currentTenantId]);

  // Refresh button: same as Manage Delegation - clear the filters and reload everything.
  const handleRefresh = () => { setSearchTerm(''); setSelectedDate(''); setActiveTab('All'); fetchData(); };

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredChecklists = checklists.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = item.taskName.toLowerCase().includes(term) || (item.doerId?.name || "").toLowerCase().includes(term);
    const matchesTab = activeTab === 'All' || item.frequency === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    const emp = employees.find(e => e._id === (item.doerId?._id || item.doerId));
    setSelectedEmployee(emp);
    setEditingId(item._id);
    setEditData({
      doerId: item.doerId?._id || item.doerId,
      taskName: item.taskName,
      description: item.description || '',
      frequency: item.frequency,
      frequencyConfig: { ...(item.frequencyConfig || {}), daysOfWeek: Array.isArray(item.frequencyConfig?.daysOfWeek) ? item.frequencyConfig.daysOfWeek : [], daysOfMonth: Array.isArray(item.frequencyConfig?.daysOfMonth) ? item.frequencyConfig.daysOfMonth : [] },
      createdAt: item.createdAt,
      customFields: (item.customFields && typeof item.customFields === 'object') ? { ...item.customFields } : {},
      // shown in Frequency Tuning; only sent to the server if the admin changes it
      startDate: item.nextDueDate ? ymd(new Date(item.nextDueDate)) : todayYmd(),
      origStart: item.nextDueDate ? ymd(new Date(item.nextDueDate)) : todayYmd(),
      startDateChanged: false
    });
  };

  const handleUpdate = async (id, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!String(editData.taskName || '').trim()) { dialog.alert('Please enter the task name.', { tone: 'error' }); return; }
    if (!editData.doerId) { dialog.alert('Please choose who the checklist is assigned to.', { tone: 'error' }); return; }
    const { startDate, startDateChanged, origStart, ...rest } = editData;
    if (startDateChanged && !/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) { dialog.alert('Please choose a valid start date.', { tone: 'error' }); return; }
    if (startDateChanged && startDate < todayYmd()) { dialog.alert('The start date cannot be in the past. Please choose today or a later date.', { tone: 'error' }); return; }
    try {
      setSaving(true);
      const payload = startDateChanged ? { ...rest, startDate } : rest;
      await API.put('/tasks/checklist/' + id, payload);
      setEditingId(null);
      fetchData();
      dialog.alert('The checklist task was updated.', { tone: 'success' });
    } catch (err) {
      dialog.alert(err.response?.data?.message || 'The checklist task could not be updated.', { tone: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, taskName, e) => {
    if (e) e.stopPropagation();
    const yes = await dialog.confirm('Delete "' + taskName + '"? The task and its history will be permanently removed.', { title: 'Delete checklist task', danger: true, confirmText: 'Delete' });
    if (!yes) return;
    try { await API.delete('/tasks/checklist/' + id); fetchData(); }
    catch (err) { dialog.alert(err.response?.data?.message || 'The checklist task could not be deleted.', { tone: 'error' }); }
  };

  // Built-in columns (company custom fields and the saved layout are added by useConfigurableColumns)
  const checklistColumns = [
    { key: 'sno', label: 'S no.', width: '60px', headerClassName: 'text-center', cellClassName: 'text-center text-xs font-black text-slate-400', render: (item, index) => index + 1 },
    { key: 'title', label: 'Title', width: 'minmax(0,1.5fr)', locked: true, cellClassName: 'min-w-0 pr-2', render: (item) => <><span className="font-black text-sm whitespace-normal break-words block">{item.taskName}</span>{item.createdAt && <span className="block mt-0.5 text-[9px] font-bold text-slate-400" data-testid="given-at">Given: {fmtIST(item.createdAt)}</span>}</> },
    { key: 'doer', label: 'Assigned to', width: 'minmax(0,1fr)', cellClassName: 'min-w-0 pr-2', render: (item) => <span className="truncate block text-sm font-semibold">{item.doerId?.name || 'UNMAPPED'}</span> },
    { key: 'description', label: 'Description', width: 'minmax(0,2fr)', cellClassName: 'min-w-0 pr-2', render: (item) => <p className="text-xs whitespace-normal break-words opacity-70 uppercase font-semibold">{item.description || "No briefing."}</p> },
    { key: 'cycle', label: 'Cycle', width: 'minmax(0,1fr)', headerClassName: 'text-center', cellClassName: 'text-center min-w-0', render: (item) => <span className="text-[10px] font-bold text-primary truncate">{item.frequency}</span> },
    { key: 'schedule', label: 'Schedule', width: 'minmax(0,1fr)', cellClassName: 'min-w-0', render: (item) => {
      const schedule = getNextFiveDates(item);
      return (
        <select className="w-full text-xs bg-background border border-border p-2 rounded-lg">
          {schedule.length > 0 ? schedule.map((obj, i) => (<option key={i}>{obj.label} → {obj.date}</option>)) : <option>Synced</option>}
        </select>
      );
    } },
    { key: 'actions', label: 'Actions', width: '190px', pinEnd: true, headerClassName: 'text-right', cellClassName: 'flex justify-end gap-2 min-w-0', render: (item) => (
      <>
        {chatEnabled && !isViewer && (
          <button onClick={(e) => { e.stopPropagation(); openChat(item); }} className="p-2 bg-background border border-border text-slate-400 hover:border-blue-400 hover:text-blue-500 rounded-lg" title="Message"><MessageSquare size={14} /></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setHistoryFor(item); }} className="p-2 bg-background border border-border text-slate-400 hover:border-violet-400 hover:text-violet-500 rounded-lg" title="History"><History size={14} /></button>
        {!isViewer && (
          <button onClick={(e) => handleEditClick(item, e)} className="p-2 bg-slate-800 text-white rounded-lg" title="Edit Checklist"><Edit3 size={14} /></button>
        )}
        {!isViewer && (
          <button onClick={(e) => handleDelete(item._id, item.taskName, e)} className="p-2 bg-red-600 text-white rounded-lg" title="Delete Checklist"><Trash2 size={14} /></button>
        )}
      </>
    ) },
  ];
  const checklistCtl = useConfigurableColumns({ tableKey: 'checklist_table', columns: checklistColumns, customFieldEntity: 'task', phoneUsesDefaults: true });

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-6">
      <RefreshCcw className="animate-spin text-primary" size={50} />
      <p className="text-foreground font-black text-sm tracking-[0.4em] uppercase">Opening Registry...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1700px] mx-auto animate-in fade-in duration-700 px-2 sm:px-6 selection:bg-primary/30">
      {historyFor && (
        <div className="fixed inset-0 z-[9994] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setHistoryFor(null)}>
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="font-black text-sm uppercase tracking-widest truncate">History - {historyFor.taskName}</h3>
              <button onClick={() => setHistoryFor(null)} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {(historyFor.history || []).length === 0 ? <p className="text-xs text-muted-foreground italic">No history yet.</p> : (historyFor.history || []).slice().reverse().map((h, i) => (
                <div key={i} className="text-xs border-l-2 border-border pl-3 pb-1">
                  <div className="font-bold text-foreground">{h.action}</div>
                  {h.remarks && <div className="text-muted-foreground mt-0.5">{h.remarks}</div>}
                  {h.attachmentUrl && <a href={h.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary font-bold">Open attached file</a>}
                  <div className="text-[10px] text-slate-400 mt-0.5">{h.timestamp ? fmtIST(h.timestamp) : ''}{h.instanceDate ? ` · for ${new Date(h.instanceDate).toLocaleDateString()}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ================= HEADER ================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ClipboardList className="text-primary shrink-0" size={20} />
          <h2 className="text-foreground text-xl font-black tracking-tight uppercase leading-none truncate">Manage Checklist</h2>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          <div className="hidden md:block"><ColumnCustomizer ctl={checklistCtl} /></div>
          <button
            onClick={handleRefresh}
            className="group flex-1 lg:flex-none bg-card hover:bg-background border border-border px-4 py-2 rounded-xl text-foreground font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500 text-primary" />
            Refresh
          </button>

          {!isViewer && (
            <button
              onClick={() => setShowBulk(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-background border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest active:scale-95 transition"
            >
              <Upload size={14} />
              Bulk Upload
            </button>
          )}

          {!isViewer && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-md shadow-primary/25 hover:opacity-90 active:scale-95 transition"
            >
              <Plus size={14} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* BULK UPLOAD MODAL COMPONENT */}
      {showBulk && (
        <BulkUpload
          tenantId={currentTenantId}
          assignerId={currentAssignerId}
          user={user}
          onClose={() => setShowBulk(false)}
          onSuccess={() => fetchData()} /* Updated: ONLY fetch data, keep modal open to see result! */
          mode="checklist"
        />
      )}

      {/* ================= FILTER BAR ================= */}
      <div className="mb-3 bg-card/40 p-2.5 rounded-xl border border-border">
        <MobileFilters
          activeCount={activeTab !== 'All' ? 1 : 0}
          onClear={() => setActiveTab('All')}
          className="flex flex-col md:flex-row md:items-center gap-3"
          alwaysVisible={
            <div className="relative group w-full md:w-56 shrink-0">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border text-foreground pl-9 pr-8 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/10 text-sm font-semibold"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" />
              {searchTerm && (
                <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={13} /></button>
              )}
            </div>
          }
        >
          {/* TABS — all visible, no sideways scrolling. Each chip sizes to
              its own label (no flex-1): forcing every chip to the same
              shared width squeezes multi-word labels like "Half-Yearly"
              below their natural width, which crowds them against their
              neighbors on the next wrapped line. */}
          <div className="flex flex-wrap bg-background p-1.5 rounded-lg border border-border gap-1.5">
            {frequencyTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={'px-2.5 py-1.5 rounded-md font-black text-[9px] uppercase tracking-wider transition whitespace-nowrap ' + (activeTab === tab ? 'bg-primary text-primary-foreground shadow' : 'text-slate-500 hover:text-foreground')}
              >
                {tab}
              </button>
            ))}
          </div>
        </MobileFilters>
      </div>

      {/* EXCEL GRID */}
      <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-h-[550px] flex flex-col overflow-hidden max-md:bg-transparent max-md:border-0 max-md:shadow-none max-md:rounded-none max-md:max-h-none max-md:overflow-visible">
        {/* SCROLL AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar w-full scrollbar-thin max-md:overflow-visible">
          <ResponsiveGrid className="w-[1000px] sm:w-full text-sm">
            <ConfigurableTable
              controller={checklistCtl}
              minWidthClass="md:min-w-[var(--cfg-min)]"
              rows={filteredChecklists}
              rowKey={(item) => item._id}
              renderHeader={({ cells, style }) => (
                <div className="mobile-grid-head grid px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-border sticky top-0 bg-card z-10" style={style}>
                  {cells}
                </div>
              )}
              empty={<div className="py-16 text-center text-sm text-muted-foreground font-medium">No checklist tasks found</div>}
              renderRow={({ row: item, cells, style }) => (
                <div
                  data-tone="chk"
                  style={style}
                  className="mobile-grid-row mgr-card mgr-card--chk grid items-center px-6 py-3 border-b border-border/50 hover:bg-muted/30 transition min-w-0"
                >
                  {cells}
                </div>
              )}
            />
          </ResponsiveGrid>
        </div>
      </div>

      {/* ── EDIT POPUP ── */}
      {editingId && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form onSubmit={(e) => handleUpdate(editingId, e)} className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"><Edit3 size={16} className="text-primary" /></div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">Edit Checklist Task</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">Update details, frequency and start date</p>
                </div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg bg-muted hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center group">
                <X size={15} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Task Name</label>
                <input
                  type="text" required value={editData.taskName}
                  onChange={(e) => setEditData({ ...editData, taskName: e.target.value })}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Assigned To</label>
                <select
                  value={editData.doerId}
                  onChange={(e) => {
                    const emp = employees.find(x => x._id === e.target.value);
                    setSelectedEmployee(emp);
                    setEditData({ ...editData, doerId: e.target.value });
                  }}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {employees.map(emp => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Description</label>
                <textarea
                  rows={3} value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              {/* Company-defined extra fields (renders nothing when the company has none) */}
              <DynamicFieldRenderer
                variant="plain"
                fields={checklistCtl.customFields}
                values={editData.customFields}
                onChange={(name, value) => setEditData((f) => ({ ...f, customFields: { ...(f.customFields || {}), [name]: value } }))}
              />

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Frequency</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map(f => (
                    <button
                      type="button" key={f}
                      onClick={() => setEditData({ ...editData, frequency: f })}
                      className={'py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition ' + (editData.frequency === f ? 'bg-primary text-white border-primary shadow-md' : 'bg-background text-slate-400 border-border hover:border-primary/40')}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {editData.frequency === 'Weekly' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                      const isDisabled = i === 0 && selectedEmployee && !selectedEmployee.workOnSunday;
                      const on = (editData.frequencyConfig.daysOfWeek || []).includes(i);
                      return (
                        <button
                          type="button" key={i} disabled={isDisabled}
                          onClick={() => !isDisabled && toggleEditDay(i)}
                          className={'w-10 h-10 rounded-lg text-[10px] font-black border transition ' + (on ? 'bg-primary text-white border-primary' : 'bg-card text-slate-400 border-border') + (isDisabled ? ' opacity-40 cursor-not-allowed' : '')}
                          title={isDisabled ? "Employee doesn't work on Sundays" : ''}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {editData.frequency === 'Monthly' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Select Dates</label>
                  <div className="grid grid-cols-7 gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <button
                        type="button" key={d}
                        onClick={() => toggleEditDate(d)}
                        className={'h-8 rounded text-[10px] font-black border transition ' + ((editData.frequencyConfig.daysOfMonth || []).includes(d) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-slate-400 border-border')}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Start Date</label>
                <input
                  type="date"
                  min={editData.origStart && editData.origStart < todayYmd() ? editData.origStart : todayYmd()}
                  value={editData.startDate || ''}
                  onChange={(e) => setEditData({ ...editData, startDate: e.target.value, startDateChanged: true })}
                  className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-[10px] text-slate-500 font-bold mt-1">Changing this recalculates the next due date from it. Past dates are not allowed.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button type="button" onClick={() => setEditingId(null)} className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-black text-[11px] uppercase tracking-wider hover:bg-background transition">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-wider shadow-lg shadow-primary/25 hover:opacity-90 transition disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>

      {/* ── CREATE CHECKLIST MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Plus size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">New Checklist Task</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">Create & assign a recurring task</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors group"
              >
                <X size={15} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="overflow-y-auto flex-1">
              <CreateChecklist
                hideHeader
                tenantId={currentTenantId}
                onSuccess={() => { setIsCreateOpen(false); fetchData(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageChecklist;