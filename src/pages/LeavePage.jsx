import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { CalendarDays, Send, X, Check } from 'lucide-react';
import { dialog } from '../components/Dialog';
import usePermissions from '../components/usePermissions';
import LeaveSetup from '../components/LeaveSetup';

/**
 * LEAVE: apply for leave and see balances, approve the team's requests, see who is off, and (for Admins) set up
 * leave types and balances. Which tabs appear depends on what the person is allowed to do.
 */
const IST = 330 * 60 * 1000;
const todayIST = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const STATUS = {
  Pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Rejected: 'bg-red-500/15 text-red-700 dark:text-red-300',
  Cancelled: 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
};
const range = (r) => (r.fromDate === r.toDate ? r.fromDate : `${r.fromDate} to ${r.toDate}`);
const half = (r) => (r.halfDay === 'first' ? ' (first half)' : r.halfDay === 'second' ? ' (second half)' : '');
const err = (e, d) => e?.response?.data?.message || d;

const Chip = ({ s }) => <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS[s] || ''}`}>{s}</span>;

const MyLeave = ({ tenantId, can }) => {
  const [balances, setBalances] = useState([]);
  const [types, setTypes] = useState([]);
  const [mine, setMine] = useState([]);
  const [people, setPeople] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', halfDay: 'none', reason: '', buddyId: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canApply = can('leave.apply');

  const load = useCallback(async () => {
    try {
      const [b, t, m] = await Promise.all([API.get('/tasks/leave/balance'), API.get('/tasks/leave/types'), API.get('/tasks/leave/requests', { params: { view: 'mine' } })]);
      setBalances(b.data?.balances || []);
      setTypes(t.data?.types || []);
      setMine(m.data?.requests || []);
    } catch (e) { await dialog.alert(err(e, 'Could not load your leave.'), { tone: 'error' }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!canApply || !tenantId) return;
    API.get(`/tasks/employees/${tenantId}`, { params: { limit: 500 } }).then((r) => { const d = r.data; setPeople(Array.isArray(d) ? d : d?.employees || []); }).catch(() => {});
  }, [canApply, tenantId]);

  const type = types.find((t) => t._id === form.leaveTypeId);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.leaveTypeId) return dialog.alert('Choose the type of leave.', { tone: 'error', title: 'Check the form' });
    if (!form.fromDate) return dialog.alert('Choose the first day of leave.', { tone: 'error', title: 'Check the form' });
    setBusy(true);
    try {
      const body = { ...form, toDate: form.toDate || form.fromDate, buddyId: form.buddyId || undefined };
      const res = await API.post('/tasks/leave/requests', body);
      await dialog.alert(`Your request for ${res.data?.request?.days ?? ''} day(s) was sent for approval.`, { tone: 'success', title: 'Sent' });
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', halfDay: 'none', reason: '', buddyId: '' });
      await load();
    } catch (er) { await dialog.alert(err(er, 'Could not send the request.'), { tone: 'error', title: 'Not sent' }); }
    finally { setBusy(false); }
  };
  const cancel = async (r) => {
    if (!(await dialog.confirm(`Cancel your leave for ${range(r)}?`, { title: 'Cancel leave', danger: true, confirmText: 'Cancel leave', cancelText: 'Keep it' }))) return;
    try { await API.put(`/tasks/leave/requests/${r._id}/cancel`, {}); await load(); }
    catch (er) { await dialog.alert(err(er, 'Could not cancel.'), { tone: 'error' }); }
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.length === 0 && <p className="text-xs font-bold text-muted-foreground">No leave types have been set up yet. Ask your Admin.</p>}
        {balances.map((b) => (
          <div key={b.typeId} className={`${card} !p-5`}>
            <p className={label}>{b.name}{!b.paid && ' · unpaid'}</p>
            {b.unlimited ? (
              <p className="text-2xl font-black text-foreground mt-2">No limit</p>
            ) : (
              <>
                <p className="text-3xl font-black text-foreground mt-2">{b.available}<span className="text-xs font-bold text-muted-foreground"> day(s) available</span></p>
                <p className="text-[11px] font-bold text-muted-foreground mt-1">Earned {b.accrued + b.carryIn + b.adjustments} · Used {b.taken}{b.pending ? ` · Waiting for approval ${b.pending}` : ''}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {canApply && (
        <form onSubmit={submit} className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-4 flex items-center gap-2"><Send size={16} className="text-primary" /> Apply for leave</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <div><label className={label}>Type</label>
              <select aria-label="Leave type" className={input} value={form.leaveTypeId} onChange={(e) => set('leaveTypeId', e.target.value)}>
                <option value="">Choose...</option>
                {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select></div>
            <div><label className={label}>From</label><input aria-label="From date" type="date" className={input} value={form.fromDate} onChange={(e) => set('fromDate', e.target.value)} /></div>
            <div><label className={label}>To (optional)</label><input aria-label="To date" type="date" className={input} min={form.fromDate || undefined} value={form.toDate} onChange={(e) => set('toDate', e.target.value)} /></div>
            <div><label className={label}>Day part</label>
              <select aria-label="Day part" className={input} value={form.halfDay} onChange={(e) => set('halfDay', e.target.value)} disabled={type && !type.halfDayAllowed}>
                <option value="none">Full day(s)</option>
                <option value="first">First half</option>
                <option value="second">Second half</option>
              </select></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div><label className={label}>Reason{type && !type.requiresReason ? ' (optional)' : ''}</label><input aria-label="Reason" className={input} maxLength={500} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Why do you need leave?" /></div>
            <div><label className={label}>Who covers your tasks? (optional)</label>
              <select aria-label="Buddy" className={input} value={form.buddyId} onChange={(e) => set('buddyId', e.target.value)}>
                <option value="">No one in particular</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select></div>
          </div>
          {type && (
            <p className="text-[11px] font-bold text-muted-foreground mt-3">
              {type.minNoticeDays > 0 && `Needs ${type.minNoticeDays} day(s) notice. `}
              {type.maxConsecutiveDays > 0 && `At most ${type.maxConsecutiveDays} day(s) at a time. `}
              {type.sandwich && 'Weekly offs and holidays between your leave days count as leave. '}
              Weekly offs and company holidays are not counted otherwise.
            </p>
          )}
          <button type="submit" disabled={busy} className="mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest disabled:opacity-50">{busy ? 'Sending...' : 'Send for approval'}</button>
        </form>
      )}

      <div className={card}>
        <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-4">My requests</h3>
        {mine.length === 0 && <p className="text-xs font-bold text-muted-foreground">You have not applied for any leave yet.</p>}
        <div className="space-y-2">
          {mine.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">{r.typeName} · {r.days} day(s){half(r)}</p>
                <p className="text-[11px] font-bold text-muted-foreground">{range(r)}{r.reason ? ` · ${r.reason}` : ''}</p>
                {r.decisionNote && <p className="text-[11px] font-bold text-muted-foreground">Note: {r.decisionNote}{r.decidedByName ? ` (${r.decidedByName})` : ''}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Chip s={r.status} />
                {(r.status === 'Pending' || (r.status === 'Approved' && r.fromDate >= todayIST())) && (
                  <button type="button" onClick={() => cancel(r)} aria-label={`Cancel leave ${range(r)}`} className="p-2 rounded-xl border border-border hover:bg-red-500/10 text-red-600 dark:text-red-400"><X size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Approvals = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const r = await API.get('/tasks/leave/requests', { params: { view: 'approvals' } }); setList(r.data?.requests || []); }
    catch (e) { await dialog.alert(err(e, 'Could not load approvals.'), { tone: 'error' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (r, decision) => {
    let note = '';
    if (decision === 'Rejected') {
      note = await dialog.prompt(`Why are you rejecting ${r.employeeName}'s leave? They will see this.`, { title: 'Reject leave', required: true, placeholder: 'Reason...', confirmText: 'Reject', danger: true });
      if (note === null) return;
    }
    try {
      const res = await API.put(`/tasks/leave/requests/${r._id}/decision`, { decision, note });
      if (res.data?.notice) await dialog.alert(res.data.notice, { tone: 'info', title: 'Approved' });
      await load();
    } catch (e) { await dialog.alert(err(e, 'Could not save the decision.'), { tone: 'error', title: 'Not saved' }); }
  };

  return (
    <div className={card}>
      <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-4">Waiting for your decision</h3>
      {!loading && list.length === 0 && <p className="text-xs font-bold text-muted-foreground">Nothing is waiting for you.</p>}
      <div className="space-y-2">
        {list.map((r) => (
          <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">{r.employeeName}{r.department ? ` · ${r.department}` : ''}</p>
              <p className="text-[11px] font-bold text-muted-foreground">{r.typeName} · {r.days} day(s){half(r)} · {range(r)}</p>
              {r.reason && <p className="text-[11px] font-bold text-muted-foreground">Reason: {r.reason}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => decide(r, 'Approved')} aria-label={`Approve ${r.employeeName} ${range(r)}`} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider"><Check size={14} /> Approve</button>
              <button type="button" onClick={() => decide(r, 'Rejected')} aria-label={`Reject ${r.employeeName} ${range(r)}`} className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-wider"><X size={14} /> Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeamCalendar = () => {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    setMsg('');
    API.get('/tasks/leave/calendar', { params: { from, to } }).then((r) => setList(r.data?.requests || [])).catch((e) => { setList([]); setMsg(err(e, 'Could not load the calendar.')); });
  }, [month]);
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-foreground text-base font-black uppercase tracking-tight">Who is on leave</h3>
        <input aria-label="Month" type="month" className={`${input} !w-auto`} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      {msg && <p className="text-xs font-bold text-red-600 dark:text-red-400">{msg}</p>}
      {!msg && list.length === 0 && <p className="text-xs font-bold text-muted-foreground">No one is on leave this month.</p>}
      <div className="space-y-2">
        {list.map((r) => (
          <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
            <div><p className="text-sm font-black text-foreground">{r.employeeName}{r.department ? ` · ${r.department}` : ''}</p>
              <p className="text-[11px] font-bold text-muted-foreground">{r.typeName} · {range(r)}{half(r)} · {r.days} day(s)</p></div>
            <Chip s={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
};

const LeavePage = ({ tenantId }) => {
  const { can, ready } = usePermissions();
  const [tab, setTab] = useState('mine');
  const tabs = [
    can('leave.view') || can('leave.apply') ? ['mine', 'My leave'] : null,
    can('leave.approve') ? ['approvals', 'Approvals'] : null,
    can('leave.view') ? ['calendar', 'Who is off'] : null,
    can('leave.configure') || can('leave.adjust') ? ['setup', 'Setup'] : null
  ].filter(Boolean);
  const current = tabs.find((t) => t[0] === tab) ? tab : tabs[0]?.[0];

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase flex items-center gap-3 mb-6"><CalendarDays className="text-primary" /> Leave</h2>
      {ready && tabs.length === 0 && <p className="text-sm font-bold text-muted-foreground">Leave is not switched on for your company, or you do not have access to it yet.</p>}
      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border ${current === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>{l}</button>
          ))}
        </div>
      )}
      {current === 'mine' && <MyLeave tenantId={tenantId} can={can} />}
      {current === 'approvals' && <Approvals />}
      {current === 'calendar' && <TeamCalendar />}
      {current === 'setup' && <LeaveSetup can={can} />}
    </div>
  );
};

export default LeavePage;
