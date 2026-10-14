import React, { useState, useMemo } from 'react';
import API from '../api/axiosConfig';
import { dialog } from '../components/Dialog';

// On leave only while today is inside the saved date range (same rule as the server).
const isOnLeaveNow = (ls) => {
  if (!ls || !ls.onLeave) return false;
  if (ls.startDate && ls.endDate) {
    const s = new Date(ls.startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(ls.endDate); e.setHours(23, 59, 59, 999);
    const now = new Date();
    return now >= s && now <= e;
  }
  return true;
};
import {
  Trash2,
  Pencil,
  Users,
  ShieldCheck,
  Briefcase,
  MapPin,
  Mail,
  Info,
  UserCheck,
  Phone,
  Search,
  X,
  Plane,
  Calendar as CalendarIcon,
  UserCircle,
  Save,
  RefreshCcw,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

/**
 * REGISTERED EMPLOYEES: PERSONNEL DIRECTORY v3.0
 * Fix: Removed horizontal scroll — card-based layout shows all info including email & phone.
 */
const RegisteredEmployees = ({ employees, onEdit, fetchEmployees, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [locFilter, setLocFilter] = useState('All');
  const [linkView, setLinkView] = useState(null); // { emp, kind: 'doers' | 'assigners' }

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [leaveData, setLeaveData] = useState({
    onLeave: true,
    startDate: '',
    endDate: '',
    buddyId: ''
  });

  const [buddySearchQuery, setBuddySearchQuery] = useState('');
  const [isUpdatingLeave, setIsUpdatingLeave] = useState(false);

  const rolesList = ['All', 'Admin', 'Assigner', 'Doer', 'Coordinator', 'Viewer'];

  const eligibleBuddies = useMemo(() => {
    if (!selectedEmp) return [];
    return employees.filter(emp =>
      emp._id !== selectedEmp._id &&
      emp.name.toLowerCase().includes(buddySearchQuery.toLowerCase())
    );
  }, [employees, buddySearchQuery, selectedEmp]);

  const openLeaveManager = (emp) => {
    setSelectedEmp(emp);
    setBuddySearchQuery('');
    setLeaveData({
      onLeave: true,
      startDate: emp.leaveStatus?.startDate ? emp.leaveStatus.startDate.split('T')[0] : '',
      endDate: emp.leaveStatus?.endDate ? emp.leaveStatus.endDate.split('T')[0] : '',
      buddyId: emp.leaveStatus?.buddyId || ''
    });
    setShowLeaveModal(true);
  };

  const handleUpdateLeave = async () => {
    if (!selectedEmp) return;
    if (leaveData.onLeave) {
      if (!leaveData.startDate || !leaveData.endDate) {
        await dialog.alert('Please choose both the leave start date and the leave end date. Without dates the leave would never end.', { tone: 'error', title: 'Dates needed' });
        return;
      }
      if (leaveData.endDate < leaveData.startDate) {
        await dialog.alert('The leave end date cannot be before the start date.', { tone: 'error', title: 'Check the dates' });
        return;
      }
    }
    try {
      setIsUpdatingLeave(true);
      // At Work clears the dates too: the server decides leave by the date range, so old dates would keep the person on leave.
      const payloadLeave = leaveData.onLeave
        ? { ...leaveData }
        : { onLeave: false, startDate: null, endDate: null, buddyId: null };
      if (leaveData.onLeave && !payloadLeave.buddyId) delete payloadLeave.buddyId;
      await API.put(`/tasks/employees/${selectedEmp._id}`, {
        ...selectedEmp,
        leaveStatus: payloadLeave
      });
      setShowLeaveModal(false);
      fetchEmployees();
      await dialog.alert(`Leave details for ${selectedEmp.name} have been saved.`, { tone: 'success', title: 'Saved' });
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Could not save the leave details. Please try again.', { tone: 'error', title: 'Not saved' });
    } finally {
      setIsUpdatingLeave(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await dialog.confirm(`Remove ${name}? This will end all of their active task links and cannot be undone.`, { title: 'Delete employee', danger: true, confirmText: 'Delete' });
    if (!ok) return;
    try {
      await API.delete(`/tasks/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Could not delete this employee.', { tone: 'error', title: 'Not deleted' });
    }
  };

  const getRoleStyle = (role) => {
    if (role === 'Admin') return 'bg-primary/10 border-primary/30 text-primary';
    if (role === 'Assigner') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
    if (role === 'Coordinator') return 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400';
    if (role === 'Doer') return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
    if (role === 'Viewer') return 'bg-slate-500/10 border-slate-500/20 text-slate-500';
    return 'bg-background border-border text-slate-500';
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-emerald-400 to-emerald-600',
      'from-violet-400 to-violet-600',
      'from-amber-400 to-amber-600',
      'from-rose-400 to-rose-600',
      'from-sky-400 to-sky-600',
    ];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const linkChip = (emp, kind, count, dot, textCls, label) => {
    const inner = (
      <>
        <div className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
        <span className={`text-[9px] font-black ${textCls} uppercase tracking-tight`}>
          {count} {label}{count !== 1 ? 's' : ''}
        </span>
      </>
    );
    if (count === 0) return <div key={kind} className="flex items-center gap-1.5">{inner}</div>;
    return (
      <button
        key={kind}
        type="button"
        title="Click to see details"
        onClick={() => setLinkView({ emp, kind })}
        className="flex items-center gap-1.5 text-left underline decoration-dotted underline-offset-2 hover:opacity-70 cursor-pointer"
      >
        {inner}
      </button>
    );
  };

  const renderTeamLinks = (emp) => {
    if (!emp) return null;
    const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    const parts = [];
    if (roles.includes('Assigner')) {
      const doers = (Array.isArray(emp.managedDoers) ? emp.managedDoers : []).filter(Boolean);
      parts.push(linkChip(emp, 'doers', doers.length, 'bg-emerald-500', 'text-emerald-600 dark:text-emerald-400', 'Doer'));
    }
    if (roles.includes('Coordinator') || roles.includes('Admin')) {
      const assigners = (Array.isArray(emp.managedAssigners) ? emp.managedAssigners : []).filter(Boolean);
      parts.push(linkChip(emp, 'assigners', assigners.length, 'bg-primary', 'text-primary', 'Assigner'));
    }
    return parts.length > 0
      ? <div className="flex flex-col gap-1">{parts}</div>
      : <span className="text-[9px] text-slate-400 italic font-semibold">Standard</span>;
  };

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const NONE = '__none__';
  const deptOptions = [...new Set(safeEmployees.map(e => (e.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const locOptions = [...new Set(safeEmployees.map(e => (e.location || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filteredEmployees = safeEmployees.filter(emp => {
    const dv = (emp.department || '').trim();
    const lv = (emp.location || '').trim();
    if (deptFilter !== 'All' && (deptFilter === NONE ? dv !== '' : dv !== deptFilter)) return false;
    if (locFilter !== 'All' && (locFilter === NONE ? lv !== '' : lv !== locFilter)) return false;
    if (statusFilter !== 'All' && (statusFilter === 'On Leave') !== isOnLeaveNow(emp.leaveStatus)) return false;
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const empRoles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
    return matchesSearch && (selectedRole === 'All' || empRoles.includes(selectedRole));
  });

  return (
    <>
      <div className="animate-in fade-in duration-500">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl px-5 py-3 mb-3 flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-foreground text-xl font-black tracking-tight uppercase leading-none">Staff Directory</h3>
              <p className="text-slate-500 text-[10px] font-medium mt-1">Staff, roles, links and leave status</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-background px-4 py-2 rounded-full border border-border flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total:</span>
              <span className="text-primary font-black text-sm">{filteredEmployees.length}</span>
            </div>
            <button
              onClick={onAddNew}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              <UserPlus size={15} />
              Add Employee
            </button>
          </div>
        </div>

        {/* ── SEARCH + FILTER ────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 mb-3 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, department, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border text-foreground pl-9 pr-9 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/15 text-sm font-semibold"
            />
            {searchTerm && (
              <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center">
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-background border border-border text-foreground px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/15 text-[11px] font-bold" title="Filter by status">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-background border border-border text-foreground px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/15 text-[11px] font-bold" title="Filter by department">
            <option value="All">All Departments</option>
            {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            <option value={NONE}>No department</option>
          </select>
          <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} className="bg-background border border-border text-foreground px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/15 text-[11px] font-bold" title="Filter by location">
            <option value="All">All Locations</option>
            {locOptions.map(l => <option key={l} value={l}>{l}</option>)}
            <option value={NONE}>No location</option>
          </select>
          <div className="flex flex-wrap gap-1.5 p-1 bg-background border border-border rounded-xl">
            {rolesList.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  selectedRole === role ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-500 hover:text-foreground hover:bg-muted'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* ── COLUMN LABELS (desktop) ─────────────────────────────── */}
        <div className="max-h-[calc(100vh-17rem)] min-h-[240px] overflow-y-auto custom-scrollbar pr-1">
        <div className="hidden xl:grid grid-cols-[1.8fr_1.3fr_1.3fr_1.5fr_1.1fr_1fr_1fr_160px] gap-x-4 px-5 py-2 mb-1 sticky top-0 z-10 bg-background border-b border-border">
          {['Employee', 'Location / Dept', 'Roles', 'Email', 'Phone', 'Linkage', 'Status', 'Action'].map((label, i) => (
            <span key={i} className={`text-[9px] font-black text-slate-400 uppercase tracking-widest ${i === 7 ? 'text-center' : ''}`}>
              {label}
            </span>
          ))}
        </div>

        {/* ── EMPLOYEE ROWS ───────────────────────────────────────── */}
        <div className="space-y-2">
          {filteredEmployees.map((emp) => {
            const isOnLeave = isOnLeaveNow(emp.leaveStatus);
            const roles = Array.isArray(emp.roles) ? emp.roles : (emp.role ? [emp.role] : []);
            const avatarColor = getAvatarColor(emp.name);
            const buddyName = safeEmployees.find(e => e._id === emp.leaveStatus?.buddyId)?.name;

            return (
              <div
                key={emp._id}
                className="bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              >
                {/* ── DESKTOP ──────────────────────────────────────── */}
                <div className="hidden xl:grid grid-cols-[1.8fr_1.3fr_1.3fr_1.5fr_1.1fr_1fr_1fr_160px] gap-x-4 items-center">

                  {/* Name + Dept */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
                      {emp.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm truncate leading-none mb-1">{emp.name}</p>
                      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold uppercase tracking-tight">
                        <Briefcase size={9} className="text-primary/50 flex-shrink-0" />
                        <span className="truncate">{emp.department || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location / Dept */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={11} className="text-primary/40 flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">{emp.location || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Briefcase size={11} className="text-primary/40 flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">{emp.department || '—'}</span>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1">
                    {roles.map((r, i) => (
                      <span key={i} className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getRoleStyle(r)}`}>
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={11} className="text-primary/40 flex-shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                      {emp.email || '—'}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={11} className="text-primary/40 flex-shrink-0" />
                    <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 truncate">
                      {emp.whatsappNumber || '—'}
                    </span>
                  </div>

                  {/* Linkage */}
                  <div>{renderTeamLinks(emp)}</div>

                  {/* Leave Status */}
                  <div>
                    {isOnLeave ? (
                      <div className="flex items-center gap-1.5">
                        <Plane size={11} className="text-amber-500 flex-shrink-0" />
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-tight">On Leave</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight">Active</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center gap-1.5">
                    <button
                      onClick={() => openLeaveManager(emp)}
                      className="px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest active:scale-90 whitespace-nowrap"
                    >
                      Leave
                    </button>
                    <button
                      onClick={() => onEdit(emp)}
                      className="w-8 h-8 bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(emp._id, emp.name)}
                      className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* ── MOBILE / TABLET ───────────────────────────────── */}
                <div className="xl:hidden space-y-3">
                  {/* Row 1: avatar + name + actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
                        {emp.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm truncate leading-none mb-1">{emp.name}</p>
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold uppercase">
                          <Briefcase size={9} className="text-primary/50" />
                          <span className="truncate">{[emp.department || 'General', emp.location].filter(Boolean).join(' · ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openLeaveManager(emp)}
                        className="px-2.5 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest">
                        Leave
                      </button>
                      <button onClick={() => onEdit(emp)}
                        className="w-8 h-8 bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center justify-center">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(emp._id, emp.name)}
                        className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: roles */}
                  <div className="flex flex-wrap gap-1">
                    {roles.map((r, i) => (
                      <span key={i} className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getRoleStyle(r)}`}>
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* Row 3: email + phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={11} className="text-primary/40 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                        {emp.email || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={11} className="text-primary/40 flex-shrink-0" />
                      <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {emp.whatsappNumber || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: linkage + status */}
                  <div className="flex items-center justify-between pt-1">
                    <div>{renderTeamLinks(emp)}</div>
                    {isOnLeave ? (
                      <div className="flex items-center gap-1.5">
                        <Plane size={11} className="text-amber-500" />
                        <span className="text-[9px] font-black text-amber-600 uppercase">On Leave</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── EMPTY STATE ──────────────────────────────────────── */}
          {filteredEmployees.length === 0 && (
            <div className="bg-card border border-border rounded-2xl py-20 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <Users size={24} className="text-slate-400" />
              </div>
              <div>
                <p className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-500">No Results Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm ? 'Try different search terms' : 'No employees have been added yet.'}
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── LINKAGE DETAILS MODAL ───────────────────────────────── */}
      {linkView && (() => {
        const list = (linkView.kind === 'doers' ? linkView.emp.managedDoers : linkView.emp.managedAssigners);
        const people = (Array.isArray(list) ? list : []).filter(Boolean);
        const title = linkView.kind === 'doers' ? 'Linked Doers' : 'Linked Assigners';
        return (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setLinkView(null)}>
            <div className="mobile-sheet bg-card border border-border w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">{title} ({people.length})</p>
                  <p className="text-[9px] text-slate-500 tracking-widest">Under: {linkView.emp.name}</p>
                </div>
                <button onClick={() => setLinkView(null)} className="w-8 h-8 rounded-lg bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors group">
                  <X size={15} className="text-slate-400 group-hover:text-red-500" />
                </button>
              </div>
              <div className="overflow-auto">
                {people.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-400">No one is linked.</p>
                ) : (
                  <table className="mobile-card-table w-full text-left">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {['Name', 'Roles', 'Department', 'Location', 'Phone'].map(h => (
                          <th key={h} className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {people.map(p => {
                        const pr = Array.isArray(p.roles) && p.roles.length ? p.roles : (p.role ? [p.role] : []);
                        return (
                          <tr key={p._id} className="border-t border-border/60">
                            <td className="px-4 py-2.5 text-sm font-bold text-foreground">{p.name}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {pr.map((r, i) => (
                                  <span key={i} className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getRoleStyle(r)}`}>{r}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">{p.department || '—'}</td>
                            <td className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">{p.location || '—'}</td>
                            <td className="px-4 py-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">{p.whatsappNumber || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── LEAVE MODAL ──────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="mobile-sheet bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Plane size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">Leave</p>
                  <p className="text-[9px] text-slate-500 tracking-widest">Employee: {selectedEmp?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowLeaveModal(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors group">
                <X size={15} className="text-slate-400 group-hover:text-red-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Leave Status</span>
                <button
                  onClick={() => setLeaveData({ ...leaveData, onLeave: !leaveData.onLeave })}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${
                    leaveData.onLeave
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-slate-500 border border-border'
                  }`}
                >
                  {leaveData.onLeave ? 'On Leave' : 'At Work'}
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leave Start</label>
                  <input type="date" value={leaveData.startDate}
                    onChange={(e) => setLeaveData({ ...leaveData, startDate: e.target.value })}
                    className="w-full bg-background border border-border text-foreground px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leave End</label>
                  <input type="date" value={leaveData.endDate}
                    onChange={(e) => setLeaveData({ ...leaveData, endDate: e.target.value })}
                    className="w-full bg-background border border-border text-foreground px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
              </div>

              {/* Buddy Search */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Substitute during leave</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search staff..."
                    value={buddySearchQuery}
                    onChange={(e) => setBuddySearchQuery(e.target.value)}
                    className="w-full bg-background border border-border text-foreground pl-9 pr-4 py-2.5 rounded-xl text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="max-h-[150px] overflow-y-auto border border-border rounded-xl bg-background/50 p-1.5 space-y-1 custom-scrollbar">
                  {eligibleBuddies.length > 0 ? eligibleBuddies.map(emp => (
                    <button key={emp._id}
                      onClick={() => { setLeaveData({ ...leaveData, buddyId: emp._id }); setBuddySearchQuery(emp.name); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between ${
                        leaveData.buddyId === emp._id
                          ? 'bg-amber-500 text-white'
                          : 'text-slate-500 hover:bg-card hover:text-foreground'
                      }`}>
                      {emp.name}
                      {leaveData.buddyId === emp._id && <CheckCircle2 size={12} />}
                    </button>
                  )) : (
                    <div className="py-6 text-center text-[10px] text-slate-400 italic">No matching personnel found</div>
                  )}
                </div>
              </div>

              {/* Save */}
              <button onClick={handleUpdateLeave} disabled={isUpdatingLeave}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                {isUpdatingLeave ? <RefreshCcw className="animate-spin" size={16} /> : <Save size={16} />}
                Save Leave
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </>
  );
};

export default RegisteredEmployees;